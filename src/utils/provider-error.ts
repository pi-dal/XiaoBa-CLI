export type ProviderErrorCategory =
  | 'permission_denied'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'provider_pool_exhausted'
  | 'capacity_unavailable'
  | 'timeout'
  | 'upstream_unavailable'
  | 'network'
  | 'unknown';

export interface NormalizedProviderError {
  status: number | null;
  code: string | null;
  category: ProviderErrorCategory;
  retryable: boolean | null;
  retryAfterSeconds: number | null;
  requestId: string | null;
  dominantCause: string | null;
  attemptCount: number | null;
  safeMessage: string;
}

export function normalizeProviderError(error: any): NormalizedProviderError {
  const responseData = error?.response?.data;
  const responseError = responseData?.error;
  const nestedError = error?.error;
  const status = firstFiniteNumber(
    error?.status,
    error?.statusCode,
    error?.response?.status,
    nestedError?.status,
  ) ?? extractStatusFromText(error?.message || error);
  const code = firstString(
    responseError?.code,
    responseError?.type,
    responseData?.code,
    nestedError?.code,
    nestedError?.type,
    error?.code,
  );
  const retryable = firstBoolean(
    error?.retryable,
    responseError?.retryable,
    responseData?.retryable,
    nestedError?.retryable,
  );
  const requestId = firstString(
    error?.requestId,
    error?.request_id,
    responseError?.requestId,
    responseError?.request_id,
    responseData?.requestId,
    responseData?.request_id,
    headerValue(error?.response?.headers, 'x-request-id'),
    headerValue(error?.response?.headers, 'request-id'),
  );
  const dominantCause = firstString(
    error?.dominantCause,
    error?.dominant_cause,
    responseError?.dominantCause,
    responseError?.dominant_cause,
    responseData?.dominantCause,
    responseData?.dominant_cause,
  );
  const attemptCount = firstFiniteNumber(
    error?.attemptCount,
    error?.attempt_count,
    responseError?.attemptCount,
    responseError?.attempt_count,
    responseData?.attemptCount,
    responseData?.attempt_count,
  );
  const retryAfterSeconds = extractRetryAfterSeconds(error);
  const rawMessage = firstString(
    responseError?.message,
    responseData?.message,
    nestedError?.message,
    error?.message,
    String(error || ''),
  ) || 'unknown error';
  const classificationText = [code, dominantCause, rawMessage].filter(Boolean).join(' ');

  return {
    status,
    code,
    category: classifyProviderError(status, classificationText),
    retryable,
    retryAfterSeconds,
    requestId,
    dominantCause,
    attemptCount,
    safeMessage: sanitizeProviderErrorMessage(rawMessage),
  };
}

export function copyProviderErrorDetails(target: Error, source: any): Error {
  const normalized = normalizeProviderError(source);
  const details = target as Error & Partial<NormalizedProviderError>;
  if (normalized.status !== null) details.status = normalized.status;
  if (normalized.code) details.code = normalized.code;
  details.category = normalized.category;
  if (normalized.retryable !== null) details.retryable = normalized.retryable;
  if (normalized.retryAfterSeconds !== null) details.retryAfterSeconds = normalized.retryAfterSeconds;
  if (normalized.requestId) details.requestId = normalized.requestId;
  if (normalized.dominantCause) details.dominantCause = normalized.dominantCause;
  if (normalized.attemptCount !== null) details.attemptCount = normalized.attemptCount;
  details.safeMessage = normalized.safeMessage;
  return target;
}

