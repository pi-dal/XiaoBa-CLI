import * as crypto from 'crypto';
import * as os from 'os';
import { APP_VERSION } from '../version';
import { CatscoLogAgentClient, isSafeCatsLogPath } from './catsco-log-agent-client';
import type {
  CatscoMemoryRecallQuery,
  CatscoMemoryRecallResponse,
  CatscoSkillCitation,
  CatscoSkillFetchResponse,
  CatscoSkillMemoryItem,
  CatscoSkillMemoryQuery,
  CatscoSkillMemoryResponse,
  CatscoSkillSubgraph,
  CatscoSkillSubgraphSelector,
  CatscoUseStageReport,
  CatscoUseStageResponse,
} from './catsco-log-agent-client';
import type { CatsLogReceiptEntry, CatsLogReceiptRoute } from './catslog-receipt-ledger';
import { MAX_CATSLOG_SUBGRAPH_SEED_NODE_IDS, skillNodeCitationRef } from './catslog-receipt-ledger';
import type { CatsLogRouteTelemetry } from './catslog-selection-episodes';
import { MAX_CATSLOG_ROUTE_ID_LENGTH } from './catslog-selection-episodes';
import { getCatscoLogAgentConfig } from './catsco-log-agent-config';
import type { CatscoLogAgentState } from './catsco-log-agent-state';
import {
  clearCatscoSkillToken,
  ensureCatscoDeviceId,
  loadCatscoLogAgentState,
  saveCatscoLogAgentState,
} from './catsco-log-agent-state';

const CAPABILITY_REFRESH_SKEW_MS = 30_000;
const DEFAULT_MEMORY_URL = '/catsco/agent/memory/retrieve';
const DEFAULT_MEMORY_RECALL_URL = '/catsco/agent/memory/recall';

/**
 * Narrow read-only seam consumed by the memory branch. Keeping this as an
 * interface lets tests and other hosts provide a capability without exposing
 * tokens or making the branch know about the upload scheduler.
 */
/**
 * Private capture point for the one-time retrieval receipt of a fetched body.
 * The receipt never appears in the fetch result itself.
 */
export type CatsLogReceiptSink = (entry: CatsLogReceiptEntry) => void;

export interface CatsLogSkillFetchOptions {
  onReceipt?: CatsLogReceiptSink;
  signal?: AbortSignal;
  /**
   * Client-owned selection-episode route telemetry (hop 0, no edge key).
   * Purely advisory planner telemetry that the server freezes onto the
   * receipt's route context; it is not a verification token, and omitting it
   * preserves exact v1 behavior. Invalid telemetry is omitted, never sent.
   */
  routeTelemetry?: CatsLogRouteTelemetry;
}

/** The validated fetch result. The retrieval receipt is deliberately absent. */
export interface CatsLogSkillFetchResult {
  item: CatscoSkillMemoryItem;
  catalogRevision?: number;
  contentTrust?: string;
}

/** Exact bounded-subgraph fetch request: citation plus program selector. */
export type CatsLogSkillSubgraphRequest = CatscoSkillCitation & CatscoSkillSubgraphSelector;

export interface CatsLogSkillSubgraphFetchOptions {
  onReceipt?: CatsLogReceiptSink;
  signal?: AbortSignal;
  /** Same advisory selection-episode telemetry as the exact body fetch. */
  routeTelemetry?: CatsLogRouteTelemetry;
}

/** The validated subgraph delivery. The retrieval receipt is deliberately absent. */
export interface CatsLogSkillSubgraphResult {
  item: CatscoSkillMemoryItem;
  program: CatscoSkillSubgraph;
  catalogRevision?: number;
  contentTrust?: string;
}

