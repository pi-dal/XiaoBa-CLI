import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CatscoLogAgentClient,
  CatscoSkillFetchResponse,
  CatscoUseStageReport,
} from '../src/utils/catsco-log-agent-client';
import {
  CatsLogCitationMismatchError,
  CatsLogCitationStaleError,
  CatsLogMemoryProvider,
} from '../src/utils/catslog-memory-provider';
import {
  CatsLogReceiptEntry,
  CatsLogReceiptLedger,
  MAX_CATSLOG_RECEIPT_ENTRIES,
} from '../src/utils/catslog-receipt-ledger';
import { CatsLogUseStageReporter } from '../src/utils/catslog-use-stage-reporter';
import { Logger } from '../src/utils/logger';
import { getCatscoLogAgentConfig } from '../src/utils/catsco-log-agent-config';

const EXACT_BODY = 'exact untrusted body for citation v3';
const EXACT_SHA256 = crypto.createHash('sha256').update(EXACT_BODY, 'utf8').digest('hex');

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  signal?: AbortSignal;
}

function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function fetchItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'version-1',
    handle: 'release-playbook',
    revision: 3,
    content_sha256: EXACT_SHA256,
    content: EXACT_BODY,
    retrieval_receipt: 'opaque-one-time-receipt',
    score: 0,
    evidence_count: 0,
    dependency_count: 0,
    outcome: {},
    ...overrides,
  };
}

