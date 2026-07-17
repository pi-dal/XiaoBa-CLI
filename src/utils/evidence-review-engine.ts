/**
 * Evidence Review Job engine — leases and executes Review Quanta.
 *
 * For the one-shard tracer (#105), reader/dossier/diff/obligation quanta are
 * Runtime-deterministic. Skill Author / Verifier / commit reuse the existing
 * branch and transition paths so Branch Transcript, Journal, and Audit hold.
 */

import * as crypto from 'crypto';
import type {
  EvidenceBundle,
  SkillDraft,
  SkillVerifierResult,
  SkillEvolutionResult,
  SkillEvolutionOptions,
} from './skill-evolution';
import type { DistilledKnowledgeCandidate } from './capability-distiller';
import {
  EVIDENCE_REVIEW_POLICY_VERSION,
  EVIDENCE_REVIEW_PROMPT_VERSION,
  type EvidenceDossier,
  type EvidenceReviewJob,
  type DossierDifferenceIndex,
  type ObligationDisposition,
  type ReviewObligation,
  type ReviewQuantumRecord,
  type ReviewWorkClass,
  type ShardFindingSet,
  type TypedFinding,
} from './evidence-review-types';
import { createEvidenceReviewJob } from './evidence-review-graph';
import {
  deriveJobDisposition,
  isQuantumRunnable,
  listRunnableQuanta,
  loadEvidenceReviewJobStore,
  saveEvidenceReviewJobStore,
  upsertEvidenceReviewJob,
  evidenceReviewJobStorePathForReviewQueue,
} from './evidence-review-job-store';
import { verifyShardContent } from './evidence-sharding';

const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_RETRY_BASE_MS = 1_000;
const DEFAULT_RETRY_MAX_MS = 60_000;
const MAX_QUANTUM_ATTEMPTS = 8;

export interface EvidenceReviewEngineOptions {
  jobStorePath: string;
  workingDirectory: string;
  leaseMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  now?: () => Date;
  /** Bound newly claimed quanta in one advance pass. */
  maxQuantaPerAdvance?: number;
  /** Execute Skill Author using existing branch path. */
  runSkillAuthor: (input: {
    bundle: EvidenceBundle;
    authorDossier: EvidenceDossier;
    job: EvidenceReviewJob;
    signal?: AbortSignal;
  }) => Promise<{ draft: SkillDraft; transcriptPaths: string[] }>;
  /** Execute final Skill Verifier with dual dossiers + obligations. */
  runSkillVerifier: (input: {
    bundle: EvidenceBundle;
    draft: SkillDraft;
    authorDossier: EvidenceDossier;
    verifierDossier: EvidenceDossier;
    differenceIndex: DossierDifferenceIndex;
    obligations: readonly ReviewObligation[];
    job: EvidenceReviewJob;
    signal?: AbortSignal;
  }) => Promise<{
    verifier: SkillVerifierResult;
    dispositions: readonly ObligationDisposition[];
    transcriptPaths: string[];
  }>;
  /** Atomic commit through existing journal/audit path. */
  commitTransition: (input: {
    bundle: EvidenceBundle;
    draft: SkillDraft;
    verifier: SkillVerifierResult;
    job: EvidenceReviewJob;
    branchTranscriptPaths: string[];
  }) => Promise<SkillEvolutionResult>;
}

