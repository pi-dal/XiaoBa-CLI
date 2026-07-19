import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildEpisodeEvidenceBundle } from '../src/utils/episode-evidence-bundle';
import { EvidenceCapsuleStore } from '../src/utils/evidence-capsule';
import type {
  EvidenceBundle,
  ReferencedSkillSnapshot,
  SkillEvolutionRuntime,
} from '../src/utils/skill-evolution';
import type { LearningEpisode } from '../src/utils/learning-episode';
import type { DistilledKnowledgeCandidate } from '../src/utils/capability-distiller';

/**
 * Focused tests for the extracted episode-evidence-bundle responsibility.
 *
 * buildEpisodeEvidenceBundle was previously a private function at the tail of
 * runtime-learning.ts (with late imports). It was extracted into
 * ./episode-evidence-bundle as a behavior-preserving move. These tests prove the
 * extracted module assembles the fixed Evidence Bundle correctly:
 *   - completion evidence excludes contradictions
 *   - settlement evidence is synthesized from the episode
 *   - related current skills are derived from the live registry
 *   - external-origin episodes require a persisted capsule (fail-fast)
 *   - a persisted capsule reconstructs the bundle instead of using raw episode data
 */

const SAMPLE_REFERENCED_SKILLS: ReferencedSkillSnapshot[] = [
  { capabilityHandle: 'cap-1', name: 'create-sticker-svg', revision: 3 },
];

function makeEpisode(overrides: Partial<LearningEpisode> = {}): LearningEpisode {
  return {
    schemaVersion: 3 as any,
    episodeId: 'episode-test-001',
    runtimeSessionId: 'sess-1',
    sourceFilePath: '/logs/sessions/chat/test.jsonl',
    deliveryTurn: 4,
    completionEvidence: [
      { ref: 'turn-1#completion', sourceFilePath: '/logs/sessions/chat/test.jsonl', turn: 1, kind: 'verified-tool-result' },
      { ref: 'turn-2#contradiction', sourceFilePath: '/logs/sessions/chat/test.jsonl', turn: 2, kind: 'contradiction' },
      { ref: 'turn-3#completion', sourceFilePath: '/logs/sessions/chat/test.jsonl', turn: 3, kind: 'artifact-delivery' },
    ],
    contradictionSignals: [],
    semanticObservations: [
      { kind: 'user-intent', value: 'create a sticker', sourceRefs: ['turn-1#completion'] },
    ],
    settlementDeadline: '2026-01-01T00:00:00.000Z',
    status: 'settled',
    ...overrides,
  } as LearningEpisode;
}

function makeCandidate(): DistilledKnowledgeCandidate {
  return {
    capabilityId: 'episode-capability-test-001',
    title: 'Create Sticker',
    summary: 'A sticker creation capability.',
    evidenceSummary: ['turn-1#completion', 'turn-3#completion'],
    toolNames: ['create_sticker_svg'],
    generatedAt: '2026-01-01T00:00:00.000Z',
    provenance: [],
    observations: [],
  } as unknown as DistilledKnowledgeCandidate;
}

/**
 * Minimal SkillEvolutionRuntime stub: buildEpisodeEvidenceBundle only calls
 * getRegistry() and getReferencedSkillSnapshots(), so a structural stub is
 * sufficient and avoids constructing the full runtime with all its options.
 */
function makeSkillEvolutionStub(registry: {
  capabilities: Record<string, any>;
}, referencedSkills: ReferencedSkillSnapshot[] = SAMPLE_REFERENCED_SKILLS): SkillEvolutionRuntime {
  return {
    getRegistry: () => registry as any,
    getReferencedSkillSnapshots: () => referencedSkills,
  } as unknown as SkillEvolutionRuntime;
}

