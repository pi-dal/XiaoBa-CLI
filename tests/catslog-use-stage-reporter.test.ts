import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import type {
  CatscoMemoryRecallQuery,
  CatscoMemoryRecallResponse,
  CatscoSkillCitation,
  CatscoSkillFetchResult,
  CatscoSkillMemoryQuery,
  CatscoSkillMemoryResponse,
  CatscoUseStageReport,
} from '../src/utils/catsco-log-agent-client';
import type { CatsLogMemoryBackend, CatsLogSkillFetchOptions } from '../src/utils/catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from '../src/utils/catslog-receipt-ledger';
import {
  CatsLogUseStageReporter,
  MAX_CATSLOG_USE_STAGE_BATCH,
  MAX_PENDING_USE_STAGE_REPORTS,
  mapLedgerEntryToUseStageReport,
} from '../src/utils/catslog-use-stage-reporter';
import type { ObservationBranchRunDisposition } from '../src/core/observation-branch-session';
import { Logger } from '../src/utils/logger';

const DISPOSITIONS: ObservationBranchRunDisposition[] = [
  'published',
  'suppressed_inject_false',
  'discarded_queue_closed_or_duplicate',
  'cancelled',
  'failed',
];

function ledgerEntry(overrides: Partial<CatsLogReceiptLedgerEntry> = {}): CatsLogReceiptLedgerEntry {
  return {
    handle: 'release-playbook',
    revision: 3,
    contentSha256: 'a'.repeat(64),
    receipt: `catslog_smr_${Math.random().toString(36).slice(2)}`,
    issuedAt: '2026-09-14T00:00:00.000Z',
    stage: 'fetched',
    ...overrides,
  };
}

/** Full backend contract; the reporting methods record, everything else fails loudly. */
class ReportingBackend implements CatsLogMemoryBackend {
  calls: CatscoUseStageReport[][] = [];
  /** Queued outcomes per reportUseStages call: 'ok' consumes the queued error, default ok. */
  failures: unknown[] = [];
  private gates: Array<(resolve: () => void) => void> = [];

  async reportUseStages(reports: readonly CatscoUseStageReport[]): Promise<{ results: unknown[] }> {
    this.calls.push([...reports]);
    const failure = this.failures.shift();
    if (failure) throw failure;
    if (this.gates.length > 0) {
      const gate = this.gates.shift()!;
      await new Promise<void>(resolve => gate(resolve));
    }
    return { results: reports.map(() => ({ recorded: true, idempotent: false })) };
  }

  /** Holds the next reportUseStages call open until released. */
  gateNextCall(): () => void {
    let release: () => void = () => {};
    this.gates.push(resolve => { release = resolve; });
    return () => release();
  }

  async retrieveSkillMemory(_query: CatscoSkillMemoryQuery): Promise<CatscoSkillMemoryResponse> {
    throw new Error('retrieveSkillMemory must never be called by the reporter');
  }

  async recallMemory(_query: CatscoMemoryRecallQuery): Promise<CatscoMemoryRecallResponse> {
    throw new Error('recallMemory must never be called by the reporter');
  }

  async fetchSkillCitation(_citation: CatscoSkillCitation, _options?: CatsLogSkillFetchOptions): Promise<CatsLogSkillFetchResult> {
    throw new Error('fetchSkillCitation must never be called by the reporter');
  }
}

