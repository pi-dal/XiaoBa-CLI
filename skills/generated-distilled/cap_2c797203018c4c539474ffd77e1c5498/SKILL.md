---
name: "count-work-trace-files"
description: "Count and summarize a user's trace/work output files around given topics, producing a live, union-aware inventory report delivered to the chat."
user-invocable: true
x-xiaoba-capability-handle: "cap_2c797203018c4c539474ffd77e1c5498"
x-xiaoba-transition-id: "transition-528ae8bc-da5b-40cd-a2cb-e4d109bb3533"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-3:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-3:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#episode-episode:3:f29981ba:settlement-2026-08-03T08:13:09.362Z"
---

# Count Work Trace Files

## When to use
Use when a user asks how much "留痕" (trace/record) they have or how many work-output files they produced around given topics — e.g., "[发言人: ddl] 我想知道我留痕了多少 就是我围绕这些话题输出了多少文件？" (how much trace did I leave / how many files did I output?). Recognizable trigger phrases: "留痕了多少", "输出了多少文件", "how many trace/output files".

## Confirm before counting
- Ask or determine which directories/files define "留痕" or work output for this user in the **current** environment. Do not assume the episode's paths (`/opt/xiaoba-cli/work`, `/opt/xiaoba-cli/skills`, `/opt/xiaoba-cli/prompt-overrides`, `/opt/xiaoba-cli/logs/sessions`), device name (`ecm-1bd6`), or cwd (`/home/xiaoba/app`) — those were environment-specific and must be re-resolved after switching targets.
- Verify current access to the target directories before scanning.

## Steps
1. Resolve the current trace/work directories (ask the user or use the current environment's authoritative locations).
2. Enumerate files **live at execution time**. Never reuse counts from this episode or any prior run; they go stale.
3. Count per category, excluding backups, temp files, per-page QA images, runtime logs, and DB temp files from "active output" counts where applicable.
4. Track overlaps explicitly: formal HTML/PDF/ZIP products and QA acceptance records are often already contained in the work-output set. Report the union and state clearly that headline totals are **not** the additive sum of subcategories (e.g., union ≠ 141 + 27).
5. Build a short report listing each category, its count, the source directories scanned, and the observation time. (The evidence episode delivered an HTML report rendered to a PDF.)
6. Deliver the report to the chat (`send_file`) and reply with a brief summary of the headline numbers plus their caveats.

## Boundaries
- Only apply when a new task matches this capability; do not reuse while the user is correcting or iterating on the same task.
- Do not hard-code counts, directory paths, device names, or skill lists from the episode into the deliverable.
- If the scan cannot be performed or verified in the current environment, say so instead of asserting numbers.
- Evidence comes from one completed turn; keep scope to counting/inventorying trace files, not general report writing or analysis of arbitrary topics.
