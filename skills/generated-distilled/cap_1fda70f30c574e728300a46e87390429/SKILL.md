---
name: "backend-subtask-batch-reply"
description: "Decide whether to send a brief user reply when backend subtask batch results return without the user explicitly waiting: reply only if the results complete a user-concerned backend matter, otherwise omit, and never restate internal processes."
user-invocable: true
x-xiaoba-capability-handle: "cap_1fda70f30c574e728300a46e87390429"
x-xiaoba-transition-id: "transition-fe3312bb-6249-4a8e-baa2-6152595f3650"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1256.jsonl#turn-3:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1256.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1256.jsonl#episode-episode:5:727c2460:settlement-2026-08-06T17:27:38.652Z"
---

# Backend Subtask Batch Reply

## When to use
Use when a batch of backend subagent results is returned to you (a "后台子任务批量回流" flow) and the user did not explicitly wait for those results, but you need to decide whether to post a short supplement to the user.

## Decision rule
1. Judge whether a reply is needed first: reply briefly **only if** the returned results complete a backend matter the user actually cares about.
2. If the results add no new value beyond what the user already has, it is acceptable to omit the reply.
3. Keep any reply to a short supplement; do not restate internal processes or reproduce subagent outputs line by line.
4. Do not proactively merge, adjust, or consolidate the retained results; the user explicitly kept them available to check, merge, or adjust on request ("需要我继续检查、合并或调整，直接说就行"). Act on those operations only when the user asks.

## Boundaries
- Apply only to batch-returned backend subtask results that the user did not explicitly await; do not generalize this to ordinary reporting or chat tasks.
- Do not claim that results were already merged or consolidated into a report unless that merge is actually evidenced. In the source episode, the user framed the results as merely retained, and the assistant's assertion that all feedback was merged into a just-sent summary report was not corroborated by any report artifact or merge instruction. Do not reproduce that unsupported claim.
- Subagent reviews that include professional perspectives (e.g., tax advisor, labor lawyer, commercial lawyer) are review inputs, not authoritative legal or tax advice, and must not be presented as such.
- This guidance derives from one completed turn; treat it as a narrow pattern, not a general reply policy.
