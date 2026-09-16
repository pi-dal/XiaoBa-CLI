import * as fs from 'fs';
import * as path from 'path';

export interface CatscoBootstrapInput {
  deviceId: string;
  deviceName?: string;
  platform?: string;
  hostname?: string;
  agentVersion?: string;
  catscoUserToken: string;
  signal?: AbortSignal;
}
export interface CatscoBootstrapResponse {
  user_id: string;
  external_provider: string;
  external_user_id: string;
  device_id: string;
  token_id: string;
  token: string;
  /** Device-bound read capability; never substitute the upload token. */
  skill_token_id?: string;
  skill_token?: string;
  skill_token_expires_at?: string;
  skills_url?: string;
  skill_graph_url?: string;
  memory_url?: string;
  memory_recall_url?: string;
  memory_notes_url?: string;
  memory_write_token_id?: string;
  memory_write_token?: string;
  memory_write_token_expires_at?: string;
  upload_url: string;
  issued_at: string;
  expires_at?: string;
  upload_protocol?: number;
  append_url?: string;
}

export interface CatscoUploadResponse {
  upload_id?: string;
  record_id?: string;
  sha256?: string;
  parse_status?: string;
  status?: string;
}

export interface CatscoAppendResponse {
  upload_id?: string;
  sha256?: string;
  status?: string;
  accepted_offset: number;
  revision: string;
}

export interface CatscoSkillMemoryQuery {
  task?: string;
  handle?: string;
  limit?: number;
  includeContent?: boolean;
  /**
   * Node-level discovery: attach the metadata-only `program_nodes` block to
   * items backed by a schema-2 program. Server bounds: node summary limit
   * 1..16 (default 8), edge summary limit 1..32 (default 16).
   */
  includeNodes?: boolean;
  nodeSummaryLimit?: number;
  edgeSummaryLimit?: number;
  routeId?: string;
  hop?: number;
  edgeKey?: string;
}

/** Metadata-only per-item node discovery block (never bodies or rationales). */
export interface CatscoSkillProgramNodesSummary {
  schema_version?: number;
  program_sha256?: string;
  node_count?: number;
  edge_count?: number;
  roots?: string[];
  nodes?: Array<{ id?: string; summary?: string }>;
  edges?: Array<{ from?: string; to?: string; required?: boolean }>;
  nodes_truncated?: boolean;
  edges_truncated?: boolean;
}

export interface CatscoSkillMemoryResponse {
  schema_version?: number;
  content_trust?: string;
  catalog_revision?: number;
  items?: CatscoSkillMemoryItem[];
  graph?: Record<string, unknown>;
  truncated?: boolean;
  route?: Record<string, unknown>;
}

export interface CatscoSkillMemoryItem {
  id?: string;
  handle?: string;
  revision?: number;
  routing_name?: string;
  description?: string;
  contract?: unknown;
  content_sha256?: string;
  updated_at?: string;
  content?: string;
  /** One-time capability; callers should not expose it to a model. */
  retrieval_receipt?: string;
  route?: Record<string, unknown>;
  score?: number;
  evidence_count?: number;
  dependency_count?: number;
  outcome?: Record<string, unknown>;
  feedback?: unknown[];
  program_nodes?: CatscoSkillProgramNodesSummary;
}

/**
 * A prepared-context Skill citation. All three fields are required: the exact
 * fetch dereferences this immutable version or fails closed. There is no
 * handle-only mode, so a stale citation can never silently return the current
 * head's body.
 */
export interface CatscoSkillCitation {
  handle: string;
  revision: number;
  contentSha256: string;
}

export interface CatscoSkillFetchResponse {
  schema_version?: number;
  content_trust?: string;
  catalog_revision?: number;
  item?: CatscoSkillMemoryItem;
  /** Exact bounded subgraph delivery; present only when the request carried a program selector. */
  program?: CatscoSkillSubgraph;
  route?: Record<string, unknown>;
}

/** Exact bounded-subgraph request: pinned program plus explicit seeds/budgets. */
export interface CatscoSkillSubgraphSelector {
  programSha256: string;
  /** 1..8 existing node IDs; the server canonicalizes ordering. */
  seedNodeIds: string[];
  maxOptionalNodes?: number;
  maxOptionalEdges?: number;
  maxTotalBytes?: number;
}

/** Delivered subgraph: seed ∪ required closure (never truncated) ∪ deterministic optional expansion. */
export interface CatscoSkillSubgraph {
  schema_version?: number;
  program_sha256?: string;
  subgraph_sha256?: string;
  seed_node_ids?: string[];
  roots?: string[];
  nodes?: Array<{ id?: string; summary?: string; body?: string; source_refs?: string[] }>;
  edges?: Array<{ from?: string; to?: string; required?: boolean; rationale?: string; source_refs?: string[] }>;
  node_count?: number;
  edge_count?: number;
  required_node_count?: number;
  required_edge_count?: number;
  expansion_truncated?: boolean;
}

