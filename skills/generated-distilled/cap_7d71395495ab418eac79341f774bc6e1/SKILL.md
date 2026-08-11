---
name: "background-subtask-brief-reply"
description: "Decide whether to send a brief, value-adding reply when background sub-agent results flow back, synthesizing the useful conclusion instead of reciting each sub-agent's internal process."
user-invocable: true
x-xiaoba-capability-handle: "cap_7d71395495ab418eac79341f774bc6e1"
x-xiaoba-transition-id: "transition-39bb107c-4d14-4a95-9fcd-116ca6c1a750"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-3:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#episode-episode:3:726b8863:settlement-2026-08-06T05:57:05.015Z"
---

# Background Subtask Brief Reply

## When to apply
Apply when a batch of background sub-agent results flows back to you: the user did not explicitly await these results, but you must judge whether to send a short follow-up reply based on what the sub-agents completed.

## Decision rule
- **Reply briefly** if the returned results completed a background matter the user cares about and you can add value beyond the raw results.
- **Skip replying** if the results add no new value for the user.
- When you reply, keep it to a brief supplementary message that synthesizes the useful conclusion (for example, a one-line review takeaway such as supporting a proposed split or gating data before it enters a downstream step).
- **Do not recite each sub-agent's internal process item by item.**

## Handling compressed results
- Returned sub-agent results may be compressed summaries. If you need more detail before replying, check the sub-agent result first (e.g., `check_subagent`), then re-read the specific file or a smaller scope only as needed.

## Boundaries
- This pattern covers the reply judgment and the brief-reply style, not the underlying analysis task that produced the results.
- Do not apply while the user is correcting or iterating on the task.
- Base the reply only on what the returned results actually support; do not assert file contents or findings that were not corroborated by the returned evidence.
