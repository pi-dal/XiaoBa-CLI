import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  CatsLogReceiptLedger,
  MAX_CATSLOG_RECEIPT_ENTRIES,
  skillCitationRef,
  skillNodeCitationRef,
} from '../src/utils/catslog-receipt-ledger';
import type { CatsLogReceiptEntry } from '../src/utils/catslog-receipt-ledger';

function bodyEntry(overrides: Partial<CatsLogReceiptEntry> = {}): CatsLogReceiptEntry {
  return {
    handle: 'deploy-r2',
    revision: 7,
    contentSha256: 'a'.repeat(64),
    receipt: 'receipt-body',
    issuedAt: '2026-09-14T00:00:00.000Z',
    ...overrides,
  };
}

function subgraphEntry(overrides: Partial<CatsLogReceiptEntry> = {}): CatsLogReceiptEntry {
  return bodyEntry({
    receipt: 'receipt-subgraph',
    programSha256: 'b'.repeat(64),
    subgraphSha256: 'c'.repeat(64),
    seedNodeIds: ['plan', 'freeze'],
    nodeRefs: [
      skillNodeCitationRef('deploy-r2', 7, 'freeze'),
      skillNodeCitationRef('deploy-r2', 7, 'plan'),
    ],
    ...overrides,
  });
}

describe('CatsLog receipt ledger with subgraph entries', () => {
  test('stores delivered-program identity, seeds, and node refs for subgraph receipts', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(subgraphEntry(), {
      toolUseId: 'call-1',
      ref: skillCitationRef('deploy-r2', 7),
    });
    assert.equal(ledger.size, 1);
    const entry = ledger.drain()[0];
    assert.equal(entry.programSha256, 'b'.repeat(64));
    assert.equal(entry.subgraphSha256, 'c'.repeat(64));
    assert.deepEqual(entry.seedNodeIds, ['freeze', 'plan']);
    assert.equal(entry.nodeRefs?.length, 2);
    assert.equal(entry.ref, 'catslog:skill:deploy-r2@7');
    assert.equal(entry.stage, 'fetched');
  });

  test('never stores a half-populated subgraph identity', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(subgraphEntry({ subgraphSha256: undefined }));
    ledger.record(subgraphEntry({ programSha256: 'not-a-hash' }));
    for (const entry of ledger.drain()) {
      assert.equal(entry.programSha256, undefined);
      assert.equal(entry.subgraphSha256, undefined);
      assert.equal(entry.seedNodeIds, undefined);
      assert.equal(entry.nodeRefs, undefined);
    }
  });

  test('defensive copies: mutating the emitted entry cannot corrupt the stored record', () => {
    const ledger = new CatsLogReceiptLedger();
    const emitted = subgraphEntry();
    ledger.record(emitted, { ref: skillCitationRef('deploy-r2', 7) });
    emitted.seedNodeIds?.push('INFECTED');
    emitted.nodeRefs?.push('catslog:skill:deploy-r2@7#INFECTED');
    const stored = ledger.drain()[0];
    assert.deepEqual(stored.seedNodeIds, ['freeze', 'plan']);
    assert.equal(stored.nodeRefs?.some(ref => ref.includes('INFECTED')), false);
  });

  test('selection advances via any delivered node ref, not only the version ref', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(subgraphEntry(), { toolUseId: 'call-1', ref: skillCitationRef('deploy-r2', 7) });
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    // The model cites only one delivered node.
    ledger.markSelectedForRefs(['catslog:skill:deploy-r2@7#plan']);
    assert.equal(ledger.drain()[0].stage, 'selected');
  });

  test('a foreign node ref does not mark selection', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(subgraphEntry(), { toolUseId: 'call-1', ref: skillCitationRef('deploy-r2', 7) });
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    ledger.markSelectedForRefs(['catslog:skill:deploy-r2@7#undelivered-node']);
    assert.equal(ledger.drain()[0].stage, 'consumed');
  });

  test('body receipts keep their legacy shape and selection semantics', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(bodyEntry(), { toolUseId: 'call-1', ref: skillCitationRef('deploy-r2', 7) });
    ledger.markConsumedForToolCallIds(new Set(['call-1']));
    ledger.markSelectedForRefs([skillCitationRef('deploy-r2', 7)]);
    const entry = ledger.drain()[0];
    assert.equal(entry.stage, 'selected');
    assert.equal(entry.programSha256, undefined);
  });

  test('stages only move forward when node-ref matching repeats', () => {
    const ledger = new CatsLogReceiptLedger();
    ledger.record(subgraphEntry(), { ref: skillCitationRef('deploy-r2', 7) });
    ledger.markSelectedForRefs(['catslog:skill:deploy-r2@7#plan']);
    assert.equal(ledger.drain()[0].stage, 'fetched', 'selection must not skip the consumed stage');
  });

  test('FIFO bound and counters stay intact with node-heavy entries', () => {
    const ledger = new CatsLogReceiptLedger();
    for (let index = 0; index < MAX_CATSLOG_RECEIPT_ENTRIES + 4; index++) {
      ledger.record(subgraphEntry({
        receipt: `receipt-${index}`,
        nodeRefs: Array.from({ length: 64 }, (_, node) => skillNodeCitationRef('deploy-r2', index, `node-${node}`)),
      }));
    }
    assert.equal(ledger.size, MAX_CATSLOG_RECEIPT_ENTRIES);
    assert.equal(ledger.droppedFifoOverflow, 4);
    const drained = ledger.drain();
    assert.equal(drained[0].receipt, 'receipt-4');
  });

  test('node ref builders keep one grammar', () => {
    assert.equal(skillCitationRef('deploy r2', 7), 'catslog:skill:deploy_r2@7');
    assert.equal(skillNodeCitationRef('deploy r2', 7, 'plan'), 'catslog:skill:deploy_r2@7#plan');
  });
});
