---
name: "refine-screening-rules"
description: "Update screening/filter rules in the current conversation: classify each stated change as a hard condition or a reference condition, re-filter with the new rule set, and deliver the updated result set (via file updates when the prototype has no live backend)."
user-invocable: true
x-xiaoba-capability-handle: "cap_7312cee799804a3bafba8b089d4ba749"
x-xiaoba-transition-id: "transition-f171b5a3-5982-4068-891e-0dce21934f06"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#turn-8:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#episode-episode:12:21c23096:settlement-2026-08-05T17:16:06.732Z"
---

# Refine Screening Rules via Conversation

## When to use
Use when a user, in the current conversation, wants to modify an existing screening/filter rule set by stating added, removed, or adjusted conditions, and expects you to re-filter and hand back an updated result set.

Trigger example (paraphrased from the episode): the user asks whether they can simply tell you in this chat which conditions to add and have you filter again.

## Guidance
1. **Confirm the type of each change.** Before re-filtering, classify each stated condition as a hard condition (硬条件) or a reference condition (参考条件).
2. **Re-run the filtering** using the updated rule set (additions, deletions, and adjustments all apply).
3. **Deliver the new version of the results.** When the prototype is not connected to a live backend, update the relevant files and re-deliver them; do not promise real-time backend updates in that case.

## Boundaries
- Applies only to updating screening/filter rules within the current conversation; do not extend this to arbitrary document, analysis, or reporting tasks.
- Derived from one completed turn; keep the workflow narrow and ask for clarification when a stated condition's type or effect is ambiguous.
- Do not claim live-backend or real-time update behavior unless the current setup actually supports it.
- Apply when a new task matches this capability; do not reuse while the user is actively correcting or iterating on the current task.