export interface CatsLogMemoryBackend {
  retrieveSkillMemory(
    query: CatscoSkillMemoryQuery,
    signal?: AbortSignal,
  ): Promise<CatscoSkillMemoryResponse>;
  recallMemory(
    query: CatscoMemoryRecallQuery,
    signal?: AbortSignal,
  ): Promise<CatscoMemoryRecallResponse>;
  /**
   * Dereference one exact citation (handle + revision + content hash). The
   * implementation must verify the returned body against the citation and
   * capture any retrieval receipt only through `options.onReceipt`. It must
   * reject with `CatsLogCitationStaleError` on a stale citation and never fall
   * back to a handle-only/current-head read.
   */
  fetchSkillCitation(
    citation: CatscoSkillCitation,
    options?: CatsLogSkillFetchOptions,
  ): Promise<CatsLogSkillFetchResult>;
  /**
   * Optional exact bounded-subgraph delivery behind the same pinned citation
   * fence. Hosts and test doubles without node-level support simply omit the
   * method; callers must fall back to `fetchSkillCitation` (the exact body
   * fetch) in that case. Implementations must verify the delivered subgraph
   * against the request (handle, revision, content hash, program hash, seed
   * membership, delivered graph shape) before capturing the receipt through
   * `options.onReceipt`, and must reject with the typed subgraph errors
   * instead of ever retrying program-less.
   */
  fetchSkillSubgraph?(
    request: CatsLogSkillSubgraphRequest,
    options?: CatsLogSkillSubgraphFetchOptions,
  ): Promise<CatsLogSkillSubgraphResult>;
  /**
   * Transport for one Memory Branch run's receipt-backed final use facts
   * (at most 8 per call). Branch-private, non-voting telemetry: never a
   * terminal outcome, never derived from main-agent completion or injection.
   * This is the only network consumer of a receipt after delivery.
   */
  reportUseStages(
    reports: readonly CatscoUseStageReport[],
    signal?: AbortSignal,
  ): Promise<CatscoUseStageResponse>;
}

export interface CatsLogMemoryProviderOptions {
  env?: NodeJS.ProcessEnv;
  clientFactory?: (apiBaseUrl: string) => CatscoLogAgentClient;
  now?: () => number;
}

interface CatsLogReadCapability {
  token: string;
  memoryUrl: string;
  memoryRecallUrl: string;
}

/**
 * Resolves the bootstrap-issued device capability and exposes only the two
 * read operations a branch needs. Upload credentials, operator credentials,
 * and raw filesystem paths never cross this boundary.
 */
export class CatsLogMemoryProvider implements CatsLogMemoryBackend {
  private bootstrapPromise: Promise<CatsLogReadCapability> | null = null;

  constructor(
    private readonly workingDirectory: string,
    private readonly options: CatsLogMemoryProviderOptions = {},
  ) {}

