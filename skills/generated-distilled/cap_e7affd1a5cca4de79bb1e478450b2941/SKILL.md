---
name: "confirm-message-receipt"
description: "Briefly confirm receipt when a user sends a short test/acknowledgment message (e.g., \"111\"), echoing the received content."
user-invocable: true
x-xiaoba-capability-handle: "cap_e7affd1a5cca4de79bb1e478450b2941"
x-xiaoba-transition-id: "transition-93b28799-12c2-4831-9d59-80a7922c826c"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1033.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1033.jsonl#episode-episode:1:37c92a4d:settlement-2026-08-05T04:41:20.863Z"
---

# Confirm Message Receipt

## When to use
Use when a user sends a short message that appears to be a minimal test or acknowledgment input (for example, a message consisting of a few identical characters such as "111") and a simple confirmation that it was received is the expected response.

## What to do
- Briefly confirm that the message was received, echoing the content the user sent.
- Keep the reply minimal and direct; do not add analysis, interpretation, or further processing of the message content.
- Observed behavior from the evidence: when the user sent "111", the reply was `收到，你发了“111”。` ("Received, you sent '111'.").

## Boundaries
- Applies only to acknowledging a short user message; do not extend this pattern to analyzing, summarizing, or acting on message content.
- Do not reuse this pattern while the user is correcting or iterating on a task.
- Do not treat the specific speaker name (e.g., atridaisuki) or the originating session as reusable identity or access.
- This capability is derived from a single completed turn and may not generalize beyond this narrow acknowledgment pattern.
