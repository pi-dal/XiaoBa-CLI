---
name: "deliver-completed-short-video"
description: "Deliver an already-completed short video (MP4) to the current chat when the user sends a continuation request (e.g., 继续@<user>) asking for the finished video."
user-invocable: true
x-xiaoba-capability-handle: "cap_27cdd33e9d014054bfac45275976935c"
x-xiaoba-transition-id: "transition-036732c9-dd17-496a-9bfe-84465de1e29e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_617.jsonl#turn-1:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_617.jsonl#episode-episode:1:0d622dc3:settlement-2026-08-04T07:05:41.077Z"
---

# Deliver Completed Short Video to Chat

## When to use
Use when the user sends a continuation or delivery request (observed form: `[发言人: <speaker>] 继续@<user>` — "continue @user") for a short-video task whose MP4 file has already been completed, and the expected action is to hand over the finished video to the current chat.

Do not use while the user is correcting or iterating on the task, or when the video still needs to be generated, edited, or re-rendered.

## Steps
1. Recognize the continuation request as a prompt to deliver the already-finished video; do not re-generate or re-edit the video.
2. Locate the completed MP4 in the work directory (observed pattern: `/home/xiaoba/app/work/hot-topic-video-<date>/<task>_生图增强版_20秒.mp4`). Paths belong to the current target agent; re-resolve common directories after switching targets.
3. Send the file to the current chat with `send_file`, providing the exact `file_name` and `file_path`.
4. Confirm delivery to the current chat.

## Boundaries
- Only deliver an already-completed video file; this skill does not cover generating, editing, or verifying video content.
- Do not assert video specifications (resolution, frame rate, accepted image count, subtitle status) unless independently verified in the current task.
- Do not assume the meaning or identity of the referenced user handle (e.g., `usr535`) from this episode.
