/**
 * Durable Evidence Review Jobs — types and schema (ADR 0045).
 *
 * An Evidence Bundle is an immutable manifest over content-addressed Evidence
 * Shards. Review advances as a dependency graph of independently resumable
 * Review Quanta leased by the Runtime Learning Heartbeat.
 */

import type {
  CapabilityReadSetEntry,
  EvidenceBundle,
  SkillDraft,
  SkillVerifierResult,
} from './skill-evolution';
import type { DistilledKnowledgeCandidate } from './capability-distiller';

export const EVIDENCE_REVIEW_JOB_SCHEMA_VERSION = 1 as const;

export const EVIDENCE_REVIEW_PROMPT_VERSION = 'evidence-review-job-v1' as const;
export const EVIDENCE_REVIEW_POLICY_VERSION = 'evidence-review-policy-v1' as const;

/** Domain unit kinds used by Deterministic Evidence Sharding. */
export type EvidenceShardDomainKind =
  | 'episode'
  | 'completion_evidence'
  | 'settlement_evidence'
  | 'bounded_continuity'
  | 'referenced_skill'
  | 'related_current_skill'
  | 'semantic_observations'
  | 'source_evidence'
  | 'bundle_remainder';

export type EvidenceShardCoverageDisposition =
  | 'covered'
  | 'unreadable'
  | 'ambiguous'
  | 'empty';

export type ReviewQuantumKind =
  | 'author_reader'
  | 'verifier_reader'
  | 'author_dossier'
  | 'verifier_dossier'
  | 'difference_index'
  | 'obligations'
  | 'skill_author'
  | 'skill_verifier'
  | 'commit';

export type ReviewQuantumState =
  | 'pending'
  | 'leased'
  | 'succeeded'
  | 'retry_wait'
  | 'terminal_failed';

export type EvidenceReviewJobDisposition =
  | 'active'
  | 'deferred'
  | 'completed'
  | 'superseded'
  | 'terminal_failed';

export type ReviewWorkClass =
  | 'operational_recovery'
  | 'live_learning'
  | 'historical_learning'
  | 'semantic_reassessment';

export type ReviewFindingClass =
  | 'fact'
  | 'limitation'
  | 'risk'
  | 'contradiction'
  | 'source_instruction'
  | 'privilege_implication'
  | 'unresolved_question'
  | 'classification_difference'
  | 'uncorroborated_claim';

export interface EvidenceShardSpan {
  readonly start: number;
  readonly end: number;
}

export interface EvidenceShard {
  readonly shardId: string;
  readonly domainKind: EvidenceShardDomainKind;
  readonly sourceIdentity: string;
  readonly contentHash: string;
  readonly content: string;
  readonly byteLength: number;
}

export interface EvidenceBundleManifest {
  readonly manifestId: string;
  readonly manifestHash: string;
  readonly bundleId: string;
  readonly shardIds: readonly string[];
  readonly createdAt: string;
}

export interface ReviewBasis {
  readonly basisHash: string;
  readonly manifestHash: string;
  readonly evidenceBundleHash: string;
  readonly registryReadSet: readonly CapabilityReadSetEntry[];
  readonly referencedSkillHashes: readonly string[];
  readonly reviewPolicyVersion: string;
  readonly promptVersion: string;
  readonly targetCapabilityHandle?: string;
  readonly targetCapabilityRevision?: number;
}

export interface TypedFinding {
  readonly findingId: string;
  readonly classification: ReviewFindingClass;
  readonly summary: string;
  readonly spans: readonly EvidenceShardSpan[];
  readonly diagnostic?: string;
}

export interface ShardFindingSet {
  readonly shardId: string;
  readonly contentHash: string;
  readonly lane: 'author' | 'verifier';
  readonly coverage: EvidenceShardCoverageDisposition;
  readonly findings: readonly TypedFinding[];
  readonly diagnostic?: string;
}

export interface EvidenceDossier {
  readonly lane: 'author' | 'verifier';
  readonly manifestHash: string;
  readonly coveredShardIds: readonly string[];
  readonly findings: readonly TypedFinding[];
  readonly findingSets: readonly ShardFindingSet[];
}