export interface CatscoMemoryRecallQuery {
  sessionId?: string;
  sessionType?: string;
  groupId?: string;
  agentId?: string;
  entryType?: string;
  latest?: boolean;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  noteLimit?: number;
  cursor?: string;
  includeNotes?: boolean;
  noteKind?: string;
  noteKey?: string;
  noteSearch?: string;
  includeNoteContent?: boolean;
}

export interface CatscoMemoryRecallResponse {
  schema_version?: number;
  content_trust?: string;
  session_available?: boolean;
  session?: CatscoSessionQueryResult;
  notes?: CatscoMemoryNote[];
  notes_truncated?: boolean;
}

export interface CatscoSessionQueryResult {
  schema_version?: number;
  content_trust?: string;
  uid?: string;
  uids?: string[];
  records?: CatscoSessionRecord[];
  next_cursor?: string;
  truncated?: boolean;
  summary?: Record<string, unknown>;
}

export interface CatscoSessionRecord {
  ref?: string;
  stream_id?: string;
  session_id?: string;
  session_type?: string;
  log_date?: string;
  agent_id?: string;
  line?: number;
  entry_type?: string;
  timestamp?: string;
  turn?: number;
  user?: CatscoActor;
  agent?: CatscoActor;
  tool_calls?: Array<{ name?: string; type?: string }>;
  event?: { type?: string; level?: string; message?: string };
  prompt?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  skill_calls?: number;
  skill_names?: string[];
}

export interface CatscoActor {
  text?: string;
  truncated?: boolean;
  redacted?: boolean;
}

export interface CatscoMemoryNote {
  id?: string;
  kind?: string;
  key?: string;
  title?: string;
  content?: string;
  content_sha256?: string;
  source_refs?: string[];
  confidence?: number;
  valid_from?: string;
  valid_to?: string;
  supersedes_id?: string;
  created_at?: string;
  origin?: string;
  skill_version_id?: string;
  feedback_code?: string;
  feedback_outcome?: string;
  feedback_tags?: string[];
  feedback_summary?: string;
  feedback_summary_sha256?: string;
}

/** Exact body delivery for prepared citations; fixed by the CatsLog contract. */
const CATSLOG_CONTEXT_FETCH_URL = '/catsco/agent/context/v1/fetch';

/** Branch use-stage reporting; fixed by the CatsLog contract. */
const CATSLOG_MEMORY_USE_STAGES_URL = '/catsco/agent/memory/use-stages';

/**
 * Branch-native final use fact for one delivered Skill body. This is the
 * Memory Branch Agent's revealed-behavior telemetry — it is never a terminal
 * succeeded/failed/corrected verdict and never consumes the outcome slot.
 */
export type CatscoUseStage = 'fetched_not_consumed' | 'consumed_not_selected' | 'selected';

/**
 * Bounded branch-run disposition vocabulary, carried verbatim from the branch
 * session. It explains the funnel denominator and is never a task verdict.
 */
export type CatscoUseStageDisposition =
  | 'published'
  | 'suppressed_inject_false'
  | 'discarded_queue_closed_or_duplicate'
  | 'cancelled'
  | 'failed';

/**
 * One item of `POST /catsco/agent/memory/use-stages`. The shape is fixed by
 * the server (DisallowUnknownFields): identity fields, the opaque one-time
 * receipt, the final stage, the run disposition, and optionally the frozen
 * per-item route tuple. Scope/UID/session/content selectors are deliberately
 * absent. Server batch bound: at most 8 items per request.
 */
export interface CatscoUseStageReport {
  handle: string;
  revision: number;
  content_sha256: string;
  retrieval_receipt: string;
  stage: CatscoUseStage;
  disposition: CatscoUseStageDisposition;
  route_id?: string;
  hop?: number;
  edge_key?: string;
  /** Delivered-program identity echo; must match the receipt exactly when present. */
  program_sha256?: string;
  subgraph_sha256?: string;
  /** Bounded advisory telemetry (≤8); never verified against subgraph contents. */
  seed_node_ids?: string[];
}

export interface CatscoUseStageResponse {
  results?: Array<{ recorded?: boolean; idempotent?: boolean }>;
}

export class CatscoLogAgentClient {
  constructor(private readonly apiBaseUrl: string) {}

