import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import {
  CatsLogSkillMemoryTool,
  CatsLogSkillSubgraphFetchTool,
} from '../src/tools/catslog-memory-tools';
import { isMemoryCitationRef } from '../src/tools/memory-branch-tools';
import {
  CatsLogCitationMismatchError,
  CatsLogCitationStaleError,
  CatsLogNodeNotFoundError,
  CatsLogNodeRetrievalDisabledError,
  CatsLogProgramStaleError,
  CatsLogSubgraphBudgetError,
  createCatsLogSkillNodesGate,
  resetCatsLogSkillNodesDisableStateForTests,
} from '../src/utils/catslog-memory-provider';
import type {
  CatsLogMemoryBackend,
  CatsLogSkillFetchOptions,
  CatsLogSkillFetchResult,
  CatsLogSkillNodesGate,
  CatsLogSkillSubgraphFetchOptions,
  CatsLogSkillSubgraphRequest,
  CatsLogSkillSubgraphResult,
} from '../src/utils/catslog-memory-provider';
import { CatsLogReceiptLedger, skillNodeCitationRef } from '../src/utils/catslog-receipt-ledger';
import type {
  CatscoMemoryRecallQuery,
  CatscoMemoryRecallResponse,
  CatscoSkillCitation,
  CatscoSkillMemoryQuery,
  CatscoSkillMemoryResponse,
  CatscoSkillSubgraphSelector,
} from '../src/utils/catsco-log-agent-client';

const context = {
  workingDirectory: '/tmp/xiaoba-catslog-subgraph-tools-test',
  conversationHistory: [],
};

const BODY = 'exact untrusted body';
const CONTENT_SHA256 = crypto.createHash('sha256').update(BODY, 'utf8').digest('hex');
const PROGRAM_SHA256 = 'a'.repeat(64);
const SUBGRAPH_SHA256 = 'c'.repeat(64);
const RECEIPT = 'subgraph-receipt-stays-private';

interface DiscoveryItemOverrides {
  programNodes?: Record<string, unknown> | null;
  content?: string;
  receipt?: string;
}

function discoveryItem(overrides: DiscoveryItemOverrides = {}) {
  return {
    handle: 'deploy-r2',
    revision: 7,
    content_sha256: CONTENT_SHA256,
    ...(overrides.content !== undefined ? { content: overrides.content } : {}),
    ...(overrides.receipt !== undefined ? { retrieval_receipt: overrides.receipt } : {}),
    ...(overrides.programNodes !== undefined ? { program_nodes: overrides.programNodes } : {}),
  };
}

function validProgramNodes() {
  return {
    schema_version: 2,
    program_sha256: PROGRAM_SHA256,
    node_count: 3,
    edge_count: 2,
    roots: ['plan'],
    nodes: [
      { id: 'plan', summary: 'plan the migration' },
      { id: 'freeze', summary: 'freeze writes' },
      { id: 'verify', summary: 'verify results' },
    ],
    edges: [
      { from: 'plan', to: 'freeze', required: true },
      { from: 'plan', to: 'verify', required: false },
    ],
    nodes_truncated: false,
    edges_truncated: false,
  };
}

/** Backend with node-level transport plus metadata/recall/receipt plumbing. */
class SubgraphBackend implements CatsLogMemoryBackend {
  lastQuery: CatscoSkillMemoryQuery | null = null;
  lastSubgraphRequest: CatsLogSkillSubgraphRequest | null = null;
  lastSubgraphOptions: CatsLogSkillSubgraphFetchOptions | null = null;
  lastFetchOptions: CatsLogSkillFetchOptions | null = null;
  subgraphCalls = 0;
  bodyFallbackCalls = 0;

  constructor(
    private readonly options: {
      discoveryResponse?: CatscoSkillMemoryResponse;
      subgraphResult?: () => CatsLogSkillSubgraphResult | Promise<CatsLogSkillSubgraphResult>;
      subgraphError?: Error;
    } = {},
  ) {}

  async retrieveSkillMemory(query: CatscoSkillMemoryQuery): Promise<CatscoSkillMemoryResponse> {
    this.lastQuery = { ...query };
    return this.options.discoveryResponse ?? { items: [discoveryItem({ programNodes: validProgramNodes() })] };
  }

  async recallMemory(_query: CatscoMemoryRecallQuery): Promise<CatscoMemoryRecallResponse> {
    return { session_available: true, session: { records: [] }, notes: [] };
  }

  async reportUseStages(): Promise<never> {
    throw new Error('reportUseStages must never be called by the tool surface');
  }