  static shouldExpose(
    workingDirectory: string,
    env: NodeJS.ProcessEnv = process.env,
  ): boolean {
    const role = String(env.XIAOBA_ROLE || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
    if (role === 'inspector-cat') return false;
    if (/^(0|false|off|no)$/i.test(String(env.CATSLOG_MEMORY_ENABLED || '').trim())) {
      return false;
    }
    const config = getCatscoLogAgentConfig(workingDirectory, env);
    if (!config.apiBaseUrl) return false;
    // An explicit opt-in is useful for a runtime that will receive its
    // login/capability shortly after construction. Otherwise avoid adding
    // dead remote tools to every unauthenticated local branch.
    if (/^(1|true|yes|on)$/i.test(String(env.CATSLOG_MEMORY_ENABLED || '').trim())) {
      return true;
    }
    if (config.catscoUserToken) return true;
    const state = loadCatscoLogAgentState(config.stateFilePath);
    if (state.stateCorrupt) return false;
    const expiresAt = Date.parse(String(state.skillTokenExpiresAt || ''));
    return Boolean(state.skillToken && Number.isFinite(expiresAt) && expiresAt > Date.now());
  }

  async retrieveSkillMemory(
    query: CatscoSkillMemoryQuery,
    signal?: AbortSignal,
  ): Promise<CatscoSkillMemoryResponse> {
    return this.withCapability(
      (capability, client) => client.retrieveSkillMemory({
        ...query,
        token: capability.token,
        memoryUrl: capability.memoryUrl,
        signal,
      }),
      signal,
    );
  }

  async recallMemory(
    query: CatscoMemoryRecallQuery,
    signal?: AbortSignal,
  ): Promise<CatscoMemoryRecallResponse> {
    return this.withCapability(
      (capability, client) => client.recallMemory({
        ...query,
        token: capability.token,
        memoryRecallUrl: capability.memoryRecallUrl,
        signal,
      }),
      signal,
    );
  }

  async fetchSkillCitation(
    citation: CatscoSkillCitation,
    options: CatsLogSkillFetchOptions = {},
  ): Promise<CatsLogSkillFetchResult> {
    const selector = normalizeCatscoSkillCitation(citation);
    const routeTelemetry = sanitizeRouteTelemetry(options.routeTelemetry);
    return this.withCapability(async (capability, client) => {
      let response: CatscoSkillFetchResponse;
      try {
        response = await client.fetchSkillCitation({
          ...selector,
          ...(routeTelemetry ? { routeId: routeTelemetry.routeId, hop: routeTelemetry.hop } : {}),
          token: capability.token,
          signal: options.signal,
        });
      } catch (error: any) {
        if (Number(error?.status) === 409) {
          // The citation no longer names the caller-visible active head. This
          // is a distinct, non-retryable signal: re-prepare (fresh metadata
          // query) instead of falling back to a handle-only read.
          throw new CatsLogCitationStaleError();
        }
        throw error;
      }
      return resolveFetchedCitation(selector, response, options.onReceipt);
    }, options.signal);
  }

  /**
   * Exact bounded-subgraph delivery behind the same pinned citation fence.
   * The citation fences run exactly as in `fetchSkillCitation`; the program
   * block is then verified client-side (schema 2, program-hash echo, canonical
   * seed echo, seed membership, delivered graph shape) before the one receipt
   * — bound to (version, program, subgraph) — is routed to the private sink.
   * Every failure is a typed, non-retryable error; a program-less retry is
   * never attempted.
   */
  async fetchSkillSubgraph(
    request: CatsLogSkillSubgraphRequest,
    options: CatsLogSkillSubgraphFetchOptions = {},
  ): Promise<CatsLogSkillSubgraphResult> {
    const selector = normalizeCatscoSkillCitation(request);
    const seeds = normalizeSubgraphSeedNodeIds(request.seedNodeIds);
    const programSha256 = canonicalSubgraphHashOrThrow(request.programSha256);
    const routeTelemetry = sanitizeRouteTelemetry(options.routeTelemetry);
    return this.withCapability(async (capability, client) => {
      let response: CatscoSkillFetchResponse;
      try {
        response = await client.fetchSkillSubgraph({
          handle: selector.handle,
          revision: selector.revision,
          contentSha256: selector.contentSha256,
          programSha256,
          seedNodeIds: seeds,
          ...(request.maxOptionalNodes !== undefined ? { maxOptionalNodes: request.maxOptionalNodes } : {}),
          ...(request.maxOptionalEdges !== undefined ? { maxOptionalEdges: request.maxOptionalEdges } : {}),
          ...(request.maxTotalBytes !== undefined ? { maxTotalBytes: request.maxTotalBytes } : {}),
          token: capability.token,
          signal: options.signal,
          ...(routeTelemetry ? { routeId: routeTelemetry.routeId, hop: routeTelemetry.hop } : {}),
        });
      } catch (error: any) {
        throw mapSubgraphFetchError(error);
      }
      return resolveFetchedSubgraph(
        selector,
        programSha256,
        seeds,
        response,
        options.onReceipt,
      );
    }, options.signal);
  }

  /**
   * Reports one branch run's final use-stage facts through the device-bound
   * Skill capability. A rotated capability is refreshed exactly once via the
   * shared `withCapability` path; a divergent replay surfaces as 409 to the
   * caller (the reporter counts it, it never rewrites a recorded fact).
   */
  async reportUseStages(
    reports: readonly CatscoUseStageReport[],
    signal?: AbortSignal,
  ): Promise<CatscoUseStageResponse> {
    return this.withCapability(
      (capability, client) => client.reportUseStages({
        token: capability.token,
        stages: reports,
        signal,
      }),
      signal,
    );
  }

  private async withCapability<T>(
    operation: (capability: CatsLogReadCapability, client: CatscoLogAgentClient) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    let capability = await this.ensureCapability(false, signal);
    const client = this.clientForCurrentConfig();
    try {
      return await operation(capability, client);
    } catch (error: any) {
      if (Number(error?.status) !== 401) throw error;
      // A rotated/revoked capability is refreshed once. Never retry a bad
      // request or silently fall back to an upload/user bearer.
      this.invalidateSkillCapability();
      capability = await this.ensureCapability(true, signal);
      return operation(capability, this.clientForCurrentConfig());
    }
  }

  private async ensureCapability(
    forceRefresh: boolean,
    signal?: AbortSignal,
  ): Promise<CatsLogReadCapability> {
    const config = getCatscoLogAgentConfig(this.workingDirectory, this.options.env ?? process.env);
    if (!config.apiBaseUrl) {
      throw new CatsLogMemoryUnavailableError('CatsLog API is not configured');
    }

    const state = loadCatscoLogAgentState(config.stateFilePath);
    if (state.stateCorrupt) {
      throw new CatsLogMemoryUnavailableError('CatsLog state is corrupt; read capability is paused');
    }
    if (!forceRefresh) {
      const existing = capabilityFromState(state, this.now());
      if (existing) return existing;
    }

    const userToken = config.catscoUserToken;
    if (!userToken) {
      throw new CatsLogMemoryUnavailableError(
        'CatsLog Skill capability is unavailable and no CatsCompany login token is configured',
      );
    }

    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrap(config.stateFilePath, config.apiBaseUrl, userToken, signal)
        .finally(() => {
          this.bootstrapPromise = null;
        });
    }
    return this.bootstrapPromise;
  }