describe('CatscoLogAgentClient.fetchSkillCitation request shape', () => {
  const originalFetch = globalThis.fetch;
  let requests: RecordedRequest[] = [];

  beforeEach(() => {
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(response: () => Response): void {
    globalThis.fetch = (async (url: any, init: any) => {
      requests.push({
        url: String(url),
        method: init?.method,
        headers: init?.headers || {},
        body: init?.body ? JSON.parse(init.body) : undefined,
        signal: init?.signal,
      });
      return response();
    }) as any;
  }

  test('posts handle, revision and content_sha256 to the exact-fetch endpoint', async () => {
    stubFetch(() => jsonResponse(200, {
      schema_version: 1,
      content_trust: 'untrusted_runtime_memory',
      catalog_revision: 9,
      item: fetchItem(),
    }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    const controller = new AbortController();
    const response = await client.fetchSkillCitation({
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256,
      token: 'skill-token-1',
      signal: controller.signal,
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://logs.example.test/catsco/agent/context/v1/fetch');
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].headers['Authorization'], 'Bearer skill-token-1');
    assert.equal(requests[0].headers['Content-Type'], 'application/json');
    // The request carries the exact citation and nothing else: no task, no
    // UID/scope selector, no receipt echo.
    assert.deepEqual(requests[0].body, {
      handle: 'release-playbook',
      revision: 3,
      content_sha256: EXACT_SHA256,
    });
    assert.equal(requests[0].signal, controller.signal);
    assert.equal(response.item?.handle, 'release-playbook');
    assert.equal(response.item?.revision, 3);
    assert.equal(response.item?.retrieval_receipt, 'opaque-one-time-receipt');
  });

  test('sends citation fields verbatim; normalization is the provider layer', async () => {
    stubFetch(() => jsonResponse(200, { item: fetchItem() }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    await client.fetchSkillCitation({
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256.toUpperCase(),
      token: 'skill-token-1',
    });
    assert.equal(requests[0].body.content_sha256, EXACT_SHA256.toUpperCase());
  });

  test('sends selection-episode route telemetry with hop 0 and never an edge key', async () => {
    stubFetch(() => jsonResponse(200, { item: fetchItem() }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    await client.fetchSkillCitation({
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256,
      token: 'skill-token-1',
      routeId: 'sel-episode-1',
      hop: 0,
    });
    assert.deepEqual(requests[0].body, {
      handle: 'release-playbook',
      revision: 3,
      content_sha256: EXACT_SHA256,
      route_id: 'sel-episode-1',
      hop: 0,
    });
    assert.equal('edge_key' in requests[0].body, false);
  });

  test('surfaces the 409 citation_stale status to the provider', async () => {
    stubFetch(() => jsonResponse(409, { error: 'citation_stale' }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    await assert.rejects(
      client.fetchSkillCitation({
        handle: 'release-playbook',
        revision: 3,
        contentSha256: EXACT_SHA256,
        token: 'skill-token-1',
      }),
      (error: any) => error.status === 409,
    );
  });
});

describe('CatscoLogAgentClient.reportUseStages request shape', () => {
  const originalFetch = globalThis.fetch;
  let requests: RecordedRequest[] = [];

  beforeEach(() => {
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function stubFetch(response: () => Response): void {
    globalThis.fetch = (async (url: any, init: any) => {
      requests.push({
        url: String(url),
        method: init?.method,
        headers: init?.headers || {},
        body: init?.body ? JSON.parse(init.body) : undefined,
        signal: init?.signal,
      });
      return response();
    }) as any;
  }

  test('posts at most the contract fields to the use-stages endpoint', async () => {
    stubFetch(() => jsonResponse(200, { results: [{ recorded: true, idempotent: false }] }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    const response = await client.reportUseStages({
      token: 'skill-token-1',
      stages: [{
        handle: 'release-playbook',
        revision: 3,
        content_sha256: EXACT_SHA256,
        retrieval_receipt: 'opaque-one-time-receipt',
        stage: 'selected',
        disposition: 'published',
        route_id: 'route-branch',
        hop: 1,
        edge_key: 'item-abc',
      }],
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://logs.example.test/catsco/agent/memory/use-stages');
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].headers['Authorization'], 'Bearer skill-token-1');
    // The wire shape is exactly the server contract: identity + receipt +
    // stage + disposition + optional frozen route. No outcome field, no
    // UID/scope/session selector, no verdict.
    assert.deepEqual(requests[0].body, {
      stages: [{
        handle: 'release-playbook',
        revision: 3,
        content_sha256: EXACT_SHA256,
        retrieval_receipt: 'opaque-one-time-receipt',
        stage: 'selected',
        disposition: 'published',
        route_id: 'route-branch',
        hop: 1,
        edge_key: 'item-abc',
      }],
    });
    assert.deepEqual(response.results, [{ recorded: true, idempotent: false }]);
  });

  test('omits route fields entirely when the report has no frozen tuple', async () => {
    stubFetch(() => jsonResponse(200, { results: [{ recorded: true }] }));
    const client = new CatscoLogAgentClient('https://logs.example.test');
    await client.reportUseStages({
      token: 'skill-token-1',
      stages: [{
        handle: 'release-playbook',
        revision: 3,
        content_sha256: EXACT_SHA256,
        retrieval_receipt: 'r',
        stage: 'fetched_not_consumed',
        disposition: 'cancelled',
      }],
    });
    const report = requests[0].body.stages[0];
    assert.equal('route_id' in report, false);
    assert.equal('hop' in report, false);
    assert.equal('edge_key' in report, false);
  });
});

describe('CatsLogMemoryProvider.fetchSkillCitation', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-catslog-fetch-'));
    env = {
      CATSCO_LOG_API_BASE_URL: 'https://logs.example.test',
      CATSCO_USER_TOKEN: 'catscompany-user-token',
      DOTENV_CONFIG_PATH: path.join(root, 'missing.env'),
      XIAOBA_USER_DATA_DIR: root,
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
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
      issued_at: '2026-08-28T00:00:00.000Z',
      expires_at: '2099-08-28T00:00:00.000Z',
      skill_token_id: `${skillToken}-id`,
      skill_token: skillToken,
      skill_token_expires_at: '2099-08-28T00:00:00.000Z',
      memory_url: '/catsco/agent/memory/retrieve',
      memory_recall_url: '/catsco/agent/memory/recall',
    };
  }

  interface FakeCall {
    kind: 'bootstrap' | 'fetch' | 'retrieve' | 'recall' | 'outcome' | 'use-stages';
    token?: string;
    citation?: Record<string, unknown>;
    routeId?: string;
    hop?: number;
    stages?: readonly unknown[];
    signal?: AbortSignal;
  }

  function fakeFetchClient(options: {
    calls: FakeCall[];
    onFetch?: (call: FakeCall, index: number) => Promise<CatscoSkillFetchResponse> | never;
    onReport?: (call: FakeCall, index: number) => Promise<{ results?: unknown[] }> | never;
  }): CatscoLogAgentClient {
    let fetchCount = 0;
    let reportCount = 0;
    const client: Partial<CatscoLogAgentClient> = {
      bootstrap: async () => {
        options.calls.push({ kind: 'bootstrap' });
        return bootstrapResponse(`skill-token-${options.calls.filter(call => call.kind === 'bootstrap').length}`);
      },
      fetchSkillCitation: async (input: any) => {
        fetchCount++;
        const call: FakeCall = {
          kind: 'fetch',
          token: input.token,
          citation: {
            handle: input.handle,
            revision: input.revision,
            content_sha256: input.contentSha256,
          },
          routeId: input.routeId,
          hop: input.hop,
          signal: input.signal,
        };
        options.calls.push(call);
        return options.onFetch?.(call, fetchCount) as Promise<CatscoSkillFetchResponse>;
      },
      reportUseStages: async (input: any) => {
        reportCount++;
        const call: FakeCall = {
          kind: 'use-stages',
          token: input.token,
          stages: input.stages,
          signal: input.signal,
        };
        options.calls.push(call);
        return options.onReport
          ? options.onReport(call, reportCount) as Promise<{ results?: unknown[] }>
          : { results: input.stages.map(() => ({ recorded: true })) };
      },
    };
    return client as CatscoLogAgentClient;
  }

  function providerFor(client: CatscoLogAgentClient): CatsLogMemoryProvider {
    return new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });
  }

  test('returns the exact cited body, captures the receipt privately, and strips it from the result', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => ({
        schema_version: 1,
        content_trust: 'untrusted_runtime_memory',
        catalog_revision: 9,
        item: fetchItem() as any,
      }),
    }));
    const captured: CatsLogReceiptEntry[] = [];

    const result = await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { onReceipt: entry => captured.push(entry) },
    );

    assert.deepEqual(calls[1].citation, {
      handle: 'release-playbook',
      revision: 3,
      content_sha256: EXACT_SHA256,
    });
    assert.equal(calls[1].token, 'skill-token-1');
    assert.equal(result.item.content, EXACT_BODY);
    assert.equal(result.catalogRevision, 9);
    assert.equal(result.contentTrust, 'untrusted_runtime_memory');
    assert.equal('retrieval_receipt' in result.item, false);
    assert.deepEqual(captured, [{
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256,
      receipt: 'opaque-one-time-receipt',
      issuedAt: captured[0].issuedAt,
    }]);
    assert.ok(captured[0].issuedAt);
  });

  test('captures the frozen per-item route tuple with the receipt and strips it from the result', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => ({
        item: fetchItem({ route: { route_id: 'route-1', hop: 2, edge_key: 'item-abc123' } }) as any,
      }),
    }));
    const captured: CatsLogReceiptEntry[] = [];
    await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { onReceipt: entry => captured.push(entry) },
    );
    assert.deepEqual(captured[0].route, { routeId: 'route-1', hop: 2, edgeKey: 'item-abc123' });
    const resultItem = captured[0];
    assert.equal('retrieval_receipt' in resultItem, false);
  });

  test('omits a malformed route tuple instead of sending it', async () => {
    for (const brokenRoute of [
      { hop: 1, edge_key: 'item-x' },
      { route_id: 'route-1', hop: 5, edge_key: 'item-x' },
      { route_id: 'route-1' },
      { route_id: 'route-1', hop: 1, edge_key: 'item-x', extra: true },
      'not-an-object',
    ]) {
      const provider = providerFor(fakeFetchClient({
        calls: [],
        onFetch: () => ({ item: fetchItem({ route: brokenRoute }) as any }),
      }));
      const captured: CatsLogReceiptEntry[] = [];
      await provider.fetchSkillCitation(
        { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
        { onReceipt: entry => captured.push(entry) },
      );
      assert.equal('route' in captured[0], false, `route should be omitted for ${JSON.stringify(brokenRoute)}`);
    }
  });

  test('forwards selection-episode route telemetry to the exact fetch', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => ({ item: fetchItem() as any }),
    }));
    const captured: CatsLogReceiptEntry[] = [];
    const telemetry = { routeId: 'sel-episode-7', hop: 0 as const };

    const result = await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { routeTelemetry: telemetry, onReceipt: entry => captured.push(entry) },
    );

    assert.equal(result.item.handle, 'release-playbook');
    assert.equal(calls[1].routeId, 'sel-episode-7');
    assert.equal(calls[1].hop, 0);
    // The provider treats the telemetry as read-only caller input.
    assert.deepEqual(telemetry, { routeId: 'sel-episode-7', hop: 0 });
    assert.equal(captured.length, 1);
  });

  test('omits invalid route telemetry instead of sending it', async () => {
    for (const broken of [
      undefined,
      { routeId: '', hop: 0 as const },
      { routeId: '   ', hop: 0 as const },
      { routeId: 'r'.repeat(129), hop: 0 as const },
      { routeId: 'sel-1', hop: 1 as const },
      { routeId: 'sel-1', hop: 2 as const },
      'not-an-object',
    ] as any[]) {
      const calls: FakeCall[] = [];
      const provider = providerFor(fakeFetchClient({
        calls,
        onFetch: () => ({ item: fetchItem() as any }),
      }));
      await provider.fetchSkillCitation(
        { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
        { routeTelemetry: broken },
      );
      // Later iterations reuse the capability cached on disk, so the fetch
      // call is not always at index 1.
      const fetchCalls = calls.filter(call => call.kind === 'fetch');
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].routeId, undefined, `route should be omitted for ${JSON.stringify(broken)}`);
      assert.equal(fetchCalls[0].hop, undefined, `hop should be omitted for ${JSON.stringify(broken)}`);
    }
  });

  test('preserves the route telemetry verbatim across the 401 capability refresh retry', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: (_call, index) => {
        if (index === 1) {
          const error: any = new Error('unauthorized');
          error.status = 401;
          throw error;
        }
        return { item: fetchItem() as any };
      },
    }));

    const result = await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { routeTelemetry: { routeId: 'sel-episode-9', hop: 0 } },
    );

    assert.equal(result.item.handle, 'release-playbook');
    assert.deepEqual(calls.map(call => call.kind), ['bootstrap', 'fetch', 'bootstrap', 'fetch']);
    // The retried request is the same episode: same telemetry, refreshed token.
    assert.equal(calls[1].routeId, 'sel-episode-9');
    assert.equal(calls[3].routeId, 'sel-episode-9');
    assert.equal(calls[1].hop, 0);
    assert.equal(calls[3].hop, 0);
    assert.equal(calls[1].token, 'skill-token-1');
    assert.equal(calls[3].token, 'skill-token-2');
  });

  test('a stale citation still carries the telemetry but captures no receipt and stays retryable', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => {
        const error: any = new Error('citation_stale');
        error.status = 409;
        throw error;
      },
    }));
    const captured: CatsLogReceiptEntry[] = [];

    await assert.rejects(
      provider.fetchSkillCitation(
        { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
        { routeTelemetry: { routeId: 'sel-episode-11', hop: 0 }, onReceipt: entry => captured.push(entry) },
      ),
      (error: any) => error instanceof CatsLogCitationStaleError,
    );
    // The one fetch attempt carried the client-owned label; the server's
    // 409 rejected the citation, not the telemetry, and nothing was recorded.
    assert.equal(calls[1].routeId, 'sel-episode-11');
    assert.equal(calls[1].hop, 0);
    assert.deepEqual(captured, []);
    assert.deepEqual(calls.map(call => call.kind).filter(kind => kind !== 'bootstrap'), ['fetch']);
  });

  test('drops the receipt silently when no sink is provided', async () => {
    const provider = providerFor(fakeFetchClient({
      calls: [],
      onFetch: () => ({ item: fetchItem() as any }),
    }));
    const result = await provider.fetchSkillCitation({
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256,
    });
    assert.equal('retrieval_receipt' in result.item, false);
  });

  test('still delivers the body when a sink is provided and the receipt is valid', async () => {
    // Guard against over-blocking: fail-closed applies to missing receipts
    // only, never to a well-formed response.
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => ({ item: fetchItem() as any }),
    }));
    const captured: CatsLogReceiptEntry[] = [];
    const result = await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { onReceipt: entry => captured.push(entry) },
    );
    assert.equal(result.item.content, EXACT_BODY);
    assert.equal(captured.length, 1);
  });

  test('maps 409 to CatsLogCitationStaleError and never falls back to a handle read', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => {
        const error: any = new Error('CatsLog Skill citation fetch failed: citation_stale');
        error.status = 409;
        throw error;
      },
    }));
    const captured: CatsLogReceiptEntry[] = [];

    await assert.rejects(
      provider.fetchSkillCitation(
        { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
        { onReceipt: entry => captured.push(entry) },
      ),
      (error: any) => error instanceof CatsLogCitationStaleError && error.code === 'CATSLOG_CITATION_STALE',
    );
    // Exactly one network attempt: a stale citation must trigger a fresh
    // metadata query upstream, never a handle-only retry.
    assert.deepEqual(calls.map(call => call.kind), ['bootstrap', 'fetch']);
    assert.deepEqual(captured, []);
  });

  test('fails closed on identity mismatches without routing any receipt', async () => {
    const mismatchCases: Array<[string, Record<string, unknown>]> = [
      ['handle', fetchItem({ handle: 'other-skill' })],
      ['revision', fetchItem({ revision: 4 })],
      ['content_sha256', fetchItem({ content_sha256: 'a'.repeat(64) })],
      ['body hash', fetchItem({ content: 'different body bytes' })],
      ['missing item', {}],
      ['empty body', fetchItem({ content: '' })],
      // A 200 without a nonempty one-time receipt is a contract violation:
      // the body must not be delivered unattributably.
      ['absent receipt key', fetchItem({ retrieval_receipt: undefined })],
      ['empty receipt', fetchItem({ retrieval_receipt: '' })],
      ['whitespace receipt', fetchItem({ retrieval_receipt: '   ' })],
    ];
    for (const [label, item] of mismatchCases) {
      const calls: FakeCall[] = [];
      const provider = providerFor(fakeFetchClient({
        calls,
        onFetch: () => ({ item: item as any }),
      }));
      const captured: CatsLogReceiptEntry[] = [];
      await assert.rejects(
        provider.fetchSkillCitation(
          { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
          { onReceipt: entry => captured.push(entry) },
        ),
        (error: any) => error instanceof CatsLogCitationMismatchError && error.code === 'CATSLOG_CITATION_MISMATCH',
        `expected mismatch failure for case: ${label}`,
      );
      assert.deepEqual(captured, [], `no receipt may be captured for case: ${label}`);
      // Only bootstrap + exact fetch happen; a capability cached on disk from
      // an earlier case skips the bootstrap, but nothing else may appear.
      assert.deepEqual(
        calls.map(call => call.kind).filter(kind => kind !== 'bootstrap'),
        ['fetch'],
        `unexpected calls for case: ${label}`,
      );
    }
  });

  test('rejects malformed citations before any network call', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({ calls }));
    for (const citation of [
      { handle: '', revision: 3, contentSha256: EXACT_SHA256 },
      { handle: 'release-playbook', revision: 0, contentSha256: EXACT_SHA256 },
      { handle: 'release-playbook', revision: 3, contentSha256: 'not-a-hash' },
    ]) {
      await assert.rejects(
        provider.fetchSkillCitation(citation as any),
        (error: any) => error instanceof CatsLogCitationMismatchError,
      );
    }
    assert.deepEqual(calls, []);
  });

  test('refreshes the capability once on 401 and retries the exact fetch', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: (_call, index) => {
        if (index === 1) {
          const error: any = new Error('unauthorized');
          error.status = 401;
          throw error;
        }
        return { item: fetchItem() as any };
      },
    }));

    const result = await provider.fetchSkillCitation({
      handle: 'release-playbook',
      revision: 3,
      contentSha256: EXACT_SHA256,
    });

    assert.equal(result.item.handle, 'release-playbook');
    assert.deepEqual(calls.map(call => call.kind), ['bootstrap', 'fetch', 'bootstrap', 'fetch']);
    assert.equal(calls[1].token, 'skill-token-1');
    assert.equal(calls[3].token, 'skill-token-2');
  });

  test('propagates the caller AbortSignal and never issues outcome calls', async () => {
    const calls: FakeCall[] = [];
    const provider = providerFor(fakeFetchClient({
      calls,
      onFetch: () => ({ item: fetchItem() as any }),
    }));
    const controller = new AbortController();
    await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      { signal: controller.signal },
    );

    // The caller's signal reaches the client untouched.
    assert.equal(calls[1].signal, controller.signal);
    // Zero outcome side effects in this phase: the whole flow is
    // bootstrap + exact fetch, nothing else.
    assert.deepEqual(calls.map(call => call.kind), ['bootstrap', 'fetch']);
  });

  test('rejects when the signal is already aborted', async () => {
    // Native fetch rejects an aborted signal; the fake mirrors that contract.
    const client: Partial<CatscoLogAgentClient> = {
      bootstrap: async () => bootstrapResponse('skill-token-1'),
      fetchSkillCitation: async (input: any) => {
        if (input.signal?.aborted) {
          const error: any = new Error('This operation was aborted');
          error.name = 'AbortError';
          throw error;
        }
        return { item: fetchItem() as any };
      },
    };
    const provider = new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client as CatscoLogAgentClient,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      provider.fetchSkillCitation(
        { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
        { signal: controller.signal },
      ),
      (error: any) => error?.name === 'AbortError' || /abort/i.test(String(error?.message)),
    );
  });
  describe('reportUseStages', () => {
  function reportFor(client: CatscoLogAgentClient): CatsLogMemoryProvider {
    return new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });
  }

  function sampleReports(): CatscoUseStageReport[] {
    return [{
      handle: 'release-playbook',
      revision: 3,
      content_sha256: EXACT_SHA256,
      retrieval_receipt: 'opaque-one-time-receipt',
      stage: 'selected',
      disposition: 'published',
    }];
  }

  test('reports through the device skill capability, never the upload token', async () => {
    const calls: FakeCall[] = [];
    const provider = reportFor(fakeFetchClient({ calls }));
    await provider.reportUseStages(sampleReports());

    const reportCalls = calls.filter(call => call.kind === 'use-stages');
    assert.equal(reportCalls.length, 1);
    assert.equal(reportCalls[0].token, 'skill-token-1');
    assert.deepEqual(calls.filter(call => call.kind === 'bootstrap').length, 1);
    assert.deepEqual(reportCalls[0].stages, sampleReports());
  });

  test('refreshes the capability exactly once on 401 and retries the batch', async () => {
    const calls: FakeCall[] = [];
    const provider = reportFor(fakeFetchClient({
      calls,
      onReport: (_call, index) => {
        if (index === 1) {
          const error: any = new Error('CatsLog use-stage report failed: unauthorized');
          error.status = 401;
          throw error;
        }
        return { results: [{ recorded: true }] };
      },
    }));
    await provider.reportUseStages(sampleReports());

    const reportCalls = calls.filter(call => call.kind === 'use-stages');
    assert.equal(reportCalls.length, 2);
    assert.equal(reportCalls[0].token, 'skill-token-1');
    assert.equal(reportCalls[1].token, 'skill-token-2');
    // Exactly one refresh; the same payload is retried verbatim (safe through
    // server idempotency), and the device identity is preserved.
    assert.equal(calls.filter(call => call.kind === 'bootstrap').length, 2);
    assert.deepEqual(reportCalls[1].stages, sampleReports());
  });

  test('does not retry on non-401 failures', async () => {
    const calls: FakeCall[] = [];
    const provider = reportFor(fakeFetchClient({
      calls,
      onReport: () => {
        const error: any = new Error('CatsLog use-stage report failed: receipt_conflict');
        error.status = 409;
        throw error;
      },
    }));
    await assert.rejects(
      provider.reportUseStages(sampleReports()),
      (error: any) => error.status === 409,
    );
    assert.equal(calls.filter(call => call.kind === 'use-stages').length, 1);
    assert.equal(calls.filter(call => call.kind === 'bootstrap').length, 1);
  });

  test('never issues outcome calls from the reporting path', async () => {
    const calls: FakeCall[] = [];
    const provider = reportFor(fakeFetchClient({ calls }));
    await provider.reportUseStages(sampleReports());
    assert.deepEqual(
      calls.map(call => call.kind).filter(kind => kind !== 'bootstrap'),
      ['use-stages'],
    );
  });
  });
});