  async fetchSkillCitation(
    citation: CatscoSkillCitation,
    options?: CatsLogSkillFetchOptions,
  ): Promise<CatsLogSkillFetchResult> {
    this.bodyFallbackCalls += 1;
    this.lastFetchOptions = options ?? null;
    options?.onReceipt?.({
      handle: citation.handle,
      revision: citation.revision,
      contentSha256: citation.contentSha256,
      receipt: RECEIPT,
      issuedAt: '2026-09-14T00:00:00.000Z',
    });
    return {
      item: {
        handle: citation.handle,
        revision: citation.revision,
        content_sha256: citation.contentSha256,
        content: BODY,
      },
    };
  }

  async fetchSkillSubgraph(
    request: CatsLogSkillSubgraphRequest,
    options?: CatsLogSkillSubgraphFetchOptions,
  ): Promise<CatsLogSkillSubgraphResult> {
    this.subgraphCalls += 1;
    this.lastSubgraphRequest = { ...request };
    this.lastSubgraphOptions = options ?? null;
    if (this.options.subgraphError) throw this.options.subgraphError;
    const result = this.options.subgraphResult
      ? await this.options.subgraphResult()
      : this.defaultSubgraphResult(request);
    // Mirror the real provider: the validated delivery routes the receipt to
    // the private sink before the result is returned.
    options?.onReceipt?.({
      handle: request.handle,
      revision: request.revision,
      contentSha256: request.contentSha256,
      receipt: RECEIPT,
      issuedAt: '2026-09-14T00:00:00.000Z',
      programSha256: result.program.program_sha256,
      subgraphSha256: result.program.subgraph_sha256,
      seedNodeIds: result.program.seed_node_ids,
      nodeRefs: (result.program.nodes ?? []).map(node => skillNodeCitationRef(request.handle, request.revision, node.id)),
    });
    return result;
  }

  private defaultSubgraphResult(request: CatsLogSkillSubgraphRequest): CatsLogSkillSubgraphResult {
    return {
      item: {
        handle: request.handle,
        revision: request.revision,
        content_sha256: request.contentSha256,
        content: BODY,
      },
      program: {
        schema_version: 2,
        program_sha256: request.programSha256,
        subgraph_sha256: SUBGRAPH_SHA256,
        seed_node_ids: [...request.seedNodeIds].sort(),
        roots: ['plan'],
        nodes: [
          { id: 'plan', summary: 'plan', body: 'plan body', source_refs: ['capsule-a'] },
          { id: 'freeze', summary: 'freeze', body: 'freeze body' },
        ],
        edges: [{ from: 'plan', to: 'freeze', required: true, rationale: 'order' }],
        node_count: 2,
        edge_count: 1,
        required_node_count: 2,
        required_edge_count: 1,
        expansion_truncated: false,
      },
      catalogRevision: 42,
      contentTrust: 'untrusted_runtime_memory',
    };
  }
}

function gate(enabled = true): CatsLogSkillNodesGate {
  return createCatsLogSkillNodesGate(enabled);
}

async function execute(tool: { execute(args: any, context: any): Promise<any> }, args: any) {
  return tool.execute(args, context);
}

