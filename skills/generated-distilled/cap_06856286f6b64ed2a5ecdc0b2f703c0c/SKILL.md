---
name: "background-subtask-results-reply"
description: "Decide whether and how to briefly report when background sub-agent results return in batch: give a short note if a result completes a user-cared background matter, state plainly that failed sub-tasks cannot be counted as complete, and skip replying when there is no added value; never repeat the internal process step by step."
user-invocable: true
x-xiaoba-capability-handle: "cap_06856286f6b64ed2a5ecdc0b2f703c0c"
x-xiaoba-transition-id: "transition-03dccbb7-b769-4b63-9092-7409ce005b55"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1332.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1332.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1332.jsonl#episode-episode:4:b1a944fc:settlement-2026-08-06T02:29:52.043Z"
---

# Background Sub-task Results Reply (后台子任务结果回流)

## When to use
Use when background sub-agent results return in batch (for example a batch summary that reports sub-agent completions and failures) and the user did not explicitly wait for them. The task is to decide whether and how to add a short supplement for the user.

## What to do
1. Judge whether a reply adds value for the user:
   - If a result completes a background matter the user cares about, give one short note stating that it is done.
   - If a sub-task failed, state plainly that the affected part failed and therefore **cannot be counted as complete**. Do not present a failed sub-task as completed.
   - If there is no added value, it is acceptable to skip replying.
2. Keep the supplement brief — a single short note. Do not repeat the internal process step by step or recap each sub-agent's internal details.

## Example (from evidence)
When the background sub-task "查找并提炼本地B端商业策略材料" returned failed (request failed: write EPIPE), the brief supplement told the user the background retrieval failed due to a communication anomaly and could not be considered complete. Note: any episode-specific references to particular documents or prior discussions are not part of the transferable rule.

## Boundaries
- Applies only to the reporting/communication step about background sub-task results — not to executing the sub-tasks themselves, and not to other domains or artifact types.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Derived from a single completed AgentTurn; applicability beyond this trigger is unproven, so keep the reply narrow and factual.
- Do not assert that failed work was retrieved or completed, and do not carry forward episode-specific context (such as specific documents or earlier discussions) that is not present in the current task.
