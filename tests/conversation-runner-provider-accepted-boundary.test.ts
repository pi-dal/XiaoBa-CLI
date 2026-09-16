import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConversationRunner } from '../src/core/conversation-runner';
import { ChatResponse, Message } from '../src/types';
import { ToolCall, ToolDefinition, ToolExecutor, ToolResult } from '../src/types/tool';

const usage = { promptTokens: 1, completionTokens: 1, totalTokens: 2 };

function cloneMessages(messages: Message[]): Message[] {
  return JSON.parse(JSON.stringify(messages));
}

function makeToolCall(id: string): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name: 'noop',
      arguments: '{}',
    },
  };
}

class NoopToolExecutor implements ToolExecutor {
  getToolDefinitions(): ToolDefinition[] {
    return [{
      name: 'noop',
      description: 'noop',
      parameters: { type: 'object', properties: {} },
    }];
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      name: toolCall.function.name,
      content: 'ok',
      ok: true,
    };
  }
}

describe('ConversationRunner accepted-provider-request boundary', () => {
  test('fires once per accepted request with an isolated snapshot; observation cannot mutate provider input', async () => {
    const received: Message[][] = [];
    const liveRequests: Message[][] = [];
    const responses: ChatResponse[] = [
      { content: null, toolCalls: [makeToolCall('call_1')], usage },
      { content: 'done', toolCalls: [], usage },
    ];
    const aiService = {
      chat: async (messages: Message[]) => {
        liveRequests.push(messages);
        received.push(cloneMessages(messages));
        return responses[received.length - 1];
      },
    } as any;

    const events: string[] = [];
    const acceptedSnapshots: Message[][] = [];
    const runner = new ConversationRunner(aiService, new NoopToolExecutor(), {
      stream: false,
      enableCompression: false,
    });

    const result = await runner.run([{ role: 'user', content: 'deploy it' }], {
      onProviderRequestAccepted: snapshot => {
        events.push('accepted');
        // Capture a clean copy first, then mutate aggressively: the boundary
        // hands out a private snapshot, so neither the runner nor later
        // provider input may observe these edits.
        acceptedSnapshots.push(cloneMessages(snapshot));
        snapshot.push({ role: 'user', content: 'callback-mutated' });
      },
      onToolEnd: () => events.push('tool_end'),
    });

    // Exactly one event per accepted request, each before the response's tool
    // execution is reported (accepted → tool_end → accepted).
    assert.deepEqual(events, ['accepted', 'tool_end', 'accepted']);
    assert.equal(acceptedSnapshots.length, 2);
    // Snapshots are private copies, never the live request arrays.
    assert.notEqual(acceptedSnapshots[0], liveRequests[0]);
    assert.notEqual(acceptedSnapshots[1], liveRequests[1]);
    // Each snapshot equals exactly what that accepted attempt sent.
    assert.deepEqual(acceptedSnapshots[0], received[0]);
    assert.deepEqual(acceptedSnapshots[1], received[1]);
    // The mutation could not leak into later provider input or the transcript.
    assert.equal(JSON.stringify(received[1]).includes('callback-mutated'), false);
    assert.equal(JSON.stringify(result.messages).includes('callback-mutated'), false);
    assert.equal(result.response, 'done');
  });

  test('a prompt-too-long rejection fires nothing; the post-trim retry reports the exact accepted messages once', async () => {
    // 100 messages of ~200 chars each (≈54 tokens/message, ≈5400 total) sit
    // above the forced-trim target (≈0.6 × before) while their content is
    // below the shrink caps — so the overflow trim removes the OLDEST
    // messages outright instead of shrinking them, deterministically dropping
    // the marker-carrying first message.
    const droppedMarker = 'dropped-marker-alpha';
    const filler = 'filler turn context that stays below the shrink cap. '.repeat(4);
    const attempts: Message[][] = [];
    const acceptedSnapshots: Message[][] = [];
    const aiService = {
      chat: async (messages: Message[]) => {
        attempts.push(cloneMessages(messages));
        if (attempts.length === 1) {
          throw new Error('prompt is too long: 6123 tokens > 4096 maximum');
        }
        return { content: 'done', toolCalls: [], usage };
      },
    } as any;

    const runner = new ConversationRunner(aiService, new NoopToolExecutor(), {
      stream: false,
      enableCompression: false,
      maxContextTokens: 10000,
    });

    const initial: Message[] = [
      { role: 'user', content: `${droppedMarker} ${filler}` },
      ...Array.from({ length: 99 }, (_, index) => ({
        role: 'user' as const,
        content: `filler turn ${index} ${filler}`,
      })),
    ];
    const result = await runner.run(initial, {
      onProviderRequestAccepted: snapshot => acceptedSnapshots.push(snapshot),
    });

    // Attempt 1 was rejected while still carrying the full request; it must
    // never fire the boundary. Attempt 2 ran on the force-trimmed request
    // and is reported exactly once.
    assert.equal(attempts.length, 2);
    assert.equal(acceptedSnapshots.length, 1);
    assert.equal(JSON.stringify(attempts[0]).includes(droppedMarker), true);
    assert.ok(attempts[1].length < attempts[0].length, 'the overflow trim must have dropped messages');
    // The accepted retry is correlated against the exact post-trim messages
    // it really used: the marker message was dropped by the trim.
    assert.deepEqual(acceptedSnapshots[0], attempts[1]);
    assert.equal(JSON.stringify(acceptedSnapshots[0]).includes(droppedMarker), false);
    assert.equal(result.response, 'done');
  });

  test('a non-prompt-too-long provider failure never fires the boundary', async () => {
    const attempts: Message[][] = [];
    const acceptedSnapshots: Message[][] = [];
    const aiService = {
      chat: async (messages: Message[]) => {
        attempts.push(cloneMessages(messages));
        throw new Error('provider exploded');
      },
    } as any;
    const runner = new ConversationRunner(aiService, new NoopToolExecutor(), {
      stream: false,
      enableCompression: false,
    });

    await assert.rejects(
      runner.run([{ role: 'user', content: 'deploy it' }], {
        onProviderRequestAccepted: snapshot => acceptedSnapshots.push(snapshot),
      }),
      /provider exploded/,
    );
    assert.equal(attempts.length, 1);
    assert.equal(acceptedSnapshots.length, 0);
  });
});
