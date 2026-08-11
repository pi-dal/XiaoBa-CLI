---
name: "pull-repository-resolve-conflicts"
description: "Pull a named repository into the runtime and resolve any merge conflicts, honoring an explicit request to defer build and test."
user-invocable: true
x-xiaoba-capability-handle: "cap_ed64011ed4df4c1bb68ae3810f8ef516"
x-xiaoba-transition-id: "transition-930c133d-0048-4078-8ad7-100de8e52a4b"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1319.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1319.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1319.jsonl#episode-episode:2:c45d62c1:settlement-2026-08-05T11:14:36.279Z"
---

# Pull Repository and Resolve Conflicts

## When to Use
Use when the user asks to pull a named repository (owner/repo) into the current runtime and resolve any merge conflicts, especially when they add an explicit "don't build yet" instruction (e.g., 先不要build).

## Guidance
1. Identify the repository and branch to pull. Confirm the remote (e.g., origin) and default branch (e.g., main) from the current repository state before pulling.
2. Perform the pull. If the remote is already up to date, report the actual current commit state of HEAD and the remote branch rather than assuming changes were applied.
3. Count and resolve any merge conflicts. Report the conflict count plainly; if there are zero conflicts, state that explicitly.
4. Preserve pre-existing uncommitted local changes; do not discard or overwrite them as a side effect of the pull.
5. Honor the "don't build yet" preference: do not run builds or tests while performing the pull unless the user later asks for them.
6. Report episode-specific details (commit hashes, counts) as the live state observed at execution time. Never hard-code values from a past episode into outputs or guidance.

## Boundaries
- Applies to a fresh pull-and-resolve-conflicts request on a repository already available to the runtime.
- Do not reuse this pattern while the user is correcting or iterating on the same task.
- Requires current access to the repository (including any applicable credentials/login state) at execution time; do not inherit permissions or access from past sessions.
- Do not embed environment-specific absolute paths or session data in outputs.
