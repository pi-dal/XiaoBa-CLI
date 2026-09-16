import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { startMemorySidecarBranch } from '../src/core/sidecar-memory-branch';
import { InMemorySyntheticObservationQueue } from '../src/core/synthetic-observation';
import { ChatResponse, Message } from '../src/types';
import { ToolCall, ToolDefinition } from '../src/types/tool';
import type {
  CatscoMemoryRecallQuery,
  CatscoMemoryRecallResponse,
  CatscoSkillCitation,
  CatscoSkillMemoryQuery,
  CatscoSkillMemoryResponse,
  CatscoUseStageReport,
} from '../src/utils/catsco-log-agent-client';
import type {
  CatsLogMemoryBackend,
  CatsLogSkillFetchOptions,
  CatsLogSkillFetchResult,
  CatsLogSkillSubgraphFetchOptions,
  CatsLogSkillSubgraphRequest,
  CatsLogSkillSubgraphResult,
} from '../src/utils/catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from '../src/utils/catslog-receipt-ledger';
import type { ObservationBranchRunDisposition } from '../src/core/observation-branch-session';

const usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2 };

const SUBGRAPH_BODY = 'untrusted subgraph body';
const CONTENT_SHA256 = crypto.createHash('sha256').update(SUBGRAPH_BODY, 'utf8').digest('hex');
const PROGRAM_SHA256 = 'a'.repeat(64);
const SUBGRAPH_SHA256 = 'c'.repeat(64);
const RECEIPT = 'branch-private-subgraph-receipt';

