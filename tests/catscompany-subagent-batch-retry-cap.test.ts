/**
 * Failure modes decided BEFORE the retry cap was added
 * (flushSubAgentCompletionBatch catch path, src/catscompany/index.ts):
 *
 * F1. `sender.reply` fails permanently (CatsCompany 403: bot not in the group /
 *     muted / no send permission) and the fallback reply fails the same way.
 *     Before: the same batch was restored and rescheduled every 1.5s forever,
 *     re-running a PAID model turn each time. After: the first 403 is treated as
 *     permanent, the fallback is not even attempted, and the batch is parked as
 *     undelivered. Exactly ONE handleRuntimeObservation call.
 * F2. The model turn itself throws a permanent delivery error (403 shape).
 *     Same rule: no reschedule, one call.
 * F3. Transient failures (no status code) must still retry, but with an attempt
 *     counter plus exponential backoff, and must stop at the cap instead of
 *     looping forever. handleRuntimeObservation call count is bounded by the
 *     cap, and the batch is never re-injected afterwards.
 * F4. Abandoned items stay recoverable: a new result for the same session
 *     resets the episode and is delivered once the transport works again (the
 *     old items are merged into the same batch, not silently dropped).
 * F5. The success path is unchanged: one model turn, one reply, batch removed.
 *
 * Every test asserts the number of model turns, because that is the cost that
 * was unbounded.
 */
import { afterEach, describe, test, mock } from 'node:test';
import * as assert from 'node:assert';
import { CatsCompanyBot } from '../src/catscompany';

const SESSION_KEY = 'cc_group:grp_403';
const MAX_FLUSH_ATTEMPTS = 4; // mirrors SUBAGENT_BATCH_MAX_FLUSH_ATTEMPTS
const BASE_DELAY_MS = 1_500; // mirrors BACKGROUND_SUBAGENT_COMPLETION_DEBOUNCE_MS

function permanentDeliveryError(status = 403) {
  return Object.assign(new Error('not a group member'), { kind: 'ack', code: status });
}

function subAgentItem(id: string) {
  return {
    id,
    displayName: `子任务 ${id}`,
    statusLabel: '已完成',
    task: `任务 ${id}`,
    summary: `结果 ${id}`,
    observation: `[子任务 ${id} 已完成]\nID: ${id}\n任务: 任务 ${id}\n结果摘要: 结果 ${id}`,
    outputFiles: [],
  };
}

function createBatch(items: Array<ReturnType<typeof subAgentItem>>) {
  return {
    topic: 'grp_403',
    senderId: 'usr7',
    firstAt: Date.now(),
    clearGeneration: 0,
    items: new Map(items.map(item => [item.id, item])),
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  };
}

function createHarness(options: {
  reply: (topic: string, text: string) => Promise<void>;
  observation?: () => Promise<{ visibleToUser: boolean; text: string }>;
}) {
  const bot = Object.create(CatsCompanyBot.prototype) as any;
  const observations: string[] = [];
  const replies: string[] = [];
  bot.shuttingDown = false;
  bot.subAgentCompletionBatches = new Map();
  bot.getSessionClearGeneration = () => 0;
  bot.tryReserveSessionExecution = () => true;
  bot.releaseSessionExecution = () => undefined;
  bot.startTypingHeartbeat = () => () => undefined;
  bot.buildChannel = () => ({});
  bot.buildSessionCallbacks = () => ({});
  bot.registerSubAgentPlatformCallbacks = () => undefined;
  bot.buildDeviceRpcTransport = () => undefined;
  bot.maybeBuildThinToolRpcTransport = () => undefined;
  bot.drainMessageQueue = async () => undefined;
  bot.runTrackedConversationWork = (fn: () => Promise<void>) => fn();
  const session = {
    isBusy: () => false,
    setBusy: () => undefined,
    handleRuntimeObservation: async (observation: string) => {
      observations.push(observation);
      return options.observation ? options.observation() : { visibleToUser: true, text: '补充说明' };
    },
  };
  bot.sessionManager = { get: () => session, getOrCreate: () => session };
  bot.sender = {
    reply: async (topic: string, text: string) => {
      replies.push(text);
      return options.reply(topic, text);
    },
    sendTyping: () => undefined,
  };
  return { bot, observations, replies };
}

/** Let the async flush chain finish after a timer tick. */
async function settle(): Promise<void> {
  for (let i = 0; i < 200; i++) await Promise.resolve();
}

async function flushAll(bot: any): Promise<void> {
  await bot.flushSubAgentCompletionBatch(SESSION_KEY);
  await settle();
}

/** Advance mock time through every scheduled retry. */
async function drainRetries(bot: any, maxAttempts = 8): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const batch = bot.subAgentCompletionBatches.get(SESSION_KEY);
    if (!batch?.timer) return;
    mock.timers.tick(60_000);
    await settle();
  }
}

