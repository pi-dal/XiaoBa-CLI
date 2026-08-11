---
name: "summarize-background-subtask-results"
description: "Decide whether to briefly supplement the user when a batch of background sub-agent results returns without an explicit wait, and write a one-line outcome summary when the results complete a user-cared background matter."
user-invocable: true
x-xiaoba-capability-handle: "cap_cee8dd3a4521434ebb98df81b0847d84"
x-xiaoba-transition-id: "transition-14d31fa8-164d-4812-8f4f-f9732a3768ee"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#episode-episode:3:ce29ffd8:settlement-2026-08-06T11:27:26.374Z"
---

# Summarize Background Subtask Results

## When to use
Use this when a batch of background sub-agent (后台子 agent) completion results returns to you, and the user did **not explicitly wait** for those results. Your job is to decide whether to add a short supplement to your ongoing reply to the user.

## Decision rule
- If the returned results complete a background matter the user cares about, post a **brief supplement** — usually one short sentence.
- If the results add no new value beyond what the user already has, it is acceptable to **not reply**.
- Never recite internal processes or list sub-agent steps one by one; do not repeat defect lists, evidence line numbers, or tool-level details.

## How to write the supplement
- Open with a short marker such as `补充：` and state the outcome in one concise sentence.
- State only the user-relevant status the returned results actually support (for example, an independent review has returned, its findings were merged into the version just sent, and no new blockers were introduced).
- Do not invent merges, fixes, file changes, or external side effects that the returned results do not confirm (e.g., do not claim files were modified if the sub-agent reported a read-only review).

## Boundaries
- Applies only to batch background sub-task result returns where the user has not explicitly awaited the results; do not generalize this to arbitrary sub-agent outputs, document editing, review, or analysis workflows.
- Do not reuse this pattern while the user is actively correcting or iterating on the task at hand.
- Keep the supplement brief and grounded in the actual returned results; this pattern is derived from a single completed turn and should stay narrow.
