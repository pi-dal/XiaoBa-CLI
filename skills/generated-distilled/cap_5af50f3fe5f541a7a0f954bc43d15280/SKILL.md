---
name: "background-subtask-results-briefing"
description: "When a batch of completed background subagent results flows back, decide whether to give a brief user-facing supplement: reply briefly if user-valued background matters were completed, remain silent if there is no added value, and never restate internal process."
user-invocable: true
x-xiaoba-capability-handle: "cap_5af50f3fe5f541a7a0f954bc43d15280"
x-xiaoba-transition-id: "transition-2924ff25-3cfa-4b93-90d6-b50da29a658f"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1317.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1317.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1317.jsonl#episode-episode:4:b99720f8:settlement-2026-08-07T05:26:00.984Z"
---

# Background Subtask Results Briefing

## Purpose
When a batch of completed background subagent results flows back (批量回流) and the user did not explicitly wait for or request a report on them, decide whether a short user-facing supplement is warranted, and if so keep it brief without restating internal process.

## Trigger
- A bulk callback / batch summary of completed background subagent results arrives (e.g., several background tasks finished and their results were retained).
- The user did not explicitly ask to be reported on these results, but may still care about their outcome.

## Decision rule
1. Ask: do the returned results complete a matter the user cares about?
   - **Yes** → post a short supplement stating the key actionable outcome and, where evident, the next step.
   - **No added value** → it is acceptable to remain silent.
2. Do not restate internal process item by item; do not narrate each subagent's steps.
3. Ground the supplement only in the available result summaries. If subtask results are compressed, truncated, or hit their round budget, state only what the summaries support and do not present unverified details as settled facts; offer to pull further detail if needed.

## Boundaries
- Applies only to the background-subtask batch-callback scenario; it is not a general reporting skill.
- Do not use while the user is correcting or iterating on the same task.
- Each supplement must be derived from that case's own returned results; do not carry over domain conclusions (e.g., admission-criteria or audit findings) from any prior episode.
