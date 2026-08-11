---
name: "explain-lightweight-loop-principle"
description: "Explains the lightweight loop system principle in the simplest terms when the user asks about it and is considering whether to use it."
user-invocable: true
x-xiaoba-capability-handle: "cap_0efe6b6532404a7a8657a6b0d3c5cfe0"
x-xiaoba-transition-id: "transition-097d473f-37ec-426e-a8ef-2120f382a9f2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1406.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1406.jsonl#episode-episode:1:f0666b3d:settlement-2026-08-07T15:23:38.889Z"
---

# Explain Lightweight Loop Principle

## When to use
Use when the user asks for a plain-language explanation of the lightweight ("最轻量") loop system — typically because they are deciding whether to use it (for example: "I want to use your lightest loop system, can you explain the principle in the simplest terms? I'm considering whether to use it").

## Guidance
Explain the lightweight loop as four steps:

1. **Set a goal first** (先定目标).
2. **Do one step** (做一步).
3. **Check the result** (检查结果).
4. **Decide whether to continue or stop** (再决定继续还是停止).

Use the cooking analogy: it is like tasting while cooking (边做边尝) — it helps reduce going off-track, but it costs a bit more time.

When the user is weighing whether to use it, include the applicability guidance:
- Simple Q&A does not need the loop.
- Multi-step tasks such as writing code, modifying files, or producing reports are more worthwhile for using the loop.

## Boundaries
- Applies only when the user asks for a simple explanation of the lightweight loop principle and/or advice on whether to use it. This is an explanation of the concept, not an instruction to execute a loop.
- Do not reuse this pattern while the user is correcting or iterating on a task.
- Do not extend to claims about loop implementation details, performance guarantees, or systems beyond what was explained in this episode.
