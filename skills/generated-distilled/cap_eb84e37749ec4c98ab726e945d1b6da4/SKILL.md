---
name: "background-subtask-result-reply"
description: "Judge whether to briefly reply to the user about batch-returned background subtask results: give a short supplement when a result completes a user-cared background matter, otherwise do not reply, and never recite internal processes."
user-invocable: true
x-xiaoba-capability-handle: "cap_eb84e37749ec4c98ab726e945d1b6da4"
x-xiaoba-transition-id: "transition-5658db58-4942-43d1-beae-0c9e4cbbfa01"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1405.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1405.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1405.jsonl#episode-episode:2:35c9c0c6:settlement-2026-08-07T17:23:33.141Z"
---

# Background Subtask Result Reply (后台子任务批量回流处理)

## When to use
Use when a batch of background subagent/subtask completion results flows back (后台子任务批量回流) and the user did **not** explicitly wait for those results, but may need a brief supplement based on them.

## Decision rule
- If a returned result completes a background matter the user cares about, reply with a short supplement (简短说明).
- If the result adds no new value, no reply is needed.
- Never recite internal processes or list the subagent results one by one.

## Action
- Keep any reply to a single short supplement line.
- When the returned content is already incorporated elsewhere (for example, already included in a newer version of the relevant material), state that briefly instead of repeating the content.

Observed example: when a background brainstorm result about new gameplay mechanics came back, the assistant replied only `补充：后续回流的玩法建议已包含在 v2 中，无需再次更新。` — a one-line note that the suggestions were already in v2 and no update was needed.

## Boundaries
- Apply only when a new task matches the same capability: batch background subtask results returning without the user explicitly waiting for them.
- Do not apply while the user is correcting or iterating on the task.
- Based on a single completed turn; do not extend to other notification, reporting, or general summarization workflows.
