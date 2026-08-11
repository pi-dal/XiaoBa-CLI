---
name: "fix-branch-update-pr"
description: "Fix a branch locally and update its pull request, with comprehensive tests, build/CI verification, and cleanup of leftover artifacts."
user-invocable: true
x-xiaoba-capability-handle: "cap_42c7448bada843e49d3f1113083fd3d5"
x-xiaoba-transition-id: "transition-1543223c-4eae-4c0d-ade3-f4afde81827d"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#episode-episode:5:b623da22:settlement-2026-08-03T06:53:46.120Z"
---

# Fix a Branch Locally and Update Its Pull Request

## When to use
Use when the user asks you to fix a branch on their local machine and then update the associated pull request, with comprehensive testing and cleanup of leftover artifacts. Example trigger (Chinese): "好，那你在我本地开始修复这个分支然后再更新pr？记得做好完备测试，然后清理残留" ("OK, fix this branch on my local machine and then update the PR? Remember to run comprehensive tests and clean up leftovers").

Do not reuse this pattern while the user is still correcting or iterating on the same task.

## Required inputs and current state
- Identify the repository, branch, and pull request to update from the current task; do not assume episode-specific identifiers such as PR numbers, commit hashes, or branch names from prior work.
- Remote PR and CI operations require explicit current authorization and an available login/working state for the repository. Do not inherit access or permissions from earlier sessions.
- Confirm which pre-existing changes in the branch must remain untouched before making any edits.

## Workflow
1. **Fix the branch locally.** Apply the needed fix on the local branch while preserving the original intended changes (track the pre-existing changes that must stay untouched).
2. **Update the PR.** Push the fixed commit and update the associated pull request.
3. **Verify comprehensively.** Run the project's targeted tests, the build, and the relevant CI jobs. Base the pass/fail report on the actual run output and CI results, not on assumptions; do not reuse prior episode counts (e.g., "9/9 tests", "3 CI jobs") as defaults for a new task.
4. **Clean up leftover artifacts.** Remove temporary files created during the work (e.g., scratch test files).
5. **Report the outcome.** Summarize what changed, what passed, and any cleanup that still must be performed later (e.g., stale worktree metadata to prune after deployment).

## Boundaries
- Do not embed or assume access to user-specific local filesystem paths or local worktree state from previous sessions.
- Do not hard-code episode-specific identifiers or counts as reusable defaults; derive them from the current task and actual verification output.
- If current authorization, login state, or final CI/validation evidence is missing, stop and request it rather than proceeding on assumed access.
