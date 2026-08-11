---
name: "record-word-game-gameplay-demo"
description: "Record a gameplay demo video of the 单词打地鼠 word game that demonstrates the different word lists (U1/U2 switching, team handoff) and includes English word pronunciations via TTS audio mixed onto the recording."
user-invocable: true
x-xiaoba-capability-handle: "cap_a1ef5b153fd740d5ab0d1215023b4c2a"
x-xiaoba-transition-id: "transition-4d11831b-07ab-4449-9b67-f2918b3c34d5"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-10:delivery:write_file:call-id-00f1b14c81cd-1, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-10:delivery:write_file:call-id-8cbd194cfb8b-2, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-10:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#episode-episode:10:6c0e347e:settlement-2026-07-29T10:44:17.407Z"
---

# Record Word-Game Gameplay Demo Video (with pronunciation audio)

## When to use
- The user asks to record a video demonstrating the gameplay of the 单词打地鼠 (word whack-a-mole) game, and explicitly requires that the video show the different word lists (e.g., U1 and U2) and include the English word pronunciations (单词的发音).
- Apply only to new tasks matching this same user-facing capability. Do not reuse this pattern while the user is correcting or iterating on the same task.

## Approach
1. **Prepare a recording script** (Node.js + Playwright):
   - Serve the game HTML over a local HTTP server (no-store cache), launch Chromium with video capture enabled, and add an on-page demo caption overlay.
   - Drive a demo run that covers: U1 answering with re-reading (答题与重读), U1/U2 word-list switching (词表切换), U2 reset start (清零开局), a full blue-team round, and the manual handoff to the red team (蓝队整轮 → 手动换到红队).
   - Record each pronunciation event as (word text + timestamp in ms) into a speech-timeline JSON, save the raw video (webm), and assert a minimum number of speech events with zero page errors before finishing.
2. **Generate the pronunciation audio**:
   - For each unique word in the speech timeline, synthesize an MP3 clip (e.g., `edge_tts` with an en-US voice at a slightly slower rate).
   - Mix the clips onto the raw video with ffmpeg: delay each clip by its event timestamp (`adelay` in ms), apply a modest volume gain for classroom clarity, mix all tracks (`amix`), limit peaks (`alimiter`), and encode the result as MP4 (H.264 + AAC, faststart).
3. **Deliver the result**:
   - Send the final MP4 to the user and summarize what the video demonstrates, including the pronunciation count (e.g., 12 English pronunciations).

## Notes and boundaries
- All file paths from the source episode (game HTML, Chrome binary, ffmpeg binary, working directory) are environment-specific; re-resolve them for the current target before running.
- The evidence supports producing the demo video and sending the file; the video's compliance with the request could not be independently verified beyond the assistant's own summary, so verify generation succeeded before delivery.
- This skill covers producing the demo video only; it does not claim broader authority over the game, external services, or account access.