describe('CatsLogReceiptLedger bounds and lifecycle', () => {
  test('records entries, drains exactly once, and clears', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record({ handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't1' });
    ledger.record({ handle: 'h', revision: 2, contentSha256: 'b'.repeat(64), receipt: 'r2', issuedAt: 't2' });
    assert.equal(ledger.size, 2);

    assert.deepEqual(ledger.drain().map(entry => entry.receipt), ['r1', 'r2']);
    assert.equal(ledger.size, 0);
    assert.deepEqual(ledger.drain(), []);

    ledger.record({ handle: 'h', revision: 3, contentSha256: 'c'.repeat(64), receipt: 'r3', issuedAt: 't3' });
    ledger.clear();
    assert.equal(ledger.size, 0);
  });

  test('preserves the frozen route tuple through record and never aliases the caller object', () => {
    const ledger = new CatsLogReceiptLedger();
    const route = { routeId: 'route-branch', hop: 1, edgeKey: 'item-9f2c1e77a1b04d5e' };
    ledger.record({ handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't', route });
    // The ledger is the retention point: mutating the caller-owned object
    // after record() must not rewrite the stored history.
    route.routeId = 'mutated-after-record';
    route.edgeKey = 'mutated-after-record';
    const [entry] = ledger.drain();
    assert.deepEqual(entry.route, { routeId: 'route-branch', hop: 1, edgeKey: 'item-9f2c1e77a1b04d5e' });
  });

  test('omits a route tuple that fails the server bounds instead of storing it', () => {
    const ledger = new CatsLogReceiptLedger();
    for (const broken of [
      { routeId: '', hop: 1, edgeKey: 'item-x' },
      { routeId: 'route', hop: 2.5, edgeKey: 'item-x' },
      { routeId: 'route', hop: 3, edgeKey: 'item-x' },
      { routeId: 'route', hop: 1, edgeKey: '   ' },
      undefined,
    ]) {
      ledger.record({
        handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: `r-${JSON.stringify(broken)}`, issuedAt: 't',
        ...(broken === undefined ? {} : { route: broken }),
      } as CatsLogReceiptEntry);
    }
    assert.equal(ledger.drain().every(entry => entry.route === undefined), true);
  });

  test('is bounded with FIFO eviction and ignores empty receipts', () => {
    const ledger = new CatsLogReceiptLedger();
    for (let index = 0; index < MAX_CATSLOG_RECEIPT_ENTRIES + 4; index++) {
      ledger.record({
        handle: 'h',
        revision: index + 1,
        contentSha256: 'a'.repeat(64),
        receipt: `receipt-${index}`,
        issuedAt: 't',
      });
    }
    assert.equal(ledger.size, MAX_CATSLOG_RECEIPT_ENTRIES);
    const drained = ledger.drain();
    assert.equal(drained[0].receipt, 'receipt-4');
    assert.equal(drained[drained.length - 1].receipt, `receipt-${MAX_CATSLOG_RECEIPT_ENTRIES + 3}`);
    // Every evicted entry is counted, so the overflow never disappears silently.
    assert.equal(ledger.droppedFifoOverflow, 4);

    ledger.record({ handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: '   ', issuedAt: 't' });
    assert.equal(ledger.size, 0);
    // clear() resets both the entries and the overflow counter for a new run.
    ledger.clear();
    assert.equal(ledger.droppedFifoOverflow, 0);
  });

  test('markConsumedForToolCallIds promotes only exact fetched toolUseId matches', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(
      { handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' },
      { toolUseId: 'call-1', ref: 'catslog:skill:h@1' },
    );
    ledger.record(
      { handle: 'h', revision: 2, contentSha256: 'b'.repeat(64), receipt: 'r2', issuedAt: 't' },
      { toolUseId: 'call-2', ref: 'catslog:skill:h@2' },
    );

    // Unknown ids change nothing.
    ledger.markConsumedForToolCallIds(new Set(['call-9x']));
    assert.deepEqual(ledger.drain().map(entry => entry.stage), ['fetched', 'fetched']);

    ledger.record(
      { handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' },
      { toolUseId: 'call-1', ref: 'catslog:skill:h@1' },
    );
    ledger.record(
      { handle: 'h', revision: 2, contentSha256: 'b'.repeat(64), receipt: 'r2', issuedAt: 't' },
      { toolUseId: 'call-2', ref: 'catslog:skill:h@2' },
    );
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    const [first, second] = ledger.drain();
    assert.equal(first.stage, 'consumed');
    assert.equal(second.stage, 'fetched');
  });

  test('consumption transitions are at-most-once and cannot regress', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(
      { handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' },
      { toolUseId: 'call-1', ref: 'catslog:skill:h@1' },
    );
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    // A replayed request scan must not move the stage again or corrupt it.
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    ledger.markSelectedForRefs(['catslog:skill:h@1']);
    // A later scan cannot drag a selected entry back to consumed.
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    assert.equal(ledger.drain()[0].stage, 'selected');
  });

  test('entries without a toolUseId can never be marked consumed', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record({ handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' });
    ledger.markConsumedForToolCallIds(new Set(['call-1', 'call-2']));
    assert.equal(ledger.drain()[0].stage, 'fetched');
  });

  test('markSelectedForRefs promotes only consumed entries cited by exact ref', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(
      { handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' },
      { toolUseId: 'call-1', ref: 'catslog:skill:h@1' },
    );
    ledger.record(
      { handle: 'h', revision: 2, contentSha256: 'b'.repeat(64), receipt: 'r2', issuedAt: 't' },
      { toolUseId: 'call-2', ref: 'catslog:skill:h@2' },
    );

    // Citing before consumption is neutral: fetched entries stay fetched —
    // selection requires the body to have actually reached the model.
    ledger.markSelectedForRefs(['catslog:skill:h@1', 'catslog:skill:unrelated@7']);
    assert.deepEqual(ledger.drain().map(entry => entry.stage), ['fetched', 'fetched']);

    ledger.record(
      { handle: 'h', revision: 1, contentSha256: 'a'.repeat(64), receipt: 'r1', issuedAt: 't' },
      { toolUseId: 'call-1', ref: 'catslog:skill:h@1' },
    );
    ledger.record(
      { handle: 'h', revision: 2, contentSha256: 'b'.repeat(64), receipt: 'r2', issuedAt: 't' },
      { toolUseId: 'call-2', ref: 'catslog:skill:h@2' },
    );
    ledger.markConsumedForToolCallIds(new Set(['call-1', 'call-2']));
    ledger.markSelectedForRefs(['catslog:skill:h@1']);
    const [selected, neutral] = ledger.drain();
    assert.equal(selected.stage, 'selected');
    // Non-selection is deliberately neutral: consumed stays consumed (telemetry).
    assert.equal(neutral.stage, 'consumed');
  });
});

/**
 * Full production-path regression for the frozen-route replay contract
 * (cross-repo review Finding 1/2): the frozen per-item route tuple delivered
 * by the HTTP fetch must survive every hop — provider validation → tool-sink
 * `ledger.record()` → branch lifecycle transitions → `drain()` → reporter →
 * the real `CatscoLogAgentClient.reportUseStages` wire body — with the exact
 * verbatim fields. No helper may bypass `ledger.record()`.
 */
describe('branch use-stage frozen-route replay (full production path)', () => {
  const originalFetch = globalThis.fetch;
  const originalWarning = Logger.warning;
  let root: string;
  let env: NodeJS.ProcessEnv;
  let useStageRequests: Array<{ url: string; headers: Record<string, string>; body: any }>;
  let warnings: string[];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-catslog-route-replay-'));
    env = {
      CATSCO_LOG_API_BASE_URL: 'https://logs.example.test',
      CATSCO_USER_TOKEN: 'catscompany-user-token',
      DOTENV_CONFIG_PATH: path.join(root, 'missing.env'),
      XIAOBA_USER_DATA_DIR: root,
    };
    useStageRequests = [];
    warnings = [];
    (Logger as any).warning = (message: string) => { warnings.push(message); };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (Logger as any).warning = originalWarning;
    fs.rmSync(root, { recursive: true, force: true });
  });

  function bootstrapPayload(skillToken: string) {
    return {
      user_id: 'catsco-123',
      external_provider: 'catsco',
      external_user_id: '123',
      device_id: 'device-stable',
      token_id: 'upload-token-id',
      token: 'upload-token-must-not-be-used-for-memory',
      upload_url: '/catsco/logs/upload',
      issued_at: '2026-08-28T00:00:00.000Z',
      expires_at: '2099-08-28T00:00:00.000Z',
      skill_token_id: `${skillToken}-id`,
      skill_token: skillToken,
      skill_token_expires_at: '2099-08-28T00:00:00.000Z',
      memory_url: '/catsco/agent/memory/retrieve',
      memory_recall_url: '/catsco/agent/memory/recall',
    };
  }

  function stubRouteAwareFetch(frozenEdgeKey: string): void {
    globalThis.fetch = (async (url: any, init: any) => {
      const target = String(url);
      if (target.endsWith('/catsco/agent/bootstrap')) {
        return jsonResponse(200, bootstrapPayload('skill-token-1'));
      }
      if (target.endsWith('/catsco/agent/context/v1/fetch')) {
        // The server freezes the derived per-candidate identity into the
        // delivery, exactly as P13.1 ships it.
        return jsonResponse(200, {
          item: fetchItem({ route: { route_id: 'route-branch', hop: 1, edge_key: frozenEdgeKey } }),
        });
      }
      if (target.endsWith('/catsco/agent/memory/use-stages')) {
        useStageRequests.push({
          url: target,
          headers: init?.headers || {},
          body: init?.body ? JSON.parse(init.body) : undefined,
        });
        return jsonResponse(200, { results: [{ recorded: true, idempotent: false }] });
      }
      throw new Error(`unexpected fetch target: ${target}`);
    }) as any;
  }

  test('provider sink -> ledger.record -> reporter -> reportUseStages replays the frozen route verbatim', async () => {
    // The same derivation the server performs at initial selection
    // (sha256(page edge_key + NUL + version id), first 16 hex bytes).
    const frozenEdgeKey = 'item-'
      + crypto.createHash('sha256').update('page-label\x00version-1', 'utf8').digest('hex').slice(0, 16);
    stubRouteAwareFetch(frozenEdgeKey);

    const client = new CatscoLogAgentClient('https://logs.example.test');
    const provider = new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });
    const ledger = new CatsLogReceiptLedger();
    const citationRef = 'catslog:skill:release-playbook@3';

    const result = await provider.fetchSkillCitation(
      { handle: 'release-playbook', revision: 3, contentSha256: EXACT_SHA256 },
      // The tool surface's exact sink discipline (CatsLogSkillFetchTool):
      // record the validated receipt under the fetch tool-use id and the
      // projected citation ref. No helper bypasses ledger.record().
      { onReceipt: entry => ledger.record(entry, { toolUseId: 'fetch-1', ref: citationRef }) },
    );

    // The receipt never reaches the model-visible result payload.
    assert.equal('retrieval_receipt' in result.item, false);

    // The two branch lifecycle boundaries, exactly as the branch session
    // drives them: consumed at the accepted provider request, selected by the
    // validated finish refs.
    ledger.markConsumedForToolCallIds(new Set(['fetch-1']));
    ledger.markSelectedForRefs([citationRef]);

    const reporter = new CatsLogUseStageReporter(provider);
    reporter.enqueue(ledger.drain(), 'published');
    await reporter.whenIdle();

    // Exactly one use-stage POST, authorized by the device Skill capability,
    // carrying the frozen tuple verbatim on the wire.
    assert.equal(useStageRequests.length, 1);
    assert.equal(useStageRequests[0].url, 'https://logs.example.test/catsco/agent/memory/use-stages');
    assert.equal(useStageRequests[0].headers['Authorization'], 'Bearer skill-token-1');
    assert.deepEqual(useStageRequests[0].body, {
      stages: [{
        handle: 'release-playbook',
        revision: 3,
        content_sha256: EXACT_SHA256,
        retrieval_receipt: 'opaque-one-time-receipt',
        stage: 'selected',
        disposition: 'published',
        route_id: 'route-branch',
        hop: 1,
        edge_key: frozenEdgeKey,
      }],
    });

    // Secrecy: the receipt appears in the request body (transport-only) and
    // nowhere in any warning log.
    assert.equal(useStageRequests[0].body.stages[0].retrieval_receipt, 'opaque-one-time-receipt');
    for (const message of warnings) {
      assert.equal(message.includes('opaque-one-time-receipt'), false, `receipt leaked into a warning: ${message}`);
      assert.equal(message.includes('catslog_smr_'), false, `receipt-shaped material leaked into a warning: ${message}`);
    }
  });
});
