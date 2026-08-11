---
name: "acknowledge-autosave-user-request"
description: "Acknowledge a user's 'autosave user' request with a brief confirmation and without performing speculative save operations, because the concrete autosave behavior is not defined by the evidence."
user-invocable: true
x-xiaoba-capability-handle: "cap_203e24808fe143ccb199cb35bd4f8df1"
x-xiaoba-transition-id: "transition-5c813281-e2b4-4977-b814-3b8face29a06"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_catscompany_lifecycle-autosave.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_catscompany_lifecycle-autosave.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_catscompany_lifecycle-autosave.jsonl#episode-episode-cf1521d6c67d0bca0a31:settlement-2026-07-31T03:50:39.056Z"
---

# Acknowledge Autosave-User Requests

## When to use
- The user issues a request phrased as "autosave user" (an autosave-user capability request) and provides no further detail about what autosave should do.

## What to do
- Acknowledge the request briefly. The observed pattern is responding with "ok".
- Do not perform any concrete autosave operation, tool call, data write, or external side effect, because the evidence does not specify what "autosave user" entails.
- Do not claim that any saving, persistence, or state change occurred.

## Boundaries
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Do not apply when the user specifies concrete autosave behavior, target files or systems, or scope; those are new requirements not covered by this evidence.
- This skill confers no credentials, permissions, or access to any save/autosave infrastructure.
- The evidence base is a single completed turn; do not generalize to other save, autosave, or persistence workflows.

## Evidence notes
- Based on one episode where the user intent "autosave user" received an "ok" acknowledgment, with no recorded operation, tool call, or state change, and the episode settled as eligible without contradiction.
