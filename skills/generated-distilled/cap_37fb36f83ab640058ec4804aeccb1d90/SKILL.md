---
name: "diagnose-video-tail-silence"
description: "Explain why the last few seconds of a narrated video are silent by comparing narration audio duration with the video track and identifying padded tail silence from an untightened timeline, rather than a playback failure."
user-invocable: true
x-xiaoba-capability-handle: "cap_37fb36f83ab640058ec4804aeccb1d90"
x-xiaoba-transition-id: "transition-afb1453b-f274-4384-8ece-d43de454d948"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-12:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:13:808b089e:settlement-2026-08-05T11:15:34.675Z"
---

# Diagnose Missing Audio in the Final Seconds of a Video

## Purpose
Explain why the last few seconds of a narrated video have no sound, using the diagnostic reasoning evidenced in this episode: a mismatch between narration audio duration and video duration, where compositing padded tail silence and the timeline was not tightened.

## When to apply
- The user reports that the final seconds of a video are silent (e.g., "怎么后面几秒没声音了？").
- The video is a narrated/synthesized composition (narration audio combined with a picture/video track), not raw camera playback.
- The user is asking for the cause, not still iterating or correcting the same task.

## Diagnostic reasoning
1. Treat missing tail audio as a timeline/compositing issue first, not a playback problem.
2. Compare the narration audio duration with the video track duration:
   - When the narration audio is shorter than the video track (e.g., ~83s of audio vs ~90s of video), the compositing step may have padded tail silence to fill the longer timeline, producing several seconds of silence (e.g., ~7s) at the end.
3. State the cause plainly: the timeline was not tightened; the tail silence was introduced during synthesis/assembly, not by the player.

## Boundaries
- This pattern is derived from a single completed turn; keep it to this diagnosis and do not generalize to other audio/video defects (e.g., dropped audio, codec problems, playback hardware).
- Use the episode's duration figures only as an observed example; do not hard-code them as universal values.
- Do not promise fixes or claim authority to edit the user's media assets beyond what the user requests.
- Do not reuse this pattern while the user is correcting or iterating on the task.
