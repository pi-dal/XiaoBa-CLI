---
name: "background-subtask-result-summary"
description: "Decide whether to reply when a batch of background subtask results returns without explicit user wait, and when replying, give a short supplement that states key corrections and conclusions without repeating internal process detail."
user-invocable: true
x-xiaoba-capability-handle: "cap_77b4664a83f64bb485c8444790e3a323"
x-xiaoba-transition-id: "transition-211ce1c0-6590-43b8-930d-4029344302a0"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1333.jsonl#turn-5:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1333.jsonl#episode-episode:5:2c6a86c0:settlement-2026-08-06T04:41:47.610Z, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1333.jsonl#turn-5:user-intent"
---

# Background Subtask Result Summary

## When to use
Apply when a batch of background subtask (sub-agent) results returns and the user did not explicitly wait for them, and you need to decide whether and how to add a short supplementary note.

## What to do
1. Read the returned results for what they complete, confirm, or correct regarding the background matters the user cares about.
2. Decide whether a reply adds value:
   - Reply briefly if the results complete, correct, or meaningfully advance a background matter the user cares about.
   - Skip the reply if there is no added value beyond what is already known or already communicated.
3. When replying, keep it short:
   - State the key conclusions, and explicitly call out any important corrections relative to prior framing (e.g., a previously assumed permission model that the results contradict).
   - Distinguish what is implemented/confirmed from what remains planned, roadmap, or unresolved.
   - Do not repeat the internal process line-by-line or restate each subtask's full detail.

## Boundaries
- Treat subtask results as secondhand observations: assert only what the returned results support, and do not generalize the underlying domain facts of any particular episode (e.g., API endpoints or permission models) into reusable defaults.
- Do not reuse this pattern while the user is actively correcting or iterating on the task.
- Do not inherit access, permissions, or credentials from the episode; rely only on currently authorized context.
- This skill covers the reply decision and framing only, not delivery mechanics or the domain content of any given result batch.
