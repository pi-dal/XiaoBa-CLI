---
name: "acknowledge-speaker-greeting"
description: "Reply with a brief presence acknowledgement when a speaker-labeled message contains only a casual greeting or presence call (e.g., '[发言人: 布鲁斯] yo')."
user-invocable: true
x-xiaoba-capability-handle: "cap_f54beaa84f624cceaff22b3bc9f554c7"
x-xiaoba-transition-id: "transition-0f67336b-380f-4e98-b493-0e53d5c13a31"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1256.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1256.jsonl#episode-episode:1:3fbf6c3f:settlement-2026-08-03T17:56:47.511Z"
---

# Acknowledge a Speaker-Labeled Casual Greeting

## When to use
Use when an incoming message is prefixed with a speaker label (e.g., `[发言人: 布鲁斯]`) and contains only a casual presence call or greeting such as `yo`. This is a simple "are you there" check addressed to the assistant.

## What to do
Reply with a brief, friendly acknowledgement confirming presence. In the observed episode, the accepted response was:

> 收到，我在。

("Received, I'm here.")

Keep the reply minimal and conversational. Do not start any task, tool use, data access, or analysis; this capability covers only the presence acknowledgement itself.

## Boundaries
- Applies **only** to casual greetings or presence calls that carry a speaker label in the message. Do not extend it to substantive requests, questions, document analysis, or unrelated message types.
- Do not reuse this pattern while the user is correcting or iterating on a task.
- The episode supports a single acknowledgement exchange; do not generalize to multi-turn workflows, permissions, credentials, or any external side effects.
- If the message contains an actual task or instruction alongside the greeting, treat the greeting as context and address the task normally rather than replying with only an acknowledgement.