  private async bootstrap(
    stateFilePath: string,
    apiBaseUrl: string,
    userToken: string,
    signal?: AbortSignal,
  ): Promise<CatsLogReadCapability> {
    const state = loadCatscoLogAgentState(stateFilePath);
    if (state.stateCorrupt) {
      throw new CatsLogMemoryUnavailableError('CatsLog state is corrupt; read capability is paused');
    }
    const deviceId = ensureCatscoDeviceId(state, stateFilePath);
    // Persist the generated device identity before the network call so a
    // failed bootstrap cannot rotate the device scope on every retry.
    saveCatscoLogAgentState(stateFilePath, state);
    const response = await this.clientFor(apiBaseUrl).bootstrap({
      deviceId,
      deviceName: os.hostname(),
      platform: `${os.platform()} ${os.release()} ${os.arch()}`,
      hostname: os.hostname(),
      agentVersion: APP_VERSION,
      catscoUserToken: userToken,
      signal,
    });

    const skillToken = String(response.skill_token || '').trim();
    const skillTokenExpiresAt = String(response.skill_token_expires_at || '').trim();
    if (!skillToken || !skillTokenExpiresAt) {
      throw new CatsLogMemoryUnavailableError(
        'CatsLog bootstrap did not issue a device-bound Skill capability',
      );
    }
    const expiresAt = Date.parse(skillTokenExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= this.now()) {
      throw new CatsLogMemoryUnavailableError('CatsLog returned an expired Skill capability');
    }

    // Merge into the latest state so an upload scheduler that advanced while
    // bootstrap was in flight does not lose its append cursor.
    const latest = loadCatscoLogAgentState(stateFilePath);
    if (latest.stateCorrupt) {
      throw new CatsLogMemoryUnavailableError('CatsLog state became corrupt during bootstrap');
    }
    latest.deviceId = response.device_id || deviceId;
    // Keep the process-local identity cache aligned if the server canonicalizes
    // the requested device id during bootstrap.
    ensureCatscoDeviceId(latest, stateFilePath);
    // Deliberately discard the upload namespace returned by bootstrap. The
    // branch owns only the read capability; CatscoLogUploadScheduler remains
    // the sole writer of upload credentials and append cursors.
    latest.skillTokenId = response.skill_token_id;
    latest.skillToken = skillToken;
    latest.skillTokenExpiresAt = skillTokenExpiresAt;
    latest.skillsUrl = isSafeCatsLogPath(response.skills_url) ? response.skills_url : undefined;
    latest.skillGraphUrl = isSafeCatsLogPath(response.skill_graph_url) ? response.skill_graph_url : undefined;
    latest.memoryUrl = isSafeCatsLogPath(response.memory_url) ? response.memory_url : undefined;
    latest.memoryRecallUrl = isSafeCatsLogPath(response.memory_recall_url) ? response.memory_recall_url : undefined;
    latest.memoryNotesUrl = isSafeCatsLogPath(response.memory_notes_url) ? response.memory_notes_url : undefined;
    saveCatscoLogAgentState(stateFilePath, latest);

    return {
      token: skillToken,
      memoryUrl: safePathOrDefault(response.memory_url, DEFAULT_MEMORY_URL),
      memoryRecallUrl: safePathOrDefault(response.memory_recall_url, DEFAULT_MEMORY_RECALL_URL),
    };
  }

  private invalidateSkillCapability(): void {
    const config = getCatscoLogAgentConfig(this.workingDirectory, this.options.env ?? process.env);
    const state = loadCatscoLogAgentState(config.stateFilePath);
    if (state.stateCorrupt) return;
    clearCatscoSkillToken(state);
    saveCatscoLogAgentState(config.stateFilePath, state);
  }

  private clientForCurrentConfig(): CatscoLogAgentClient {
    const config = getCatscoLogAgentConfig(this.workingDirectory, this.options.env ?? process.env);
    return this.clientFor(config.apiBaseUrl);
  }

  private clientFor(apiBaseUrl: string): CatscoLogAgentClient {
    return this.options.clientFactory?.(apiBaseUrl) ?? new CatscoLogAgentClient(apiBaseUrl);
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}

export class CatsLogMemoryUnavailableError extends Error {
  readonly code = 'CATSLOG_MEMORY_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'CatsLogMemoryUnavailableError';
  }
}

