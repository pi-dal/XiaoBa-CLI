---
name: "respond-to-stuck-check"
description: "Respond when a user asks whether the agent is stuck ('卡了？') during ongoing work: confirm liveness, report the current task state, clarify stale pre-fix artifacts, and flag pending follow-up without redoing the work."
user-invocable: true
x-xiaoba-capability-handle: "cap_84370973a6ba42b4852b3329e629b821"
x-xiaoba-transition-id: "transition-5b642d0a-f227-408c-8c17-48b1322c3163"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#episode-episode:1:631fab9a:settlement-2026-08-03T09:29:45.527Z"
---

# Respond to a Stuck-Status Check

## Trigger

A user asks whether the agent is stuck or blocked while a fix or task is in progress (observed form: `卡了？` / "Stuck?").

## Guidance

- Answer the liveness question directly and concisely first (e.g., confirm that you are not stuck).
- Give a brief current-state summary of the task in progress: state what has been completed (e.g., the fix is finished and pushed) without redoing or re-running the work just because a status check arrived.
- If an artifact or review returned earlier predates the latest fix, state explicitly that it reflects the pre-fix state and not the current one.
- List any remaining pending follow-up steps as pending (e.g., cleaning up stale worktree records after a device comes online); do not claim they are finished.
- Do not assert external outcomes (pushes, test results, CI results) unless they are currently verified in the environment.

## Boundaries

- Applies only to status/liveness check-ins matching this capability; do not apply while the user is correcting or iterating on the task.
- Does not grant repository, CI, or device access; do not inherit any permissions, credentials, or login state from the source episode.
- Derived from a single completed turn; it is not a general task-status reporting procedure and must not be generalized to other account, repository, or CI workflows.
