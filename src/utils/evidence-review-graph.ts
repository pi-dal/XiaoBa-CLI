/**
 * Evidence Review Dependency Graph construction and content-identified Quantum IDs.
 */

import * as crypto from 'crypto';
import type { EvidenceBundle, CapabilityReadSetEntry } from './skill-evolution';
import type { DistilledKnowledgeCandidate } from './capability-distiller';
import {
  EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
  EVIDENCE_REVIEW_POLICY_VERSION,
  EVIDENCE_REVIEW_PROMPT_VERSION,
  type EvidenceReviewJob,
  type EvidenceShard,
  type ReviewBasis,
  type ReviewQuantumKind,
  type ReviewQuantumRecord,
  type ReviewWorkClass,
} from './evidence-review-types';
import { hashEvidenceBundle, shardEvidenceBundle, type ShardingOptions } from './evidence-sharding';

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b, 'en'))) {
      out[key] = canonicalize(record[key]);
    }
    return out;
  }
  return value;
}

export function makeQuantumId(
  jobId: string,
  kind: ReviewQuantumKind,
  inputHash: string,
): string {
  return `q:${jobId}:${kind}:${inputHash.slice(0, 16)}`;
}

export function quantumInputHash(parts: Record<string, unknown>): string {
  return sha256(stableStringify(parts));
}

export function buildReviewBasis(input: {
  bundle: EvidenceBundle;
  manifestHash: string;
  registryReadSet?: readonly CapabilityReadSetEntry[];
  reviewPolicyVersion?: string;
  promptVersion?: string;
}): ReviewBasis {
  const referencedSkillHashes = (input.bundle.referencedSkills ?? []).map(skill => (
    sha256(stableStringify(skill))
  )).sort((a, b) => a.localeCompare(b, 'en'));
  const registryReadSet = [...(input.registryReadSet ?? [])]
    .map(entry => ({ handle: entry.handle, revision: entry.revision }))
    .sort((a, b) => a.handle.localeCompare(b.handle, 'en'));
  const evidenceBundleHash = hashEvidenceBundle(input.bundle);
  const reviewPolicyVersion = input.reviewPolicyVersion ?? EVIDENCE_REVIEW_POLICY_VERSION;
  const promptVersion = input.promptVersion ?? EVIDENCE_REVIEW_PROMPT_VERSION;
  const target = input.bundle.relatedCurrentSkills?.[0] as
    | { handle?: string; revision?: number }
    | undefined;
  const basis: Omit<ReviewBasis, 'basisHash'> = {
    manifestHash: input.manifestHash,
    evidenceBundleHash,
    registryReadSet,
    referencedSkillHashes,
    reviewPolicyVersion,
    promptVersion,
    ...(typeof target?.handle === 'string' ? { targetCapabilityHandle: target.handle } : {}),
    ...(typeof target?.revision === 'number' ? { targetCapabilityRevision: target.revision } : {}),
  };
  return {
    ...basis,
    basisHash: sha256(stableStringify(basis)),
  };
}

function makeQuantum(
  jobId: string,
  kind: ReviewQuantumKind,
  inputParts: Record<string, unknown>,
  dependencyQuantumIds: readonly string[],
  extras: Partial<Pick<ReviewQuantumRecord, 'shardId' | 'lane'>> = {},
  nowIso: string,
): ReviewQuantumRecord {
  const inputHash = quantumInputHash({
    kind,
    promptVersion: EVIDENCE_REVIEW_PROMPT_VERSION,
    policyVersion: EVIDENCE_REVIEW_POLICY_VERSION,
    ...inputParts,
  });
  return {
    quantumId: makeQuantumId(jobId, kind, inputHash),
    kind,
    inputHash,
    dependencyQuantumIds: [...dependencyQuantumIds],
    ...extras,
    state: 'pending',
    attempts: 0,
    currentDelayMs: 0,
    transcriptPaths: [],
    updatedAt: nowIso,
  };
}

export interface CreateEvidenceReviewJobInput {
  bundle: EvidenceBundle;
  candidate: DistilledKnowledgeCandidate;
  workClass: ReviewWorkClass;
  registryReadSet?: readonly CapabilityReadSetEntry[];
  parentJobId?: string;
  now?: Date;
  sharding?: ShardingOptions;
  jobId?: string;
}

