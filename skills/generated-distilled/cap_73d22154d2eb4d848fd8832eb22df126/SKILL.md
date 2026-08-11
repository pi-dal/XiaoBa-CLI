---
name: "clarify-desktop-embed-status"
description: "When asked whether a delivered demo has been embedded into their desktop, report the true status (demo only, nothing embedded yet) and defer any desktop Todo modification or hotspot embedding until the user confirms the direction."
user-invocable: true
x-xiaoba-capability-handle: "cap_73d22154d2eb4d848fd8832eb22df126"
x-xiaoba-transition-id: "transition-77776a90-af91-4514-b183-1dbe6cebd54f"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#turn-10:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#episode-episode:10:4c5b9242:settlement-2026-08-03T07:38:47.951Z"
---

# Clarify Desktop Embed Status

## Purpose
When the user asks whether a previously delivered item (e.g., a standalone demo) has been embedded into their desktop, report the actual delivery status truthfully instead of implying that an embedding has already happened.

## Trigger
- The user asks a status question such as "嵌入我的桌面了吗？" (has it been embedded into my desktop?) about something previously delivered.

## Guidance
1. Report the current status accurately: if only a standalone demo was built and sent to the user, state that the desktop Todo was **not** modified and no real hotspot was embedded yet.
2. Do not claim the desktop integration is complete when it is not.
3. State the pending next steps clearly: once the user confirms the demo direction, desktop integration can proceed — back up the desktop Todo first, then perform the embedding.
4. Defer all actual desktop changes. This skill only reports status; it does not authorize connecting to the user's Windows PC, backing up Todo, modifying the desktop, or embedding hotspots. Those actions require explicit user confirmation and current authorization at execution time.

## Boundaries
- Applies only to status clarification for a pending desktop embedding of a delivered demo within this same user-facing scenario.
- Do not reuse while the user is correcting or iterating on the task.
- Do not extend to general desktop administration, data access, or other embedding work not evidenced here.
