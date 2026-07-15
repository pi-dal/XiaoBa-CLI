/**
 * Issue #94 — External source provider diagnostics for CLI and Dashboard.
 *
 * Exposes provider identity, scope, activation/baseline progress, reader/
 * version, cursor progress, last successful read, next retry, failure class,
 * quarantine, lock, drain, and operator action through a public diagnostic
 * record that both the CLI and Dashboard can consume.
 *
 * This module is intentionally standalone so it is testable before and after
 * #90–#93 integrate the reader wiring. It does not modify existing reader,
 * control, concurrency, or admission semantics.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AdmissionState = 'activating' | 'active' | 'paused' | 'activation_blocked';

export type FailureClass =
  | 'transient'
  | 'protocol_failure'
  | 'integrity_conflict'
  | 'quarantine'
  | 'permission';

export type DrainState = 'idle' | 'reading' | 'draining' | 'drained';

export interface ActivationProgress {
  readonly baselined: number;
  readonly total: number;
}

export interface CursorProgress {
  readonly maxPosition: number;
  readonly activeResources: number;
  readonly closedResources: number;
}

export interface ExternalSourceProviderDiagnostic {
  readonly provider: string;
  readonly scope: string;
  readonly admissionState: AdmissionState;
  readonly readerVersion?: string;
  readonly activationProgress?: ActivationProgress;
  readonly cursorProgress?: CursorProgress;
  readonly lastSuccessfulReadAt?: string;
  readonly nextRetryAt?: string;
  readonly failureClass?: FailureClass;
  readonly quarantined: boolean;
  readonly locked: boolean;
  readonly drainState: DrainState;
  readonly nextAction?: string;
}

export type DiagnosticOverallStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ExternalSourceDiagnosticSummary {
  readonly overallStatus: DiagnosticOverallStatus;
  readonly providers: readonly ExternalSourceProviderDiagnostic[];
  readonly activeCount: number;
  readonly activatingCount: number;
  readonly pausedCount: number;
  readonly activationBlockedCount: number;
  readonly failureCount: number;
}

// ---------------------------------------------------------------------------
// Human formatting (CLI)
// ---------------------------------------------------------------------------

export function formatProviderDiagnosticHuman(diag: ExternalSourceProviderDiagnostic): string {
  const lines: string[] = [];
  lines.push(`Provider: ${diag.provider}`);
  lines.push(`  Scope: ${diag.scope}`);
  lines.push(`  State: ${diag.admissionState}`);
  if (diag.readerVersion) {
    lines.push(`  Reader version: ${diag.readerVersion}`);
  }
  if (diag.activationProgress) {
    const { baselined, total } = diag.activationProgress;
    lines.push(`  Baseline progress: ${baselined}/${total}`);
  }
  if (diag.cursorProgress) {
    const cp = diag.cursorProgress;
    lines.push(`  Cursor: position=${cp.maxPosition}, active=${cp.activeResources}, closed=${cp.closedResources}`);
  }
  if (diag.lastSuccessfulReadAt) {
    lines.push(`  Last read: ${diag.lastSuccessfulReadAt}`);
  }
  if (diag.nextRetryAt) {
    lines.push(`  Next retry: ${diag.nextRetryAt}`);
  }
  if (diag.failureClass) {
    lines.push(`  Failure: ${diag.failureClass}`);
  }
  if (diag.quarantined) {
    lines.push(`  Quarantined: yes`);
  }
  if (diag.locked) {
    lines.push(`  Locked: yes`);
  }
  lines.push(`  Drain: ${diag.drainState}`);
  if (diag.nextAction) {
    lines.push(`  Next action: ${diag.nextAction}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON formatting (CLI --json and Dashboard)
// ---------------------------------------------------------------------------

export function formatProviderDiagnosticJson(diag: ExternalSourceProviderDiagnostic): string {
  return JSON.stringify(diag, null, 2);
}

// ---------------------------------------------------------------------------
// Summary aggregation
// ---------------------------------------------------------------------------

export function buildDiagnosticSummary(
  diagnostics: readonly ExternalSourceProviderDiagnostic[],
): ExternalSourceDiagnosticSummary {
  let activeCount = 0;
  let activatingCount = 0;
  let pausedCount = 0;
  let activationBlockedCount = 0;
  let failureCount = 0;

  for (const diag of diagnostics) {
    switch (diag.admissionState) {
      case 'active':
        activeCount++;
        break;
      case 'activating':
        activatingCount++;
        break;
      case 'paused':
        pausedCount++;
        break;
      case 'activation_blocked':
        activationBlockedCount++;
        break;
    }
    if (diag.failureClass) {
      failureCount++;
    }
  }

  let overallStatus: DiagnosticOverallStatus = 'healthy';
  if (failureCount > 0 || activationBlockedCount > 0) {
    overallStatus = 'unhealthy';
  } else if (activatingCount > 0 || pausedCount > 0) {
    overallStatus = 'degraded';
  }

  return {
    overallStatus,
    providers: diagnostics,
    activeCount,
    activatingCount,
    pausedCount,
    activationBlockedCount,
    failureCount,
  };
}