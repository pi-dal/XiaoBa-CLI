---
name: "spot-difference-html-visual-markers"
description: "Deliver an interactive spot-the-difference (找不同) HTML game where found differences are visibly marked with red circles, white checks, and a top hint, because static screenshots cannot show clickable markers."
user-invocable: true
x-xiaoba-capability-handle: "cap_ef79dc61c7444de7a74a4aad3deb64f2"
x-xiaoba-transition-id: "transition-26034d8e-45b9-4b26-b871-2ee754cce40c"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1065.jsonl#turn-2:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1065.jsonl#episode-episode:2:8510c909:settlement-2026-08-03T06:55:19.448Z"
---

# Spot-the-Difference HTML with Visible Markers

## When to use
Use when the user asks for, reviews, or requests delivery of a spot-the-difference (找不同) game and requires the differences to be visibly marked — for example, when the user points out that the current version shows no circle, marker, or hint at all and asks how they are supposed to see where the differences are.

## Input requirements
- The deliverable is an interactive HTML spot-the-difference game file (not a static PNG screenshot).
- Locate and deliver the actual current game file for the task; do not assume the previous version already contains the markers.

## Guidance
- The HTML must show visible markers when a difference is found: after the user locates a difference, both the left and right images synchronously display a red circle (红圈), a white check (白勾), and a top hint (顶部提示).
- Static PNG screenshots cannot be clicked, so the markers must be implemented inside the interactive HTML itself, not described separately.
- Verify the outcome against the user's actual screenshots rather than assuming the previous version was correct.

## Boundaries
- Applies only to spot-the-difference HTML game tasks that require visible difference markers.
- Do not apply this pattern while the user is still correcting or iterating on the same task.
- This evidence covers a single completed delivery; keep the skill bounded to this scenario and do not generalize to other game or artifact types.