function call(id: string, name: string, args: unknown): ToolCall {
  return {
    id,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

function metadataToolResult() {
  return {
    content_trust: 'untrusted_runtime_memory',
    items: [{
      ref: 'catslog:skill:deploy-r2@7',
      handle: 'deploy-r2',
      revision: 7,
      content_sha256: CONTENT_SHA256,
      program_nodes: {
        schema_version: 2,
        program_sha256: PROGRAM_SHA256,
        node_count: 2,
        edge_count: 1,
        roots: ['plan'],
        nodes: [
          { id: 'plan', summary: 'plan the migration' },
          { id: 'freeze', summary: 'freeze writes' },
        ],
        edges: [{ from: 'plan', to: 'freeze', required: true }],
        nodes_truncated: false,
        edges_truncated: false,
      },
    }],
  };
}

/** Drives: node discovery → subgraph fetch → finish citing a node ref. */
class SubgraphBranchAI {
  calls: Message[][] = [];
  toolNames: string[] = [];

  isToolCallingSupported(): boolean {
    return true;
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    this.calls.push(JSON.parse(JSON.stringify(messages)));
    this.toolNames = tools?.map(tool => tool.name) || [];
    const toolMessages = messages.filter(message => message.role === 'tool');
    if (toolMessages.length === 0) {
      return {
        content: null,
        toolCalls: [call('meta-1', 'catslog_skill_memory', { task: 'rclone migration', include_nodes: true })],
        usage,
      };
    }
    if (toolMessages.length === 1) {
      const page = JSON.parse(String(toolMessages[0].content));
      const item = page.items[0];
      return {
        content: null,
        toolCalls: [call('sub-1', 'catslog_skill_subgraph_fetch', {
          handle: item.handle,
          revision: item.revision,
          content_sha256: item.content_sha256,
          program_sha256: item.program_nodes.program_sha256,
          seeds: ['plan'],
        })],
        usage,
      };
    }
    const delivered = JSON.parse(String(toolMessages[toolMessages.length - 1].content));
    const freeze = delivered.program.nodes.find((node: any) => node.id === 'freeze');
    return {
      content: null,
      toolCalls: [call('finish-1', 'finish_memory_search', {
        summary: 'The subgraph delivered the freeze-order context.',
        refs: [freeze.ref],
      })],
      usage,
    };
  }
}

/** Pathologist: subgraph fetch and finish in the SAME assistant block. */
class SameBlockSubgraphFinishAI {
  calls: Message[][] = [];

  isToolCallingSupported(): boolean {
    return true;
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    this.calls.push(JSON.parse(JSON.stringify(messages)));
    void tools;
    if (messages.filter(message => message.role === 'tool').length === 0) {
      return {
        content: null,
        toolCalls: [
          call('sub-1', 'catslog_skill_subgraph_fetch', {
            handle: 'deploy-r2',
            revision: 7,
            content_sha256: CONTENT_SHA256,
            program_sha256: PROGRAM_SHA256,
            seeds: ['plan'],
          }),
          call('finish-1', 'finish_memory_search', {
            summary: 'Citing a node from a subgraph fetched in the same block.',
            refs: ['catslog:skill:deploy-r2@7#freeze'],
          }),
        ],
        usage,
      };
    }
    return { content: 'stray', toolCalls: [], usage };
  }
}

interface Handoff {
  entries: CatsLogReceiptLedgerEntry[];
  disposition: ObservationBranchRunDisposition;
}

/** Full node-capable backend. */
class SubgraphBranchBackend implements CatsLogMemoryBackend {
  subgraphRequest: (CatsLogSkillSubgraphRequest & { token: string }) | null = null;
  discoveryQueries: CatscoSkillMemoryQuery[] = [];
  reports: CatscoUseStageReport[][] = [];

  async retrieveSkillMemory(query: CatscoSkillMemoryQuery): Promise<CatscoSkillMemoryResponse> {
    this.discoveryQueries.push({ ...query });
    return metadataToolResult();
  }

  async recallMemory(_query: CatscoMemoryRecallQuery): Promise<CatscoMemoryRecallResponse> {
    return { session_available: true, session: { records: [] }, notes: [] };
  }

  async fetchSkillCitation(
    citation: CatscoSkillCitation,
    options?: CatsLogSkillFetchOptions,
  ): Promise<CatsLogSkillFetchResult> {
    options?.onReceipt?.({
      handle: citation.handle,
      revision: citation.revision,
      contentSha256: citation.contentSha256,
      receipt: RECEIPT,
      issuedAt: '2026-09-14T00:00:00.000Z',
    });
    return {
      item: { handle: citation.handle, revision: citation.revision, content_sha256: citation.contentSha256, content: SUBGRAPH_BODY },
    };
  }

  async fetchSkillSubgraph(
    request: CatsLogSkillSubgraphRequest,
    options?: CatsLogSkillSubgraphFetchOptions,
  ): Promise<CatsLogSkillSubgraphResult> {
    this.subgraphRequest = { ...request };
    options?.onReceipt?.({
      handle: request.handle,
      revision: request.revision,
      contentSha256: request.contentSha256,
      receipt: RECEIPT,
      issuedAt: '2026-09-14T00:00:00.000Z',
      programSha256: request.programSha256,
      subgraphSha256: SUBGRAPH_SHA256,
      seedNodeIds: request.seedNodeIds,
      nodeRefs: ['catslog:skill:deploy-r2@7#freeze', 'catslog:skill:deploy-r2@7#plan'],
    });
    return {
      item: { handle: request.handle, revision: request.revision, content_sha256: request.contentSha256, content: SUBGRAPH_BODY },
      program: {
        schema_version: 2,
        program_sha256: request.programSha256,
        subgraph_sha256: SUBGRAPH_SHA256,
        seed_node_ids: request.seedNodeIds,
        roots: ['plan'],
        nodes: [
          { id: 'freeze', summary: 'freeze writes', body: 'freeze body' },
          { id: 'plan', summary: 'plan the migration', body: 'plan body' },
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

  async reportUseStages(reports: readonly CatscoUseStageReport[]): Promise<{ results: unknown[] }> {
    this.reports.push([...reports]);
    return { results: reports.map(() => ({ recorded: true })) };
  }
}

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    sessionKey: 'subgraph-branch-test',
    input: 'how do we run the rclone migration?',
    recentMessages: [],
    workingDirectory: '/tmp/xiaoba-catslog-subgraph-branch',
    aiService: undefined as any,
    queue: undefined as any,
    logEnabled: false,
    ...overrides,
  };
}

describe('memory branch node-level subgraph integration', () => {
  test('registers the subgraph tool only behind the gate with a node-capable backend', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SubgraphBranchAI();
    const backend = new SubgraphBranchBackend();
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: backend,
      catsLogSkillNodesEnabled: true,
    }));
    await handle.done;
    queue.drain();

    // Inserted after catslog_skill_fetch, before finish_memory_search.
    assert.deepEqual(ai.toolNames, [
      'memory_search',
      'memory_read_turn',
      'memory_neighbors',
      'catslog_skill_memory',
      'catslog_session_recall',
      'catslog_skill_fetch',
      'catslog_skill_subgraph_fetch',
      'finish_memory_search',
    ]);
    const systemPrompt = ai.calls[0].find(message => message.role === 'system')?.content as string;
    assert.match(systemPrompt, /catslog_skill_subgraph_fetch/);
    assert.match(systemPrompt, /program_stale/);
  });

  test('gate off keeps the tool unregistered and the prompt node-free', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SubgraphBranchAI();
    const backend = new SubgraphBranchBackend();
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: backend,
      catsLogSkillNodesEnabled: false,
    }));
    await handle.done;
    queue.drain();
    assert.equal(ai.toolNames.includes('catslog_skill_subgraph_fetch'), false);
    const systemPrompt = ai.calls[0].find(message => message.role === 'system')?.content as string;
    assert.doesNotMatch(systemPrompt, /catslog_skill_subgraph_fetch/);
  });

  test('gate on without a node-capable backend keeps the legacy tool set', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SubgraphBranchAI();
    // Strip the node-level transport: the tool must not register.
    const legacyBackend: CatsLogMemoryBackend = {
      retrieveSkillMemory: (query, signal) => backend.retrieveSkillMemory(query, signal),
      recallMemory: (query, signal) => backend.recallMemory(query, signal),
      fetchSkillCitation: (citation, options) => backend.fetchSkillCitation(citation, options),
      reportUseStages: (reports, signal) => backend.reportUseStages(reports, signal),
    };
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: legacyBackend,
      catsLogSkillNodesEnabled: true,
    }));
    await handle.done;
    queue.drain();
    assert.equal(ai.toolNames.includes('catslog_skill_subgraph_fetch'), false);
  });

  test('discovery → subgraph fetch → node-ref finish yields selected with the delivered identity', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SubgraphBranchAI();
    const backend = new SubgraphBranchBackend();
    const handoffs: Handoff[] = [];
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: backend,
      catsLogSkillNodesEnabled: true,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
    }));
    await handle.done;

    // Discovery carried the node flag.
    assert.equal(backend.discoveryQueries[0]?.includeNodes, true);
    // The subgraph fetch pinned citation + program + seeds.
    assert.equal(backend.subgraphRequest?.programSha256, PROGRAM_SHA256);
    assert.deepEqual(backend.subgraphRequest?.seedNodeIds, ['plan']);

    // The observation (the ONLY main-agent surface) carries safe refs only.
    const observations = queue.drain();
    assert.equal(observations.length, 1);
    const observationText = observations[0].formattedContent || '';
    assert.match(observationText, /catslog:skill:deploy-r2@7#freeze/);
    assert.equal(observationText.includes(RECEIPT), false, 'receipt reached the observation');
    assert.equal(observationText.includes('freeze body'), false, 'node body reached the observation');
    assert.equal(observationText.includes(SUBGRAPH_SHA256), false, 'manifest reached the observation');

    // The exact tool call was consumed (its result reached the finish request)
    // and the node-ref finish marked selection.
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0].disposition, 'published');
    assert.equal(handoffs[0].entries.length, 1);
    const entry = handoffs[0].entries[0];
    assert.equal(entry.stage, 'selected');
    assert.equal(entry.programSha256, PROGRAM_SHA256);
    assert.equal(entry.subgraphSha256, SUBGRAPH_SHA256);
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('same-block subgraph fetch + finish stays fetched_not_consumed', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SameBlockSubgraphFinishAI();
    const backend = new SubgraphBranchBackend();
    const handoffs: Handoff[] = [];
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: backend,
      catsLogSkillNodesEnabled: true,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
    }));
    await handle.done;

    assert.equal(handoffs.length, 1);
    const entry = handoffs[0].entries[0];
    assert.equal(entry.stage, 'fetched', 'same-block fetch+finish must not count as consumed');
    assert.equal(handoffs[0].disposition, 'published');
    queue.drain();
  });

  test('suppression still reports the delivered subgraph with a verbatim non-success disposition', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SubgraphBranchAI();
    // Override the final turn: finish with inject:false and no refs.
    const originalChat = ai.chat.bind(ai);
    ai.chat = async (messages: Message[], tools?: ToolDefinition[]) => {
      const toolMessages = messages.filter(message => message.role === 'tool');
      if (toolMessages.length >= 2) {
        return {
          content: null,
          toolCalls: [call('finish-1', 'finish_memory_search', {
            summary: 'The delivered subgraph added nothing beyond recent context.',
            inject: false,
            refs: [],
          })],
          usage,
        };
      }
      return originalChat(messages, tools);
    };
    const backend = new SubgraphBranchBackend();
    const handoffs: Handoff[] = [];
    const handle = startMemorySidecarBranch(baseOptions({
      aiService: ai,
      queue,
      catslogMemory: backend,
      catsLogSkillNodesEnabled: true,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
    }));
    await handle.done;

    // inject:false ⇒ suppressed runs push NO observation to the main agent;
    // the receipt-backed fact is still handed off, with the branch-run
    // disposition (never a success verdict).
    assert.equal(queue.drain().length, 0);
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0].disposition, 'suppressed_inject_false');
    assert.equal(handoffs[0].entries[0].stage, 'consumed', 'delivered but not selected: telemetry, never a verdict');
    assert.equal(handoffs[0].entries[0].receipt, RECEIPT);
  });
});
