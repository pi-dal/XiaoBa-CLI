import type { CatscoUseStageReport } from './catsco-log-agent-client';
import type { CatsLogMemoryBackend } from './catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from './catslog-receipt-ledger';
import { Logger } from './logger';
import type { ObservationBranchRunDisposition } from '../core/observation-branch-session';

/**
 * Server batch bound for `POST /catsco/agent/memory/use-stages`
 * (CatsLog `MaxSkillMemoryUseStageReports`).
 */
export const MAX_CATSLOG_USE_STAGE_BATCH = 8;

/**
 * Process-private bound on pending use-stage reports across handoffs
 * (8 batches of 8). Overflow drops the oldest pending chunks FIFO and is
 * counted; dropped facts are a denominator datum, never an outcome signal.
 */
export const MAX_PENDING_USE_STAGE_REPORTS = 64;

/**
 * Maps one private ledger entry to the exact wire report. The mapping is
 * fixed and total: fetched → fetched_not_consumed, consumed →
 * consumed_not_selected, selected → selected. The disposition is carried
 * verbatim; no disposition or stage is ever interpreted as a terminal
 * succeeded/failed/corrected verdict, and no report ever carries an outcome
 * field. Identity fields (handle/revision/content hash/receipt) and the
 * frozen route tuple are repeated exactly as delivered.
 */
export function mapLedgerEntryToUseStageReport(
  entry: CatsLogReceiptLedgerEntry,
  disposition: ObservationBranchRunDisposition,
): CatscoUseStageReport {
  const stage = entry.stage === 'selected'
    ? 'selected'
    : entry.stage === 'consumed'
      ? 'consumed_not_selected'
      : 'fetched_not_consumed';
  const route = entry.route;
  return {
    handle: entry.handle,
    revision: entry.revision,
    content_sha256: entry.contentSha256,
    retrieval_receipt: entry.receipt,
    stage,
    disposition,
    ...(route ? { route_id: route.routeId, hop: route.hop, edge_key: route.edgeKey } : {}),
    // Subgraph receipts repeat their delivered-program identity verbatim so
    // the server can verify the echo against the receipt (and keep the
    // binding durable in the fact row). Body receipts omit the fields and
    // stay byte-compatible with the v1 report shape.
    ...(entry.programSha256 ? { program_sha256: entry.programSha256 } : {}),
    ...(entry.subgraphSha256 ? { subgraph_sha256: entry.subgraphSha256 } : {}),
    ...(entry.seedNodeIds?.length ? { seed_node_ids: [...entry.seedNodeIds] } : {}),
  };
}

/**
 * Process-private, bounded, asynchronous reporter for the Memory Branch's
 * receipt-backed final use facts. The branch's run-end handoff only maps,
 * copies, enqueues, and returns: the network work happens strictly outside
 * the branch `finally`, failures are caught and counted, and nothing here can
 * affect branch or main-agent execution. Receipts exist only inside this
 * object's in-memory queue and the request body; they are never logged,
 * persisted, or exposed through diagnostics.
 *
 * Delivery rules: chunks of at most 8 reports are posted strictly in enqueue
 * order, exactly once each — an ordinary success never re-posts a chunk. A
 * failed chunk is dropped and counted (the facts stay server-idempotent for
 * any future legitimate retry, and crash loss is an accepted denominator
 * datum). One 401 capability refresh + retry happens inside the backend's
 * capability path, not here.
 */
export class CatsLogUseStageReporter {
  private readonly pending: CatscoUseStageReport[][] = [];
  private readonly idleWaiters: Array<() => void> = [];
  private pumping = false;
  private droppedReports = 0;
  private skippedInvalid = 0;
  private failedChunks = 0;
  private deliveredReports = 0;
  private deliveredChunks = 0;

  constructor(private readonly backend: CatsLogMemoryBackend) {}

