import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  CATSLOG_SELECTION_EPISODE_TTL_MS,
  CatsLogSelectionEpisodeTracker,
  MAX_CATSLOG_ROUTE_ID_LENGTH,
  MAX_CATSLOG_SELECTION_EPISODE_ENTRIES,
} from '../src/utils/catslog-selection-episodes';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);

function item(handle: string, revision: number, contentSha256: string): Record<string, unknown> {
  return { handle, revision, content_sha256: contentSha256 };
}

/** Injectable clock so TTL behavior is deterministic. */
class FakeClock {
  private current = 1_000_000;
  readonly now = () => this.current;
  advance(ms: number): void {
    this.current += ms;
  }
}

describe('CatsLogSelectionEpisodeTracker', () => {
  test('resolves the exact citation triple of a tracked page to hop-0 telemetry', () => {
    const clock = new FakeClock();
    const tracker = new CatsLogSelectionEpisodeTracker(clock.now);
    tracker.trackPage([
      item('release-playbook', 3, SHA_A),
      item('deploy-notes', 1, SHA_B),
    ]);

    const telemetry = tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A });
    assert.ok(telemetry);
    // Exactly the two telemetry fields; hop is pinned to 0 and there is no
    // edge key (the server derives per-candidate identities itself).
    assert.deepEqual(Object.keys(telemetry).sort(), ['hop', 'routeId']);
    assert.equal(telemetry.hop, 0);
    assert.ok(telemetry.routeId.length > 0);
    assert.ok(telemetry.routeId.length <= MAX_CATSLOG_ROUTE_ID_LENGTH);
    // Items of the SAME delivered page share one selection-episode id.
    const samePage = tracker.routeForCitation({ handle: 'deploy-notes', revision: 1, contentSha256: SHA_B });
    assert.equal(samePage?.routeId, telemetry.routeId);
    // A later tracked page generates a distinct opaque episode id.
    clock.advance(1);
    tracker.trackPage([item('incident-notes', 2, SHA_C)]);
    const nextPage = tracker.routeForCitation({ handle: 'incident-notes', revision: 2, contentSha256: SHA_C });
    assert.notEqual(nextPage?.routeId, telemetry.routeId);
  });

  test('citation normalization matches the fetch path: case-insensitive hash, trimmed handle', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([item('  release-playbook  ', 3, SHA_A.toUpperCase())]);
    assert.ok(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A }));
    assert.ok(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A.toUpperCase() }));
  });

  test('most-recent exact match wins when the same triple is offered by a newer page', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([item('release-playbook', 3, SHA_A)]);
    const first = tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A });
    tracker.trackPage([item('release-playbook', 3, SHA_A), item('other', 1, SHA_B)]);
    const second = tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A });

    assert.ok(first && second);
    assert.notEqual(first.routeId, second.routeId);
    // The most recent page deterministically owns the mapping.
    const again = tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A });
    assert.equal(again?.routeId, second.routeId);
    assert.equal(tracker.size, 2);
  });

  test('a citation that no page offered omits the route', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([item('release-playbook', 3, SHA_A)]);
    for (const citation of [
      { handle: 'unknown-skill', revision: 1, contentSha256: SHA_A },
      { handle: 'release-playbook', revision: 4, contentSha256: SHA_A },
      { handle: 'release-playbook', revision: 3, contentSha256: SHA_C },
      { handle: '', revision: 3, contentSha256: SHA_A },
      { handle: 'release-playbook', revision: 0, contentSha256: SHA_A },
      { handle: 'release-playbook', revision: 1.5, contentSha256: SHA_A },
      { handle: 'release-playbook', revision: 3, contentSha256: 'not-a-hash' },
    ]) {
      assert.equal(
        tracker.routeForCitation(citation),
        undefined,
        `expected omission for ${JSON.stringify(citation)}`,
      );
    }
  });

  test('expired page identities are omitted and reclaimed lazily', () => {
    const clock = new FakeClock();
    const tracker = new CatsLogSelectionEpisodeTracker(clock.now);
    tracker.trackPage([item('release-playbook', 3, SHA_A)]);
    clock.advance(CATSLOG_SELECTION_EPISODE_TTL_MS - 1);
    assert.ok(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A }));
    // At exactly the TTL horizon the identity is still valid; only a strictly
    // older identity is stale.
    clock.advance(1);
    assert.ok(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A }));
    clock.advance(1);
    assert.equal(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A }), undefined);
    assert.equal(tracker.size, 0);
  });

  test('storage is bounded with FIFO eviction of the oldest triples', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    // One page fills the whole bound (unique 64-char hex per item).
    const hexFor = (index: number) => index.toString(16).padStart(2, '0').repeat(2) + '0'.repeat(60);
    const fullPage = Array.from({ length: MAX_CATSLOG_SELECTION_EPISODE_ENTRIES }, (_, index) =>
      item(`skill-${index}`, 1, hexFor(index)));
    tracker.trackPage(fullPage);
    assert.equal(tracker.size, MAX_CATSLOG_SELECTION_EPISODE_ENTRIES);
    const oldestCitation = { handle: 'skill-0', revision: 1, contentSha256: hexFor(0) };
    assert.ok(tracker.routeForCitation(oldestCitation));

    // One more page evicts exactly the number of newly stored triples.
    tracker.trackPage([item('brand-new', 1, SHA_C)]);
    assert.equal(tracker.size, MAX_CATSLOG_SELECTION_EPISODE_ENTRIES);
    assert.equal(tracker.evictedEntryCount, 1);
    assert.equal(tracker.routeForCitation(oldestCitation), undefined);
    assert.ok(tracker.routeForCitation({ handle: 'brand-new', revision: 1, contentSha256: SHA_C }));
  });

  test('repeated pages never exceed the bound and re-offers are not evictions', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    for (let page = 0; page < 12; page++) {
      tracker.trackPage([item('skill', 1, SHA_A)]);
    }
    assert.equal(tracker.size, 1);
    // Overwrites of the same key do not count as evictions.
    assert.equal(tracker.evictedEntryCount, 0);
  });

  test('clear() empties all bookkeeping for the next run', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([item('release-playbook', 3, SHA_A)]);
    tracker.trackPage(Array.from({ length: MAX_CATSLOG_SELECTION_EPISODE_ENTRIES + 2 }, (_, index) =>
      item(`skill-${index}`, 1, 'd'.repeat(64))));
    assert.ok(tracker.size > 0);
    assert.ok(tracker.evictedEntryCount > 0);

    tracker.clear();
    assert.equal(tracker.size, 0);
    assert.equal(tracker.evictedEntryCount, 0);
    assert.equal(tracker.routeForCitation({ handle: 'release-playbook', revision: 3, contentSha256: SHA_A }), undefined);
  });

  test('malformed page items are skipped, not tracked; empty pages store nothing', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([
      item('no-hash', 1, 'short'),
      item('bad-revision', 0, SHA_A),
      { handle: 'missing-revision', content_sha256: SHA_A },
      null,
      undefined,
      'garbage',
    ] as any);
    assert.equal(tracker.size, 0);
    tracker.trackPage(undefined);
    tracker.trackPage([]);
    assert.equal(tracker.size, 0);
  });

  test('a duplicated triple within one page collapses to a single entry', () => {
    const tracker = new CatsLogSelectionEpisodeTracker();
    tracker.trackPage([item('dup', 1, SHA_A), item('dup', 1, SHA_A)]);
    assert.equal(tracker.size, 1);
    assert.ok(tracker.routeForCitation({ handle: 'dup', revision: 1, contentSha256: SHA_A }));
  });
});