export function createEvidenceReviewJob(input: CreateEvidenceReviewJobInput): EvidenceReviewJob {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const { manifest, shards } = shardEvidenceBundle(input.bundle, input.sharding);
  const basis = buildReviewBasis({
    bundle: input.bundle,
    manifestHash: manifest.manifestHash,
    registryReadSet: input.registryReadSet,
  });
  const jobId = input.jobId ?? `job:${basis.basisHash.slice(0, 20)}:${input.bundle.bundleId.slice(0, 24)}`;

  const quanta: Record<string, ReviewQuantumRecord> = {};
  const authorReaderIds: string[] = [];
  const verifierReaderIds: string[] = [];

  for (const shard of shards) {
    const author = makeQuantum(
      jobId,
      'author_reader',
      { lane: 'author', shardId: shard.shardId, contentHash: shard.contentHash },
      [],
      { shardId: shard.shardId, lane: 'author' },
      nowIso,
    );
    const verifier = makeQuantum(
      jobId,
      'verifier_reader',
      { lane: 'verifier', shardId: shard.shardId, contentHash: shard.contentHash },
      [],
      { shardId: shard.shardId, lane: 'verifier' },
      nowIso,
    );
    quanta[author.quantumId] = author;
    quanta[verifier.quantumId] = verifier;
    authorReaderIds.push(author.quantumId);
    verifierReaderIds.push(verifier.quantumId);
  }

  const authorDossier = makeQuantum(
    jobId,
    'author_dossier',
    { lane: 'author', manifestHash: manifest.manifestHash, readers: authorReaderIds },
    authorReaderIds,
    { lane: 'author' },
    nowIso,
  );
  const verifierDossier = makeQuantum(
    jobId,
    'verifier_dossier',
    { lane: 'verifier', manifestHash: manifest.manifestHash, readers: verifierReaderIds },
    verifierReaderIds,
    { lane: 'verifier' },
    nowIso,
  );
  quanta[authorDossier.quantumId] = authorDossier;
  quanta[verifierDossier.quantumId] = verifierDossier;

  const difference = makeQuantum(
    jobId,
    'difference_index',
    { manifestHash: manifest.manifestHash, dossiers: [authorDossier.quantumId, verifierDossier.quantumId] },
    [authorDossier.quantumId, verifierDossier.quantumId],
    {},
    nowIso,
  );
  quanta[difference.quantumId] = difference;

  const obligations = makeQuantum(
    jobId,
    'obligations',
    { manifestHash: manifest.manifestHash, difference: difference.quantumId },
    [difference.quantumId],
    {},
    nowIso,
  );
  quanta[obligations.quantumId] = obligations;

  const skillAuthor = makeQuantum(
    jobId,
    'skill_author',
    { manifestHash: manifest.manifestHash, authorDossier: authorDossier.quantumId },
    [authorDossier.quantumId, obligations.quantumId],
    {},
    nowIso,
  );
  quanta[skillAuthor.quantumId] = skillAuthor;

  const skillVerifier = makeQuantum(
    jobId,
    'skill_verifier',
    {
      manifestHash: manifest.manifestHash,
      author: skillAuthor.quantumId,
      dossiers: [authorDossier.quantumId, verifierDossier.quantumId],
      difference: difference.quantumId,
      obligations: obligations.quantumId,
    },
    [skillAuthor.quantumId, verifierDossier.quantumId, difference.quantumId, obligations.quantumId],
    {},
    nowIso,
  );
  quanta[skillVerifier.quantumId] = skillVerifier;

  const commit = makeQuantum(
    jobId,
    'commit',
    { basisHash: basis.basisHash, skillVerifier: skillVerifier.quantumId },
    [skillVerifier.quantumId],
    {},
    nowIso,
  );
  quanta[commit.quantumId] = commit;

  const shardMap: Record<string, EvidenceShard> = {};
  for (const shard of shards) shardMap[shard.shardId] = shard;

  return {
    schemaVersion: EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
    jobId,
    workClass: input.workClass,
    disposition: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
    candidate: input.candidate,
    bundle: input.bundle,
    manifest: {
      ...manifest,
      createdAt: nowIso,
    },
    shards: shardMap,
    basis,
    quanta,
    parentJobId: input.parentJobId,
  };
}

export function reuseSucceededQuanta(
  successor: EvidenceReviewJob,
  prior: EvidenceReviewJob,
): EvidenceReviewJob {
  const next: EvidenceReviewJob = {
    ...successor,
    quanta: { ...successor.quanta },
    updatedAt: new Date().toISOString(),
  };
  for (const [quantumId, quantum] of Object.entries(prior.quanta)) {
    if (quantum.state !== 'succeeded') continue;
    const candidate = next.quanta[quantumId];
    if (!candidate) continue;
    if (candidate.kind !== quantum.kind) continue;
    if (candidate.inputHash !== quantum.inputHash) continue;
    next.quanta[quantumId] = {
      ...candidate,
      state: 'succeeded',
      result: quantum.result,
      resultHash: quantum.resultHash,
      transcriptPaths: [...quantum.transcriptPaths],
      updatedAt: quantum.updatedAt,
      attempts: quantum.attempts,
    };
  }
  // Also match by kind+inputHash when quantum ids differ across job ids.
  const priorByInput = new Map(
    Object.values(prior.quanta)
      .filter(q => q.state === 'succeeded')
      .map(q => [`${q.kind}:${q.inputHash}`, q] as const),
  );
  for (const [quantumId, quantum] of Object.entries(next.quanta)) {
    if (quantum.state === 'succeeded') continue;
    const match = priorByInput.get(`${quantum.kind}:${quantum.inputHash}`);
    if (!match) continue;
    next.quanta[quantumId] = {
      ...quantum,
      state: 'succeeded',
      result: match.result,
      resultHash: match.resultHash,
      transcriptPaths: [...match.transcriptPaths],
      updatedAt: match.updatedAt,
      attempts: match.attempts,
    };
  }
  return next;
}
