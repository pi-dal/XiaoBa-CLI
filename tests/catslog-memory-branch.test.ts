import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { startMemorySidecarBranch } from '../src/core/sidecar-memory-branch';
import { MemorySearchBranchSession } from '../src/core/memory-search-branch-session';
import { BranchSessionLogger } from '../src/core/branch-session';
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
import type { CatsLogReceiptLedgerEntry } from '../src/utils/catslog-receipt-ledger';
import type { CatsLogSelectionEpisodeTracker } from '../src/utils/catslog-selection-episodes';
import { Logger } from '../src/utils/logger';
import { CatsLogUseStageReporter } from '../src/utils/catslog-use-stage-reporter';
import type { ObservationBranchRunDisposition } from '../src/core/observation-branch-session';

/** Captured run-end handoff: stage-annotated entries plus run disposition. */
interface ReceiptHandoff {
  entries: CatsLogReceiptLedgerEntry[];
  disposition: ObservationBranchRunDisposition;
}
import type {
  CatsLogMemoryBackend,
  CatsLogSkillFetchOptions,
  CatsLogSkillFetchResult,
} from '../src/utils/catslog-memory-provider';

const usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2 };

function call(id: string, name: string, args: unknown): ToolCall {
  return {
    id,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

class RemoteMemoryBranchAI {
  calls: Message[][] = [];
  toolNames: string[] = [];

  isToolCallingSupported(): boolean {
    return true;
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    this.calls.push(JSON.parse(JSON.stringify(messages)));
    this.toolNames = tools?.map(tool => tool.name) || [];
    const lastTool = [...messages].reverse().find(message => message.role === 'tool');
    if (!lastTool) {
      return {
        content: null,
        toolCalls: [call('skill-1', 'catslog_skill_memory', {
          task: 'release checklist',
        })],
        usage,
      };
    }
    const result = JSON.parse(String(lastTool.content));
    return {
      content: null,
      toolCalls: [call('finish-1', 'finish_memory_search', {
        summary: 'CatsLog returned a relevant release skill.',
        refs: [result.items[0].ref],
      })],
      usage,
    };
  }
}

const FETCH_BODY = 'exact untrusted branch body';
const FETCH_SHA256 = crypto.createHash('sha256').update(FETCH_BODY, 'utf8').digest('hex');
const FETCH_RECEIPT = 'branch-run-private-receipt';

interface FetchedRefFinishShape {
  /** 'fetched': cite the fetched ref; 'none': inject:false with empty refs. */
  finishMode: 'fetched' | 'none';
}

/** Drives metadata query → exact citation fetch → finish. */
class CitationFetchBranchAI {
  calls: Message[][] = [];
  toolNames: string[] = [];

  constructor(private readonly options: FetchedRefFinishShape = { finishMode: 'fetched' }) {}

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
        toolCalls: [call('meta-1', 'catslog_skill_memory', { task: 'release checklist' })],
        usage,
      };
    }
    if (toolMessages.length === 1) {
      const metadata = JSON.parse(String(toolMessages[0].content));
      return {
        content: null,
        toolCalls: [call('fetch-1', 'catslog_skill_fetch', {
          handle: metadata.items[0].handle,
          revision: metadata.items[0].revision,
          content_sha256: metadata.items[0].content_sha256,
        })],
        usage,
      };
    }
    const fetched = JSON.parse(String(toolMessages[toolMessages.length - 1].content));
    return {
      content: null,
      toolCalls: [call('finish-1', 'finish_memory_search', this.options.finishMode === 'none'
        ? {
          summary: 'The fetched body added nothing beyond recent context.',
          inject: false,
          refs: [],
        }
        : {
          summary: 'Fetched the exact cited release skill body.',
          refs: [fetched.ref],
        })],
      usage,
    };
  }
}

/**
 * The pathologist case: the model emits catslog_skill_fetch and
 * finish_memory_search in the SAME assistant block. The finish decision was
 * made without the fetch result ever reaching a provider request, so the
 * entry must stay `fetched` (fetched_not_consumed) even though the finish
 * cites its ref.
 */
