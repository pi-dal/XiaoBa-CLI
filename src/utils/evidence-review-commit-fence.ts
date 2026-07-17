/**
 * Review Commit Fence (#109).
 *
 * Atomic version-vector comparison of the immutable Review Basis before a
 * Capability Transition commits. Relevant pre-fence changes create a Successor
 * Review Job; post-fence changes schedule ordinary reassessment later.
 */

import type { CapabilityReadSetEntry, EvidenceBundle } from './skill-evolution';
import type { EvidenceReviewJob, ReviewBasis } from './evidence-review-types';
import { buildReviewBasis, createEvidenceReviewJob, reuseSucceededQuanta } from './evidence-review-graph';
import { hashEvidenceBundle } from './evidence-review';
import type { DistilledKnowledgeCandidate } from './capability-distiller';

export type FenceComparison =
  | { status: 'match' }
  | {
      status: 'stale';
      reason: string;
      changed: Array<'evidence' | 'registry' | 'referenced_skills' | 'policy' | 'target'>;
    };

export function compareReviewBasis(
  basis: ReviewBasis,
  live: {
    bundle: EvidenceBundle;
    registryReadSet?: readonly CapabilityReadSetEntry[];
    reviewPolicyVersion?: string;
    promptVersion?: string;
  },
): FenceComparison {
  const current = buildReviewBasis({
    bundle: live.bundle,
    manifestHash: basis.manifestHash,
    registryReadSet: live.registryReadSet,
    reviewPolicyVersion: live.reviewPolicyVersion,
    promptVersion: live.promptVersion,
  });

  // Recompute live evidence hash against the job's frozen bundle identity.
  // Fence uses declared basis fields, not the job's embedded shard set mutation.
  const liveEvidenceHash = hashEvidenceBundle(live.bundle);
  const changed: Array<'evidence' | 'registry' | 'referenced_skills' | 'policy' | 'target'> = [];

  if (liveEvidenceHash !== basis.evidenceBundleHash) changed.push('evidence');
  if (
    JSON.stringify(current.registryReadSetFingerprints)
    !== JSON.stringify(basis.registryReadSetFingerprints)
  ) {
    changed.push('registry');
  }
  if (
    JSON.stringify(current.referencedSkillHashes)
    !== JSON.stringify(basis.referencedSkillHashes)
  ) {
    changed.push('referenced_skills');
  }
  if (
    (live.reviewPolicyVersion ?? basis.reviewPolicyVersion) !== basis.reviewPolicyVersion
    || (live.promptVersion ?? basis.promptVersion) !== basis.promptVersion
  ) {
    changed.push('policy');
  }
  if (
    current.targetCapabilityHandle !== basis.targetCapabilityHandle
    || current.targetCapabilityRevision !== basis.targetCapabilityRevision
  ) {
    changed.push('target');
  }

  // Unrelated registry entries outside the declared read set do not invalidate.
  // buildReviewBasis only fingerprints the provided registryReadSet argument;
  // callers must pass the job's declared set (or the live equivalent for those handles).
  if (changed.length === 0) return { status: 'match' };
  return {
    status: 'stale',
    reason: `Review Basis stale: ${changed.join(',')}`,
    changed,
  };
}

/**
 * Create a Successor Review Job after a stale fence, reusing still-valid quanta.
 */
export function createSuccessorReviewJob(input: {
  staleJob: EvidenceReviewJob;
  liveBundle: EvidenceBundle;
  candidate: DistilledKnowledgeCandidate;
  registryReadSet?: readonly CapabilityReadSetEntry[];
  now?: Date;
}): EvidenceReviewJob {
  const successor = createEvidenceReviewJob({
    bundle: input.liveBundle,
    candidate: input.candidate,
    workClass: input.staleJob.workClass,
    registryReadSet: input.registryReadSet,
    parentJobId: input.staleJob.jobId,
    now: input.now,
  });
  const reused = reuseSucceededQuanta(successor, input.staleJob);
  reused.parentJobId = input.staleJob.jobId;
  return reused;
}

export function markJobSuperseded(
  staleJob: EvidenceReviewJob,
  successorJobId: string,
  now = new Date(),
): EvidenceReviewJob {
  return {
    ...staleJob,
    disposition: 'superseded',
    successorJobId,
    updatedAt: now.toISOString(),
    terminalReason: `Superseded by successor job ${successorJobId}`,
  };
}
