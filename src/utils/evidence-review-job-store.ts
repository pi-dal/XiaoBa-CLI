/**
 * Durable store for Evidence Review Jobs and fairness cursors.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
  type EvidenceReviewDiagnostics,
  type EvidenceReviewJob,
  type EvidenceReviewJobDisposition,
  type EvidenceReviewJobStoreState,
  type ReviewQuantumRecord,
  type ReviewWorkClass,
} from './evidence-review-types';

const WORK_CLASS_ORDER: readonly ReviewWorkClass[] = [
  'operational_recovery',
  'live_learning',
  'historical_learning',
  'semantic_reassessment',
];

function emptyState(): EvidenceReviewJobStoreState {
  return {
    schemaVersion: EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
    jobs: {},
    fairness: {
      nextWorkClass: 'operational_recovery',
      classCursors: {},
      jobCursors: {},
    },
  };
}

export function emptyEvidenceReviewJobStoreState(): EvidenceReviewJobStoreState {
  return emptyState();
}

function quarantine(filePath: string, reason: string): void {
  try {
    if (!fs.existsSync(filePath)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = `${filePath}.corrupt.${reason}.${stamp}`;
    fs.renameSync(filePath, dest);
  } catch {
    // best effort
  }
}

function isJob(value: unknown): value is EvidenceReviewJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<EvidenceReviewJob>;
  return (
    job.schemaVersion === EVIDENCE_REVIEW_JOB_SCHEMA_VERSION
    && typeof job.jobId === 'string'
    && typeof job.disposition === 'string'
    && job.manifest !== undefined
    && job.basis !== undefined
    && job.quanta !== undefined
  );
}

export function loadEvidenceReviewJobStore(filePath: string): EvidenceReviewJobStoreState {
  if (!fs.existsSync(filePath)) return emptyState();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<EvidenceReviewJobStoreState>;
    if (
      !parsed
      || parsed.schemaVersion !== EVIDENCE_REVIEW_JOB_SCHEMA_VERSION
      || !parsed.jobs
      || typeof parsed.jobs !== 'object'
    ) {
      throw new Error('invalid schema');
    }
    const jobs: Record<string, EvidenceReviewJob> = {};
    for (const [jobId, job] of Object.entries(parsed.jobs)) {
      if (isJob(job)) jobs[jobId] = job;
    }
    const nextWorkClass = WORK_CLASS_ORDER.includes(parsed.fairness?.nextWorkClass as ReviewWorkClass)
      ? (parsed.fairness!.nextWorkClass as ReviewWorkClass)
      : 'operational_recovery';
    return {
      schemaVersion: EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
      jobs,
      fairness: {
        nextWorkClass,
        classCursors: { ...(parsed.fairness?.classCursors ?? {}) },
        jobCursors: { ...(parsed.fairness?.jobCursors ?? {}) },
      },
    };
  } catch {
    quarantine(filePath, 'invalid');
    return { ...emptyState(), stateCorrupt: true };
  }
}

export function saveEvidenceReviewJobStore(
  filePath: string,
  state: EvidenceReviewJobStoreState,
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(
      tmpPath,
      JSON.stringify({
        schemaVersion: EVIDENCE_REVIEW_JOB_SCHEMA_VERSION,
        jobs: state.jobs,
        fairness: state.fairness,
      }, null, 2),
      { encoding: 'utf-8', mode: 0o600 },
    );
    fs.renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // best effort cleanup
    }
    throw error;
  }
}

export function upsertEvidenceReviewJob(
  state: EvidenceReviewJobStoreState,
  job: EvidenceReviewJob,
): void {
  state.jobs[job.jobId] = job;
}

export function getEvidenceReviewJob(
  state: EvidenceReviewJobStoreState,
  jobId: string,
): EvidenceReviewJob | undefined {
  return state.jobs[jobId];
}

export function listActiveEvidenceReviewJobs(
  state: EvidenceReviewJobStoreState,
): EvidenceReviewJob[] {
  return Object.values(state.jobs)
    .filter(job => job.disposition === 'active' || job.disposition === 'deferred')
    .sort((a, b) => a.jobId.localeCompare(b.jobId, 'en'));
}

export function listJobsByBundleId(
  state: EvidenceReviewJobStoreState,
  bundleId: string,
): EvidenceReviewJob[] {
  return Object.values(state.jobs)
    .filter(job => job.bundle.bundleId === bundleId)
    .sort((a, b) => a.jobId.localeCompare(b.jobId, 'en'));
}

export function quantumSucceeded(quantum: ReviewQuantumRecord): boolean {
  return quantum.state === 'succeeded';
}

export function isQuantumRunnable(
  job: EvidenceReviewJob,
  quantum: ReviewQuantumRecord,
  now: Date,
): boolean {
  if (job.disposition !== 'active') return false;
  if (quantum.state === 'succeeded' || quantum.state === 'terminal_failed') return false;
  if (quantum.state === 'leased') {
    if (!quantum.lease) return true;
    return new Date(quantum.lease.expiresAt).getTime() <= now.getTime();
  }
  if (quantum.state === 'retry_wait') {
    if (!quantum.nextRetryAt) return true;
    return new Date(quantum.nextRetryAt).getTime() <= now.getTime();
  }
  // pending: dependencies must succeed
  return quantum.dependencyQuantumIds.every(depId => {
    const dep = job.quanta[depId];
    return dep?.state === 'succeeded';
  });
}

export function listRunnableQuanta(
  job: EvidenceReviewJob,
  now: Date,
): ReviewQuantumRecord[] {
  return Object.values(job.quanta)
    .filter(quantum => isQuantumRunnable(job, quantum, now))
    .sort((a, b) => criticalPathRank(a) - criticalPathRank(b)
      || a.quantumId.localeCompare(b.quantumId, 'en'));
}

/** Lower rank = higher critical-path priority. */
export function criticalPathRank(quantum: ReviewQuantumRecord): number {
  switch (quantum.kind) {
    case 'commit': return 0;
    case 'skill_verifier': return 1;
    case 'skill_author': return 2;
    case 'obligations': return 3;
    case 'difference_index': return 4;
    case 'author_dossier':
    case 'verifier_dossier': return 5;
    case 'author_reader':
    case 'verifier_reader': return 6;
    default: return 100;
  }
}