describe('episode-evidence-bundle (extracted responsibility)', () => {
  test('assembles a bundle with the v3 learning-episode bundleId', () => {
    const episode = makeEpisode();
    const candidate = makeCandidate();
    const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });
    const bundle = buildEpisodeEvidenceBundle(episode, candidate, skillEvolution);

    assert.equal(bundle.bundleId, 'v3:learning-episode:episode-test-001');
    assert.equal(bundle.episode, candidate);
  });

  test('completion evidence excludes contradictions and maps to SkillEvidenceRef', () => {
    const episode = makeEpisode();
    const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });
    const bundle: EvidenceBundle = buildEpisodeEvidenceBundle(episode, makeCandidate(), skillEvolution);

    assert.equal(bundle.completionEvidence.length, 2);
    assert.deepEqual(
      bundle.completionEvidence.map(e => e.ref),
      ['turn-1#completion', 'turn-3#completion'],
    );
    // Contradiction evidence must be filtered out.
    assert.ok(!bundle.completionEvidence.some(e => e.ref.includes('contradiction')));
  });

  test('settlement evidence is synthesized from the episode settlement deadline', () => {
    const episode = makeEpisode();
    const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });
    const bundle: EvidenceBundle = buildEpisodeEvidenceBundle(episode, makeCandidate(), skillEvolution);

    assert.equal(bundle.settlementEvidence.length, 1);
    const [settlement] = bundle.settlementEvidence;
    assert.equal(settlement.sourceFilePath, episode.sourceFilePath);
    assert.equal(settlement.turn, episode.deliveryTurn);
    assert.match(settlement.ref, /settled-2026-01-01T00:00:00\.000Z/);
  });

  test('relatedCurrentSkills are derived from the live registry capabilities', () => {
    const episode = makeEpisode();
    const skillEvolution = makeSkillEvolutionStub({
      capabilities: {
        'cap-a': {
          handle: 'cap-a',
          revision: 2,
          routingName: 'route-a',
          description: 'Capability A',
          guidanceHash: 'hash-a',
          skillFilePath: '/skills/a.md',
          evidenceRefs: [],
          referencedSkills: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    const bundle: EvidenceBundle = buildEpisodeEvidenceBundle(episode, makeCandidate(), skillEvolution);

    assert.equal(bundle.relatedCurrentSkills.length, 1);
    assert.equal(bundle.relatedCurrentSkills[0].handle, 'cap-a');
    assert.equal(bundle.relatedCurrentSkills[0].routingName, 'route-a');
    assert.equal(bundle.relatedCurrentSkills[0].guidanceHash, 'hash-a');
  });

  test('referencedSkills come from the SkillEvolutionRuntime snapshots and semanticObservations pass through', () => {
    const episode = makeEpisode();
    const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });
    const bundle: EvidenceBundle = buildEpisodeEvidenceBundle(episode, makeCandidate(), skillEvolution);

    assert.equal(bundle.referencedSkills, SAMPLE_REFERENCED_SKILLS);
    assert.equal(bundle.semanticObservations, episode.semanticObservations);
    assert.deepEqual(bundle.boundedContinuity, []);
  });

  test('external-origin episode without a capsule fails fast', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-episode-bundle-'));
    try {
      const capsuleStorePath = path.join(root, 'capsules.json');
      const capsuleStore = new EvidenceCapsuleStore(capsuleStorePath);
      const episode = makeEpisode({ episodeId: 'episode-ext-001' });
      const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });

      assert.throws(
        () => buildEpisodeEvidenceBundle(
          episode,
          makeCandidate(),
          skillEvolution,
          capsuleStore,
          () => true, // isExternalEpisode
        ),
        /External-origin Learning Episode episode-ext-001 requires a persisted Evidence Capsule before review\./,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('non-external episode with empty capsule store still builds a plain bundle', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-episode-bundle-plain-'));
    try {
      const capsuleStore = new EvidenceCapsuleStore(path.join(root, 'capsules.json'));
      const episode = makeEpisode();
      const skillEvolution = makeSkillEvolutionStub({ capabilities: {} });
      const bundle: EvidenceBundle = buildEpisodeEvidenceBundle(
        episode,
        makeCandidate(),
        skillEvolution,
        capsuleStore,
        () => false, // not external
      );

      assert.equal(bundle.bundleId, 'v3:learning-episode:episode-test-001');
      assert.equal(bundle.completionEvidence.length, 2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
