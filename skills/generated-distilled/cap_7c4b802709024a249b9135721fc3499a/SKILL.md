---
name: "deliver-xunse-comic-xiaohongshu-material-pack"
description: "Deliver the completed 寻色漫画书 (Xunse comic book) Xiaohongshu release material pack — zip, vertical MP4, and title/body/comments text — to the current chat when the user continues the task."
user-invocable: true
x-xiaoba-capability-handle: "cap_7c4b802709024a249b9135721fc3499a"
x-xiaoba-transition-id: "transition-8e40f9b6-ee43-41f0-8c9c-9f0a12dcbd01"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-1:delivery:send_file:call-id-ed682a04c548-1, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-1:delivery:send_file:call-id-1d3fe5436df9-2, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-1:delivery:send_file:call-id-25b48dec24b3-3, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#episode-episode:1:002d60ab:settlement-2026-08-06T08:12:35.340Z"
---

# Deliver Xunse Comic Xiaohongshu Release Material Pack

## When to use
Use this skill when the user continues or requests delivery of the completed **寻色漫画书 (Xunse comic book) Xiaohongshu release material pack** — for example a message like `[发言人: ddl] 继续@usr535` — and the three deliverable files have already been prepared and just need to be sent to the current chat.

## What to do
1. Confirm the three completed deliverables are available:
   - `寻色漫画书_小红书发布素材包.zip` (release material pack)
   - `寻色漫画书_真实实玩竖屏.mp4` (vertical gameplay video)
   - `小红书标题正文与评论.txt` (title, body, and comments text)
2. Send each file to the current chat with `send_file`. In the original session the files lived under `/home/xiaoba/app/output` (the zip) and `/home/xiaoba/app/tmp/xhs-assets` (the MP4 and text). These paths are session/target-specific — re-resolve the common directories after switching targets instead of assuming they still exist.
3. In the reply, list the sent files. If a temporary play link was provided (e.g., a `*.trycloudflare.com` URL), tell the user it is currently a temporary link and suggest pinning it in the top comment at publish time.

## Boundaries
- Covers **delivering already-prepared pack files only**. It does not cover generating the images, video, copy, or play link (not evidenced in this episode).
- Do not treat the temporary play URL as a permanent or reusable link; it is ephemeral and environment-specific.
- The assistant's description of the zip contents (e.g., number of images, ordering instructions) was not independently verified — do not assert specific contents beyond the three file names.
- Do not reuse this skill for other products, projects, or generic file-sending tasks.

## Verification
- All three `send_file` deliveries completed and the episode settled without contradiction at 2026-08-06T08:12:35.340Z.
