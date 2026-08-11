---
name: "plain-language-app-status-explanation"
description: "When a user asks '说人话' (explain in plain language) about an app's current technical status, translate it into simple everyday terms with a concrete analogy, and clearly separate what works today from what is still missing (e.g., server connected but data not yet persisted)."
user-invocable: true
x-xiaoba-capability-handle: "cap_e24d3a9d93174344af5692aedb7c956d"
x-xiaoba-transition-id: "transition-9044de6f-4cc1-4503-85cc-c547fd0fd4d0"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-8:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#turn-8:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1326.jsonl#episode-episode:8:dcefdab2:settlement-2026-08-08T17:45:56.413Z"
---

# 说人话：用大白话解释应用当前技术状态

## Purpose
When a user asks "说人话" (say it in plain language) about a technical status or explanation, re-explain the current state in simple, everyday terms instead of repeating technical jargon. The transferable preference is the *plain-language explanation style*, not the underlying product work itself.

## Trigger
- The user says "说人话" or otherwise asks for a plain-language explanation of a technical status (e.g., "server is connected" / "still a browser demo").

## Steps
1. Pull the current technical state from the existing conversation context (e.g., the server connection is up, but data and tasks are not yet actually stored on the server; the app is currently demonstrated in the browser).
2. Restate that state in short, everyday words, using a concrete analogy the user can relate to (e.g., "the computer is connected to the internet, but the files still only exist on this machine").
3. Explicitly separate what works today from what is still missing, and name the practical gap in plain terms (e.g., formal multi-user use, continuing after exiting, and automatic execution still require connecting the server database and interfaces).
4. Keep the answer brief and conversational; do not introduce new technical terminology.

## Boundaries
- Applies only to *plain-language explanation requests* about an application's current technical status. Do not extend this to implementation, debugging, deployment, or authorization to make server/database changes.
- Do not claim that server database/API work has been completed when the evidence only shows an explanation of the status gap.
- Do not reuse this pattern while the user is correcting or iterating on the same task.
