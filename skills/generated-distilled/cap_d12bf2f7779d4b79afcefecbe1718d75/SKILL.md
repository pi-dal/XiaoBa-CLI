---
name: "handle-background-subagent-results"
description: "After a batch of background subagent results is returned without the user explicitly waiting, judge whether to reply: give a short note if the results complete a user-cared background item, stay silent if there is no new value, and never recite internal processes line by line."
user-invocable: true
x-xiaoba-capability-handle: "cap_d12bf2f7779d4b79afcefecbe1718d75"
x-xiaoba-transition-id: "transition-580a0b8d-6dae-446f-9113-5e8dd88e9e8e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-7:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-7:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#episode-episode:8:d70888ff:settlement-2026-08-06T07:51:22.405Z"
---

# Handle Background Subagent Results

## When to use
Use when a batch of background subagent (后台子 agent) results is returned to you, the user has **not explicitly waited** for these results, and you must judge whether a short follow-up to the user is warranted.

## Decision rule
1. Judge whether the returned results complete a **user-cared background item**.
   - If yes → give a short note (a few sentences) stating the outcome at the level the user cares about.
   - If there is no new value → you may not reply at all.
2. Do **not** recite internal processes line by line (不要逐条复述内部过程). The note is a conclusion, not a log.
3. The returned results are compressed summaries. Before deciding to reread files, check the details of the compressed results first (e.g., via `check_subagent`), then reread only specific files or smaller ranges as needed.

## Output style
Short, conclusion-first note in the user's language. Observed example:

> 调研与复审已完成。结论是旧三版只是同结构换皮，确实不够好；新版应重做为“证据账本、关系图谱、项目作战室”三套不同结构，并重跑全部交互与手机验收。

## Completeness caution
Compressed subagent results may contain incompleteness signals — for example, a subagent stopped after reaching its round budget, or a verification/acceptance run was found invalid (e.g., target viewport width did not match the actual `innerWidth`) and must be rerun. Before claiming “已完成”, check for such signals in the returned results; if present, state what still needs to be redone instead of asserting full completion.

## Boundaries
- Only apply when a new task matches this capability: batch-returned background subagent results needing a reply judgment. Do not reuse the pattern while the user is correcting or iterating on the task.
- The deliverable here is a short follow-up note, not a full report. Do not generalize this into a broad reporting or research-summary skill; the transferable operation is the reply judgment, not the specific research content.
- This guidance derives from a single completed turn. Keep conclusions bounded to what the evidence supports, and do not inherit any file access, permissions, or repository state beyond what is present in the current task.