export function formatProviderErrorReply(error: any, model?: string | null): string | null {
  const normalized = normalizeProviderError(error);
  const modelLabel = model ? `当前模型 ${model}` : '当前模型';
  const diagnostic = formatDiagnosticId(normalized.requestId);

  switch (normalized.category) {
    case 'permission_denied':
      return normalized.retryable === true
        ? `${modelLabel}访问被拒绝，系统自动切换后仍未恢复。问题已记录，请稍后再试或检查模型权限与线路配置。${diagnostic}`
        : `${modelLabel}访问被拒绝，系统自动切换后仍未恢复。问题已记录，无需反复重试，请检查模型权限或线路配置。${diagnostic}`;
    case 'provider_pool_exhausted':
      return normalized.retryable === true
        ? `主线路调用失败，系统已尝试备用线路但仍未成功。当前可用线路可能繁忙，请稍后再试。${diagnostic}`
        : `主线路调用失败，系统已尝试备用线路但仍未成功。问题已记录，无需反复重试。${diagnostic}`;
    case 'rate_limited':
      return normalized.retryable === false
        ? `当前线路触发限流，系统暂时无法完成请求。问题已记录，无需反复重试。${diagnostic}`
        : `当前线路触发限流，系统暂时无法完成请求，请稍后再试。${diagnostic}`;
    case 'capacity_unavailable':
      return normalized.retryable === false
        ? `当前可用模型线路均不可用，系统已尝试切换线路。问题已记录，无需反复重试。${diagnostic}`
        : `当前可用模型线路均繁忙，系统已尝试切换线路，请稍后再试。${diagnostic}`;
    case 'quota_exhausted':
      return `${modelLabel}调用额度不足，当前请求无法继续。请检查账号额度或线路配置。${diagnostic}`;
    case 'timeout':
    case 'upstream_unavailable':
    case 'network':
      return normalized.retryable === false
        ? `${modelLabel}调用失败，线路已标记本次错误不可重试。问题已记录，无需反复重试。${diagnostic}`
        : null;
    default:
      return null;
  }
}

export function sanitizeProviderErrorMessage(message: string): string {
  const normalized = String(message || 'unknown error')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, 'sk-[redacted]')
    .replace(/("?api_?key"?\s*[:=]\s*)"?[^"\s,}]+/gi, '$1[redacted]')
    .replace(/("?authorization"?\s*[:=]\s*)"?[^"\s,}]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length <= 600 ? normalized : `${normalized.slice(0, 600)}...(已截断)`;
}

function classifyProviderError(status: number | null, text: string): ProviderErrorCategory {
  if (/provider[_\s-]?pool[_\s-]?exhausted|fallback[_\s-]?exhausted|all (?:providers|candidates).*failed/i.test(text)) {
    return 'provider_pool_exhausted';
  }
  if (status === 401 || status === 403 || /permission[_\s-]?denied|forbidden|unauthorized|model access denied/i.test(text)) {
    return 'permission_denied';
  }
  if (/insufficient[_\s-]?quota|quota[_\s-]?exceeded|billing|insufficient (?:credit|balance)|余额不足|额度不足|额度已用尽/i.test(text)) {
    return 'quota_exhausted';
  }
  if (status === 429 || /rate[_\s-]?limit|too many requests/i.test(text)) {
    return 'rate_limited';
  }
  if (/capacity|overloaded|saturated|no available (?:provider|model)|线路均繁忙|容量/i.test(text)) {
    return 'capacity_unavailable';
  }
  if (status === 408 || status === 504 || /timed? out|timeout|gateway timeout/i.test(text)) {
    return 'timeout';
  }
  if (/ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|network error/i.test(text)) {
    return 'network';
  }
  if (status !== null && [500, 502, 503, 520, 524, 529].includes(status)) {
    return 'upstream_unavailable';
  }
  return 'unknown';
}

function extractStatusFromText(value: any): number | null {
  const match = String(value || '').match(/(?:API错误|HTTP|status(?:\s*code)?|response status)\s*[\(:= ]\s*(\d{3})\b/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRetryAfterSeconds(error: any): number | null {
  const direct = firstFiniteNumber(error?.retryAfterSeconds, error?.retry_after_seconds);
  if (direct !== null) return direct;
  const value = headerValue(error?.response?.headers, 'retry-after') ?? headerValue(error?.headers, 'retry-after');
  if (value === null || value === undefined || value === '') return null;
  const seconds = Number.parseInt(String(value), 10);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const dateMs = Date.parse(String(value));
  return Number.isFinite(dateMs) ? Math.max(0, Math.ceil((dateMs - Date.now()) / 1000)) : null;
}

function headerValue(headers: any, name: string): any {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name);
  return key ? headers[key] : null;
}

function firstString(...values: any[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstBoolean(...values: any[]): boolean | null {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function firstFiniteNumber(...values: any[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function formatDiagnosticId(requestId: string | null): string {
  if (!requestId) return '';
  const safe = requestId.replace(/[^A-Za-z0-9_-]/g, '');
  if (!safe) return '';
  const short = safe.length <= 12 ? safe : safe.slice(-12);
  return ` 诊断号：${short}`;
}