/**
 * Process-wide kill state for node-level retrieval arguments (contract §8.7).
 * Once a node-bearing request fails against a server that cannot serve nodes
 * (`node_retrieval_disabled`, or an unknown-field `invalid_request` from an
 * older build), node arguments and the subgraph tool stay disabled for this
 * process, restoring the legacy exact-body path without user intervention.
 * Client and server flags are independent, so either side can roll back alone.
 */
let catsLogSkillNodesPermanentlyDisabled = false;

export interface CatsLogSkillNodesGate {
  /** Static env gate (`CATSLOG_SKILL_NODES_ENABLED`, default off). */
  readonly enabled: boolean;
  isPermanentlyDisabled(): boolean;
  markPermanentlyDisabled(): void;
}

export function isCatsLogSkillNodesEnvEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes|on)$/i.test(String(env.CATSLOG_SKILL_NODES_ENABLED || '').trim());
}

/**
 * Builds the execution-time gate for one branch tool set. `enabled` comes
 * from the host's env read (`isCatsLogSkillNodesEnvEnabled`); the
 * permanent-disable state is process-global by contract.
 */
export function createCatsLogSkillNodesGate(enabled: boolean): CatsLogSkillNodesGate {
  return {
    enabled,
    isPermanentlyDisabled: () => catsLogSkillNodesPermanentlyDisabled,
    markPermanentlyDisabled: () => {
      catsLogSkillNodesPermanentlyDisabled = true;
    },
  };
}

/** Test seam: the permanent-disable state is process-global by contract. */
export function resetCatsLogSkillNodesDisableStateForTests(): void {
  catsLogSkillNodesPermanentlyDisabled = false;
}

/**
 * The pinned program no longer matches the cited version's program (hash
 * mismatch, program absent, or schema v1). Deliberately carries no substitute
 * program: callers must re-run node discovery for a fresh program_sha256 and
 * must never retry the fetch program-less.
 */
export class CatsLogProgramStaleError extends Error {
  readonly code = 'CATSLOG_PROGRAM_STALE';

  constructor() {
    super('CatsLog program no longer matches the cited Skill version; re-run the metadata query with node discovery for a fresh program_sha256');
    this.name = 'CatsLogProgramStaleError';
  }
}

/** A canonicalized seed does not exist in the pinned, fully-authorized program. */
export class CatsLogNodeNotFoundError extends Error {
  readonly code = 'CATSLOG_NODE_NOT_FOUND';

  constructor() {
    super('CatsLog subgraph seed does not exist in the pinned program; re-run node discovery for fresh node ids');
    this.name = 'CatsLogNodeNotFoundError';
  }
}

/** The required closure alone exceeds the byte budget; retry with a larger or absent budget. */
export class CatsLogSubgraphBudgetError extends Error {
  readonly code = 'CATSLOG_SUBGRAPH_BUDGET';

  constructor() {
    super('CatsLog required closure exceeds the subgraph byte budget; retry with a larger max_total_bytes or no budget');
    this.name = 'CatsLogSubgraphBudgetError';
  }
}

/** The server cannot serve node-level retrieval for this process (flag off or old build). */
export class CatsLogNodeRetrievalDisabledError extends Error {
  readonly code = 'CATSLOG_NODES_DISABLED';

  constructor() {
    super('CatsLog node retrieval is disabled on the server; use the exact body fetch (catslog_skill_fetch) instead');
    this.name = 'CatsLogNodeRetrievalDisabledError';
  }
}

function mapSubgraphFetchError(error: any): unknown {
  const status = Number(error?.status);
  if (status !== 400 && status !== 404 && status !== 409) return error;
  const code = String(error?.payload?.error || '');
  if (status === 409) {
    return code === 'program_stale' ? new CatsLogProgramStaleError() : new CatsLogCitationStaleError();
  }
  if (status === 404 && code === 'node_not_found') {
    return new CatsLogNodeNotFoundError();
  }
  if (status === 400) {
    if (code === 'required_closure_exceeds_budget') return new CatsLogSubgraphBudgetError();
    // Both `node_retrieval_disabled` (flag off) and `invalid_request` (old
    // build rejecting unknown fields) mean this server cannot serve nodes.
    if (code === 'node_retrieval_disabled' || code === 'invalid_request') {
      return new CatsLogNodeRetrievalDisabledError();
    }
  }
  return error;
}

/**
 * The citation (handle + revision + content hash) is no longer the
 * caller-visible active head. Deliberately carries no server detail and no
 * substitute content: callers must re-prepare a fresh citation.
 */
export class CatsLogCitationStaleError extends Error {
  readonly code = 'CATSLOG_CITATION_STALE';

