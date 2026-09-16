import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CatscoLogAgentClient,
  CatscoSkillFetchResponse,
  CatscoSkillMemoryQuery,
} from '../src/utils/catsco-log-agent-client';
import {
  CatsLogCitationMismatchError,
  CatsLogCitationStaleError,
  CatsLogMemoryProvider,
  CatsLogNodeNotFoundError,
  CatsLogNodeRetrievalDisabledError,
  CatsLogProgramStaleError,
  CatsLogSkillSubgraphRequest,
  CatsLogSubgraphBudgetError,
  createCatsLogSkillNodesGate,
  isCatsLogSkillNodesEnvEnabled,
  resetCatsLogSkillNodesDisableStateForTests,
} from '../src/utils/catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from '../src/utils/catslog-receipt-ledger';

const BODY = 'exact untrusted body under the subgraph delivery';
const CONTENT_SHA256 = crypto.createHash('sha256').update(BODY, 'utf8').digest('hex');
const PROGRAM_SHA256 = 'a'.repeat(64);
const OTHER_PROGRAM_SHA256 = 'b'.repeat(64);
const SUBGRAPH_SHA256 = 'c'.repeat(64);
const RECEIPT = 'one-time-subgraph-receipt-never-model-visible';

/** Canonical subgraph delivery fixture (server-shaped, schema 2). */
function subgraphResponse(overrides: {
  programSha256?: string;
  subgraphSha256?: string;
  seeds?: string[];
  nodes?: Array<{ id: string; summary?: string; body?: string; source_refs?: string[] }>;
  edges?: Array<{ from: string; to: string; required?: boolean; rationale?: string }>;
  nodeCount?: number;
  edgeCount?: number;
  receipt?: string;
  contentSha256?: string;
  schemaVersion?: number;
  roots?: string[];
} = {}): CatscoSkillFetchResponse {
  const nodes = overrides.nodes ?? [
    { id: 'plan', summary: 'plan the migration', body: 'plan body', source_refs: ['capsule-a'] },
    { id: 'freeze', summary: 'freeze writes', body: 'freeze body' },
    { id: 'verify', summary: 'verify results', body: 'verify body' },
  ];
  const edges = overrides.edges ?? [
    { from: 'plan', to: 'freeze', required: true, rationale: 'order' },
    { from: 'plan', to: 'verify', required: false, rationale: 'optional check' },
  ];
  const seeds = overrides.seeds ?? ['plan'];
  const item = {
    handle: 'deploy-r2',
    revision: 7,
    content_sha256: overrides.contentSha256 ?? CONTENT_SHA256,
    content: BODY,
    retrieval_receipt: overrides.receipt ?? RECEIPT,
  };
  return {
    schema_version: 1,
    content_trust: 'untrusted_runtime_memory',
    catalog_revision: 42,
    item,
    program: {
      schema_version: overrides.schemaVersion ?? 2,
      program_sha256: overrides.programSha256 ?? PROGRAM_SHA256,
      subgraph_sha256: overrides.subgraphSha256 ?? SUBGRAPH_SHA256,
      seed_node_ids: seeds,
      roots: overrides.roots ?? ['plan'],
      nodes,
      edges,
      node_count: overrides.nodeCount ?? nodes.length,
      edge_count: overrides.edgeCount ?? edges.length,
      required_node_count: 2,
      required_edge_count: 1,
      expansion_truncated: false,
    },
  };
}

function subgraphRequest(overrides: Partial<CatsLogSkillSubgraphRequest> = {}): CatsLogSkillSubgraphRequest {
  return {
    handle: 'deploy-r2',
    revision: 7,
    contentSha256: CONTENT_SHA256,
    programSha256: PROGRAM_SHA256,
    seedNodeIds: ['plan'],
    ...overrides,
  };
}

