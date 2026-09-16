/**
 * Bounded, branch-scoped private ledger for one-time CatsLog retrieval
 * receipts and their branch-native use lifecycle.
 *
 * A `retrieval_receipt` is an opaque one-time capability minted by CatsLog when
 * it returns a Skill body. It must never become model-visible context: not in
 * tool results, synthetic messages, logs, exceptions, or serialized debug
 * payloads. This ledger is the only retention point, and it exists so a later
 * outcome phase can correlate a terminal result with the exact Skill Version
 * that was actually delivered.
 *
 * Lifecycle: one ledger per memory-branch run. The branch records receipts
 * through the provider's `onReceipt` callback as exact citations are fetched;
 * each entry starts at stage `fetched`. It advances to `consumed` only when a
 * subsequent provider request actually carried that fetch's tool result to the
 * model, and to `selected` only when the validated finish refs cite the exact
 * consumed citation. Each entry leaves the ledger exactly one way: consumed
 * mid-run via `drain()` (owner polling), or transferred once at run end to the
 * private `onRunEndReceipts` owner callback before the run clears the ledger
 * (success, suppression, cancel, or failure). Entries beyond the bound are
 * dropped FIFO, and a run with no consumer drops everything at cleanup.
 * Nothing here is persisted or logged.
 */

/** Provider-emitted receipt payload. The receipt itself is transport-only. */
export interface CatsLogReceiptEntry {
  handle: string;
  revision: number;
  contentSha256: string;
  /** Opaque one-time credential. Never logged, never serialized. */
  receipt: string;
  /** ISO timestamp of when the fetch response was validated. */
  issuedAt: string;
  /**
   * Frozen per-item route tuple from the delivery response (`items[].route`),
   * repeated verbatim by use-stage reports. Absent means the report omits the
   * route and the server inherits the receipt's immutable attribution.
   */
  route?: CatsLogReceiptRoute;
  /**
   * Delivered-program identity for subgraph receipts (both 64-hex lowercase,
   * or both absent for a body fetch). Repeated verbatim by use-stage reports;
   * a half-populated pair is a body-shaped entry by construction.
   */
  programSha256?: string;
  subgraphSha256?: string;
  /** Canonicalized seed node IDs of the delivered subgraph (≤8). */
  seedNodeIds?: string[];
  /** Node citation refs for every delivered node (≤64), matching finish refs. */
  nodeRefs?: string[];
}

/** Bounded frozen route tuple (server bounds: route id ≤128, hop 0..2, edge ≤256). */
export interface CatsLogReceiptRoute {
  routeId: string;
  hop: number;
  edgeKey: string;
}

/**
 * Branch-private use stage of one receipt. `fetched` means the body was
 * delivered; `consumed` means a provider request actually included the fetch
 * tool result; `selected` means the branch staked its finish on that exact
 * citation. Stages only move forward and only via the marked transitions.
 */
export type CatsLogReceiptStage = 'fetched' | 'consumed' | 'selected';

/** Stored ledger entry: the receipt plus its private use lifecycle. */
export interface CatsLogReceiptLedgerEntry extends CatsLogReceiptEntry {
  /**
   * Exact citation ref (`catslog:skill:<handle>@<revision>`) as projected to
   * the model, so finish-ref matching compares the same normalized string.
   */
  ref?: string;
  /** Tool-use id of the exact catslog_skill_fetch invocation that produced this entry. */
  toolUseId?: string;
  stage: CatsLogReceiptStage;
}

/** Fetch-invocation correlation attached when a receipt is recorded. */
export interface CatsLogReceiptRecordContext {
  toolUseId?: string;
  ref?: string;
}

export const MAX_CATSLOG_RECEIPT_ENTRIES = 16;

/** Server bound on one delivered subgraph's seed set (CatsLog contract). */
export const MAX_CATSLOG_SUBGRAPH_SEED_NODE_IDS = 8;

/** Server bound on delivered nodes per subgraph (program caps at 64). */
export const MAX_CATSLOG_SUBGRAPH_NODE_REFS = 64;

function citationPart(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9._:@-]/g, '_').replace(/\.{2,}/g, '_');
  return normalized.slice(0, 220) || 'skill';
}

/**
 * Exact citation ref for one Skill Version, normalized identically wherever
 * it is projected to the model, stored in the private ledger, and matched
 * against validated finish refs. One spelling per concept: the tools project
 * it, the ledger correlates with it, and the finish-ref allowlist accepts it.
 */
export function skillCitationRef(handle: string, revision: number): string {
  return `catslog:skill:${citationPart(handle)}@${revision}`;
}

/**
 * Node-level citation ref for one node inside a delivered subgraph:
 * `catslog:skill:<handle>@<revision>#<node_id>`. Node IDs must already
 * satisfy the server grammar (`^[a-z][a-z0-9_-]{0,63}$`); the provider
 * validates them before any ref is built.
 */
export function skillNodeCitationRef(handle: string, revision: number, nodeId: string): string {
  return `${skillCitationRef(handle, revision)}#${citationPart(nodeId)}`;
}

function canonicalSubgraphHash(value: unknown): string | undefined {
  const hash = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(hash) ? hash : undefined;
}

function canonicalSeedNodeIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  for (const raw of value) {
    const id = String(raw || '').trim();
    if (id) seen.add(id);
  }
  if (seen.size === 0) return undefined;
  return [...seen].sort().slice(0, MAX_CATSLOG_SUBGRAPH_SEED_NODE_IDS);
}

