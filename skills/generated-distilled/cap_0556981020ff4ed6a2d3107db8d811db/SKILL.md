---
name: "handle-background-subtask-results"
description: "Decide whether to reply when background sub-agent results flow back, and give a brief user-facing summary that delivers the key finished artifact to the current chat without enumerating internal processes."
user-invocable: true
x-xiaoba-capability-handle: "cap_0556981020ff4ed6a2d3107db8d811db"
x-xiaoba-transition-id: "transition-3c4c47ee-676e-4d5f-a04f-2f6ecaf01cc7"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1333.jsonl#turn-3:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1333.jsonl#turn-3:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1333.jsonl#episode-episode:3:a150598d:settlement-2026-08-09T07:18:23.122Z"
---

# Handle Background Subtask Results

## When to use
Use when a batch of background sub-agent completion results flows back to you (e.g., a "[后台子任务批量回流]" batch), the user did not explicitly wait for those results, and you must decide whether to send a brief supplementary reply based on what the sub-agents finished.

## Decision rule
- Reply briefly if the returned results complete background matters the user actually cares about and add value (for example, a finished deliverable the user is waiting on).
- If the results add no new value, you may skip replying.

## How to reply
1. Keep the reply to one or two sentences: state the overall outcome and the key completed deliverable (e.g., "final version sent, 72 seconds, main line …").
2. Do not enumerate internal sub-agent processes one by one (不要逐条复述内部过程) — no per-subtask steps, IDs, or intermediate research-file paths.
3. If the key outcome is a finished artifact already present in the working directory, deliver that artifact to the current chat using its actual file path and file name, and mention its key attributes (e.g., duration, main theme).
4. Base the reply only on the provided results summaries and the delivered artifact; do not invent content or re-derive the sub-agents' work.

## Boundaries
- Applies only to batch background subtask result flow-back where the user did not explicitly wait for the results.
- Not for general report writing, generic file delivery, or when the user is actively correcting or iterating on the task.
- No access to sub-agent internals beyond the supplied summaries; resolve file paths against the current working directory before delivering.