export function deriveJobDisposition(job: EvidenceReviewJob): EvidenceReviewJobDisposition {
  if (
    job.disposition === 'completed'
    || job.disposition === 'superseded'
    || job.disposition === 'terminal_failed'
    || job.disposition === 'deferred'
  ) {
    return job.disposition;
  }
  const quanta = Object.values(job.quanta);
  if (quanta.some(q => q.state === 'terminal_failed' && q.kind === 'commit')) {
    return 'terminal_failed';
  }
  const commit = quanta.find(q => q.kind === 'commit');
  if (commit?.state === 'succeeded') return 'completed';
  return 'active';
}

export function buildEvidenceReviewDiagnostics(job: EvidenceReviewJob, now = new Date()): EvidenceReviewDiagnostics {
  const quanta = Object.values(job.quanta);
  const authorReaders = quanta.filter(q => q.kind === 'author_reader');
  const verifierReaders = quanta.filter(q => q.kind === 'verifier_reader');
  const runnable = listRunnableQuanta(job, now);
  const unresolved = (job.obligations ?? []).filter(obligation => (
    !(job.obligationDispositions ?? []).some(d => d.obligationId === obligation.obligationId)
  )).length;
  return {
    jobId: job.jobId,
    disposition: job.disposition,
    workClass: job.workClass,
    basisHash: job.basis.basisHash,
    manifestHash: job.manifest.manifestHash,
    shardCount: job.manifest.shardIds.length,
    authorCoveredShards: authorReaders.filter(q => q.state === 'succeeded').length,
    verifierCoveredShards: verifierReaders.filter(q => q.state === 'succeeded').length,
    runnableQuanta: runnable.length,
    leasedQuanta: quanta.filter(q => q.state === 'leased').length,
    retryingQuanta: quanta.filter(q => q.state === 'retry_wait').length,
    failedQuanta: quanta.filter(q => q.state === 'terminal_failed').length,
    succeededQuanta: quanta.filter(q => q.state === 'succeeded').length,
    obligationCount: job.obligations?.length ?? 0,
    unresolvedObligations: unresolved,
    nextDueAt: job.nextDueAt,
    successorJobId: job.successorJobId,
    transitionId: job.transitionId,
    terminalReason: job.terminalReason,
  };
}

export function evidenceReviewJobStorePathForReviewQueue(reviewQueuePath: string): string {
  return path.join(path.dirname(reviewQueuePath), 'evidence-review-jobs.json');
}

export { WORK_CLASS_ORDER };
