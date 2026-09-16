import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  CatsLogUseStageReporter,
  MAX_CATSLOG_USE_STAGE_BATCH,
  mapLedgerEntryToUseStageReport,
} from '../src/utils/catslog-use-stage-reporter';
import type { CatsLogMemoryBackend } from '../src/utils/catslog-memory-provider';
import type { CatsLogReceiptLedgerEntry } from '../src/utils/catslog-receipt-ledger';
import type { CatscoUseStageReport } from '../src/utils/catsco-log-agent-client';
import type { ObservationBranchRunDisposition } from '../src/core/observation-branch-session';

function subgraphLedgerEntry(stage: CatsLogReceiptLedgerEntry['stage']): CatsLogReceiptLedgerEntry {
  return {
    handle: 'deploy-r2',
    revision: 7,
    contentSha256: 'a'.repeat(64),
    receipt: 'receipt-subgraph',
    issuedAt: '2026-09-14T00:00:00.000Z',
    route: { routeId: 'route-1', hop: 0, edgeKey: 'edge-1' },
    programSha256: 'b'.repeat(64),
    subgraphSha256: 'c'.repeat(64),
    seedNodeIds: ['freeze', 'plan'],
    nodeRefs: [
      'catslog:skill:deploy-r2@7#plan',
      'catslog:skill:deploy-r2@7#freeze',
    ],
    ref: 'catslog:skill:deploy-r2@7',
    toolUseId: 'call-1',
    stage,
  };
}

function bodyLedgerEntry(): CatsLogReceiptLedgerEntry {
  return {
    handle: 'deploy-r2',
    revision: 7,
    contentSha256: 'a'.repeat(64),
    receipt: 'receipt-body',
    issuedAt: '2026-09-14T00:00:00.000Z',
    ref: 'catslog:skill:deploy-r2@7',
    stage: 'consumed',
  };
}

class RecordingBackend implements CatsLogMemoryBackend {
  chunks: CatscoUseStageReport[][] = [];
  failures = 0;

  constructor(private readonly failFirst?: number) {}

  async retrieveSkillMemory(): Promise<never> {
    throw new Error('not used');
  }

  async recallMemory(): Promise<never> {
    throw new Error('not used');
  }

  async fetchSkillCitation(): Promise<never> {
    throw new Error('not used');
  }

  async reportUseStages(reports: readonly CatscoUseStageReport[]): Promise<{ results: unknown[] }> {
    if (this.failFirst && this.failures < this.failFirst) {
      this.failures += 1;
      throw new Error(`transient failure ${this.failures} receipt=${reports[0]?.retrieval_receipt}`);
    }
    this.chunks.push([...reports]);
    return { results: reports.map(() => ({ recorded: true })) };
  }
}

describe('use-stage reporting with subgraph entries', () => {
  test('maps subgraph identity, seeds, route, stage, and disposition verbatim', () => {
    const report = mapLedgerEntryToUseStageReport(subgraphLedgerEntry('selected'), 'published');
    assert.equal(report.stage, 'selected');
    assert.equal(report.disposition, 'published');
    assert.equal(report.program_sha256, 'b'.repeat(64));
    assert.equal(report.subgraph_sha256, 'c'.repeat(64));
    assert.deepEqual(report.seed_node_ids, ['freeze', 'plan']);
    assert.equal(report.route_id, 'route-1');
    assert.equal(report.hop, 0);
    assert.equal(report.edge_key, 'edge-1');
    // Receipt identity rides the report; node refs and refs do not.
    assert.equal(report.retrieval_receipt, 'receipt-subgraph');
    assert.equal((report as any).nodeRefs, undefined);
    assert.equal((report as any).ref, undefined);
  });

  test('body receipts map without any subgraph fields (v1 wire compatibility)', () => {
    const report = mapLedgerEntryToUseStageReport(bodyLedgerEntry(), 'suppressed_inject_false');
    assert.equal(report.stage, 'consumed_not_selected');
    assert.equal(report.disposition, 'suppressed_inject_false');
    assert.equal(report.program_sha256, undefined);
    assert.equal(report.subgraph_sha256, undefined);
    assert.equal(report.seed_node_ids, undefined);
  });

  test('stage vocabulary and dispositions are unchanged for subgraph entries', () => {
    const dispositions: ObservationBranchRunDisposition[] = [
      'published',
      'suppressed_inject_false',
      'discarded_queue_closed_or_duplicate',
      'cancelled',
      'failed',
    ];
    for (const disposition of dispositions) {
      assert.equal(mapLedgerEntryToUseStageReport(subgraphLedgerEntry('fetched'), disposition).stage, 'fetched_not_consumed');
      assert.equal(mapLedgerEntryToUseStageReport(subgraphLedgerEntry('consumed'), disposition).stage, 'consumed_not_selected');
      assert.equal(mapLedgerEntryToUseStageReport(subgraphLedgerEntry('selected'), disposition).stage, 'selected');
      const report = mapLedgerEntryToUseStageReport(subgraphLedgerEntry('selected'), disposition);
      assert.equal(report.disposition, disposition, 'disposition must be carried verbatim');
    }
  });

  test('subgraph reports deliver exactly once, batched, with bounds unchanged', async () => {
    const backend = new RecordingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const entries = Array.from({ length: MAX_CATSLOG_USE_STAGE_BATCH + 2 }, (_, index) => subgraphLedgerEntry('consumed'));
    reporter.enqueue(entries, 'published');
    await reporter.whenIdle();

    assert.equal(backend.chunks.length, 2);
    assert.equal(backend.chunks[0].length, MAX_CATSLOG_USE_STAGE_BATCH);
    assert.equal(backend.chunks[1].length, 2);
    assert.equal(reporter.deliveredReportCount, MAX_CATSLOG_USE_STAGE_BATCH + 2);
    assert.equal(reporter.pendingReportCount, 0);

    // Delivering again is impossible: enqueue is the only entry point and the
    // entries were already consumed.
    await reporter.whenIdle();
    assert.equal(backend.chunks.length, 2);
  });

  test('a failed chunk is dropped and counted; the failure log never carries receipt material', async () => {
    const warnings: string[] = [];
    const originalWarning = console.warn;
    console.warn = (...parts: unknown[]) => warnings.push(parts.map(String).join(' '));
    try {
      const backend = new RecordingBackend(1);
      const reporter = new CatsLogUseStageReporter(backend);
      reporter.enqueue([subgraphLedgerEntry('selected')], 'cancelled');
      await reporter.whenIdle();
      assert.equal(backend.chunks.length, 0);
      assert.equal(reporter.failedChunkCount, 1);
      const logged = warnings.join('\n');
      assert.ok(!logged.includes('receipt-subgraph'), 'failure log leaked the receipt');
    } finally {
      console.warn = originalWarning;
    }
  });

  test('entries without a usable receipt or handle are skipped, never poisoning the batch', () => {
    const backend = new RecordingBackend();
    const reporter = new CatsLogUseStageReporter(backend);
    const broken = { ...subgraphLedgerEntry('fetched'), receipt: '  ' } as CatsLogReceiptLedgerEntry;
    reporter.enqueue([broken, subgraphLedgerEntry('consumed')], 'published');
    assert.equal(reporter.skippedInvalidCount, 1);
    return reporter.whenIdle().then(() => {
      assert.equal(backend.chunks.length, 1);
      assert.equal(backend.chunks[0].length, 1);
    });
  });
});
