import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CatscoLogAgentClient,
  CatscoMemoryRecallQuery,
  CatscoSkillMemoryQuery,
} from '../src/utils/catsco-log-agent-client';
import {
  CatsLogMemoryProvider,
  CatsLogMemoryUnavailableError,
} from '../src/utils/catslog-memory-provider';
import { getCatscoLogAgentConfig } from '../src/utils/catsco-log-agent-config';

describe('CatsLog memory provider', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaoba-catslog-provider-'));
    env = {
      CATSCO_LOG_API_BASE_URL: 'https://logs.example.test',
      CATSCO_USER_TOKEN: 'catscompany-user-token',
      DOTENV_CONFIG_PATH: path.join(root, 'missing.env'),
      XIAOBA_USER_DATA_DIR: root,
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('bootstraps and reuses a device-bound capability, never the upload token', async () => {
    const calls: Array<{ kind: string; token?: string; query?: unknown }> = [];
    const client = fakeClient(calls, 'skill-token-1');
    const provider = new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });

    await provider.retrieveSkillMemory({ task: 'release' });
    await provider.recallMemory({ search: 'rollback' });

    assert.equal(calls.filter(call => call.kind === 'bootstrap').length, 1);
    assert.deepEqual(calls.filter(call => call.kind === 'retrieve')[0], {
      kind: 'retrieve',
      token: 'skill-token-1',
      query: { task: 'release' },
    });
    assert.deepEqual(calls.filter(call => call.kind === 'recall')[0], {
      kind: 'recall',
      token: 'skill-token-1',
      query: { search: 'rollback' },
    });

    const state = JSON.parse(fs.readFileSync(getCatscoLogAgentConfig(root, env).stateFilePath, 'utf8'));
    assert.equal(state.skillToken, 'skill-token-1');
    assert.equal(state.token, undefined);
  });

  test('refreshes once after a revoked capability and preserves device identity', async () => {
    const calls: Array<{ kind: string; token?: string }> = [];
    let retrieveCount = 0;
    const client: Partial<CatscoLogAgentClient> = {
      bootstrap: async () => {
        const token = calls.filter(call => call.kind === 'bootstrap').length === 0
          ? 'skill-token-old'
          : 'skill-token-new';
        calls.push({ kind: 'bootstrap', token });
        return bootstrapResponse(token);
      },
      retrieveSkillMemory: async input => {
        retrieveCount++;
        calls.push({ kind: 'retrieve', token: input.token });
        if (retrieveCount === 1) {
          const error: any = new Error('unauthorized');
          error.status = 401;
          throw error;
        }
        return { items: [] };
      },
    };
    const provider = new CatsLogMemoryProvider(root, {
      env,
      clientFactory: () => client as CatscoLogAgentClient,
      now: () => Date.parse('2026-08-28T00:00:00.000Z'),
    });

    await provider.retrieveSkillMemory({ task: 'release' });

    assert.deepEqual(calls, [
      { kind: 'bootstrap', token: 'skill-token-old' },
      { kind: 'retrieve', token: 'skill-token-old' },
      { kind: 'bootstrap', token: 'skill-token-new' },
      { kind: 'retrieve', token: 'skill-token-new' },
    ]);
    const statePath = getCatscoLogAgentConfig(root, env).stateFilePath;
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(state.deviceId, 'device-stable');
    assert.equal(state.skillToken, 'skill-token-new');
  });

  test('fails closed when neither a capability nor a CatsCompany token exists', async () => {
    const noAuthEnv = { ...env };
    delete noAuthEnv.CATSCO_USER_TOKEN;
    const provider = new CatsLogMemoryProvider(root, { env: noAuthEnv });
    await assert.rejects(
      provider.recallMemory({ search: 'anything' }),
      (error: any) => error instanceof CatsLogMemoryUnavailableError
        && error.code === 'CATSLOG_MEMORY_UNAVAILABLE',
    );
  });
});

function bootstrapResponse(skillToken: string) {
  return {
    user_id: 'catsco-123',
    external_provider: 'catsco',
    external_user_id: '123',
    device_id: 'device-stable',
    token_id: 'upload-token-id',
    token: 'upload-token-must-not-be-used-for-memory',
    upload_url: '/catsco/logs/upload',
    issued_at: '2026-08-28T00:00:00.000Z',
    expires_at: '2099-08-28T00:00:00.000Z',
    skill_token_id: `${skillToken}-id`,
    skill_token: skillToken,
    skill_token_expires_at: '2099-08-28T00:00:00.000Z',
    memory_url: '/catsco/agent/memory/retrieve',
    memory_recall_url: '/catsco/agent/memory/recall',
  };
}

function fakeClient(
  calls: Array<{ kind: string; token?: string; query?: unknown }>,
  skillToken: string,
): CatscoLogAgentClient {
  const client: Partial<CatscoLogAgentClient> = {
    bootstrap: async () => {
      calls.push({ kind: 'bootstrap' });
      return bootstrapResponse(skillToken);
    },
    retrieveSkillMemory: async input => {
      calls.push({ kind: 'retrieve', token: input.token, query: stripCapability(input) });
      return { items: [] };
    },
    recallMemory: async input => {
      calls.push({ kind: 'recall', token: input.token, query: stripCapability(input) });
      return { session_available: true, session: { records: [] }, notes: [] };
    },
  };
  return client as CatscoLogAgentClient;
}

function stripCapability(input: CatscoSkillMemoryQuery | CatscoMemoryRecallQuery & { token?: string; memoryUrl?: string; memoryRecallUrl?: string }): unknown {
  const clone = { ...(input as any) };
  delete clone.token;
  delete clone.memoryUrl;
  delete clone.memoryRecallUrl;
  delete clone.signal;
  return clone;
}