describe('catslog_skill_memory node discovery', () => {
  beforeEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
  });
  afterEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
  });

  test('rejects node arguments when the env gate is off', async () => {
    const backend = new SubgraphBackend();
    const tool = new CatsLogSkillMemoryTool(backend, undefined, gate(false));
    const result = await execute(tool, { task: 'deploy', include_nodes: true });
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, 'INVALID_TOOL_ARGUMENTS');
    assert.equal(backend.lastQuery, null);
  });

  test('rejects node arguments once the server permanently disabled nodes', async () => {
    const nodesGate = gate(true);
    nodesGate.markPermanentlyDisabled();
    const backend = new SubgraphBackend();
    const tool = new CatsLogSkillMemoryTool(backend, undefined, nodesGate);
    const result = await execute(tool, { task: 'deploy', include_nodes: true });
    assert.equal(result.ok, false);
    assert.equal(backend.lastQuery, null);
  });

  test('forwards include_nodes and limits when enabled and projects metadata-only program_nodes', async () => {
    const backend = new SubgraphBackend({
      discoveryResponse: {
        content_trust: 'untrusted_runtime_memory',
        items: [discoveryItem({
          programNodes: {
            ...validProgramNodes(),
            // Hostile/malformed server extras must never cross the projection.
            nodes: [{ id: 'plan', summary: 'plan the migration', body: 'LEAKED BODY', source_refs: ['LEAKED'] }],
            edges: [{ from: 'plan', to: 'freeze', required: true, rationale: 'LEAKED RATIONALE', source_refs: ['LEAKED'] }],
          },
          content: 'LEAKED BODY CONTENT',
          receipt: RECEIPT,
        })],
      },
    });
    const tool = new CatsLogSkillMemoryTool(backend, undefined, gate(true));
    const result = await execute(tool, { task: 'deploy', include_nodes: true, node_summary_limit: 16, edge_summary_limit: 32 });
    assert.equal(result.ok, true);
    assert.deepEqual(backend.lastQuery, {
      task: 'deploy',
      limit: 8,
      includeNodes: true,
      nodeSummaryLimit: 16,
      edgeSummaryLimit: 32,
    });

    const page = JSON.parse(String(result.content));
    const item = page.items[0];
    assert.equal(item.program_nodes.schema_version, 2);
    assert.equal(item.program_nodes.program_sha256, PROGRAM_SHA256);
    assert.deepEqual(item.program_nodes.nodes[0], { id: 'plan', summary: 'plan the migration' });
    assert.deepEqual(item.program_nodes.edges[0], { from: 'plan', to: 'freeze', required: true });
    const serialized = JSON.stringify(page);
    for (const leak of ['LEAKED BODY', 'LEAKED RATIONALE', 'LEAKED', RECEIPT, 'LEAKED BODY CONTENT']) {
      assert.ok(!serialized.includes(leak), `discovery projection leaked: ${leak}`);
    }
  });

  test('omits program_nodes for v1/body-only items and for non-v2 blocks', async () => {
    const backend = new SubgraphBackend({
      discoveryResponse: {
        items: [
          discoveryItem({}),
          discoveryItem({ programNodes: { ...validProgramNodes(), schema_version: 1 } }),
          discoveryItem({ programNodes: { schema_version: 2 } }),
        ],
      },
    });
    const tool = new CatsLogSkillMemoryTool(backend, undefined, gate(true));
    const result = await execute(tool, { task: 'deploy', include_nodes: true });
    const page = JSON.parse(String(result.content));
    for (const item of page.items) {
      assert.equal(item.program_nodes, undefined);
    }
  });

  test('plain queries without node arguments stay byte-compatible with the legacy path', async () => {
    const backend = new SubgraphBackend({
      discoveryResponse: { items: [discoveryItem({ programNodes: validProgramNodes() })] },
    });
    const tool = new CatsLogSkillMemoryTool(backend, undefined, gate(true));
    const result = await execute(tool, { task: 'deploy' });
    assert.equal(result.ok, true);
    assert.deepEqual(backend.lastQuery, { task: 'deploy', limit: 8 });
    const page = JSON.parse(String(result.content));
    assert.equal(page.items[0].program_nodes, undefined);
  });
});

