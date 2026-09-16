import { randomUUID } from 'crypto';
import type { CatscoSkillMemoryItem } from './catsco-log-agent-client';

/**
 * Client-owned selection-episode route telemetry for the Memory Branch
 * (CatsLog Route Attribution, Graph Evolution Phase 0 client slice).
 *
 * For every successful `catslog_skill_memory` metadata page the branch
 * generates one opaque selection-episode id and remembers, per exact citation
 * triple (handle + revision + content_sha256), which recent page offered it.
 * A later `catslog_skill_fetch` of a remembered triple carries `route_id`
 * with `hop 0` and no `edge_key`, so the server can freeze the selection
 * episode into the delivery receipt's route context.
 *
 * This is client-owned planner telemetry — never proof of the offered page,
 * never a semantic SkillSubgraph edge, and never an evolution input. The
 * server cannot verify it; it only freezes it as attribution context. An
 * unmatched, ambiguous, expired, or evicted citation conservatively omits the
 * route and preserves exact v1 behavior.
 *
 * Lifecycle: one tracker per memory-branch run, owned by the branch session,
 * cleared when the run ends. Bounded by entry count (FIFO eviction) and a
 * sliding TTL checked lazily at lookup. Nothing here is persisted, logged,
 * serialized, or exposed to the model.
 */

/** Client-owned route telemetry attached to one exact citation fetch. */
export interface CatsLogRouteTelemetry {
  routeId: string;
  /**
   * Direct selection episode. This client slice pins hop 0: it has no graph
   * planner, so it never claims a deeper traversal, and it never sends an
   * `edge_key` (the server derives per-candidate identities itself).
   */
  hop: 0;
}

/** Exact citation triple used as the page-membership key. */
export interface CatsLogSelectionCitation {
  handle: string;
  revision: number;
  contentSha256: string;
}

/** Server bound: a route id is at most 128 chars (`ValidateSkillRouteAttribution`). */
export const MAX_CATSLOG_ROUTE_ID_LENGTH = 128;
/**
 * Citation bookkeeping bound: 8 result items × 8 bounded pages of branch
 * working set. Overflow evicts the oldest triples FIFO.
 */
export const MAX_CATSLOG_SELECTION_EPISODE_ENTRIES = 64;
/**
 * Page identities are selection-scoped working memory, mirroring the
 * retrieval-receipt TTL horizon: an older mapping is stale and omitted.
 */
export const CATSLOG_SELECTION_EPISODE_TTL_MS = 30 * 60 * 1000;

interface TrackedSelectionEntry {
  routeId: string;
  recordedAtMs: number;
}

/**
 * Normalizes a citation triple into the map key, or returns null when the
 * triple can never be a valid CatsLog citation (the tool layer rejects such
 * fetches anyway, so tracking them would be dead bookkeeping).
 */
function citationKey(citation: CatsLogSelectionCitation): string | null {
  const handle = typeof citation?.handle === 'string' ? citation.handle.trim() : '';
  const revision = citation?.revision;
  const contentSha256 = typeof citation?.contentSha256 === 'string'
    ? citation.contentSha256.trim().toLowerCase()
    : '';
  if (!handle || handle.length > 512) return null;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) return null;
  if (!/^[0-9a-f]{64}$/.test(contentSha256)) return null;
  return `${handle}\u0000${revision}\u0000${contentSha256}`;
}

export class CatsLogSelectionEpisodeTracker {
  /** Insertion order is recency: re-recorded triples move to the newest slot. */
  private readonly entries = new Map<string, TrackedSelectionEntry>();
  private evictedEntries = 0;

  constructor(private readonly now: () => number = Date.now) {}

  /**
   * Records one delivered metadata page under a fresh opaque episode id.
   * Items that fail citation validation are skipped, so a fetch of them
   * conservatively omits the route. Re-encountering a triple overwrites its
   * entry: the most recent offering wins deterministically. A page with no
   * trackable item stores nothing.
   */
  trackPage(items: ReadonlyArray<CatscoSkillMemoryItem | null | undefined> | undefined): void {
    const list = Array.isArray(items) ? items : [];
    const keys: string[] = [];
    for (const item of list) {
      const key = citationKey({
        handle: String(item?.handle ?? ''),
        revision: item?.revision as number,
        contentSha256: String(item?.content_sha256 ?? ''),
      });
      if (key) keys.push(key);
    }
    if (keys.length === 0) return;
    const routeId = randomUUID();
    for (const key of keys) {
      // Delete-then-set refreshes Map recency order (most-recent wins).
      this.entries.delete(key);
      this.entries.set(key, { routeId, recordedAtMs: this.now() });
    }
    while (this.entries.size > MAX_CATSLOG_SELECTION_EPISODE_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
      this.evictedEntries += 1;
    }
  }

  /**
   * Resolves the selection-episode telemetry for one exact citation, or
   * undefined when the triple is unknown, malformed, expired, or was evicted.
   * The returned object is a fresh copy; callers cannot alias the bookkeeping.
   */
  routeForCitation(citation: CatsLogSelectionCitation): CatsLogRouteTelemetry | undefined {
    const key = citationKey(citation);
    if (!key) return undefined;
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() - entry.recordedAtMs > CATSLOG_SELECTION_EPISODE_TTL_MS) {
      // Lazy expiry: a page identity past the TTL horizon no longer
      // describes the current selection episode; omit and reclaim.
      this.entries.delete(key);
      return undefined;
    }
    return { routeId: entry.routeId, hop: 0 };
  }

  /** Clears all run-scoped bookkeeping (branch termination). */
  clear(): void {
    this.entries.clear();
    this.evictedEntries = 0;
  }

  /** Current number of tracked citation triples. */
  get size(): number {
    return this.entries.size;
  }

  /** Entries dropped by the FIFO bound since the last `clear()`. */
  get evictedEntryCount(): number {
    return this.evictedEntries;
  }
}