  constructor() {
    super('CatsLog citation is no longer the current active version; re-run the metadata query for a fresh citation');
    this.name = 'CatsLogCitationStaleError';
  }
}

/**
 * Fail-closed integrity signal: the response did not match the requested
 * citation (identity fields, body hash, or shape). Never carries the receipt.
 */
export class CatsLogCitationMismatchError extends Error {
  readonly code = 'CATSLOG_CITATION_MISMATCH';

  constructor(detail: string) {
    super(`CatsLog citation fetch failed the exact-match check: ${detail}`);
    this.name = 'CatsLogCitationMismatchError';
  }
}

/**
 * Client node-ID grammar: mirrors the server's canonical node ID pattern
 * (`^[a-z][a-z0-9_-]{0,63}$`). A seed that fails this shape can never name a
 * delivered node, so it is rejected before any network round trip.
 */
const CATSLOG_PROGRAM_NODE_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

function canonicalSubgraphHashOrThrow(value: unknown): string {
  const hash = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new CatsLogCitationMismatchError('program_sha256 must be a 64-character hex digest');
  }
  return hash;
}

function normalizeSubgraphSeedNodeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new CatsLogCitationMismatchError('seed_node_ids must be an array of node ids');
  }
  const seen = new Set<string>();
  for (const raw of value) {
    const id = String(raw || '').trim();
    if (!id) continue;
    if (!CATSLOG_PROGRAM_NODE_ID_PATTERN.test(id)) {
      throw new CatsLogCitationMismatchError('seed node id is not a valid program node id');
    }
    seen.add(id);
  }
  if (seen.size < 1 || seen.size > MAX_CATSLOG_SUBGRAPH_SEED_NODE_IDS) {
    throw new CatsLogCitationMismatchError(
      `seed_node_ids must contain 1..${MAX_CATSLOG_SUBGRAPH_SEED_NODE_IDS} distinct node ids`,
    );
  }
  return [...seen].sort();
}

function normalizeCatscoSkillCitation(citation: CatscoSkillCitation): CatscoSkillCitation {
  const handle = String(citation?.handle || '').trim();
  const revision = citation?.revision;
  const contentSha256 = String(citation?.contentSha256 || '').trim().toLowerCase();
  if (!handle || handle.length > 512) {
    throw new CatsLogCitationMismatchError('citation handle is missing or too long');
  }
  if (!Number.isSafeInteger(revision) || (revision as number) < 1) {
    throw new CatsLogCitationMismatchError('citation revision must be a positive integer');
  }
  if (!/^[0-9a-f]{64}$/.test(contentSha256)) {
    throw new CatsLogCitationMismatchError('citation content_sha256 must be a 64-character hex digest');
  }
  return { handle, revision: revision as number, contentSha256 };
}

/**
 * Shared citation fence: identity fields, declared hash, and the actual
 * SHA-256 of the returned body must all match before either the body or the
 * subgraph delivery may be accepted. Returns the item or throws.
 */
function validateFetchedItemIdentity(
  selector: CatscoSkillCitation,
  response: CatscoSkillFetchResponse,
): CatscoSkillMemoryItem {
  const item = response?.item;
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new CatsLogCitationMismatchError('response carried no item');
  }
  if (String(item.handle || '') !== selector.handle) {
    throw new CatsLogCitationMismatchError('returned handle does not match the citation');
  }
  if (item.revision !== selector.revision) {
    throw new CatsLogCitationMismatchError('returned revision does not match the citation');
  }
  const declaredHash = String(item.content_sha256 || '').toLowerCase();
  if (declaredHash !== selector.contentSha256) {
    throw new CatsLogCitationMismatchError('returned content hash does not match the citation');
  }
  const content = typeof item.content === 'string' ? item.content : '';
  if (!content) {
    throw new CatsLogCitationMismatchError('returned body is empty');
  }
  // Mirror the server's body-hash fence (client-side defense in depth).
  const bodyDigest = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  if (bodyDigest !== selector.contentSha256) {
    throw new CatsLogCitationMismatchError('returned body does not match the cited content hash');
  }
  return item;
}

/**
 * Strictly validates that the fetched response IS the cited version before
 * anything is returned: handle, revision, declared hash, the actual SHA-256 of
 * the returned body, and a nonempty one-time retrieval receipt must all match.
 * Only then is the receipt routed to the private sink, and the returned item
 * copy is stripped of the receipt.
 */