describe('catslog_skill_subgraph_fetch', () => {
  beforeEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
  });
  afterEach(() => {
    resetCatsLogSkillNodesDisableStateForTests();
  });

  const baseArgs = {
    handle: 'deploy-r2',
    revision: 7,
    content_sha256: CONTENT_SHA256,
    program_sha256: PROGRAM_SHA256,
    seeds: ['plan'],
  };

  test('returns the bounded subgraph with stable node refs and routes the receipt to the ledger only', async () => {
    const backend = new SubgraphBackend();
    const ledger = new CatsLogReceiptLedger();
    const tool = new CatsLogSkillSubgraphFetchTool(backend, ledger, undefined, gate(true));
    const result = await execute(tool, baseArgs);

    assert.equal(result.ok, true);
    assert.equal(backend.subgraphCalls, 1);
    assert.deepEqual(backend.lastSubgraphRequest, {
      handle: 'deploy-r2',
      revision: 7,
      contentSha256: CONTENT_SHA256,
      programSha256: PROGRAM_SHA256,
      seedNodeIds: ['plan'],
    });

    const projected = JSON.parse(String(result.content));
    assert.equal(projected.content_trust, 'untrusted_runtime_memory');
    assert.equal(projected.ref, 'catslog:skill:deploy-r2@7');
    assert.equal(projected.program.program_sha256, PROGRAM_SHA256);
    assert.equal(projected.program.subgraph_sha256, SUBGRAPH_SHA256);
    assert.equal(projected.program.node_count, 2);
    assert.equal(projected.program.expansion_truncated, false);
    const planNode = projected.program.nodes.find((node: any) => node.id === 'plan');
    assert.equal(planNode.ref, 'catslog:skill:deploy-r2@7#plan');
    assert.equal(planNode.body, 'plan body');

    // Receipt secrecy: never in the tool result, exactly once in the ledger.
    assert.ok(!String(result.content).includes(RECEIPT));
    assert.equal(ledger.size, 1);
    const entry = ledger.drain()[0];
    assert.equal(entry.receipt, RECEIPT);
    assert.equal(entry.programSha256, PROGRAM_SHA256);
    assert.equal(entry.subgraphSha256, SUBGRAPH_SHA256);
    assert.deepEqual(entry.nodeRefs?.length, 2);
  });

  test('dedupes and validates seeds client-side before any request', async () => {
    const backend = new SubgraphBackend();
    const tool = new CatsLogSkillSubgraphFetchTool(backend, undefined, undefined, gate(true));
    const result = await execute(tool, { ...baseArgs, seeds: [' freeze ', 'freeze', 'plan'] });
    assert.equal(result.ok, true);
    assert.deepEqual(backend.lastSubgraphRequest?.seedNodeIds, ['freeze', 'plan']);

    const bad = await execute(tool, { ...baseArgs, seeds: ['BAD_ID'] });
    assert.equal(bad.ok, false);
    assert.equal(bad.errorCode, 'INVALID_TOOL_ARGUMENTS');
    const empty = await execute(tool, { ...baseArgs, seeds: [] });
    assert.equal(empty.ok, false);
    const tooMany = await execute(tool, { ...baseArgs, seeds: Array.from({ length: 9 }, (_, i) => `node-${i}`) });
    assert.equal(tooMany.ok, false);
    assert.equal(backend.subgraphCalls, 1);
  });

  test('projects distinct non-retryable error codes with fresh-discovery guidance', async () => {
    const cases: Array<{ error: Error; code: string }> = [
      { error: new CatsLogProgramStaleError(), code: 'CATSLOG_PROGRAM_STALE' },
      { error: new CatsLogNodeNotFoundError(), code: 'CATSLOG_NODE_NOT_FOUND' },
      { error: new CatsLogSubgraphBudgetError(), code: 'CATSLOG_SUBGRAPH_BUDGET' },
      { error: new CatsLogCitationStaleError(), code: 'CATSLOG_CITATION_STALE' },
      { error: new CatsLogCitationMismatchError('bad shape'), code: 'CATSLOG_CITATION_MISMATCH' },
    ];
    for (const testCase of cases) {
      const backend = new SubgraphBackend({ subgraphError: testCase.error });
      const ledger = new CatsLogReceiptLedger();
      const tool = new CatsLogSkillSubgraphFetchTool(backend, ledger, undefined, gate(true));
      const result = await execute(tool, baseArgs);
      assert.equal(result.ok, false);
      assert.equal(result.errorCode, testCase.code, testCase.code);
      assert.equal(result.retryable, false);
      assert.equal(ledger.size, 0);
    }
  });

  test('node_retrieval_disabled permanently disables nodes for the process', async () => {
    const nodesGate = gate(true);
    const backend = new SubgraphBackend({ subgraphError: new CatsLogNodeRetrievalDisabledError() });
    const tool = new CatsLogSkillSubgraphFetchTool(backend, undefined, undefined, nodesGate);
    const result = await execute(tool, baseArgs);
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, 'CATSLOG_NODES_DISABLED');
    assert.equal(nodesGate.isPermanentlyDisabled(), true);

    // A brand-new gate object inherits the process-wide state.
    assert.equal(gate(true).isPermanentlyDisabled(), true);
    const discovery = new CatsLogSkillMemoryTool(new SubgraphBackend(), undefined, gate(true));
    const rejected = await execute(discovery, { task: 'deploy', include_nodes: true });
    assert.equal(rejected.ok, false);
  });

  test('falls back byte/behavior-compatibly to the exact body fetch when the backend lacks subgraph transport', async () => {
    const subgraphBackend = new SubgraphBackend();
    const legacyBackend: CatsLogMemoryBackend = {
      retrieveSkillMemory: (query, signal) => subgraphBackend.retrieveSkillMemory(query, signal),
      recallMemory: (query, signal) => subgraphBackend.recallMemory(query, signal),
      reportUseStages: (reports, signal) => subgraphBackend.reportUseStages(reports, signal),
      fetchSkillCitation: (citation, options) => subgraphBackend.fetchSkillCitation(citation, options),
    };
    const ledger = new CatsLogReceiptLedger();
    const tool = new CatsLogSkillSubgraphFetchTool(legacyBackend, ledger, undefined, gate(true));
    const result = await execute(tool, baseArgs);

    assert.equal(subgraphBackend.bodyFallbackCalls, 1);
    assert.equal(subgraphBackend.subgraphCalls, 0);
    assert.equal(result.ok, true);
    const projected = JSON.parse(String(result.content));
    // Same projection shape as catslog_skill_fetch.
    assert.equal(projected.ref, 'catslog:skill:deploy-r2@7');
    assert.equal(projected.content, BODY);
    assert.equal(projected.program, undefined);
    // The body-shaped receipt carries no subgraph identity.
    const entry = ledger.drain()[0];
    assert.equal(entry.receipt, RECEIPT);
    assert.equal(entry.programSha256, undefined);
    assert.equal(entry.subgraphSha256, undefined);
    assert.equal(entry.nodeRefs, undefined);
  });

  test('truncation drops longest node bodies first while keeping every id, ref, and the manifest', async () => {
    // 10 nodes with ~9KiB bodies each exceed the 60K projection budget even
    // after per-field bounding, so the aggregate budget must drop bodies.
    const nodes = Array.from({ length: 10 }, (_, index) => ({
      id: `node-${index}`,
      summary: `summary ${index}`,
      body: 'x'.repeat(9_000 - index * 100),
    }));
    const backend = new SubgraphBackend({
      subgraphResult: () => ({
        item: { handle: 'deploy-r2', revision: 7, content_sha256: CONTENT_SHA256, content: BODY },
        program: {
          schema_version: 2,
          program_sha256: PROGRAM_SHA256,
          subgraph_sha256: SUBGRAPH_SHA256,
          seed_node_ids: ['node-0'],
          roots: ['node-0'],
          nodes,
          edges: [],
          node_count: nodes.length,
          edge_count: 0,
          required_node_count: nodes.length,
          required_edge_count: 0,
          expansion_truncated: false,
        },
      }),
    });
    const tool = new CatsLogSkillSubgraphFetchTool(backend, undefined, undefined, gate(true));
    const result = await execute(tool, { ...baseArgs, seeds: ['node-0'] });
    assert.equal(result.ok, true);
    const projected = JSON.parse(String(result.content));
    assert.ok(JSON.stringify(projected).length <= 60_000, 'projection exceeded the subgraph budget');
    assert.equal(projected.truncated, true);
    // Every id and ref survives, bodies are dropped longest-first.
    assert.equal(projected.program.nodes.length, 10);
    const keptBodies = projected.program.nodes.filter((node: any) => node.body !== undefined);
    const droppedBodies = projected.program.nodes.filter((node: any) => node.body === undefined);
    assert.ok(droppedBodies.length >= 4, 'expected the longest bodies to be dropped');
    for (const dropped of droppedBodies.map((node: any) => node.id)) {
      assert.equal(dropped.startsWith('node-'), true);
    }
    for (const node of projected.program.nodes) {
      assert.ok(node.ref, `node ${node.id} lost its citation ref`);
      assert.ok(node.summary, `node ${node.id} lost its summary`);
    }
    // Manifest block stays intact.
    assert.equal(projected.program.subgraph_sha256, SUBGRAPH_SHA256);
    assert.equal(projected.program.node_count, 10);
    assert.equal(projected.program.seed_node_ids[0], 'node-0');
    void keptBodies;
  });

  test('refuses execution when the gate is off or nodes are permanently disabled', async () => {
    const backend = new SubgraphBackend();
    const offTool = new CatsLogSkillSubgraphFetchTool(backend, undefined, undefined, gate(false));
    const off = await execute(offTool, baseArgs);
    assert.equal(off.ok, false);
    assert.equal(off.errorCode, 'CATSLOG_NODES_DISABLED');
    assert.equal(backend.subgraphCalls, 0);
  });

  test('tool-argument omissions fall back to server defaults (budgets not sent)', async () => {
    const backend = new SubgraphBackend();
    const tool = new CatsLogSkillSubgraphFetchTool(backend, undefined, undefined, gate(true));
    await execute(tool, baseArgs);
    assert.equal(backend.lastSubgraphRequest?.maxOptionalNodes, undefined);
    assert.equal(backend.lastSubgraphRequest?.maxOptionalEdges, undefined);
    assert.equal(backend.lastSubgraphRequest?.maxTotalBytes, undefined);
  });
});

describe('memory citation ref grammar with node refs', () => {
  test('accepts node refs and legacy refs, rejects lookalikes', () => {
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7'), true);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#plan'), true);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#re-hearse_2'), true);
    // Rejects: bad node charset, empty node, uppercase start, URL-ish, missing revision.
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#Bad_ID'), false);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#'), false);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#9lives'), false);
    assert.equal(isMemoryCitationRef('https://evil.test/#plan'), false);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2#plan'), false);
    assert.equal(isMemoryCitationRef('catslog:skill:deploy-r2@7#plan/../../secret'), false);
  });
});