  /**
   * Non-blocking branch-run handoff. Maps the entries to wire reports
   * synchronously (the branch callback must return promptly), chunks them in
   * order, and starts the async pump. Never throws and never awaits network.
   */
  enqueue(
    entries: readonly CatsLogReceiptLedgerEntry[],
    disposition: ObservationBranchRunDisposition,
  ): void {
    try {
      const reports: CatscoUseStageReport[] = [];
      for (const entry of entries) {
        // A ledger entry without a usable receipt or handle can never be
        // attributed; skip it rather than poison its all-or-nothing batch.
        if (!entry || !entry.receipt?.trim() || !entry.handle?.trim()) {
          this.skippedInvalid += 1;
          continue;
        }
        reports.push(mapLedgerEntryToUseStageReport(entry, disposition));
      }
      if (reports.length === 0) return;
      for (let index = 0; index < reports.length; index += MAX_CATSLOG_USE_STAGE_BATCH) {
        this.pending.push(reports.slice(index, index + MAX_CATSLOG_USE_STAGE_BATCH));
      }
      this.trimOverflow();
      this.pump();
    } catch {
      // Fault isolation: a reporting problem must never reach the branch or
      // the main agent. Only a count is logged, never entry material.
      Logger.warning('[catslog-use-stages] enqueue failed; pending use-stage facts were dropped');
    }
  }

  /** Reports currently queued (not yet delivered or dropped). */
  get pendingReportCount(): number {
    return this.pending.reduce((total, chunk) => total + chunk.length, 0);
  }

  /** Facts dropped because the pending bound was exceeded. */
  get droppedReportCount(): number {
    return this.droppedReports;
  }

  /** Facts skipped at enqueue because they could never be attributed. */
  get skippedInvalidCount(): number {
    return this.skippedInvalid;
  }

  /** Chunks that failed permanently (already dropped; the facts were lost). */
  get failedChunkCount(): number {
    return this.failedChunks;
  }

  get deliveredReportCount(): number {
    return this.deliveredReports;
  }

  get deliveredChunkCount(): number {
    return this.deliveredChunks;
  }

  /**
   * Idle seam for graceful shutdown and tests: resolves once every queued
   * chunk has been delivered or dropped. It never blocks a branch run —
   * callers opt in.
   */
  whenIdle(): Promise<void> {
    if (!this.pumping && this.pending.length === 0) return Promise.resolve();
    return new Promise(resolve => {
      this.idleWaiters.push(resolve);
    });
  }

  private trimOverflow(): void {
    while (this.pendingReportCount > MAX_PENDING_USE_STAGE_REPORTS) {
      const dropped = this.pending.shift();
      if (!dropped) break;
      this.droppedReports += dropped.length;
    }
  }

  private pump(): void {
    if (this.pumping) return;
    this.pumping = true;
    void this.pumpLoop().finally(() => {
      this.pumping = false;
      // An enqueue that landed while the loop was exiting must not strand.
      if (this.pending.length > 0) this.pump();
      else this.resolveIdleWaiters();
    });
  }

  private async pumpLoop(): Promise<void> {
    while (this.pending.length > 0) {
      // Take the chunk out of the queue before posting it: a concurrent
      // enqueue that overflows the bound trims the oldest PENDING chunks and
      // must never be able to drop or double-count the in-flight one.
      const chunk = this.pending.shift();
      if (!chunk) break;
      try {
        await this.backend.reportUseStages(chunk);
        this.deliveredChunks += 1;
        this.deliveredReports += chunk.length;
      } catch (error) {
        // Contained by design. The log carries only a bounded count plus a
        // safe class/status — never a receipt, token, body, or entry JSON.
        this.failedChunks += 1;
        Logger.warning(
          `[catslog-use-stages] report chunk failed and was dropped; `
          + `reports=${chunk.length} status=${safeStatus(error)} class=${safeErrorClass(error)}`,
        );
      }
      if (this.pending.length === 0) this.resolveIdleWaiters();
    }
  }

  private resolveIdleWaiters(): void {
    while (this.idleWaiters.length > 0) {
      this.idleWaiters.shift()?.();
    }
  }
}

function safeStatus(error: unknown): string {
  const status = Number((error as any)?.status);
  return Number.isFinite(status) ? String(status) : 'unknown';
}

function safeErrorClass(error: unknown): string {
  const name = (error as any)?.name;
  const code = (error as any)?.code;
  if (typeof name === 'string' && name) return name.slice(0, 64);
  if (typeof code === 'string' && code) return code.slice(0, 64);
  return 'unknown';
}