class SameBlockFetchFinishAI {
  calls: Message[][] = [];

  isToolCallingSupported(): boolean {
    return true;
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
    this.calls.push(JSON.parse(JSON.stringify(messages)));
    if (messages.filter(message => message.role === 'tool').length === 0) {
      return {
        content: null,
        toolCalls: [
          call('fetch-1', 'catslog_skill_fetch', {
            handle: 'release-playbook',
            revision: 3,
            content_sha256: FETCH_SHA256,
          }),
          call('finish-1', 'finish_memory_search', {
            summary: 'Citing a skill body I asked for in the same block.',
            refs: ['catslog:skill:release-playbook@3'],
          }),
        ],
        usage,
      };
    }
    // Finish ends the run; this must never be reached.
    return { content: 'stray', toolCalls: [], usage };
  }
}

/** Full backend contract: metadata read plus exact citation dereference. */
class FetchCapableBackend implements CatsLogMemoryBackend {
  fetchCitation: CatscoSkillCitation | null = null;
  /** Client-owned selection-episode telemetry observed on the exact fetch. */
  routeTelemetry: { routeId: string; hop: number } | null = null;
  emittedReceipt: string | null = null;

  async reportUseStages(): Promise<{ results: unknown[] }> {
    throw new Error('reportUseStages is not wired in this test');
  }

  async retrieveSkillMemory(_query: CatscoSkillMemoryQuery): Promise<CatscoSkillMemoryResponse> {
    return {
      content_trust: 'untrusted_runtime_memory',
      items: [{
        handle: 'release-playbook',
        revision: 3,
        content_sha256: FETCH_SHA256,
      }],
    };
  }

  async recallMemory(_query: CatscoMemoryRecallQuery): Promise<CatscoMemoryRecallResponse> {
    return { session_available: true, session: { records: [] }, notes: [] };
  }

  async fetchSkillCitation(
    citation: CatscoSkillCitation,
    options?: CatsLogSkillFetchOptions,
  ): Promise<CatsLogSkillFetchResult> {
    this.fetchCitation = { ...citation };
    this.routeTelemetry = options?.routeTelemetry ? { ...options.routeTelemetry } : null;
    this.emittedReceipt = FETCH_RECEIPT;
    options?.onReceipt?.({
      handle: citation.handle,
      revision: citation.revision,
      contentSha256: citation.contentSha256,
      receipt: FETCH_RECEIPT,
      issuedAt: '2026-09-14T00:00:00.000Z',
    });
    return {
      item: { handle: citation.handle, revision: citation.revision, content_sha256: citation.contentSha256, content: FETCH_BODY },
      catalogRevision: 9,
      contentTrust: 'untrusted_runtime_memory',
    };
  }
}

class FakeRemoteMemory implements CatsLogMemoryBackend {
  async reportUseStages(): Promise<{ results: unknown[] }> {
    throw new Error('reportUseStages is not wired in this test');
  }

  async retrieveSkillMemory(_query: CatscoSkillMemoryQuery): Promise<CatscoSkillMemoryResponse> {
    return {
      content_trust: 'untrusted_runtime_memory',
      items: [{ handle: 'release-playbook', revision: 3, content: 'untrusted body' }],
    };
  }

  async recallMemory(_query: CatscoMemoryRecallQuery): Promise<CatscoMemoryRecallResponse> {
    return { session_available: true, session: { records: [] }, notes: [] };
  }
}