  async bootstrap(input: CatscoBootstrapInput): Promise<CatscoBootstrapResponse> {
    const response = await fetch(this.buildUrl('/catsco/agent/bootstrap'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${input.catscoUserToken}`,
        'Content-Type': 'application/json',
      },
      signal: input.signal,
      body: JSON.stringify({
        device_id: input.deviceId,
        device_name: input.deviceName,
        platform: input.platform,
        hostname: input.hostname,
        agent_version: input.agentVersion,
      }),
    });

    return this.parseJsonResponse<CatscoBootstrapResponse>(response, 'CatsLog bootstrap failed');
  }

  async uploadLog(input: {
    filePath: string;
    token: string;
    logDate: string;
    content?: Uint8Array;
    fileName?: string;
  }): Promise<CatscoUploadResponse> {
    const form = new FormData();
    form.append('log_date', input.logDate);

    const fileBuffer = input.content || fs.readFileSync(input.filePath);
    form.append(
      'file',
      new Blob([fileBuffer], { type: 'application/x-ndjson' }),
      input.fileName || path.basename(input.filePath),
    );

    const response = await fetch(this.buildUrl('/catsco/logs/upload'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
      body: form,
    });

    return this.parseJsonResponse<CatscoUploadResponse>(response, 'CatsLog upload failed');
  }

  async appendLog(input: {
    token: string;
    logDate: string;
    content: Uint8Array;
    fileName: string;
    expectedOffset: number;
    expectedRevision: string;
    requestId: string;
    appendUrl?: string;
    signal?: AbortSignal;
  }): Promise<CatscoAppendResponse> {
    const form = new FormData();
    form.append('log_date', input.logDate);
    form.append(
      'file',
      new Blob([input.content], { type: 'application/x-ndjson' }),
      input.fileName,
    );

    const response = await fetch(this.buildUrl(input.appendUrl || '/catsco/logs/append'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'X-CatsLog-Expected-Offset': String(input.expectedOffset),
        'X-CatsLog-Expected-Revision': input.expectedRevision,
        'X-CatsLog-Request-ID': input.requestId,
      },
      signal: input.signal,
      body: form,
    });

    return this.parseJsonResponse<CatscoAppendResponse>(response, 'CatsLog append failed');
  }

  /**
   * Retrieve current Skills through the device-bound Skill Memory capability.
   * The task is transient and is never sent to an operator endpoint.
   */
  async retrieveSkillMemory(input: CatscoSkillMemoryQuery & {
    token: string;
    memoryUrl: string;
    signal?: AbortSignal;
  }): Promise<CatscoSkillMemoryResponse> {
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({
      task: input.task,
      handle: input.handle,
      limit: input.limit,
      include_content: input.includeContent,
      include_nodes: input.includeNodes,
      node_summary_limit: input.nodeSummaryLimit,
      edge_summary_limit: input.edgeSummaryLimit,
      route_id: input.routeId,
      hop: input.hop,
      edge_key: input.edgeKey,
    })) {
      if (value !== undefined) body[key] = value;
    }
    return this.postCapabilityJSON<CatscoSkillMemoryResponse>(
      input.memoryUrl,
      input.token,
      body,
      'CatsLog Skill Memory retrieval failed',
      input.signal,
    );
  }

  /**
   * Dereference one exact prepared citation into the cited body through the
   * device-bound Skill capability. CatsLog answers 409 citation_stale when the
   * citation no longer names the caller-visible active head; callers must
   * re-prepare (fresh metadata query) instead of retrying by handle alone.
   */
  async fetchSkillCitation(input: CatscoSkillCitation & {
    token: string;
    signal?: AbortSignal;
    /** Client-owned selection-episode label (Route Attribution telemetry). */
    routeId?: string;
    /** Only sent together with routeId; this client sends hop 0. */
    hop?: number;
  }): Promise<CatscoSkillFetchResponse> {
    return this.postCapabilityJSON<CatscoSkillFetchResponse>(
      CATSLOG_CONTEXT_FETCH_URL,
      input.token,
      {
        handle: input.handle,
        revision: input.revision,
        content_sha256: input.contentSha256,
        // Client-owned selection-episode telemetry: the server freezes it
        // onto the receipt's route context. No edge_key is ever sent by this
        // client — the server derives the per-candidate identity itself.
        ...(input.routeId ? { route_id: input.routeId, hop: input.hop } : {}),
      },
      'CatsLog Skill citation fetch failed',
      input.signal,
    );
  }

  /**
   * Exact bounded-subgraph delivery through the same pinned context-fetch
   * endpoint. The `program` selector pins the program content address and
   * seed nodes; a mismatch answers 409 program_stale, an unknown seed 404
   * node_not_found, and an infeasible required closure 400
   * required_closure_exceeds_budget. No receipt is minted on any failure.
   */
  async fetchSkillSubgraph(input: CatscoSkillCitation & CatscoSkillSubgraphSelector & {
    token: string;
    signal?: AbortSignal;
    routeId?: string;
    hop?: number;
  }): Promise<CatscoSkillFetchResponse> {
    const program: Record<string, unknown> = {
      program_sha256: input.programSha256,
      seed_node_ids: input.seedNodeIds,
    };
    if (input.maxOptionalNodes !== undefined) program.max_optional_nodes = input.maxOptionalNodes;
    if (input.maxOptionalEdges !== undefined) program.max_optional_edges = input.maxOptionalEdges;
    if (input.maxTotalBytes !== undefined) program.max_total_bytes = input.maxTotalBytes;
    return this.postCapabilityJSON<CatscoSkillFetchResponse>(
      CATSLOG_CONTEXT_FETCH_URL,
      input.token,
      {
        handle: input.handle,
        revision: input.revision,
        content_sha256: input.contentSha256,
        program,
        ...(input.routeId ? { route_id: input.routeId, hop: input.hop } : {}),
      },
      'CatsLog Skill subgraph fetch failed',
      input.signal,
    );
  }

  /**
   * Report one Memory Branch run's receipt-backed final use facts through the
   * device-bound Skill capability. Non-voting telemetry: the server records
   * at most one immutable fact per receipt and never lets it consume the
   * terminal outcome slot or feed ranking/probation/publication/suppression.
   * The caller must send at most 8 reports per request.
   */
  async reportUseStages(input: {
    token: string;
    stages: readonly CatscoUseStageReport[];
    signal?: AbortSignal;
  }): Promise<CatscoUseStageResponse> {
    return this.postCapabilityJSON<CatscoUseStageResponse>(
      CATSLOG_MEMORY_USE_STAGES_URL,
      input.token,
      { stages: input.stages },
      'CatsLog use-stage report failed',
      input.signal,
    );
  }

  /** Retrieve redacted session evidence and optional Agent Memory notes. */
  async recallMemory(input: CatscoMemoryRecallQuery & {
    token: string;
    memoryRecallUrl: string;
    signal?: AbortSignal;
  }): Promise<CatscoMemoryRecallResponse> {
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({
      session_id: input.sessionId,
      session_type: input.sessionType,
      group_id: input.groupId,
      agent_id: input.agentId,
      entry_type: input.entryType,
      latest: input.latest,
      search: input.search,
      from: input.from,
      to: input.to,
      limit: input.limit,
      note_limit: input.noteLimit,
      cursor: input.cursor,
      include_notes: input.includeNotes,
      note_kind: input.noteKind,
      note_key: input.noteKey,
      note_search: input.noteSearch,
      include_note_content: input.includeNoteContent,
    })) {
      if (value !== undefined) body[key] = value;
    }
    return this.postCapabilityJSON<CatscoMemoryRecallResponse>(
      input.memoryRecallUrl,
      input.token,
      body,
      'CatsLog Agent Memory recall failed',
      input.signal,
    );
  }

  private buildUrl(requestPath: string): string {
    if (!this.apiBaseUrl) {
      throw new Error('CATSCO_LOG_API_BASE_URL is not configured');
    }
    const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
    if (!isSafeCatsLogPath(normalizedPath)) {
      throw new Error('CatsLog returned an unsafe endpoint path');
    }
    return `${this.apiBaseUrl}${normalizedPath}`;
  }

  private async postCapabilityJSON<T>(
    requestPath: string,
    token: string,
    body: Record<string, unknown>,
    fallbackMessage: string,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await fetch(this.buildUrl(requestPath), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify(body),
    });
    return this.parseJsonResponse<T>(response, fallbackMessage);
  }

  private async parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const detail = data?.detail || data?.error || data?.message || data?.raw;
      const error = new Error(detail ? `${fallbackMessage}: ${detail}` : `${fallbackMessage}: HTTP ${response.status}`);
      (error as any).status = response.status;
      (error as any).payload = data;
      throw error;
    }

    return data as T;
  }
}

/** Bootstrap URLs are relative paths owned by CatsLog, never arbitrary URLs. */
export function isSafeCatsLogPath(value: string | undefined): value is string {
  const raw = String(value || '');
  const normalized = raw.trim();
  // Do not return the untrimmed value to callers: a path that is merely
  // whitespace-padded would otherwise validate but be persisted verbatim.
  if (raw !== normalized || normalized.length === 0 || normalized.length > 512) return false;
  if (!/^\/[A-Za-z0-9._~\/-]*$/.test(normalized) || normalized.includes('//')) {
    return false;
  }
  if (normalized === '/') return false;
  return !normalized.split('/').some(segment => segment === '.' || segment === '..');
}
