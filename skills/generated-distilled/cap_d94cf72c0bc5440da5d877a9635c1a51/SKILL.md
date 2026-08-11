---
name: "sync-repo-main-with-remote"
description: "Pull the latest main from a specified GitHub remote and update the local repository to match it, preserving any local changes before aligning."
user-invocable: true
x-xiaoba-capability-handle: "cap_d94cf72c0bc5440da5d877a9635c1a51"
x-xiaoba-transition-id: "transition-5a3e5413-181b-4141-b6b9-716cca092d6e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1282.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1282.jsonl#episode-episode:1:e1258207:settlement-2026-08-04T11:16:42.432Z"
---

# Sync Local Repo Main with a Remote

## When to use
Use when the user asks to pull the latest `main` from a specific GitHub remote (for example a GitHub org such as `buildsense-ai`) and update the local repository to match it. The evidenced user phrasing is: "帮我去拉取最新的main下来更新<remote> 你自己看一下" (pull the latest main and update locally).

## Inputs to confirm first
- The remote URL / org-repo the user wants to pull from.
- The local repository path and its current branch.
- That the user has authorized access to this repository and the remote is reachable.

## Procedure
1. Inspect the local repository's current state: current branch, `git status`, and whether there are local changes.
2. Before aligning to the remote, preserve any local changes (create a backup branch and/or stash) so nothing is lost and the worktree can be made clean.
3. Fetch the latest `main` from the remote and identify the specific commit to align to.
4. Align local `main` to that commit, leaving the worktree clean.
5. Do not run tests or a build unless the user explicitly asks. Report clearly whether they were run.

## Report the outcome
State: the local repo path, the remote and commit the local `main` was aligned to, how local changes were preserved (backup branch / stash), the final worktree state, and any verification (tests/build) that was **not** performed.

## Boundaries
- Only apply when the user explicitly requests updating the local repo from the remote's latest `main`. Do not reuse the pattern while the user is correcting or iterating on the task.
- Do not hard-code episode-specific details such as the commit hash, repository path, or number of local changes; verify them at execution time.
- Do not claim test or build success unless those steps were actually run.
- Operate only on repositories the user has authorized; confirm current access and remote reachability rather than assuming permissions from a prior episode.
