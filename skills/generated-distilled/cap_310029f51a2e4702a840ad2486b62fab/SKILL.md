---
name: "review-local-pr-branch-after-rebase"
description: "Rebase a user's local PR branch against main and inspect the branch for problems via targeted tests and build, reporting concrete root-cause findings while preserving pre-existing uncommitted changes."
user-invocable: true
x-xiaoba-capability-handle: "cap_310029f51a2e4702a840ad2486b62fab"
x-xiaoba-transition-id: "transition-7be24b62-1691-464d-96fc-0fb22d1c5b59"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#episode-episode:1:144c692c:settlement-2026-08-03T04:26:36.726Z"
---

# Review Local PR Branch After Rebase Against Main

## Purpose
When a user asks to inspect a locally raised PR branch — rebase main, rebase the PR branch, and check what problems the branch has — perform the local git rebase and inspect the branch for issues, reporting concrete findings.

## When to use
- The user names a local PR branch (e.g., "PR271") and asks to rebase main, rebase that branch, and examine the branch for problems.
- Local repository and branch access is already available for this task.

## When not to use
- While the user is actively correcting or iterating on the same task.
- If no local branch or repository access is available. Do not assume credentials, pushes, merges, or other repository permissions beyond what the user has granted for this task.

## Steps
1. Update main first. Bring main to latest; report whether main was already up to date (no new commits) or produced commits.
2. Rebase the PR branch onto main. Report whether it was already up to date or produced new commits.
3. Inspect the branch for problems:
   - Run the targeted tests for the affected area.
   - Run the build.
   - If a specific mode (e.g., Create mode) fails early, trace it to a concrete root cause (exact line/command) rather than stopping at the symptom.
4. Report findings with specifics: which tests passed/failed (e.g., 8/9), the identified root cause and its location, and build status.
5. Housekeeping: clean up any temporary directories created during the check; leave pre-existing uncommitted changes untouched.

## Evidence-bound notes
In the observed episode, main and the PR branch were already up to date after rebase (no new commits). The identified problem was a PowerShell script line (line 818) on Windows mangling `HEAD^{commit}` into `HEAD{commit}`, causing Create mode to fail early; targeted tests passed 8/9 and the build passed. This root cause appears only in the assistant response and was not independently verified, so treat it as one possible class of issue: when a scripted flow fails early on Windows, check whether git revision syntax such as `HEAD^{commit}` was mangled in the script. Re-verify any such cause against the current repository before reporting it as fact.

This skill derives from a single completed session; apply it only to tasks matching this bounded capability.
