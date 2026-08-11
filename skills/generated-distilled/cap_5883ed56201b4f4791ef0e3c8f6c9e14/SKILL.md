---
name: "direct-chat-file-delivery"
description: "Handle a user request to receive files directly in the chat instead of as a zip/archive: acknowledge direct delivery, note one-by-one sending and the flood/platform-limit risk for large file counts, and propose a batched delivery plan (final deliverables first, then category batches) pending user confirmation."
user-invocable: true
x-xiaoba-capability-handle: "cap_5883ed56201b4f4791ef0e3c8f6c9e14"
x-xiaoba-transition-id: "transition-4c6753b8-d47a-4d54-a4b9-abe267066433"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#turn-5:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_936.jsonl#episode-episode:5:a9895cea:settlement-2026-08-03T08:21:44.087Z"
---

# Direct Chat File Delivery

## Purpose
Handle a user request to receive files directly in the chat conversation instead of as a compressed package (e.g., a ZIP archive).

## Trigger
- The user explicitly declines an archive/package and asks for the files to be sent directly in the conversation (e.g., "我不要压缩包 你可以直接在这个对话发给我吗？" — "I don't want a zip, can you send it directly in this conversation?").

## Guidance
1. Acknowledge the preference: direct chat delivery is possible, but chat platforms typically send files one by one.
2. If the number of files is large, note that sending them all at once would flood the chat and could trigger platform limits.
3. Propose a batched delivery plan instead of dumping everything at once: send the formal/final deliverables first, then continue in batches grouped by category (e.g., by system, Skills, documentation).
4. Treat the batching plan as a proposal and wait for user confirmation before executing it; the originating episode recorded no explicit user acceptance of the proposed plan.

## Boundaries
- Do not hard-code episode-specific counts (e.g., 321 total files or 27 in the first batch) or the specific category names as universal defaults; re-derive them from the current task's actual file inventory at execution time.
- Do not assert platform limit behavior as a certainty; the observed reasoning was only that a large send "may" trigger platform limits.
- Do not inherit file inventories, access, or platform behavior beyond what the current task and environment evidence show.
- Do not reproduce user identifiers or speaker labels (e.g., @usr535 or [发言人: ddl]) in public-facing names or guidance.