function canonicalNodeRefs(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  for (const raw of value) {
    const ref = String(raw || '').trim();
    if (ref) seen.add(ref);
  }
  if (seen.size === 0) return undefined;
  return [...seen].slice(0, MAX_CATSLOG_SUBGRAPH_NODE_REFS);
}

/**
 * Defensive copy of the frozen route tuple: the stored entry must never alias
 * a caller-owned object (the provider constructs a fresh one per fetch, but
 * this ledger is the retention point), and a tuple that fails the server
 * bounds (route id ≤128, hop 0..2, edge ≤256) is omitted rather than stored —
 * the server rejects an out-of-bounds replay with a batch-wide 400, so a
 * malformed tuple must never ride into a use-stage report.
 */
function frozenRouteCopy(route: CatsLogReceiptRoute | undefined): CatsLogReceiptRoute | undefined {
  if (!route || typeof route !== 'object') return undefined;
  const routeId = String(route.routeId || '').trim();
  const edgeKey = String(route.edgeKey || '').trim();
  const hop = route.hop;
  if (!routeId || routeId.length > 128) return undefined;
  if (!Number.isInteger(hop) || (hop as number) < 0 || (hop as number) > 2) return undefined;
  if (!edgeKey || edgeKey.length > 256) return undefined;
  return { routeId, hop: hop as number, edgeKey };
}

export class CatsLogReceiptLedger {
  private entries: CatsLogReceiptLedgerEntry[] = [];
  private droppedFifoCount = 0;

  record(entry: CatsLogReceiptEntry, context?: CatsLogReceiptRecordContext): void {
    const receipt = String(entry?.receipt || '').trim();
    if (!receipt) return;
    const route = frozenRouteCopy(entry.route);
    // Subgraph identity is stored only as a complete, valid pair; anything
    // else degrades to the body-delivery shape so a use-stage report can
    // never present a half-populated identity to the server.
    const programSha256 = canonicalSubgraphHash(entry.programSha256);
    const subgraphSha256 = canonicalSubgraphHash(entry.subgraphSha256);
    const hasSubgraphIdentity = Boolean(programSha256 && subgraphSha256);
    const seedNodeIds = hasSubgraphIdentity ? canonicalSeedNodeIds(entry.seedNodeIds) : undefined;
    const nodeRefs = hasSubgraphIdentity ? canonicalNodeRefs(entry.nodeRefs) : undefined;
    this.entries.push({
      handle: String(entry.handle || ''),
      revision: entry.revision,
      contentSha256: String(entry.contentSha256 || ''),
      receipt,
      issuedAt: entry.issuedAt,
      ...(route ? { route } : {}),
      ...(hasSubgraphIdentity ? { programSha256, subgraphSha256 } : {}),
      ...(seedNodeIds ? { seedNodeIds } : {}),
      ...(nodeRefs ? { nodeRefs } : {}),
      ...(context?.toolUseId ? { toolUseId: context.toolUseId } : {}),
      ...(context?.ref ? { ref: context.ref } : {}),
      stage: 'fetched',
    });
    if (this.entries.length > MAX_CATSLOG_RECEIPT_ENTRIES) {
      const overflow = this.entries.length - MAX_CATSLOG_RECEIPT_ENTRIES;
      this.entries.splice(0, overflow);
      this.droppedFifoCount += overflow;
    }
  }

  /**
   * Marks fetched entries consumed when their exact fetch tool result was part
   * of a provider request. At-most-once per entry: only `fetched` entries
   * move, so replayed requests or later scans cannot regress a stage.
   */
  markConsumedForToolCallIds(toolCallIds: ReadonlySet<string>): void {
    if (!toolCallIds || toolCallIds.size === 0) return;
    for (const entry of this.entries) {
      if (entry.stage !== 'fetched') continue;
      if (entry.toolUseId && toolCallIds.has(entry.toolUseId)) {
        entry.stage = 'consumed';
      }
    }
  }

  /**
   * Promotes consumed entries to selected when the validated finish refs cite
   * the exact consumed citation — either the version ref itself or any node
   * ref delivered inside that entry's subgraph. Non-selection is deliberately
   * neutral: an entry stays `consumed`, which is telemetry, never a failure
   * verdict.
   */
  markSelectedForRefs(refs: readonly string[]): void {
    if (!refs || refs.length === 0) return;
    const cited = new Set(refs);
    for (const entry of this.entries) {
      if (entry.stage !== 'consumed') continue;
      const citedVersion = entry.ref !== undefined && cited.has(entry.ref);
      const citedNode = entry.nodeRefs?.some(nodeRef => cited.has(nodeRef)) === true;
      if (citedVersion || citedNode) {
        entry.stage = 'selected';
      }
    }
  }

  /** Returns the captured entries exactly once and leaves the ledger empty. */
  drain(): CatsLogReceiptLedgerEntry[] {
    const drained = this.entries;
    this.entries = [];
    return drained;
  }

  get size(): number {
    return this.entries.length;
  }

  /** Count of entries dropped by the FIFO bound since the last `clear()`. */
  get droppedFifoOverflow(): number {
    return this.droppedFifoCount;
  }

  clear(): void {
    this.entries = [];
    this.droppedFifoCount = 0;
  }
}