describe('CatsLog memory branch integration', () => {
  test('adds remote Skill Memory tools only to the branch and publishes a citation', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new RemoteMemoryBranchAI();
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-test',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: new FakeRemoteMemory(),
      logEnabled: false,
    });

    await handle.done;
    const observations = queue.drain();
    assert.equal(observations.length, 1);
    assert.deepEqual(ai.toolNames, [
      'memory_search',
      'memory_read_turn',
      'memory_neighbors',
      'catslog_skill_memory',
      'catslog_session_recall',
      'catslog_skill_fetch',
      'finish_memory_search',
    ]);
    assert.match(ai.calls[0].find(message => message.role === 'system')?.content as string, /catslog_skill_memory/);
    // The prompt must not teach the removed include_content body bypass.
    assert.doesNotMatch(ai.calls[0].find(message => message.role === 'system')?.content as string, /include_content/);
    // The ranked result is metadata-only even when the backend returns a body.
    const rankedToolMessage = ai.calls[1]?.find(message => message.role === 'tool');
    const ranked = JSON.parse(String(rankedToolMessage?.content));
    assert.equal('content' in ranked.items[0], false);
    assert.equal(JSON.parse(observations[0].formattedContent || '').refs[0], 'catslog:skill:release-playbook@3');
  });

  test('exact citation fetch inside the branch keeps receipts private and clears them at run end', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-fetch-test',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      logEnabled: false,
    });

    await handle.done;

    // The branch dereferenced the exact citation from the metadata result.
    assert.deepEqual(backend.fetchCitation, {
      handle: 'release-playbook',
      revision: 3,
      contentSha256: FETCH_SHA256,
    });
    // The observation carries only summary + refs; the receipt is absent.
    const observations = queue.drain();
    assert.equal(observations.length, 1);
    const observationText = observations[0].formattedContent || '';
    assert.equal(observationText.includes(FETCH_RECEIPT), false);
    assert.equal(observationText.includes('receipt'), false);

    // Run-scoped cleanup: the run-end handoff (no callback configured here)
    // and clear happen when the run ends, so the drain seam yields nothing
    // after `done`.
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('exact fetches carry client-owned selection-episode telemetry that never leaks', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const warnings: string[] = [];
    const originalWarning = Logger.warning;
    (Logger as any).warning = (message: string) => { warnings.push(message); };
    try {
      const handle = startMemorySidecarBranch({
        sessionKey: 'remote-memory-route-telemetry',
        input: 'what is our release checklist?',
        recentMessages: [],
        workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
        aiService: ai as any,
        queue,
        catslogMemory: backend,
        logEnabled: false,
      });

      await handle.done;

      // The metadata page was tracked, so the exact fetch resolved its
      // client-owned selection-episode label with hop 0.
      assert.ok(backend.routeTelemetry, 'expected route telemetry on the exact fetch');
      assert.equal(backend.routeTelemetry.hop, 0);
      const routeId = backend.routeTelemetry.routeId;
      assert.ok(routeId.length >= 1 && routeId.length <= 128);

      // Telemetry stays branch-private: absent from observations, from every
      // model-visible message (including the metadata tool result), and from
      // any log line.
      const observationText = queue.drain().map(observation => observation.formattedContent || '').join('');
      assert.equal(observationText.includes(routeId), false);
      for (const messages of ai.calls) {
        assert.equal(JSON.stringify(messages).includes(routeId), false);
      }
      for (const message of warnings) {
        assert.equal(message.includes(routeId), false, `route id leaked into a warning: ${message}`);
      }
      assert.deepEqual(handle.drainCatsLogReceipts(), []);
    } finally {
      (Logger as any).warning = originalWarning;
    }
  });

  test('selection-episode bookkeeping is cleared when the branch run ends', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const session = new MemorySearchBranchSession({
      sessionKey: 'remote-memory-episode-cleanup',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      logEnabled: false,
    });

    await session.run();

    // The fetch resolved telemetry mid-run, so the tracker was populated;
    // run-end cleanup must have emptied it completely.
    assert.ok(backend.routeTelemetry, 'expected route telemetry during the run');
    const tracker = (session as any).catsLogSelectionEpisodes as CatsLogSelectionEpisodeTracker;
    assert.ok(tracker);
    assert.equal(tracker.size, 0);
    assert.equal(tracker.evictedEntryCount, 0);
  });

  test('hands captured receipts to the run-end owner exactly once before cleanup', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-handoff',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    // Exactly one terminal handoff carrying exactly the captured receipts.
    assert.equal(handoffs.length, 1);
    assert.deepEqual(handoffs[0].entries.map(entry => entry.receipt), [FETCH_RECEIPT]);
    assert.equal(handoffs[0].entries[0].contentSha256, FETCH_SHA256);
    assert.equal(handoffs[0].disposition, 'published');
    // The handoff happens before cleanup: after `done` nothing remains.
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('branch use ladder: fetch → consumed at the provider boundary → selected by the cited finish', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-use-ladder',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    assert.equal(handoffs.length, 1);
    const [entry] = handoffs[0].entries;
    assert.equal(handoffs[0].disposition, 'published');
    // The fetch receipt was recorded privately with the exact invocation id.
    assert.equal(entry.toolUseId, 'fetch-1');
    assert.equal(entry.ref, 'catslog:skill:release-playbook@3');
    assert.equal(entry.stage, 'selected');
    // Consumption happened exactly when request 3 carried the fetch tool
    // result: the request before the finish turn already includes it.
    const consumedRequest = ai.calls[2];
    assert.ok(consumedRequest.some(message => message.role === 'tool'
      && message.tool_call_id === 'fetch-1'));
    // The receipt itself never entered any model-visible request payload.
    assert.equal(JSON.stringify(ai.calls).includes(FETCH_RECEIPT), false);
  });

  test('same-block catslog_skill_fetch + finish stays fetched_not_consumed', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new SameBlockFetchFinishAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-same-block',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    assert.equal(handoffs.length, 1);
    const [entry] = handoffs[0].entries;
    assert.equal(handoffs[0].disposition, 'published');
    // The finish cited the ref, but the fetch result never reached a provider
    // request before the finish decision: the entry stays at `fetched`.
    assert.equal(entry.stage, 'fetched');
    assert.equal(entry.toolUseId, 'fetch-1');
  });

  test('inject:false suppression keeps non-selection neutral at consumed', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI({ finishMode: 'none' });
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-suppressed',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    assert.equal(handoffs.length, 1);
    const [entry] = handoffs[0].entries;
    assert.equal(handoffs[0].disposition, 'suppressed_inject_false');
    // The body was consumed but never selected: telemetry, not a verdict.
    assert.equal(entry.stage, 'consumed');
    // Nothing was published to the main agent.
    assert.equal(queue.drain().length, 0);
  });

  test('still hands receipts off once when the branch run fails', async () => {
    class FailingAfterFetchAI extends CitationFetchBranchAI {
      async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
        if (messages.filter(message => message.role === 'tool').length >= 2) {
          throw new Error('simulated branch failure');
        }
        return super.chat(messages, tools);
      }
    }
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new FailingAfterFetchAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-error',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    // The error path still transfers the receipt exactly once; it must not
    // be lost silently on failure.
    assert.equal(handoffs.length, 1);
    assert.deepEqual(handoffs[0].entries.map(entry => entry.receipt), [FETCH_RECEIPT]);
    assert.equal(handoffs[0].disposition, 'failed');
    // The simulated crash happens on the provider call that would have
    // carried the fetch result: that request was never accepted, so the
    // branch model never consumed it and the entry honestly stays `fetched`.
    assert.equal(handoffs[0].entries[0].stage, 'fetched');
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('a throwing receipt consumer cannot break cleanup or leak the receipt', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-consumer-error',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: () => {
        throw new Error('faulty outcome coordinator');
      },
      logEnabled: false,
    });

    await handle.done;

    // Cleanup still happened and the receipt never reached the observation.
    const observations = queue.drain();
    const observationText = observations.map(observation => observation.formattedContent || '').join('\n');
    assert.equal(observationText.includes(FETCH_RECEIPT), false);
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('mid-run drain wins: receipts consumed mid-run are excluded from the terminal handoff', async () => {
    class MidRunDrainAI extends CitationFetchBranchAI {
      drain: (() => CatsLogReceiptLedgerEntry[]) | null = null;
      midRunDrained: CatsLogReceiptLedgerEntry[] = [];

      async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
        // After the fetch tool result is in (2 tool messages), the receipt
        // sits in the ledger; drain it before the finish turn.
        if (messages.filter(message => message.role === 'tool').length === 2) {
          this.midRunDrained = this.drain?.() ?? [];
        }
        return super.chat(messages, tools);
      }
    }
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new MidRunDrainAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-midrun',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });
    ai.drain = () => handle.drainCatsLogReceipts();

    await handle.done;

    // Every receipt leaves the ledger exactly one way: here via mid-run drain.
    assert.deepEqual(ai.midRunDrained.map(entry => entry.receipt), [FETCH_RECEIPT]);
    assert.equal(handoffs.length, 1);
    assert.deepEqual(handoffs[0].entries, []);
    assert.equal(handoffs[0].disposition, 'published');
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('cancel path still fires the terminal handoff exactly once', async () => {
    const controller = new AbortController();
    class AbortingAI {
      isToolCallingSupported(): boolean {
        return true;
      }

      async chat(): Promise<ChatResponse> {
        await new Promise((_, reject) => {
          if (controller.signal.aborted) {
            reject(new Error('aborted'));
            return;
          }
          controller.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
        throw new Error('unreachable');
      }
    }
    const queue = new InMemorySyntheticObservationQueue();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-cancel',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: new AbortingAI() as any,
      queue,
      signal: controller.signal,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    controller.abort();
    await handle.done;

    // The terminal handoff fires on cancel too, with whatever remained (none).
    assert.equal(handoffs.length, 1);
    assert.deepEqual(handoffs[0].entries, []);
    assert.equal(handoffs[0].disposition, 'cancelled');
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('queue-closed discard completes the branch ladder and hands the receipt exactly once', async () => {
    // The downstream queue refuses delivery (closed via cancel()); the
    // branch-private use ladder and the exactly-once handoff are unaffected.
    const queue = new InMemorySyntheticObservationQueue();
    queue.cancel();
    const ai = new CitationFetchBranchAI();
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-queue-closed',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    // Exactly one handoff, annotated with the discarded-delivery disposition.
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0].disposition, 'discarded_queue_closed_or_duplicate');
    // The branch-side ladder completed upstream of the refused delivery:
    // fetch → consumed at the accepted provider request → selected by the finish.
    const [entry] = handoffs[0].entries;
    assert.equal(entry.stage, 'selected');
    assert.equal(entry.toolUseId, 'fetch-1');
    assert.equal(entry.ref, 'catslog:skill:release-playbook@3');
    // Nothing reached the (closed) downstream queue, and the receipt never
    // became model-visible.
    assert.equal(queue.drain().length, 0);
    assert.equal(JSON.stringify(ai.calls).includes(FETCH_RECEIPT), false);
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('cancelling after the fetch was consumed hands the consumed entry exactly once', async () => {
    const controller = new AbortController();
    class CancelAfterConsumptionAI extends CitationFetchBranchAI {
      constructor(private readonly abort: () => void) {
        super();
      }

      async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ChatResponse> {
        const response = await super.chat(messages, tools);
        // Abort right after the accepted request that carried the fetch tool
        // result: consumption is already marked, and the finish tool will
        // never execute.
        if (messages.filter(message => message.role === 'tool').length >= 2) {
          this.abort();
        }
        return response;
      }
    }
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CancelAfterConsumptionAI(() => controller.abort());
    const backend = new FetchCapableBackend();
    const handoffs: ReceiptHandoff[] = [];
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-receipt-cancel-consumed',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      signal: controller.signal,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => handoffs.push({ entries, disposition }),
      logEnabled: false,
    });

    await handle.done;

    // Exactly one handoff on the cancel path, with the honestly consumed
    // entry: the fetch result reached an accepted provider request, but the
    // finish never ran, so the entry can never be selected.
    assert.equal(handoffs.length, 1);
    assert.equal(handoffs[0].disposition, 'cancelled');
    const [entry] = handoffs[0].entries;
    assert.equal(entry.stage, 'consumed');
    assert.equal(entry.toolUseId, 'fetch-1');
    // Nothing was published downstream, and the receipt never became
    // model-visible.
    assert.equal(queue.drain().length, 0);
    assert.equal(JSON.stringify(ai.calls).includes(FETCH_RECEIPT), false);
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });

  test('the production handoff feeds a use-stage reporter; branch output is unchanged', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new ReportingFetchBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-use-stage-reporter',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => reporter.enqueue(entries, disposition),
      logEnabled: false,
    });

    await handle.done;
    await reporter.whenIdle();

    // The branch behavior is unchanged: one published observation, and the
    // receipt never became model-visible.
    assert.equal(queue.drain().length, 1);
    assert.equal(JSON.stringify(ai.calls).includes(FETCH_RECEIPT), false);
    // The reporter received the exact final fact through the private handoff:
    // selected + published, identity verbatim, no route (none was frozen),
    // and no verdict field of any kind.
    assert.equal(backend.reported.length, 1);
    assert.deepEqual(backend.reported[0], [{
      handle: 'release-playbook',
      revision: 3,
      content_sha256: FETCH_SHA256,
      retrieval_receipt: FETCH_RECEIPT,
      stage: 'selected',
      disposition: 'published',
    }]);
    assert.equal(reporter.deliveredReportCount, 1);
    assert.equal(reporter.failedChunkCount, 0);
  });

  test('a failing use-stage reporter cannot affect the branch run', async () => {
    const queue = new InMemorySyntheticObservationQueue();
    const ai = new CitationFetchBranchAI();
    const backend = new ReportingFetchBackend();
    backend.fail = true;
    const reporter = new CatsLogUseStageReporter(backend);
    const handle = startMemorySidecarBranch({
      sessionKey: 'remote-memory-use-stage-reporter-failure',
      input: 'what is our release checklist?',
      recentMessages: [],
      workingDirectory: '/tmp/xiaoba-catslog-memory-branch',
      aiService: ai as any,
      queue,
      catslogMemory: backend,
      onRunEndReceipts: (entries, disposition) => reporter.enqueue(entries, disposition),
      logEnabled: false,
    });

    await handle.done;
    await reporter.whenIdle();

    // The branch still completed and published; only the telemetry chunk failed.
    assert.equal(queue.drain().length, 1);
    assert.equal(reporter.failedChunkCount, 1);
    assert.equal(reporter.deliveredReportCount, 0);
    assert.deepEqual(handle.drainCatsLogReceipts(), []);
  });
});

