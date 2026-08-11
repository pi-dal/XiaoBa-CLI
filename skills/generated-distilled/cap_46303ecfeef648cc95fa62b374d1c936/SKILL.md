---
name: "background-subtask-batch-recap"
description: "Decide whether to reply to the user when background sub-agent completion results are returned in batch, and add a short independent conclusion when a result completes a background matter the user cares about, without reciting internal processes."
user-invocable: true
x-xiaoba-capability-handle: "cap_46303ecfeef648cc95fa62b374d1c936"
x-xiaoba-transition-id: "transition-93b4a127-db85-401a-b22f-ab7b4eae5c49"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#episode-episode:2:5da5c467:settlement-2026-08-08T15:06:45.624Z"
---

# Background Sub-Task Batch Recap

Decide whether and how to reply to the user when background sub-agent completion results are returned in batch, and produce a short independent conclusion when a reply is warranted.

## When to use
- A set of background sub-agent completion results is returned to you in batch ("后台子任务批量回流") — for example a batch summary plus compressed per-sub-agent results — and the user did not explicitly ask you to wait for those results.
- You must judge whether the user needs a supplement based on those results.

## Decision rule
- Reply when a returned result completes a background matter the user cares about: add a short supplement.
- Skip the reply when the results add no new value to the user.
- Never recite internal processes item by item, and do not reproduce the full sub-agent report.

## How to phrase the reply
- Compress the sub-agent's conclusion into one short independent statement: what the result established and, where implied, the next step it prioritizes.
- State the conclusion directly; do not copy the sub-agent's internal reasoning, file-level detail, or QA-style evidence into the user-facing reply.

## Boundaries
- This skill covers the reply decision and its short supplement, not the underlying sub-agent work itself. It is not a reporting, review, or analysis skill for the subject of any one sub-task.
- Apply it only when the new task matches this same batch-return scenario; do not reuse it while the user is correcting or iterating on the task.
- Do not generalize the specific findings of any single episode (for example a particular platform or system under review) into reusable claims.
