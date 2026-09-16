import { ContentBlock, Message } from '../types';
import { AIService } from '../utils/ai-service';
import { Logger } from '../utils/logger';
import { SyntheticObservationQueue } from './synthetic-observation';
import { MemorySearchBranchSession } from './memory-search-branch-session';
import type { ObservationBranchRunDisposition } from './observation-branch-session';
import type { CatsLogMemoryBackend } from '../utils/catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from '../utils/catslog-receipt-ledger';

export interface MemorySidecarBranchOptions {
  sessionKey: string;
  input: string | ContentBlock[];
  recentMessages: Message[];
  workingDirectory: string;
  branchLogRoot?: string;
  aiService: AIService;
  queue: SyntheticObservationQueue;
  signal?: AbortSignal;
  logEnabled?: boolean;
  /** Optional device-bound CatsLog read capability for remote skill/session recall. */
  catslogMemory?: CatsLogMemoryBackend;
  /** Env gate (`CATSLOG_SKILL_NODES_ENABLED`) for node-level discovery/fetch tools. */
  catsLogSkillNodesEnabled?: boolean;
  /**
   * Private owner transfer for receipts captured during the run, annotated
   * with the branch run's terminal disposition. Invoked exactly once per run
   * on every terminal path, before `done` resolves and before the ledger is
   * cleared. Consumers must keep entries process-private and must not report
   * outcomes from this phase; the disposition is branch-run vocabulary
   * (published/suppressed/cancelled/failed), never a task success verdict.
   */
  onRunEndReceipts?: (
    entries: CatsLogReceiptLedgerEntry[],
    disposition: ObservationBranchRunDisposition,
  ) => void;
}

export interface MemorySidecarBranchHandle {
  cancel(): void;
  done: Promise<void>;
  /**
   * Mid-run consumption point for receipts captured by exact citation fetches
   * during this run. Entries taken here are delivered exactly once and are
   * excluded from the run-end handoff. Once `done` resolves, the run-end
   * handoff (options.onRunEndReceipts) has already happened and this returns
   * an empty array by design. This phase performs no outcome reporting.
   */
  drainCatsLogReceipts(): CatsLogReceiptLedgerEntry[];
}

export function startMemorySidecarBranch(options: MemorySidecarBranchOptions): MemorySidecarBranchHandle {
  const controller = new AbortController();
  const signal = linkAbortSignals(controller.signal, options.signal);
  const session = new MemorySearchBranchSession({
    ...options,
    signal,
  });
  const done = session.run().catch(error => {
    if (isAbortError(error) || signal.aborted) return;
    Logger.warning(`[${options.sessionKey}] memory branch failed: ${error.message}`);
  });

  return {
    cancel: () => {
      controller.abort();
      session.stop();
    },
    done,
    drainCatsLogReceipts: () => session.drainCatsLogReceipts(),
  };
}

function linkAbortSignals(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      abort();
      break;
    }
    signal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

function isAbortError(error: any): boolean {
  return error?.name === 'AbortError' || /aborted|aborterror|canceled|cancelled/i.test(String(error?.message || ''));
}