export interface AdvanceJobResult {
  job: EvidenceReviewJob;
  executedQuantumIds: string[];
  remainingRunnable: number;
  result?: SkillEvolutionResult;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function validateFindingSet(set: ShardFindingSet, shardContent: string): void {
  if (!set.shardId || !set.contentHash || !set.lane) {
    throw new Error('invalid_completion_schema: Shard Finding Set missing identity fields');
  }
  if (!['covered', 'unreadable', 'ambiguous', 'empty'].includes(set.coverage)) {
    throw new Error('invalid_completion_schema: invalid coverage disposition');
  }
  if (!Array.isArray(set.findings)) {
    throw new Error('invalid_completion_schema: findings must be an array');
  }
  const contentLen = Buffer.byteLength(shardContent, 'utf8');
  for (const finding of set.findings) {
    if (!finding.findingId || !finding.classification || !finding.summary) {
      throw new Error('invalid_completion_schema: finding missing required fields');
    }
    for (const span of finding.spans ?? []) {
      if (
        typeof span.start !== 'number'
        || typeof span.end !== 'number'
        || span.start < 0
        || span.end < span.start
        || span.end > contentLen
      ) {
        throw new Error('invalid_completion_schema: finding span out of shard bounds');
      }
    }
  }
}

/** Deterministic structural reader — no model authority over shard boundaries. */
export function readShardStructurally(
  shardId: string,
  contentHash: string,
  content: string,
  lane: 'author' | 'verifier',
): ShardFindingSet {
  const findings: TypedFinding[] = [];
  const lower = content.toLowerCase();
  const push = (
    classification: TypedFinding['classification'],
    summary: string,
    needle: string,
  ): void => {
    const idx = lower.indexOf(needle.toLowerCase());
    if (idx < 0) return;
    const start = Buffer.byteLength(content.slice(0, idx), 'utf8');
    const end = start + Buffer.byteLength(content.slice(idx, idx + needle.length), 'utf8');
    findings.push({
      findingId: `${lane}:${classification}:${sha256(`${shardId}:${needle}`).slice(0, 12)}`,
      classification,
      summary,
      spans: [{ start, end }],
    });
  };

  if (/ignore (all )?(previous|prior) instructions|system prompt|you are now/i.test(content)) {
    push('source_instruction', 'Source material contains instruction-like text.', 'ignore');
  }
  if (/password|secret|credential|sudo|rm -rf|privilege/i.test(content)) {
    push('privilege_implication', 'Source material mentions privilege-sensitive content.', 'privilege');
  }
  if (/risk|danger|unsafe|leak/i.test(content)) {
    push('risk', 'Source material mentions risk language.', 'risk');
  }
  if (/but |however |contradict|instead /i.test(content)) {
    push('limitation', 'Source material contains limiting or contrastive language.', 'but');
  }
  if (findings.length === 0 && content.trim().length > 0) {
    const end = Math.min(Buffer.byteLength(content, 'utf8'), 64);
    findings.push({
      findingId: `${lane}:fact:${contentHash.slice(0, 12)}`,
      classification: 'fact',
      summary: 'Shard content observed for dual-lane coverage.',
      spans: [{ start: 0, end }],
    });
  }

  return {
    shardId,
    contentHash,
    lane,
    coverage: content.trim().length === 0 ? 'empty' : 'covered',
    findings,
  };
}

export function buildDossierFromFindingSets(
  lane: 'author' | 'verifier',
  manifestHash: string,
  sets: readonly ShardFindingSet[],
): EvidenceDossier {
  const covered = sets
    .filter(set => set.coverage === 'covered' || set.coverage === 'empty')
    .map(set => set.shardId)
    .sort((a, b) => a.localeCompare(b, 'en'));
  const findings = sets.flatMap(set => set.findings);
  return {
    lane,
    manifestHash,
    coveredShardIds: covered,
    findings,
    findingSets: sets,
  };
}

export function buildDifferenceIndex(
  author: EvidenceDossier,
  verifier: EvidenceDossier,
): DossierDifferenceIndex {
  const entries: Array<DossierDifferenceIndex['entries'][number]> = [];
  const authorByClass = new Map(author.findings.map(f => [`${f.classification}:${f.summary}`, f]));
  const verifierByClass = new Map(verifier.findings.map(f => [`${f.classification}:${f.summary}`, f]));

  for (const [key, finding] of authorByClass) {
    if (!verifierByClass.has(key)) {
      entries.push({
        kind: 'missing_citation',
        leftFindingId: finding.findingId,
        detail: `Author finding not corroborated by Verifier: ${finding.summary}`,
      });
    }
  }
  for (const [key, finding] of verifierByClass) {
    if (!authorByClass.has(key)) {
      entries.push({
        kind: 'missing_citation',
        rightFindingId: finding.findingId,
        detail: `Verifier finding not present in Author dossier: ${finding.summary}`,
      });
    }
  }

  const authorCovered = new Set(author.coveredShardIds);
  const verifierCovered = new Set(verifier.coveredShardIds);
  for (const shardId of authorCovered) {
    if (!verifierCovered.has(shardId)) {
      entries.push({
        kind: 'coverage_gap',
        shardId,
        detail: `Author covered shard ${shardId} but Verifier did not`,
      });
    }
  }
  for (const shardId of verifierCovered) {
    if (!authorCovered.has(shardId)) {
      entries.push({
        kind: 'coverage_gap',
        shardId,
        detail: `Verifier covered shard ${shardId} but Author did not`,
      });
    }
  }

  return { manifestHash: author.manifestHash, entries };
}

export function buildReviewObligations(
  author: EvidenceDossier,
  verifier: EvidenceDossier,
  difference: DossierDifferenceIndex,
): ReviewObligation[] {
  const obligations: ReviewObligation[] = [];
  const highRisk = [...author.findings, ...verifier.findings].filter(f => (
    f.classification === 'risk'
    || f.classification === 'source_instruction'
    || f.classification === 'privilege_implication'
    || f.classification === 'contradiction'
  ));
  for (const finding of highRisk) {
    obligations.push({
      obligationId: `obl:${finding.findingId}`,
      kind: finding.classification,
      summary: finding.summary,
      relatedFindingIds: [finding.findingId],
      requiredShardIds: [],
    });
  }
  for (const [index, entry] of difference.entries.entries()) {
    obligations.push({
      obligationId: `obl:diff:${index}:${sha256(entry.detail).slice(0, 10)}`,
      kind: 'difference',
      summary: entry.detail,
      relatedFindingIds: [entry.leftFindingId, entry.rightFindingId].filter(
        (id): id is string => typeof id === 'string',
      ),
      requiredShardIds: entry.shardId ? [entry.shardId] : [],
    });
  }
  // Stable unique by obligationId
  const seen = new Set<string>();
  return obligations.filter(o => {
    if (seen.has(o.obligationId)) return false;
    seen.add(o.obligationId);
    return true;
  });
}

function claimQuantum(
  quantum: ReviewQuantumRecord,
  wakeId: string,
  now: Date,
  leaseMs: number,
): ReviewQuantumRecord {
  const leasedAt = nowIso(now);
  return {
    ...quantum,
    state: 'leased',
    lease: {
      leaseId: `lease:${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      ownerWakeId: wakeId,
      leasedAt,
      expiresAt: new Date(now.getTime() + leaseMs).toISOString(),
    },
    updatedAt: leasedAt,
  };
}

function succeedQuantum(
  quantum: ReviewQuantumRecord,
  result: unknown,
  transcriptPaths: readonly string[] = [],
  now: Date,
): ReviewQuantumRecord {
  const payload = JSON.stringify(result ?? null);
  return {
    ...quantum,
    state: 'succeeded',
    result,
    resultHash: sha256(payload),
    lease: undefined,
    failureMessage: undefined,
    nextRetryAt: undefined,
    transcriptPaths: [...quantum.transcriptPaths, ...transcriptPaths],
    updatedAt: nowIso(now),
  };
}

function failQuantumRetry(
  quantum: ReviewQuantumRecord,
  message: string,
  retryBaseMs: number,
  retryMaxMs: number,
  now: Date,
  terminal = false,
): ReviewQuantumRecord {
  const attempts = quantum.attempts + 1;
  if (terminal || attempts >= MAX_QUANTUM_ATTEMPTS) {
    return {
      ...quantum,
      state: 'terminal_failed',
      attempts,
      failureMessage: message,
      lease: undefined,
      updatedAt: nowIso(now),
    };
  }
  const previous = quantum.currentDelayMs > 0 ? quantum.currentDelayMs : retryBaseMs;
  const delay = Math.min(retryMaxMs, Math.max(retryBaseMs, previous * 2));
  return {
    ...quantum,
    state: 'retry_wait',
    attempts,
    currentDelayMs: delay,
    nextRetryAt: new Date(now.getTime() + delay).toISOString(),
    failureMessage: message,
    lease: undefined,
    updatedAt: nowIso(now),
  };
}

export class EvidenceReviewEngine {
  private readonly options: EvidenceReviewEngineOptions;

  constructor(options: EvidenceReviewEngineOptions) {
    this.options = options;
  }

  get jobStorePath(): string {
    return this.options.jobStorePath;
  }

  loadStore() {
    return loadEvidenceReviewJobStore(this.options.jobStorePath);
  }

  saveStore(state: ReturnType<typeof loadEvidenceReviewJobStore>): void {
    saveEvidenceReviewJobStore(this.options.jobStorePath, state);
  }

  findActiveJobForBundle(bundleId: string): EvidenceReviewJob | undefined {
    const state = this.loadStore();
    return Object.values(state.jobs)
      .filter(job => job.bundle.bundleId === bundleId && job.disposition === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt, 'en'))[0];
  }

  createJob(input: {
    bundle: EvidenceBundle;
    candidate: DistilledKnowledgeCandidate;
    workClass: ReviewWorkClass;
  }): EvidenceReviewJob {
    const job = createEvidenceReviewJob({
      bundle: input.bundle,
      candidate: input.candidate,
      workClass: input.workClass,
      now: this.options.now?.() ?? new Date(),
    });
    const state = this.loadStore();
    upsertEvidenceReviewJob(state, job);
    this.saveStore(state);
    return job;
  }

  ensureJob(input: {
    bundle: EvidenceBundle;
    candidate: DistilledKnowledgeCandidate;
    workClass: ReviewWorkClass;
  }): EvidenceReviewJob {
    const existing = this.findActiveJobForBundle(input.bundle.bundleId);
    if (existing) return existing;
    return this.createJob(input);
  }

  async advanceJob(
    jobId: string,
    wakeId: string,
    signal?: AbortSignal,
    options?: {
      /** When set, only these quantum kinds may be claimed. */
      allowedKinds?: ReadonlySet<ReviewQuantumRecord['kind']> | readonly ReviewQuantumRecord['kind'][];
    },
  ): Promise<AdvanceJobResult> {
    const nowFn = this.options.now ?? (() => new Date());
    const leaseMs = this.options.leaseMs ?? DEFAULT_LEASE_MS;
    const retryBaseMs = this.options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    const retryMaxMs = this.options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS;
    const maxQuanta = Math.max(1, this.options.maxQuantaPerAdvance ?? 64);
    const allowedKinds = options?.allowedKinds
      ? new Set(options.allowedKinds)
      : undefined;
    const executedQuantumIds: string[] = [];
    let result: SkillEvolutionResult | undefined;

    for (let i = 0; i < maxQuanta; i++) {
      if (signal?.aborted) break;
      const now = nowFn();
      const state = this.loadStore();
      const job = state.jobs[jobId];
      if (!job || job.disposition !== 'active') {
        return {
          job: job ?? state.jobs[jobId]!,
          executedQuantumIds,
          remainingRunnable: 0,
          result,
        };
      }

      // Reclaim expired leases before selection.
      for (const [qid, quantum] of Object.entries(job.quanta)) {
        if (
          quantum.state === 'leased'
          && quantum.lease
          && new Date(quantum.lease.expiresAt).getTime() <= now.getTime()
        ) {
          job.quanta[qid] = {
            ...quantum,
            state: 'pending',
            lease: undefined,
            updatedAt: nowIso(now),
          };
        }
      }

      const runnable = listRunnableQuanta(job, now).filter(q => (
        !allowedKinds || allowedKinds.has(q.kind)
      ));
      if (runnable.length === 0) {
        job.disposition = deriveJobDisposition(job);
        job.updatedAt = nowIso(now);
        upsertEvidenceReviewJob(state, job);
        this.saveStore(state);
        return { job, executedQuantumIds, remainingRunnable: 0, result };
      }

      const selected = selectNextQuantum(job, runnable);
      if (!selected) break;

      const claimed = claimQuantum(selected, wakeId, now, leaseMs);
      job.quanta[claimed.quantumId] = claimed;
      job.updatedAt = nowIso(now);
      upsertEvidenceReviewJob(state, job);
      this.saveStore(state);

      try {
        const execution = await this.executeQuantum(job, claimed, signal);
        const after = this.loadStore();
        const live = after.jobs[jobId]!;
        live.quanta[claimed.quantumId] = succeedQuantum(
          live.quanta[claimed.quantumId]!,
          execution.result,
          execution.transcriptPaths,
          nowFn(),
        );
        if (execution.jobPatch) Object.assign(live, execution.jobPatch);
        if (execution.skillResult) result = execution.skillResult;
        live.disposition = deriveJobDisposition(live);
        live.updatedAt = nowIso(nowFn());
        if (live.disposition === 'completed' && result?.transitionId) {
          live.transitionId = result.transitionId;
        }
        upsertEvidenceReviewJob(after, live);
        this.saveStore(after);
        executedQuantumIds.push(claimed.quantumId);
        if (claimed.kind === 'commit' && result) {
          const remaining = listRunnableQuanta(live, nowFn()).length;
          return { job: live, executedQuantumIds, remainingRunnable: remaining, result };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const terminal = /terminal|integrity|manifest/i.test(message);
        const after = this.loadStore();
        const live = after.jobs[jobId]!;
        live.quanta[claimed.quantumId] = failQuantumRetry(
          live.quanta[claimed.quantumId]!,
          message,
          retryBaseMs,
          retryMaxMs,
          nowFn(),
          terminal,
        );
        live.disposition = deriveJobDisposition(live);
        if (live.disposition === 'terminal_failed') {
          live.terminalReason = message;
        }
        live.updatedAt = nowIso(nowFn());
        // Keep nextDueAt for retry_wait quanta.
        const retrying = Object.values(live.quanta)
          .filter(q => q.state === 'retry_wait' && q.nextRetryAt)
          .map(q => q.nextRetryAt!)
          .sort();
        live.nextDueAt = retrying[0];
        upsertEvidenceReviewJob(after, live);
        this.saveStore(after);
        executedQuantumIds.push(claimed.quantumId);
      }
    }

    const finalState = this.loadStore();
    const finalJob = finalState.jobs[jobId]!;
    const remainingRunnable = listRunnableQuanta(finalJob, nowFn()).length;
    return { job: finalJob, executedQuantumIds, remainingRunnable, result };
  }

  private async executeQuantum(
    job: EvidenceReviewJob,
    quantum: ReviewQuantumRecord,
    signal?: AbortSignal,
  ): Promise<{
    result: unknown;
    transcriptPaths: string[];
    jobPatch?: Partial<EvidenceReviewJob>;
    skillResult?: SkillEvolutionResult;
  }> {
    switch (quantum.kind) {
      case 'author_reader':
      case 'verifier_reader':
        return this.executeReader(job, quantum);
      case 'author_dossier':
        return this.executeDossier(job, 'author');
      case 'verifier_dossier':
        return this.executeDossier(job, 'verifier');
      case 'difference_index':
        return this.executeDifference(job);
      case 'obligations':
        return this.executeObligations(job);
      case 'skill_author':
        return this.executeSkillAuthor(job, signal);
      case 'skill_verifier':
        return this.executeSkillVerifier(job, signal);
      case 'commit':
        return this.executeCommit(job);
      default:
        throw new Error(`unknown quantum kind: ${(quantum as ReviewQuantumRecord).kind}`);
    }
  }

  private executeReader(
    job: EvidenceReviewJob,
    quantum: ReviewQuantumRecord,
  ): { result: ShardFindingSet; transcriptPaths: string[] } {
    const shardId = quantum.shardId;
    if (!shardId) throw new Error('reader quantum missing shardId');
    const shard = job.shards[shardId];
    if (!shard) throw new Error(`missing shard ${shardId}`);
    if (!verifyShardContent(shard)) {
      throw new Error(`integrity: shard content hash mismatch for ${shardId}`);
    }
    const lane = quantum.lane ?? (quantum.kind === 'author_reader' ? 'author' : 'verifier');
    const findingSet = readShardStructurally(shard.shardId, shard.contentHash, shard.content, lane);
    validateFindingSet(findingSet, shard.content);
    if (findingSet.coverage !== 'covered' && findingSet.coverage !== 'empty') {
      throw new Error(`reader coverage incomplete: ${findingSet.coverage}`);
    }
    return { result: findingSet, transcriptPaths: [] };
  }

  private executeDossier(
    job: EvidenceReviewJob,
    lane: 'author' | 'verifier',
  ): { result: EvidenceDossier; transcriptPaths: string[]; jobPatch: Partial<EvidenceReviewJob> } {
    const kind = lane === 'author' ? 'author_reader' : 'verifier_reader';
    const sets = Object.values(job.quanta)
      .filter(q => q.kind === kind && q.state === 'succeeded')
      .map(q => q.result as ShardFindingSet)
      .filter(Boolean);
    if (sets.length !== job.manifest.shardIds.length) {
      throw new Error(`${lane} dossier incomplete: ${sets.length}/${job.manifest.shardIds.length} shards`);
    }
    for (const set of sets) {
      if (set.coverage !== 'covered' && set.coverage !== 'empty') {
        throw new Error(`${lane} dossier blocked by incomplete coverage on ${set.shardId}`);
      }
    }
    const dossier = buildDossierFromFindingSets(lane, job.manifest.manifestHash, sets);
    const jobPatch: Partial<EvidenceReviewJob> = lane === 'author'
      ? { authorDossier: dossier }
      : { verifierDossier: dossier };
    return { result: dossier, transcriptPaths: [], jobPatch };
  }

  private executeDifference(
    job: EvidenceReviewJob,
  ): { result: DossierDifferenceIndex; transcriptPaths: string[]; jobPatch: Partial<EvidenceReviewJob> } {
    if (!job.authorDossier || !job.verifierDossier) {
      throw new Error('difference index requires both dossiers');
    }
    const index = buildDifferenceIndex(job.authorDossier, job.verifierDossier);
    return { result: index, transcriptPaths: [], jobPatch: { differenceIndex: index } };
  }

  private executeObligations(
    job: EvidenceReviewJob,
  ): { result: ReviewObligation[]; transcriptPaths: string[]; jobPatch: Partial<EvidenceReviewJob> } {
    if (!job.authorDossier || !job.verifierDossier || !job.differenceIndex) {
      throw new Error('obligations require dossiers and difference index');
    }
    const obligations = buildReviewObligations(
      job.authorDossier,
      job.verifierDossier,
      job.differenceIndex,
    );
    return { result: obligations, transcriptPaths: [], jobPatch: { obligations } };
  }

  private async executeSkillAuthor(
    job: EvidenceReviewJob,
    signal?: AbortSignal,
  ): Promise<{ result: SkillDraft; transcriptPaths: string[]; jobPatch: Partial<EvidenceReviewJob> }> {
    if (!job.authorDossier) throw new Error('skill author requires author dossier');
    const { draft, transcriptPaths } = await this.options.runSkillAuthor({
      bundle: job.bundle,
      authorDossier: job.authorDossier,
      job,
      signal,
    });
    return { result: draft, transcriptPaths, jobPatch: { draft } };
  }

  private async executeSkillVerifier(
    job: EvidenceReviewJob,
    signal?: AbortSignal,
  ): Promise<{
    result: { verifier: SkillVerifierResult; dispositions: readonly ObligationDisposition[] };
    transcriptPaths: string[];
    jobPatch: Partial<EvidenceReviewJob>;
  }> {
    if (!job.draft || !job.authorDossier || !job.verifierDossier || !job.differenceIndex) {
      throw new Error('skill verifier requires draft, dossiers, and difference index');
    }
    const obligations = job.obligations ?? [];
    const { verifier, dispositions, transcriptPaths } = await this.options.runSkillVerifier({
      bundle: job.bundle,
      draft: job.draft,
      authorDossier: job.authorDossier,
      verifierDossier: job.verifierDossier,
      differenceIndex: job.differenceIndex,
      obligations,
      job,
      signal,
    });
    if (verifier.decision === 'accept') {
      const missing = obligations.filter(o => !dispositions.some(d => d.obligationId === o.obligationId));
      if (missing.length > 0) {
        throw new Error(`integrity: unresolved obligations: ${missing.map(o => o.obligationId).join(',')}`);
      }
      for (const disposition of dispositions) {
        if (disposition.decision === 'deferred') {
          // Unresolved semantics defer rather than commit.
          return {
            result: {
              verifier: {
                ...verifier,
                decision: 'defer',
                rationale: disposition.rationale || verifier.rationale,
              },
              dispositions,
            },
            transcriptPaths,
            jobPatch: {
              verifierResult: {
                ...verifier,
                decision: 'defer',
                rationale: disposition.rationale || verifier.rationale,
              },
              obligationDispositions: dispositions,
              disposition: 'deferred',
              terminalReason: disposition.rationale || 'Unresolved review obligation',
            },
          };
        }
      }
    }
    return {
      result: { verifier, dispositions },
      transcriptPaths,
      jobPatch: {
        verifierResult: verifier,
        obligationDispositions: dispositions,
      },
    };
  }

  private async executeCommit(
    job: EvidenceReviewJob,
  ): Promise<{
    result: SkillEvolutionResult;
    transcriptPaths: string[];
    jobPatch: Partial<EvidenceReviewJob>;
    skillResult: SkillEvolutionResult;
  }> {
    if (!job.draft || !job.verifierResult) {
      throw new Error('commit requires draft and verifier result');
    }
    if (job.verifierResult.decision !== 'accept') {
      // Non-accept outcomes still settle the job without Registry mutation when reject/defer already applied.
      const skillResult: SkillEvolutionResult = {
        transition: job.verifierResult.decision === 'defer' ? 'defer' : 'reject_candidate',
        verified: false,
        rounds: 1,
        draft: job.draft,
        verifier: job.verifierResult,
        queued: job.verifierResult.decision === 'defer' ? 'deferred' : undefined,
      };
      return {
        result: skillResult,
        transcriptPaths: [],
        jobPatch: {
          disposition: job.verifierResult.decision === 'defer' ? 'deferred' : 'completed',
        },
        skillResult,
      };
    }
    // Coverage fence: both lanes must have covered every manifest shard.
    const authorCovered = new Set(job.authorDossier?.coveredShardIds ?? []);
    const verifierCovered = new Set(job.verifierDossier?.coveredShardIds ?? []);
    for (const shardId of job.manifest.shardIds) {
      if (!authorCovered.has(shardId) || !verifierCovered.has(shardId)) {
        throw new Error(`integrity: incomplete dual-lane coverage for ${shardId}`);
      }
    }
    const obligations = job.obligations ?? [];
    const dispositions = job.obligationDispositions ?? [];
    for (const obligation of obligations) {
      const disposition = dispositions.find(d => d.obligationId === obligation.obligationId);
      if (!disposition) throw new Error(`integrity: missing disposition for ${obligation.obligationId}`);
      if (disposition.decision === 'deferred') {
        throw new Error(`integrity: deferred obligation blocks commit: ${obligation.obligationId}`);
      }
    }

    const transcriptPaths = Object.values(job.quanta).flatMap(q => q.transcriptPaths);
    const skillResult = await this.options.commitTransition({
      bundle: job.bundle,
      draft: job.draft,
      verifier: job.verifierResult,
      job,
      branchTranscriptPaths: transcriptPaths,
    });
    return {
      result: skillResult,
      transcriptPaths,
      jobPatch: {
        disposition: 'completed',
        transitionId: skillResult.transitionId ?? skillResult.audit?.transitionId,
      },
      skillResult,
    };
  }
}

/**
 * Prefer critical-path nodes; among reader nodes, balance Author/Verifier lanes.
 */
export function selectNextQuantum(
  job: EvidenceReviewJob,
  runnable: readonly ReviewQuantumRecord[],
): ReviewQuantumRecord | undefined {
  if (runnable.length === 0) return undefined;
  const nonReaders = runnable.filter(q => q.kind !== 'author_reader' && q.kind !== 'verifier_reader');
  if (nonReaders.length > 0) return nonReaders[0];

  const authorDone = Object.values(job.quanta)
    .filter(q => q.kind === 'author_reader' && q.state === 'succeeded').length;
  const verifierDone = Object.values(job.quanta)
    .filter(q => q.kind === 'verifier_reader' && q.state === 'succeeded').length;
  const preferLane: 'author' | 'verifier' = authorDone <= verifierDone ? 'author' : 'verifier';
  const preferred = runnable.find(q => q.lane === preferLane);
  return preferred ?? runnable[0];
}

export function resolveEvidenceReviewJobStorePath(
  options: Pick<SkillEvolutionOptions, 'reviewQueuePath' | 'workingDirectory'>,
): string {
  if (options.reviewQueuePath) {
    return evidenceReviewJobStorePathForReviewQueue(options.reviewQueuePath);
  }
  return `${options.workingDirectory.replace(/\/$/, '')}/data/evidence-review-jobs.json`;
}

export {
  EVIDENCE_REVIEW_POLICY_VERSION,
  EVIDENCE_REVIEW_PROMPT_VERSION,
};