/** Fetch backend that can also absorb the use-stage report (or fail). */
class ReportingFetchBackend extends FetchCapableBackend {
  reported: CatscoUseStageReport[][] = [];
  fail = false;

  async reportUseStages(stages: readonly CatscoUseStageReport[]): Promise<{ results: unknown[] }> {
    if (this.fail) {
      throw Object.assign(
        new Error('CatsLog use-stage report failed: skill_memory_unavailable'),
        { status: 503 },
      );
    }
    this.reported.push([...stages]);
    return { results: stages.map(() => ({ recorded: true })) };
  }
}

describe('branch log receipt redaction (defense in depth)', () => {
  test('branch logs redact receipt-shaped keys, assignments, and catslog_smr_ tokens', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-branch-redaction-'));
    try {
      const logger = new BranchSessionLogger({
        branchId: 'redaction-check',
        branchType: 'memory',
        workingDirectory: root,
        branchLogRoot: path.join(root, 'logs', 'branches'),
        enabled: true,
        contract: 'best-effort',
      });
      const filePath = logger.getFilePath();
      assert.ok(filePath);

      logger.write('leak_probe', {
        retrieval_receipt: 'catslog_smr_superuser-secret-value',
        nested: { retrievalReceipt: 'catslog_smr_second-secret-value' },
        note: 'receipt=catslog_smr_inline-secret-value',
      });

      const written = fs.readFileSync(filePath, 'utf-8');
      assert.equal(written.includes('catslog_smr_'), false);
      assert.equal(written.includes('superuser-secret-value'), false);
      assert.equal(written.includes('second-secret-value'), false);
      assert.equal(written.includes('inline-secret-value'), false);
      // The surrounding structure survives so the log stays debuggable.
      assert.match(written, /leak_probe/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