function resolveFetchedCitation(
  selector: CatscoSkillCitation,
  response: CatscoSkillFetchResponse,
  onReceipt?: CatsLogReceiptSink,
): CatsLogSkillFetchResult {
  const item = validateFetchedItemIdentity(selector, response);
  const receipt = typeof item.retrieval_receipt === 'string' ? item.retrieval_receipt.trim() : '';
  if (!receipt) {
    // The server contract issues a one-time receipt for every returned body
    // before the response is sent. A 200 without one means a contract
    // violation (rewriting intermediary, stale server build): fail closed
    // rather than deliver a body whose delivery can never be attributed.
    throw new CatsLogCitationMismatchError('response did not carry a nonempty retrieval receipt');
  }
  if (onReceipt) {
    const route = parseFrozenRoute(item.route);
    onReceipt({
      handle: selector.handle,
      revision: selector.revision,
      contentSha256: selector.contentSha256,
      receipt,
      issuedAt: new Date().toISOString(),
      ...(route ? { route } : {}),
    });
  }
  // Without a sink the receipt is simply dropped; it is never returned or
  // logged. The result copy below must not carry it in either case.
  const { retrieval_receipt: _dropped, ...itemWithoutReceipt } = item;
  return {
    item: itemWithoutReceipt as CatscoSkillMemoryItem,
    catalogRevision: typeof response.catalog_revision === 'number' ? response.catalog_revision : undefined,
    contentTrust: typeof response.content_trust === 'string' ? response.content_trust : undefined,
  };
}

/**
 * Strictly validates one exact bounded-subgraph delivery before anything is
 * returned or the receipt is accepted: the full citation fence (identity,
 * declared hash, body hash), then the program block (schema 2, program-hash
 * echo, canonical seed echo, seed membership, delivered graph shape with no
 * dangling edge endpoints and no unknown roots), and finally a nonempty
 * one-time receipt bound to (version, program, subgraph). Any failure throws
 * `CatsLogCitationMismatchError` and the receipt is never captured.
 */
function resolveFetchedSubgraph(
  selector: CatscoSkillCitation,
  programSha256: string,
  seeds: readonly string[],
  response: CatscoSkillFetchResponse,
  onReceipt?: CatsLogReceiptSink,
): CatsLogSkillSubgraphResult {
  const item = validateFetchedItemIdentity(selector, response);
  const program = response.program;
  if (!program || typeof program !== 'object' || Array.isArray(program)) {
    throw new CatsLogCitationMismatchError('subgraph response carried no program block');
  }
  if (program.schema_version !== 2) {
    throw new CatsLogCitationMismatchError('subgraph response program block is not schema version 2');
  }
  if (canonicalSubgraphHashOrUndefined(program.program_sha256) !== programSha256) {
    throw new CatsLogCitationMismatchError('returned program_sha256 does not match the pinned program');
  }
  const subgraphSha256 = canonicalSubgraphHashOrUndefined(program.subgraph_sha256);
  if (!subgraphSha256) {
    throw new CatsLogCitationMismatchError('subgraph response did not carry a subgraph_sha256 digest');
  }
  const nodes = program.nodes;
  const edges = program.edges;
  if (!Array.isArray(nodes) || nodes.length < 1 || !Array.isArray(edges)) {
    throw new CatsLogCitationMismatchError('subgraph response delivered no nodes or edges');
  }
  const deliveredIds = new Set<string>();
  for (const node of nodes) {
    const id = typeof node?.id === 'string' ? node.id : '';
    if (!CATSLOG_PROGRAM_NODE_ID_PATTERN.test(id)) {
      throw new CatsLogCitationMismatchError('delivered subgraph carries a malformed node id');
    }
    deliveredIds.add(id);
  }
  for (const seed of seeds) {
    if (!deliveredIds.has(seed)) {
      throw new CatsLogCitationMismatchError('delivered subgraph is missing a requested seed node');
    }
  }
  const responseSeeds = Array.isArray(program.seed_node_ids) ? program.seed_node_ids : [];
  if (responseSeeds.length !== seeds.length || !seeds.every((seed, index) => responseSeeds[index] === seed)) {
    // The server canonicalizes seed ordering; a divergent echo means the
    // delivered manifest does not describe this request.
    throw new CatsLogCitationMismatchError('returned seed_node_ids do not match the canonical request seeds');
  }
  for (const edge of edges) {
    const from = typeof edge?.from === 'string' ? edge.from : '';
    const to = typeof edge?.to === 'string' ? edge.to : '';
    if (!deliveredIds.has(from) || !deliveredIds.has(to)) {
      throw new CatsLogCitationMismatchError('delivered subgraph carries an edge with a missing endpoint');
    }
  }
  const roots = Array.isArray(program.roots) ? program.roots : [];
  for (const root of roots) {
    if (typeof root !== 'string' || !deliveredIds.has(root)) {
      throw new CatsLogCitationMismatchError('delivered subgraph carries a root outside the delivered nodes');
    }
  }
  const counts: Array<[string, unknown, number]> = [
    ['node_count', program.node_count, nodes.length],
    ['edge_count', program.edge_count, edges.length],
  ];
  for (const [name, value, expected] of counts) {
    if (value !== expected) {
      throw new CatsLogCitationMismatchError(`subgraph ${name} does not match the delivered ${name === 'node_count' ? 'nodes' : 'edges'}`);
    }
  }
  const receipt = typeof item.retrieval_receipt === 'string' ? item.retrieval_receipt.trim() : '';
  if (!receipt) {
    // Same fence as the body fetch: a 200 without the one-time credential
    // cannot be attributed and is a contract violation, not a soft case.
    throw new CatsLogCitationMismatchError('subgraph response did not carry a nonempty retrieval receipt');
  }
  if (onReceipt) {
    const route = parseFrozenRoute(item.route);
    onReceipt({
      handle: selector.handle,
      revision: selector.revision,
      contentSha256: selector.contentSha256,
      receipt,
      issuedAt: new Date().toISOString(),
      programSha256,
      subgraphSha256,
      seedNodeIds: [...seeds],
      nodeRefs: [...deliveredIds].map(nodeId => skillNodeCitationRef(selector.handle, selector.revision, nodeId)),
      ...(route ? { route } : {}),
    });
  }
  const { retrieval_receipt: _droppedProgramReceipt, ...itemWithoutReceipt } = item;
  return {
    item: itemWithoutReceipt as CatscoSkillMemoryItem,
    program,
    catalogRevision: typeof response.catalog_revision === 'number' ? response.catalog_revision : undefined,
    contentTrust: typeof response.content_trust === 'string' ? response.content_trust : undefined,
  };
}