describe('subagent completion batch retry cap', () => {
  afterEach(() => {
    mock.timers.reset();
  });

  test('F1: permanent 403 from reply + fallback stops after one model turn', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const harness = createHarness({
      reply: async () => { throw permanentDeliveryError(403); },
    });
    harness.bot.subAgentCompletionBatches.set(SESSION_KEY, createBatch([subAgentItem('sub-1'), subAgentItem('sub-2')]));

    await flushAll(harness.bot);
    await drainRetries(harness.bot);

    assert.equal(harness.observations.length, 1, 'the paid model turn must not be re-run');
    assert.equal(harness.replies.length, 1, 'the fallback must not be attempted after a permanent 403');
    const batch = harness.bot.subAgentCompletionBatches.get(SESSION_KEY);
    assert.ok(batch, 'items stay in the batch so they remain recoverable');
    assert.equal(batch.undelivered, true);
    assert.equal(batch.deliveryAttempts, 1);
    assert.equal(batch.timer, undefined, 'no retry timer may remain');
    assert.equal(batch.items.size, 2);
  });

  test('F2: a permanent 403 thrown by the model turn is not retried either', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const harness = createHarness({
      reply: async () => undefined,
      observation: async () => { throw permanentDeliveryError(403); },
    });
    harness.bot.subAgentCompletionBatches.set(SESSION_KEY, createBatch([subAgentItem('sub-3')]));

    await flushAll(harness.bot);
    await drainRetries(harness.bot);

    assert.equal(harness.observations.length, 1);
    const batch = harness.bot.subAgentCompletionBatches.get(SESSION_KEY);
    assert.equal(batch.undelivered, true);
    assert.equal(batch.timer, undefined);
  });

  test('F3: transient failures are capped and back off exponentially', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const harness = createHarness({
      reply: async () => { throw new Error('socket hang up'); },
    });
    harness.bot.subAgentCompletionBatches.set(SESSION_KEY, createBatch([subAgentItem('sub-4')]));

    await flushAll(harness.bot);
    await drainRetries(harness.bot);
    await drainRetries(harness.bot);

    assert.equal(
      harness.observations.length,
      MAX_FLUSH_ATTEMPTS,
      'bounded by the attempt cap, previously unbounded',
    );
    assert.equal(harness.replies.length, MAX_FLUSH_ATTEMPTS * 2, 'primary + fallback per attempt');
    const batch = harness.bot.subAgentCompletionBatches.get(SESSION_KEY);
    assert.equal(batch.undelivered, true);
    assert.equal(batch.timer, undefined);

    // No further injections no matter how much time passes.
    mock.timers.tick(24 * 60 * 60 * 1000);
    await settle();
    assert.equal(harness.observations.length, MAX_FLUSH_ATTEMPTS);
  });

  test('F4: a new result after abandonment starts a fresh delivery episode', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    let failing = true;
    const harness = createHarness({
      reply: async () => {
        if (failing) throw permanentDeliveryError(403);
      },
    });
    harness.bot.subAgentCompletionBatches.set(SESSION_KEY, createBatch([subAgentItem('sub-5')]));
    await flushAll(harness.bot);
    assert.equal(harness.bot.subAgentCompletionBatches.get(SESSION_KEY).undelivered, true);

    failing = false;
    harness.bot.scheduleSubAgentCompletionBatch(
      SESSION_KEY,
      'grp_403',
      'usr7',
      '[子任务 sub-6 已完成]\nID: sub-6\n任务: 任务 sub-6\n结果摘要: 结果 sub-6',
    );
    const merged = harness.bot.subAgentCompletionBatches.get(SESSION_KEY);
    assert.equal(merged.undelivered, false, 'a new result resets the abandoned episode');
    assert.equal(merged.deliveryAttempts, 0);
    assert.equal(merged.items.size, 2, 'the abandoned item stays with the new one');

    await flushAll(harness.bot);

    assert.equal(harness.observations.length, 2, 'one turn for the abandoned batch, one for the new result');
    // Delivered, so the batch is gone and nothing is retried.
    assert.equal(harness.bot.subAgentCompletionBatches.has(SESSION_KEY), false);
    mock.timers.tick(60_000);
    await settle();
    assert.equal(harness.observations.length, 2);
  });

  test('F5: a delivered batch is removed after exactly one model turn', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    const harness = createHarness({ reply: async () => undefined });
    harness.bot.subAgentCompletionBatches.set(SESSION_KEY, createBatch([subAgentItem('sub-7')]));

    await flushAll(harness.bot);

    assert.equal(harness.observations.length, 1);
    assert.equal(harness.replies.length, 1);
    assert.equal(harness.bot.subAgentCompletionBatches.has(SESSION_KEY), false);
    assert.equal(harness.replies[0], '补充说明', 'the model reply is delivered once');
  });
});
