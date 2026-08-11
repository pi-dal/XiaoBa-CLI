---
name: "acknowledge-presence-call"
description: "Reply with a brief presence acknowledgement (e.g., '收到，我在。') when a user sends only a speaker label prefix such as '[发言人: <name>]' plus an @mention (e.g., '@usr535') and no further task content."
user-invocable: true
x-xiaoba-capability-handle: "cap_67ad63e519294085a64eb352b9e9b73f"
x-xiaoba-transition-id: "transition-55e195fa-c8a5-4e21-ade2-c5f3f690ce56"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1293.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1293.jsonl#episode-episode:3:67704f4c:settlement-2026-08-05T02:57:22.126Z"
---

# Acknowledge a Speaker-Attributed Presence Call

## When to use
Use this when the user sends a message that consists only of a speaker label prefix (for example `[发言人: <name>]`) followed by an @mention of a user handle (for example `@usr535`), with no further task instructions.

## What to do
Reply with a brief, friendly acknowledgement that you are present and ready, matching the language of the incoming message. For a message like `[发言人: 布鲁斯] @usr535`, reply `收到，我在。` ("Received, I'm here."). Do not invent, infer, or start additional work: the observed message contained no task content beyond the presence call.

## Boundaries
- Only apply when the message matches the pattern above (speaker prefix + @mention, with no substantive task content).
- Do not apply while the user is correcting or iterating on a task, or when the message contains an actual request, question, or instruction beyond the presence call; handle those normally instead.
- This guidance is based on a single observed acknowledgement exchange. Do not extend it to meeting-note processing, transcript analysis, or any multi-step workflow.
- Keep the reply to a brief acknowledgement; do not reveal internal file paths, session logs, or environment-specific details in the response.
- If the user follows up with a real task after the acknowledgement, switch to that task rather than repeating the acknowledgement.
