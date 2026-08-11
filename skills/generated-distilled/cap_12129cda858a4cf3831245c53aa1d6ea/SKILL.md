---
name: "background-subtask-batch-briefing"
description: "Decide whether and how to give a brief supplementary reply when a batch of background sub-agent completion results returns for user-cared matters: reply briefly if the results complete user-cared items, may stay silent if no added value, and never retell internal processes step by step."
user-invocable: true
x-xiaoba-capability-handle: "cap_12129cda858a4cf3831245c53aa1d6ea"
x-xiaoba-transition-id: "transition-47888335-c993-43b2-994d-6ecbd46567c9"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#episode-episode:6:4c17d2a3:settlement-2026-08-05T15:56:46.499Z"
---

# Background Subtask Batch Result Briefing

## Trigger
Apply when a batch of background sub-agent completion results is returned (`后台子任务批量回流`) for matters the user did not explicitly wait on, and the assistant must judge whether a brief supplementary reply is warranted.

## Decision rule
- Judge whether to reply. If the returned results complete user-cared background matters, give one short supplementary statement.
- If the results add no value beyond what the user already has, it is acceptable not to reply.
- Do not retell internal processes or subtask mechanics step by step.

## Handling details
- When a subtask failed, note the failure briefly rather than reproducing the error body.
- When a subtask completed with actionable conclusions, surface the top priorities or recommendations concisely in the supplement.
- Before re-reading specific files or narrower ranges, use `check_subagent` on the relevant sub-agent result for more detail.

## Boundaries
- Only apply when a new task matches this same user-facing capability evidenced here.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Episode-specific findings (e.g., security rendering, field-level merge, stable IDs, product naming like 达人甄选台) are content of that one review, not reusable defaults for other domains.
- This skill covers judging and phrasing the brief reply only; it does not confer any access, permissions, or authority to alter the underlying work products.
