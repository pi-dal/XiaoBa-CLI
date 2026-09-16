import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(join(process.cwd(), 'src/core/agent-turn-controller.ts'), 'utf-8');

test('AgentTurnController forwards thinking callbacks to ConversationRunner', () => {
  assert.match(source, /onThinking:\s*callbacks\?\.onThinking/);
  assert.match(source, /onAssistantText:\s*callbacks\?\.onAssistantText/);
});

const sidecarSeam = source.slice(
  source.indexOf('private createMemorySidecarHandle'),
  source.indexOf('private isMemoryBranchEnabled'),
);

// The production receipt handoff is wired only when a CatsLog capability
// exists, and it feeds the branch-private use-stage reporter: enqueue only
// copies and returns, the network happens outside the branch, and no
// main-agent completion or injection input reaches this path.
test('AgentTurnController wires the branch receipt handoff to the use-stage reporter', () => {
  assert.match(sidecarSeam, /onRunEndReceipts: \(entries[\s\S]*?enqueueUseStageReports/);
  assert.match(source, /private enqueueUseStageReports\(/);
  assert.match(source, /new CatsLogUseStageReporter\(backend\)/);
  // The shared runner callback surface stays free of reporting: main-agent
  // turns never forward the provider boundary or any use-stage path.
  assert.doesNotMatch(source, /toRunnerCallbacks[\s\S]{0,400}(reportUseStages|onRunEndReceipts|UseStageReporter)/);
});
