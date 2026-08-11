---
name: "diagnose-safari-photo-drag"
description: "Diagnose why dragging photos into a web attachment input works in Chrome but fails in Safari, and guide a Safari-compatible drag protocol (native File or controlled drag marker) with real-Safari verification."
user-invocable: true
x-xiaoba-capability-handle: "cap_b853358aaba742a6bcb76cb551b1a131"
x-xiaoba-transition-id: "transition-db97f5b5-5119-4c9f-8839-78f2fcdae21f"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1125.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1125.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1125.jsonl#episode-episode:1:39f7e848:settlement-2026-07-31T04:12:06.376Z"
---

# Safari Photo Drag Troubleshooting

## When to use
Use when a user reports that dragging photos into a web attachment/upload input works in Chrome but fails in Safari on the same page. Do not apply this pattern while the user is still correcting or iterating on the task.

## What to do
1. Present the likely cause as a diagnostic hypothesis, not a confirmed fact: the page relies on a custom `DataTransfer` drag type to carry an internal attachment token; Chrome accepts this custom type, while Safari applies stricter restrictions on custom DataTransfer MIME types and in-page image drags, so the token never reaches the input.
2. Note the expected symptom split: dragging a file from the desktop usually still works in Safari; the failure is specific to the custom in-page drag protocol, not a styling issue.
3. Recommend adding a Safari-compatible drag protocol rather than only changing styles: support Safari-recognizable native `File` objects (or a controlled drag marker) as an alternative path alongside the custom MIME type.
4. Require verification on a real Safari browser before claiming the fix works. Do not assert confirmed Safari behavior based on this diagnosis alone.

## Boundaries
- Based on a single, unverified diagnostic exchange; the root cause and the proposed fix are not yet confirmed by tests or documentation.
- Do not generalize this to all Safari drag-and-drop behavior or to arbitrary browsers/platforms.
- Do not reproduce user names, @mentions, or internal log paths in responses.
