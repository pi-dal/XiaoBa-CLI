---
name: "honor-no-zip-single-file-delivery"
description: "Honor a user's explicit preference to receive files as individual items instead of a compressed ZIP archive."
user-invocable: true
x-xiaoba-capability-handle: "cap_0ad48bc7e52441b5ad45746d8db7dc9b"
x-xiaoba-transition-id: "transition-18cb9739-fe52-43d1-9fc7-ca15ce55979d"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#episode-episode:4:f8bef717:settlement-2026-08-06T08:22:09.173Z"
---

# Honor No-ZIP / Single-File Delivery Preference

## When to apply
Apply when a user explicitly states that they do not want a compressed archive (for example, "我不要压缩包" / "no ZIP") and expects files to be delivered as individual items. This includes when the preference is expressed as a correction to prior delivery behavior.

## What to do
1. Acknowledge the stated preference explicitly (confirm that you will not send ZIP or other compressed archives).
2. Deliver the requested files one by one as individual files for the current request rather than bundling them into a ZIP or similar archive.

## Boundaries
- Apply only when the user has clearly expressed this no-archive preference; do not assume it for all users or all tasks.
- This guidance covers the delivery format preference for the current request only. It does not cover file contents, access, permissions, or any external side effects, and it does not assert any ongoing future delivery commitment beyond the observed exchange.
