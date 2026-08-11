---
name: "explain-agent-run-triggers"
description: "Answers user questions about which agent-run triggers currently exist (general manual Agent Run, code Inspection, Finding Review) and confirms whether an independent agent-run Session can be launched locally for a task assigned in the conversation, including the local-write and cloud-visibility caveats."
user-invocable: true
x-xiaoba-capability-handle: "cap_1a5e5df7b4ad4ec98e76227ca986dd61"
x-xiaoba-transition-id: "transition-b39178c2-f666-4284-832e-c99752aa9a61"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_980.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_980.jsonl#episode-episode:2:32ba9f6e:settlement-2026-07-31T01:21:18.282Z"
---

# Explain Agent Run Triggers

## Purpose
Answer user questions asking **which agent-run triggers currently exist** and **whether an independent agent run Session can be launched** for a task the user assigns in the current conversation. This skill describes the trigger status and launch capability; it does not itself execute an agent run.

## When to apply
Recognize the trigger when the user asks (in Chinese or English, typically phrased like the observed example):

- "现在trigger都有什么" / "What triggers exist currently?"
- "我在这里主动让你做什么任务，你可以触发独立的agent run开session执行么?" / "If I give you a task here, can you trigger an independent agent run to open a session and execute it?"

Apply only when the request is an informational question about trigger availability / independent run capability. Do **not** apply while the user is correcting or iterating on the task.

## Guidance
Respond within the facts supported by the observed session (turn 2 of `catscompany_cc_group_grp_980.jsonl`):

1. **Currently landed triggers (three):**
   - 通用手动 Agent Run (general manual Agent Run)
   - 代码 Inspection (code Inspection)
   - Finding Review

2. **Not yet connected:** PR 新增或修改的自动轮询 (auto-polling on PR additions/modifications) and Webhook 触发 (Webhook triggers).

3. **Launch capability:** For a specific task the user assigns, an independent Agent Run can be started on the local machine, creating an agent-run Session, running normal ReAct, and automatically executing Goal Check.

4. **Always include the operational caveat:** execution mainly writes to the local SessionStore and an independent Board; the CatsCo WebApp cloud session list is **not guaranteed to be synchronously visible**. Treat this cloud-visibility statement as self-reported and unverified — do not assert guaranteed cloud sync.

## Boundaries and cautions
- This skill is derived from a single completed turn and may not generalize; keep answers scoped to trigger status and launch capability questions.
- Do not claim an authoritative or complete trigger registry: the observed shard lists known landed/not-connected triggers but contains no verified full taxonomy.
- Do not inherit privileges. No actual agent run was demonstrated in the observed turn; before any run is started, require the user to explicitly assign a concrete task, and do not claim access or permissions beyond what is observed.
- Do not promote the launch into a reusable execution workflow — evidence covers the capability statement, not a performed launch procedure.
- When the user is correcting or iterating on the answer, stop and follow their correction rather than reusing this pattern.
