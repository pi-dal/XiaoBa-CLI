/**
 * Episode Evidence Bundle Builder
 *
 * Focused responsibility extracted from RuntimeLearning: assemble the
 * fixed Evidence Bundle that the Skill Author / Verifier branches consume for
 * one Learning Episode. This module holds only the pure assembly logic —
 * RuntimeLearning decides *when* to build a bundle and *when* to admit it for
 * review. Structured data (completion evidence, settlement evidence, related
 * current skills, capsule reconstruction) stays here; the calling class still
 * owns wake coordination, scheduling, and persistence.
 *
 * Behavior is preserved exactly: the public function signature and return
 * shape match the private `buildEpisodeEvidenceBundle` that previously lived at
 * the bottom of `runtime-learning.ts`.
 */

import type { LearningEpisode } from './learning-episode';
import type { DistilledKnowledgeCandidate } from './capability-distiller';
import type { SkillEvolutionRuntime } from './skill-evolution';
import type {
  BoundedSourceEvidence,
  EvidenceBundle,
  RelatedCurrentSkill,
  SkillEvidenceRef,
} from './skill-evolution';
import type { EvidenceCapsuleStore } from './evidence-capsule';
import { reconstructBundleFromCapsule } from './evidence-capsule';

// Re-export the bundle-related types that RuntimeLearning previously
// re-exported from its tail, so external consumers can still reach them through
// either module without changing import sites.
export type {
  BoundedSourceEvidence,
  EvidenceBundle,
  RelatedCurrentSkill,
  SkillEvidenceRef,
};

/**
 * Build the fixed Evidence Bundle for one Learning Episode.
 *
 * For external-origin episodes that have a persisted Evidence Capsule, the
 * entire bundle is reconstructed from the capsule so Author/Verifier never see
 * raw external detail leaked through the fallback candidate's actionPattern
 * or solvedLoop fields. External-origin episodes without a capsule fail fast.
 *
 * @param episode           The matured Learning Episode to assemble evidence for.
 * @param candidate         The distilled knowledge candidate describing the episode.
 * @param skillEvolution     The SkillEvolutionRuntime providing the current registry and referenced-skill snapshots.
 * @param capsuleStore      Optional capsule store; when present, external-origin episodes are reconstructed from their capsule.
 * @param isExternalEpisode Optional predicate marking an episode as external-origin (requires a persisted capsule).
 */
export function buildEpisodeEvidenceBundle(
  episode: LearningEpisode,
  candidate: DistilledKnowledgeCandidate,
  skillEvolution: SkillEvolutionRuntime,
  capsuleStore?: EvidenceCapsuleStore,
  isExternalEpisode?: (episodeId: string) => boolean,
): EvidenceBundle {
  const completionEvidence: readonly SkillEvidenceRef[] = episode.completionEvidence
    .filter(evidence => evidence.kind !== 'contradiction')
    .map(evidence => ({
      ref: evidence.ref,
      sourceFilePath: evidence.sourceFilePath,
      turn: evidence.turn,
    }));
  const settlementEvidence: readonly SkillEvidenceRef[] = [{
    ref: `${episode.sourceFilePath}#episode-${episode.episodeId}:settled-${episode.settlementDeadline}`,
    sourceFilePath: episode.sourceFilePath,
    turn: episode.deliveryTurn,
  }];
  const registry = skillEvolution.getRegistry();
  const relatedCurrentSkills: readonly RelatedCurrentSkill[] = Object.values(registry.capabilities).map(
    record => ({
      handle: record.handle,
      revision: record.revision,
      routingName: record.routingName,
      description: record.description,
      guidanceHash: record.guidanceHash,
    }),
  );

  const bundleId = `v3:learning-episode:${episode.episodeId}`;

  if (capsuleStore) {
    const capsule = capsuleStore.findByBundleId(bundleId);
    if (capsule) {
      // For external-origin evidence, reconstruct the entire bundle from the
      // pinned capsule so Author/Verifier never see raw external detail leaked
      // through the fallback candidate's actionPattern or solvedLoop fields.
      return reconstructBundleFromCapsule(
        capsule,
        skillEvolution.getReferencedSkillSnapshots(),
        registry,
      );
    }
    if (!capsule && isExternalEpisode?.(episode.episodeId)) {
      throw new Error(
        `External-origin Learning Episode ${episode.episodeId} requires a persisted Evidence Capsule before review.`,
      );
    }
  }

  return {
    bundleId,
    episode: candidate,
    completionEvidence,
    settlementEvidence,
    boundedContinuity: [],
    semanticObservations: episode.semanticObservations,
    referencedSkills: skillEvolution.getReferencedSkillSnapshots(),
    relatedCurrentSkills,
  };
}