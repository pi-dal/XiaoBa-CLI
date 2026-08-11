---
name: "create-narrated-demo-video"
description: "Redo or produce a demo version with an accompanying explanation: write a narration script and deliver a short narrated MP4 (synchronized operations, step subtitles, mouse highlighting, voice narration) alongside the script."
user-invocable: true
x-xiaoba-capability-handle: "cap_2d68b48430b64193bf2ea33f5aef52dd"
x-xiaoba-transition-id: "transition-15b55e2e-cc5c-4cb6-8363-e1d5d29ca4d6"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-11:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-11:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:12:e7247c64:settlement-2026-08-05T10:22:59.574Z"
---

# Create a Narrated Demo Video with Explanation Script

## When to use
Apply when the user asks to redo or produce a demo version **with an accompanying explanation** — for example a request phrased as "配合上你讲解 重新做一版" (redo the version together with your explanation). The task centers on turning an existing demo into a narrated, explainable version, not on building the underlying product or workflow itself.

## Guidance
1. **Confirm the ask is a narrated redo.** The user wants the demo re-explained out loud, not just regenerated silently. If the request is instead a correction or iteration on an in-progress task, do not apply this pattern.
2. **Write a narration script first.** Create a plain-text explanation file (in the working directory, e.g. `讲解词.txt`) that walks through the demo step by step in clear, plain language. Base the narration strictly on the actual demo content being explained — do not substitute content from other demos or projects.
   - From the evidenced episode, a narration of this kind: states upfront what the demo does and does not solve; walks through each step of the demo flow in order (e.g., inputs by source → data check/deduplication → criteria filtering → human handoff); clarifies how ambiguous values are handled (marked for confirmation rather than defaulted); and closes by stating what the tool saves time on and where human decision-making still remains.
3. **Produce the narrated video.** Deliver a short narrated MP4 (in the evidenced episode, roughly 90 seconds) with synchronized operations, mouse highlighting, step subtitles, and Chinese voice narration covering the script's content.
4. **Deliver both artifacts together.** Send the narration script file and the narrated MP4 so the explanation and the demonstration are available side by side. A short summary line in the reply describing what the video contains is appropriate.

## Boundaries
- Applies only when a new task matches this user-facing capability (producing a demo version with accompanying explanation). Do not reuse the pattern while the user is correcting or iterating on the same task.
- This guidance covers producing the narrated demo deliverables, not the domain workflow shown inside any particular demo (the evidenced episode's subject was a daren/influencer source-material collection and screening flow; that subject matter must not be imported as a general capability).
- Do not assume any specific video duration, voice language, or subtitle style beyond what the current task asks for; the 90-second, Chinese-narrated, subtitled format is what this episode evidenced, not a universal default.
- The agent supports the explanation and delivery; it does not replace the user's own business or product decisions described in the narration.

## Evidence notes
Single completed learning episode (eligible, no contradiction at settlement). Keep this skill narrow and extend it only with further corroborating episodes.