function canonicalSubgraphHashOrUndefined(value: unknown): string | undefined {
  const hash = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(hash) ? hash : undefined;
}

/**
 * Client route telemetry is advisory: anything that fails this slice's wire
 * contract (hop 0 only, nonempty route id within the server's 128-char bound)
 * is omitted rather than sent, preserving exact v1 behavior. A malformed
 * label must never be upgraded into a server-visible assertion.
 */
function sanitizeRouteTelemetry(value: CatsLogRouteTelemetry | undefined): CatsLogRouteTelemetry | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const routeId = typeof value.routeId === 'string' ? value.routeId.trim() : '';
  if (!routeId || routeId.length > MAX_CATSLOG_ROUTE_ID_LENGTH) return undefined;
  if (value.hop !== 0) return undefined;
  return { routeId, hop: 0 };
}

/**
 * Parses the frozen per-item route tuple from a delivery response. Returns
 * undefined unless all three fields are present and within the server's
 * bounds (route id ≤128, hop 0..2, edge ≤256); a malformed tuple is omitted
 * rather than sent, because an omitted route inherits the receipt's identical
 * frozen attribution on the server.
 */
function parseFrozenRoute(value: unknown): CatsLogReceiptRoute | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  // Exact shape: the server freezes exactly these three fields. Anything else
  // (missing field, out-of-bounds value, extra key) is a contract violation;
  // omitting is conservative because the server then inherits the receipt's
  // identical frozen attribution.
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'edge_key,hop,route_id') return undefined;
  const routeId = typeof record.route_id === 'string' ? record.route_id.trim() : '';
  const hop = record.hop;
  const edgeKey = typeof record.edge_key === 'string' ? record.edge_key.trim() : '';
  if (!routeId || routeId.length > 128) return undefined;
  if (!Number.isInteger(hop) || (hop as number) < 0 || (hop as number) > 2) return undefined;
  if (!edgeKey || edgeKey.length > 256) return undefined;
  return { routeId, hop: hop as number, edgeKey };
}

function capabilityFromState(
  state: CatscoLogAgentState,
  now: number,
): CatsLogReadCapability | null {
  const token = String(state.skillToken || '').trim();
  const expiresAt = Date.parse(String(state.skillTokenExpiresAt || ''));
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= now + CAPABILITY_REFRESH_SKEW_MS) {
    return null;
  }
  return {
    token,
    memoryUrl: safePathOrDefault(state.memoryUrl, DEFAULT_MEMORY_URL),
    memoryRecallUrl: safePathOrDefault(state.memoryRecallUrl, DEFAULT_MEMORY_RECALL_URL),
  };
}

function safePathOrDefault(value: string | undefined, fallback: string): string {
  return isSafeCatsLogPath(value) ? value : fallback;
}