export interface DossierDifferenceEntry {
  readonly kind:
    | 'missing_citation'
    | 'classification_conflict'
    | 'coverage_gap'
    | 'conflicting_finding';
  readonly leftFindingId?: string;
  readonly rightFindingId?: string;
  readonly shardId?: string;
  readonly detail: string;
}

export interface DossierDifferenceIndex {
  readonly manifestHash: string;
  readonly entries: readonly DossierDifferenceEntry[];
}

export interface ReviewObligation {
  readonly obligationId: string;
  readonly kind: ReviewFindingClass | 'difference';
  readonly summary: string;
  readonly relatedFindingIds: readonly string[];
  readonly requiredShardIds: readonly string[];
}

export interface ObligationDisposition {
  readonly obligationId: string;
  readonly decision: 'accepted' | 'mitigated' | 'deferred' | 'rejected';
  readonly rationale: string;
  readonly citedSpans: readonly {
    readonly shardId: string;
    readonly span: EvidenceShardSpan;
  }[];
}

export interface QuantumLease {
  readonly leaseId: string;
  readonly ownerWakeId: string;
  readonly leasedAt: string;
  readonly expiresAt: string;
}

export interface ReviewQuantumRecord {
  readonly quantumId: string;
  readonly kind: ReviewQuantumKind;
  readonly inputHash: string;
  readonly dependencyQuantumIds: readonly string[];
  readonly shardId?: string;
  readonly lane?: 'author' | 'verifier';
  state: ReviewQuantumState;
  attempts: number;
  currentDelayMs: number;
  nextRetryAt?: string;
  lease?: QuantumLease;
  resultHash?: string;
  result?: unknown;
  failureMessage?: string;
  transcriptPaths: string[];
  updatedAt: string;
}

export interface EvidenceReviewJob {
  schemaVersion: typeof EVIDENCE_REVIEW_JOB_SCHEMA_VERSION;
  jobId: string;
  workClass: ReviewWorkClass;
  disposition: EvidenceReviewJobDisposition;
  createdAt: string;
  updatedAt: string;
  /** Original candidate snapshot for queue compatibility and commit. */
  candidate: DistilledKnowledgeCandidate;
  /** Fixed Evidence Bundle snapshot for this job. */
  bundle: EvidenceBundle;
  manifest: EvidenceBundleManifest;
  shards: Record<string, EvidenceShard>;
  basis: ReviewBasis;
  quanta: Record<string, ReviewQuantumRecord>;
  authorDossier?: EvidenceDossier;
  verifierDossier?: EvidenceDossier;
  differenceIndex?: DossierDifferenceIndex;
  obligations?: readonly ReviewObligation[];
  obligationDispositions?: readonly ObligationDisposition[];
  draft?: SkillDraft;
  verifierResult?: SkillVerifierResult;
  transitionId?: string;
  successorJobId?: string;
  supersededByJobId?: string;
  parentJobId?: string;
  terminalReason?: string;
  nextDueAt?: string;
}

export interface EvidenceReviewJobStoreState {
  schemaVersion: typeof EVIDENCE_REVIEW_JOB_SCHEMA_VERSION;
  jobs: Record<string, EvidenceReviewJob>;
  /** Fairness cursors for Review Quantum Scheduling. */
  fairness: {
    nextWorkClass: ReviewWorkClass;
    classCursors: Partial<Record<ReviewWorkClass, string>>;
    jobCursors: Partial<Record<string, string>>;
  };
  stateCorrupt?: boolean;
}

export interface EvidenceReviewDiagnostics {
  jobId: string;
  disposition: EvidenceReviewJobDisposition;
  workClass: ReviewWorkClass;
  basisHash: string;
  manifestHash: string;
  shardCount: number;
  authorCoveredShards: number;
  verifierCoveredShards: number;
  runnableQuanta: number;
  leasedQuanta: number;
  retryingQuanta: number;
  failedQuanta: number;
  succeededQuanta: number;
  obligationCount: number;
  unresolvedObligations: number;
  nextDueAt?: string;
  successorJobId?: string;
  transitionId?: string;
  terminalReason?: string;
}
