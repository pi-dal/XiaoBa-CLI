import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  copyProviderErrorDetails,
  formatProviderErrorReply,
  normalizeProviderError,
} from '../src/utils/provider-error';

test('normalizeProviderError classifies a structured 403 without exposing credentials', () => {
  const error = Object.assign(new Error('permission denied Bearer secret-token sk-secret12345678'), {
    response: {
      status: 403,
      headers: { 'x-request-id': 'req-1234567890abcdef' },
      data: {
        error: {
          code: 'permission_denied',
          message: 'permission denied Bearer secret-token sk-secret12345678',
          retryable: false,
        },
      },
    },
  });

  const normalized = normalizeProviderError(error);

  assert.equal(normalized.status, 403);
  assert.equal(normalized.code, 'permission_denied');
  assert.equal(normalized.category, 'permission_denied');
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.requestId, 'req-1234567890abcdef');
  assert.doesNotMatch(normalized.safeMessage, /secret-token|secret12345678/);
});

test('normalizeProviderError preserves pool exhaustion aggregation fields', () => {
  const normalized = normalizeProviderError(Object.assign(new Error('all candidates failed'), {
    response: {
      status: 503,
      data: {
        code: 'provider_pool_exhausted',
        retryable: false,
        dominant_cause: 'permission_denied',
        attempt_count: 4,
        request_id: 'req-pool-123456789',
      },
    },
  }));

  assert.equal(normalized.category, 'provider_pool_exhausted');
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.dominantCause, 'permission_denied');
  assert.equal(normalized.attemptCount, 4);
});

test('copyProviderErrorDetails keeps structured fields after wrapping', () => {
  const wrapped = copyProviderErrorDetails(new Error('wrapped'), {
    status: 503,
    code: 'provider_pool_exhausted',
    retryable: false,
    request_id: 'req-copy-123',
    attempt_count: 3,
  }) as Error & Record<string, unknown>;

  assert.equal(wrapped.status, 503);
  assert.equal(wrapped.code, 'provider_pool_exhausted');
  assert.equal(wrapped.retryable, false);
  assert.equal(wrapped.requestId, 'req-copy-123');
  assert.equal(wrapped.attemptCount, 3);
});

test('formatProviderErrorReply distinguishes permission and retryable pool failures', () => {
  const permissionReply = formatProviderErrorReply({
    status: 403,
    code: 'permission_denied',
    retryable: false,
    request_id: 'req-permission-123456789',
  }, 'gpt-test');
  assert.match(permissionReply || '', /访问被拒绝/);
  assert.match(permissionReply || '', /无需反复重试/);
  assert.doesNotMatch(permissionReply || '', /你再试一次/);

  const poolReply = formatProviderErrorReply({
    status: 503,
    code: 'provider_pool_exhausted',
    retryable: true,
  });
  assert.match(poolReply || '', /已尝试备用线路/);
  assert.match(poolReply || '', /请稍后再试/);
});

test('formatProviderErrorReply respects explicit retryability for conflicting statuses', () => {
  const retryablePermission = formatProviderErrorReply({
    status: 403,
    code: 'permission_denied',
    retryable: true,
  });
  assert.match(retryablePermission || '', /请稍后再试/);
  assert.doesNotMatch(retryablePermission || '', /无需反复重试/);

  const finalRateLimit = formatProviderErrorReply({
    status: 429,
    code: 'rate_limited',
    retryable: false,
  });
  assert.match(finalRateLimit || '', /无需反复重试/);
  assert.doesNotMatch(finalRateLimit || '', /请稍后再试/);

  const finalUpstream = formatProviderErrorReply({
    status: 503,
    retryable: false,
  }, 'gpt-test');
  assert.match(finalUpstream || '', /不可重试/);
  assert.doesNotMatch(finalUpstream || '', /稍后重试/);
});

test('formatProviderErrorReply handles quota exhaustion explicitly', () => {
  const reply = formatProviderErrorReply({
    status: 429,
    code: 'insufficient_quota',
    retryable: false,
  }, 'gpt-test');
  assert.match(reply || '', /额度不足/);
  assert.doesNotMatch(reply || '', /稍后再试/);
});