describe('CatsLog memory provider subgraph fetch', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;
  let capturedReceipts: CatsLogReceiptLedgerEntry[];

  beforeEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-catslog-subgraph-'));
    env = {
      CATSCO_LOG_API_BASE_URL: 'https://logs.example.test',
      CATSCO_USER_TOKEN: 'catscompany-user-token',
      DOTENV_CONFIG_PATH: path.join(root, 'missing.env'),
      XIAOBA_USER_DATA_DIR: root,
    };
    capturedReceipts = [];
  });

  afterEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
    fs.rmSync(root, { recursive: true, force: true });
  });

  function providerWith(client: Partial<CatscoLogAgentClient>): CatsLogMemoryProvider {
    return new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client as CatscoLogAgentClient,
    });
  }

  function capturingBackend(client: Partial<CatscoLogAgentClient>): {
    provider: CatsLogMemoryProvider;
    requests: unknown[];
  } {
    const requests: unknown[] = [];
    const wrapped: Partial<CatscoLogAgentClient> = {
      ...client,
      fetchSkillSubgraph: async input => {
        requests.push(input);
        return client.fetchSkillSubgraph!(input as any);
      },
    };
    return { provider: providerWith(wrapped), requests };
  }

  test('env gate helper reads CATSLOG_SKILL_NODES_ENABLED and defaults off', () => {
    assert.equal(isCatsLogSkillNodesEnvEnabled({}), false);
    assert.equal(isCatsLogSkillNodesEnvEnabled({ CATSLOG_SKILL_NODES_ENABLED: '0' }), false);
    assert.equal(isCatsLogSkillNodesEnvEnabled({ CATSLOG_SKILL_NODES_ENABLED: 'false' }), false);
    assert.equal(isCatsLogSkillNodesEnvEnabled({ CATSLOG_SKILL_NODES_ENABLED: '1' }), true);
    assert.equal(isCatsLogSkillNodesEnvEnabled({ CATSLOG_SKILL_NODES_ENABLED: 'yes' }), true);
    const gate = createCatsLogSkillNodesGate(true);
    assert.equal(gate.enabled, true);
    assert.equal(gate.isPermanentlyDisabled(), false);
    gate.markPermanentlyDisabled();
    assert.equal(gate.isPermanentlyDisabled(), true);
    assert.equal(createCatsLogSkillNodesGate(false).enabled, false);
  });

  test('delivers a validated subgraph, routes the receipt privately, strips it from the result', async () => {
    const { provider, requests } = capturingBackend({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse(),
    });

    const result = await provider.fetchSkillSubgraph(subgraphRequest(), {
      onReceipt: entry => capturedReceipts.push(entry),
    });

    // Request shape: pinned citation plus program selector, canonicalized seeds.
    const request = requests[0] as any;
    assert.equal(request.handle, 'deploy-r2');
    assert.equal(request.revision, 7);
    assert.equal(request.contentSha256, CONTENT_SHA256);
    assert.equal(request.programSha256, PROGRAM_SHA256);
    assert.deepEqual(request.seedNodeIds, ['plan']);
    assert.equal(request.token, 'skill-token-1');

    // Delivered program block passes through after validation.
    assert.equal(result.program.schema_version, 2);
    assert.equal(result.program.program_sha256, PROGRAM_SHA256);
    assert.equal(result.program.subgraph_sha256, SUBGRAPH_SHA256);
    assert.equal(result.program.nodes?.length, 3);

    // The result copy must never carry the receipt.
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(RECEIPT), 'receipt leaked into the subgraph result');
    assert.equal((result.item as any).retrieval_receipt, undefined);

    // The private capture carries the full delivered identity for reporting.
    assert.equal(capturedReceipts.length, 1);
    const entry = capturedReceipts[0];
    assert.equal(entry.programSha256, PROGRAM_SHA256);
    assert.equal(entry.subgraphSha256, SUBGRAPH_SHA256);
    assert.deepEqual(entry.seedNodeIds, ['plan']);
    assert.deepEqual(entry.nodeRefs, [
      'catslog:skill:deploy-r2@7#plan',
      'catslog:skill:deploy-r2@7#freeze',
      'catslog:skill:deploy-r2@7#verify',
    ]);
  });

  test('canonicalizes unordered duplicate seeds and validates the canonical echo', async () => {
    const { provider, requests } = capturingBackend({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({ seeds: ['freeze', 'plan'] }),
    });
    await provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: [' freeze', 'plan', 'freeze'] }), {
      onReceipt: entry => capturedReceipts.push(entry),
    });
    const request = requests[0] as any;
    assert.deepEqual(request.seedNodeIds, ['freeze', 'plan']);
    assert.deepEqual(capturedReceipts[0].seedNodeIds, ['freeze', 'plan']);
  });

  test('rejects a program_sha256 echo mismatch before capturing the receipt', async () => {
    const { provider } = capturingBackend({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({ programSha256: OTHER_PROGRAM_SHA256 }),
    });
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest(), {
        onReceipt: entry => capturedReceipts.push(entry),
      }),
      CatsLogCitationMismatchError,
    );
    assert.equal(capturedReceipts.length, 0);
  });

  test('fails closed on a missing program block, wrong schema, or missing subgraph digest', async () => {
    const cases: Array<() => CatscoSkillFetchResponse> = [
      () => {
        const response = subgraphResponse();
        delete (response as any).program;
        return response;
      },
      () => subgraphResponse({ schemaVersion: 1 }),
      () => subgraphResponse({ subgraphSha256: 'not-a-digest' }),
    ];
    for (const build of cases) {
      const provider = providerWith({
        bootstrap: async () => bootstrapResponse('skill-token-1'),
        fetchSkillSubgraph: async () => build(),
      });
      await assert.rejects(
        provider.fetchSkillSubgraph(subgraphRequest(), {
          onReceipt: entry => capturedReceipts.push(entry),
        }),
        CatsLogCitationMismatchError,
      );
    }
    assert.equal(capturedReceipts.length, 0);
  });

  test('fails closed when a requested seed is missing from the delivered nodes', async () => {
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({
        seeds: ['plan', 'ghost'],
        nodes: [
          { id: 'plan', body: 'plan body' },
          { id: 'freeze', body: 'freeze body' },
        ],
        edges: [{ from: 'plan', to: 'freeze', required: true }],
        nodeCount: 2,
        edgeCount: 1,
      }),
    });
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: ['plan', 'ghost'] }), {
        onReceipt: entry => capturedReceipts.push(entry),
      }),
      CatsLogCitationMismatchError,
    );
    assert.equal(capturedReceipts.length, 0);
  });

  test('fails closed on an incomplete required closure (dangling edge endpoint)', async () => {
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({
        edges: [{ from: 'plan', to: 'missing-node', required: true }],
      }),
    });
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest(), {
        onReceipt: entry => capturedReceipts.push(entry),
      }),
      CatsLogCitationMismatchError,
    );
    assert.equal(capturedReceipts.length, 0);
  });

  test('fails closed on malformed delivered node ids, unknown roots, or inconsistent counts', async () => {
    const cases: Array<() => CatscoSkillFetchResponse> = [
      () => subgraphResponse({ nodes: [{ id: 'Bad_ID', body: 'x' }] }),
      () => subgraphResponse({ roots: ['not-delivered'] }),
      () => subgraphResponse({ nodeCount: 99 }),
      () => subgraphResponse({ edgeCount: 99 }),
      () => subgraphResponse({ seeds: ['plan'] }),
    ];
    cases[4] = () => {
      // A non-canonical seed echo (server canonicalizes ordering) is corrupt.
      const response = subgraphResponse({ seeds: ['plan', 'freeze'] });
      (response.program as any).seed_node_ids = ['plan', 'freeze'];
      return response;
    };
    for (const build of cases) {
      const provider = providerWith({
        bootstrap: async () => bootstrapResponse('skill-token-1'),
        fetchSkillSubgraph: async () => build(),
      });
      await assert.rejects(
        provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: ['plan', 'freeze'] }), {
          onReceipt: entry => capturedReceipts.push(entry),
        }),
        CatsLogCitationMismatchError,
      );
    }
    assert.equal(capturedReceipts.length, 0);
  });

  test('fails closed when the body hash does not match the citation or the receipt is missing', async () => {
    const wrongBody = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({ contentSha256: 'f'.repeat(64) }),
    });
    await assert.rejects(
      wrongBody.fetchSkillSubgraph(subgraphRequest(), { onReceipt: entry => capturedReceipts.push(entry) }),
      CatsLogCitationMismatchError,
    );

    const noReceipt = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse({ receipt: '  ' }),
    });
    await assert.rejects(
      noReceipt.fetchSkillSubgraph(subgraphRequest(), { onReceipt: entry => capturedReceipts.push(entry) }),
      CatsLogCitationMismatchError,
    );
    assert.equal(capturedReceipts.length, 0);
  });

  test('maps typed server failures without retry or receipt capture', async () => {
    const errorWith = (status: number, code: string) => {
      const error: any = new Error(`HTTP ${status}`);
      error.status = status;
      error.payload = { error: code };
      return error;
    };
    const cases: Array<{
      status: number;
      code: string;
      expected: new () => Error;
    }> = [
      { status: 409, code: 'program_stale', expected: CatsLogProgramStaleError },
      { status: 409, code: 'citation_stale', expected: CatsLogCitationStaleError },
      { status: 404, code: 'node_not_found', expected: CatsLogNodeNotFoundError },
      { status: 400, code: 'required_closure_exceeds_budget', expected: CatsLogSubgraphBudgetError },
      { status: 400, code: 'node_retrieval_disabled', expected: CatsLogNodeRetrievalDisabledError },
      { status: 400, code: 'invalid_request', expected: CatsLogNodeRetrievalDisabledError },
    ];
    for (const testCase of cases) {
      const provider = providerWith({
        bootstrap: async () => bootstrapResponse('skill-token-1'),
        fetchSkillSubgraph: async () => {
          throw errorWith(testCase.status, testCase.code);
        },
      });
      await assert.rejects(
        provider.fetchSkillSubgraph(subgraphRequest(), {
          onReceipt: entry => capturedReceipts.push(entry),
        }),
        (error: any) => {
          assert.ok(error instanceof testCase.expected, `expected ${testCase.expected.name} for ${testCase.code}`);
          return true;
        },
      );
    }
    assert.equal(capturedReceipts.length, 0);
  });

  test('cancellation propagates and never records a receipt', async () => {
    const controller = new AbortController();
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async input => {
        controller.abort();
        input.signal?.throwIfAborted();
        return subgraphResponse();
      },
    });
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest(), {
        onReceipt: entry => capturedReceipts.push(entry),
        signal: controller.signal,
      }),
      (error: any) => error?.name === 'AbortError',
    );
    assert.equal(capturedReceipts.length, 0);
  });

  test('without a sink the receipt is dropped and never returned or logged', async () => {
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => subgraphResponse(),
    });
    const result = await provider.fetchSkillSubgraph(subgraphRequest());
    assert.ok(!JSON.stringify(result).includes(RECEIPT));
    assert.equal(capturedReceipts.length, 0);
  });

  test('rejects malformed selectors before any network call', async () => {
    let networkCalls = 0;
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillSubgraph: async () => {
        networkCalls++;
        return subgraphResponse();
      },
    });
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest({ programSha256: 'zzz' })),
      CatsLogCitationMismatchError,
    );
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: ['BAD_ID'] })),
      CatsLogCitationMismatchError,
    );
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: [] })),
      CatsLogCitationMismatchError,
    );
    await assert.rejects(
      provider.fetchSkillSubgraph(subgraphRequest({ seedNodeIds: Array.from({ length: 9 }, (_, index) => `node-${index}`) })),
      CatsLogCitationMismatchError,
    );
    assert.equal(networkCalls, 0);
  });

  test('retrieveSkillMemory forwards node discovery fields when the gate is on', async () => {
    const queries: CatscoSkillMemoryQuery[] = [];
    const provider = providerWith({
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      retrieveSkillMemory: async input => {
        queries.push({
          task: input.task,
          limit: input.limit,
          includeNodes: input.includeNodes,
          nodeSummaryLimit: input.nodeSummaryLimit,
          edgeSummaryLimit: input.edgeSummaryLimit,
        });
        return { items: [] };
      },
    });
    await provider.retrieveSkillMemory({
      task: 'deploy',
      limit: 5,
      includeNodes: true,
      nodeSummaryLimit: 16,
      edgeSummaryLimit: 32,
    });
    assert.deepEqual(queries[0], {
      task: 'deploy',
      limit: 5,
      includeNodes: true,
      nodeSummaryLimit: 16,
      edgeSummaryLimit: 32,
    });
  });
});

function bootstrapResponse(skillToken: string) {
  return {
    user_id: 'catsco-123',
    external_provider: 'catsco',
    external_user_id: '123',
    device_id: 'device-stable',
    token_id: 'upload-token-id',
    token: 'upload-token-must-not-be-used-for-memory',
    upload_url: '/catsco/logs/upload',
    issued_at: '2026-09-14T00:00:00.000Z',
    expires_at: '2099-08-28T00:00:00.000Z',
    skill_token_id: `${skillToken}-id`,
    skill_token: skillToken,
    skill_token_expires_at: '2099-08-28T00:00:00.000Z',
    memory_url: '/catsco/agent/memory/retrieve',
    memory_recall_url: '/catsco/agent/memory/recall',
  };
}