describe('CatsLog use-stage reporter', () => {
  const originalWarning = Logger.warning;
  let warnings: string[];

  beforeEach(() => {
    warnings = [];
    (Logger as any).warning = (message: string) => { warnings.push(message); };
  });

  afterEach(() => {
    (Logger as any).warning = originalWarning;
  });

  test('maps every private stage to the exact wire vocabulary and carries identity verbatim', () => {
    const routed = mapLedgerEntryToUseStageReport(ledgerEntry({
      stage: 'selected',
      receipt: 'receipt-selected',
      route: { routeId: 'route-branch', hop: 1, edgeKey: 'item-abc' },
    }), 'published');
    assert.deepEqual(routed, {
      handle: 'release-playbook',
      revision: 3,
      content_sha256: 'a'.repeat(64),
      retrieval_receipt: 'receipt-selected',
      stage: 'selected',
      disposition: 'published',
      route_id: 'route-branch',
      hop: 1,
      edge_key: 'item-abc',
    });

    const consumed = mapLedgerEntryToUseStageReport(ledgerEntry({ stage: 'consumed' }), 'cancelled');
    assert.equal(consumed.stage, 'consumed_not_selected');
    const fetched = mapLedgerEntryToUseStageReport(ledgerEntry({ stage: 'fetched' }), 'failed');
    assert.equal(fetched.stage, 'fetched_not_consumed');

    // Without a route the tuple fields are absent entirely (server inherits
    // the receipt's frozen attribution), and no report ever gains an outcome
    // key or any verdict field.
    for (const report of [routed, consumed, fetched]) {
      assert.equal('outcome' in report, false);
      assert.equal('verdict' in report, false);
      assert.equal('succeeded' in report, false);
    }
    assert.equal('route_id' in consumed, false);
    assert.equal('route_id' in fetched, false);
    assert.equal('hop' in consumed, false);
    assert.equal('edge_key' in consumed, false);
  });

  test('carries all five bounded dispositions verbatim, never a derived verdict', () => {
    for (const disposition of DISPOSITIONS) {
      const report = mapLedgerEntryToUseStageReport(ledgerEntry({ stage: 'consumed' }), disposition);
      assert.equal(report.disposition, disposition);
      assert.ok(['fetched_not_consumed', 'consumed_not_selected', 'selected'].includes(report.stage));
    }
  });

  test('splits 16 entries into two ordered batches of exactly 8', async () => {
    const backend = new ReportingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const entries = Array.from({ length: 16 }, (_, index) => ledgerEntry({
      receipt: `receipt-${index}`,
      stage: index % 3 === 0 ? 'fetched' : index % 3 === 1 ? 'consumed' : 'selected',
    }));
    reporter.enqueue(entries, 'published');
    await reporter.whenIdle();

    assert.equal(backend.calls.length, 2);
    assert.deepEqual(backend.calls[0].map(report => report.retrieval_receipt),
      entries.slice(0, 8).map(entry => entry.receipt));
    assert.deepEqual(backend.calls[1].map(report => report.retrieval_receipt),
      entries.slice(8).map(entry => entry.receipt));
    assert.equal(MAX_CATSLOG_USE_STAGE_BATCH, 8);
    assert.equal(reporter.deliveredReportCount, 16);
    assert.equal(reporter.failedChunkCount, 0);
    assert.equal(reporter.droppedReportCount, 0);
  });

  test('an empty handoff is a no-op', async () => {
    const backend = new ReportingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    reporter.enqueue([], 'published');
    await reporter.whenIdle();
    assert.equal(backend.calls.length, 0);
    assert.equal(reporter.pendingReportCount, 0);
    assert.equal(reporter.deliveredReportCount, 0);
    assert.equal(reporter.failedChunkCount, 0);
  });

  test('enqueue returns before the network resolves and keeps per-handoff order', async () => {
    const backend = new ReportingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const release = backend.gateNextCall();

    reporter.enqueue([ledgerEntry({ receipt: 'first', stage: 'fetched' })], 'published');
    // Second handoff lands while the first chunk is still in flight.
    reporter.enqueue([ledgerEntry({ receipt: 'second', stage: 'selected' })], 'cancelled');

    assert.equal(backend.calls.length, 1);
    assert.equal(reporter.pendingReportCount, 1);
    release();

    await reporter.whenIdle();
    assert.equal(backend.calls.length, 2);
    assert.equal(backend.calls[0][0].retrieval_receipt, 'first');
    assert.equal(backend.calls[0][0].stage, 'fetched_not_consumed');
    assert.equal(backend.calls[1][0].retrieval_receipt, 'second');
    assert.equal(backend.calls[1][0].stage, 'selected');
    assert.equal(backend.calls[1][0].disposition, 'cancelled');
    assert.equal(reporter.deliveredReportCount, 2);
  });

  test('delivers each chunk exactly once and never duplicates on ordinary success', async () => {
    const backend = new ReportingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const entries = Array.from({ length: 9 }, (_, index) => ledgerEntry({ receipt: `r-${index}` }));
    reporter.enqueue(entries, 'published');
    await reporter.whenIdle();
    await reporter.whenIdle();

    assert.equal(backend.calls.length, 2);
    assert.equal(reporter.deliveredReportCount, 9);
    assert.equal(reporter.deliveredChunkCount, 2);
    const seen = backend.calls.flat().map(report => report.retrieval_receipt);
    assert.equal(new Set(seen).size, seen.length);
  });

  for (const failure of [
    { label: '400', error: Object.assign(new Error('CatsLog use-stage report failed: invalid_request'), { status: 400 }) },
    { label: '409', error: Object.assign(new Error('CatsLog use-stage report failed: receipt_conflict'), { status: 409 }) },
    { label: '503', error: Object.assign(new Error('CatsLog use-stage report failed: skill_memory_unavailable'), { status: 503 }) },
    { label: 'network', error: new TypeError('fetch failed') },
  ]) {
    test(`a ${failure.label} failure is contained, counted, and stays secret-free`, async () => {
      const backend = new ReportingBackend();
      backend.failures.push(failure.error);
      const reporter = new CatsLogUseStageReporter(backend);

      // The poisoned chunk carries a canary receipt; it must never reach a log.
      reporter.enqueue([
        ledgerEntry({ receipt: 'canary-secret-receipt', stage: 'selected' }),
        ...Array.from({ length: 10 }, (_, index) => ledgerEntry({ receipt: `plain-${index}`, stage: 'consumed' })),
      ], 'failed');
      await reporter.whenIdle();

      // First chunk (8, canary) failed and was dropped; the second chunk (3)
      // was still delivered. The enqueue itself never threw.
      assert.equal(backend.calls.length, 2);
      assert.equal(reporter.failedChunkCount, 1);
      assert.equal(reporter.deliveredReportCount, 3);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /status=\d+|status=unknown/);
      assert.ok(!warnings[0].includes('canary-secret-receipt'));
      assert.ok(!warnings.join('\n').includes('canary-secret-receipt'));
    });
  }

  test('the pending queue is bounded and overflow drops the oldest with a counter', async () => {
    const backend = new ReportingBackend();
    const release = backend.gateNextCall();
    const reporter = new CatsLogUseStageReporter(backend);

    // The first chunk is held in flight; keep enqueueing until well past the bound.
    const total = MAX_PENDING_USE_STAGE_REPORTS + 3 * MAX_CATSLOG_USE_STAGE_BATCH;
    reporter.enqueue(
      Array.from({ length: total }, (_, index) => ledgerEntry({ receipt: `flood-${index}`, stage: 'fetched' })),
      'published',
    );

    assert.ok(reporter.pendingReportCount <= MAX_PENDING_USE_STAGE_REPORTS);
    assert.equal(
      reporter.droppedReportCount,
      total - reporter.pendingReportCount - MAX_CATSLOG_USE_STAGE_BATCH,
      'in-flight chunk is neither dropped nor double-counted',
    );
    release();
    await reporter.whenIdle();
    assert.equal(reporter.pendingReportCount, 0);
    assert.equal(backend.calls.flat().length, total - reporter.droppedReportCount);
  });

  test('entries that can never be attributed are skipped and counted, not sent', async () => {
    const backend = new ReportingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    reporter.enqueue([
      ledgerEntry({ receipt: '', stage: 'fetched' }),
      ledgerEntry({ receipt: '  ', stage: 'fetched' }),
      ledgerEntry({ receipt: 'good', stage: 'consumed' }),
    ] as CatsLogReceiptLedgerEntry[], 'published');
    await reporter.whenIdle();

    assert.equal(backend.calls.length, 1);
    assert.deepEqual(backend.calls[0].map(report => report.retrieval_receipt), ['good']);
    assert.equal(reporter.skippedInvalidCount, 2);
  });
});
