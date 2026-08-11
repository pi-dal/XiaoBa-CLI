---
name: "deliver-source-research-operation-demo"
description: "Deliver the prepared operation demonstration video for the multi-source data collection and screening task (达人多来源资料归集与筛选) to the current chat when the user asks to continue, and confirm delivery with a brief summary."
user-invocable: true
x-xiaoba-capability-handle: "cap_7e99809a5aa74413b78c8fbb109d3079"
x-xiaoba-transition-id: "transition-587f4bac-9998-4a3f-898a-0a2091759c6c"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-10:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:11:e138031b:settlement-2026-08-05T10:09:46.861Z"
---

# Deliver Source Research Operation Demo

## Description
Deliver the prepared operation demonstration video for the multi-source data collection and screening task (达人多来源资料归集与筛选) to the current chat when the user asks to continue, and confirm delivery with a brief summary.

## Guidance
1. **Scope**: Use this when the current session involves the multi-source data collection and screening task (达人多来源资料归集与筛选), an operation demo video for that workflow has already been prepared under the task working directory, and the user asks to continue (e.g., "[发言人: ddl] j继续").
2. **Locate the artifact**: Find the prepared demo file `达人多来源资料归集与筛选_操作演示.webm` under the task working directory. In the source episode it lived at `/home/xiaoba/app/tmp/daren-source-research-20260805/`; do not treat that absolute path as reusable — re-resolve the file within the current working directory for the task.
3. **Deliver**: Send the file to the current chat using its original file name (e.g., via `send_file` with identical file_path and file_name, as observed in the episode).
4. **Confirm**: After the file is sent, give a brief confirmation (e.g., "操作演示视频已发"). The source episode settled with status "eligible" at 2026-08-05T10:09:46.861Z; no explicit user confirmation was recorded in the supplied evidence.
5. **State only verified properties**: Do not assert video properties or contents unless you actually verify them. In the source episode, claims such as "10秒、1440×900" and that the video shows data loading, data inspection, candidate filtering, and manual handoff were not independently corroborated and must not be repeated as fact.

## Boundaries
- Applies only when the new task matches the evidenced user-facing capability: delivering the already-prepared operation demo for the multi-source data collection and screening workflow when asked to continue.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Do not extend this to arbitrary file deliveries, and do not generalize to the underlying multi-source data collection/filtering workflow itself — those workflow steps are not evidenced in this bundle.
- Do not inherit paths, permissions, or access beyond the current working directory; re-resolve common directories after switching targets.
