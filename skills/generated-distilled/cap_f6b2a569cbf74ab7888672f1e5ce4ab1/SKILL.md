---
name: "organize-and-send-file-packages"
description: "Organize relevant files into named zip packages, excluding sensitive material (keys, databases, runtime state, identity files), and send the packages to the user."
user-invocable: true
x-xiaoba-capability-handle: "cap_f6b2a569cbf74ab7888672f1e5ce4ab1"
x-xiaoba-transition-id: "transition-84e6d312-63f3-4a7a-9627-786ccdaf0f16"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-4:delivery:send_file:call-id-ec9ba07d7386-1, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-4:delivery:send_file:call-id-bf4884752681-2, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-4:delivery:send_file:call-id-22730886c48f-3, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#episode-episode:4:53f1240b:settlement-2026-08-03T08:17:35.645Z"
---

# Organize and Send File Packages

## Trigger
Apply when the user asks to organize the relevant files and send them (e.g., `[发言人: ddl] 你把有关文件都整理出来发给我@usr535` — "organize the relevant files and send them to me").

## What to do
1. **Locate the relevant files** at execution time. Resolve the current file locations from the active environment/chat context; do not reuse paths from a previous session (paths belong to the target where they were observed and must be re-resolved after switching targets).
2. **Group the files into topical zip packages** with clear, descriptive names (in the observed episode, three packages were created by topic: employee onboarding system, reports/research/deliverables, and skills prompts/project documents).
3. **Exclude sensitive files** from packaging. The observed episode excluded keys, databases, runtime state, and potential identity files (25 files were excluded out of 346 total considered, 321 packaged).
4. **Record exclusions in each package's file list**: write an explicit exclusion record inside every package so the recipient knows which files were intentionally left out and why.
5. **Deliver each package** via `send_file` with both `file_path` and `file_name`, sending one package per call.
6. **Report the outcome** to the user: total number of packaged files and the number/type of sensitive files excluded.

## Boundaries
- Apply only when a new task matches this same user-facing capability. Do not reuse this pattern while the user is correcting or iterating on the task.
- Do not treat the observed `actionPattern` string as an exact execution instruction; it is malformed/truncated.
- Do not inherit the episode's file access. Require current authorization and an available environment where the relevant files are accessible before packaging.
- Never include keys, databases, runtime state, or potential identity files in the delivered packages; exclude them and record the exclusion.
- Scope the skill to organizing/packaging existing files in the current environment — this single completed episode does not support arbitrary document production or reporting workflows.
