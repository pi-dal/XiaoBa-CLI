---
name: "verify-seek-color-comic-build"
description: "Verifies and delivers a new version of the 寻色漫画书 (Seek Color Comic) HTML game build: writes a Playwright regression script that loads the local HTML artifact via file://, clears localStorage, asserts version/build/level/commission invariants, runs desktop and mobile contexts with console/page error checks, captures screenshots, and sends the HTML file to the chat when checks pass."
user-invocable: true
x-xiaoba-capability-handle: "cap_7d192e1d0882417a86a3f6892e05e242"
x-xiaoba-transition-id: "transition-5c5b51a1-a11b-427b-8ee0-40dae4dacc8e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1069.jsonl#turn-6:delivery:write_file:call-id-1faf7fd74578-1, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1069.jsonl#turn-6:delivery:write_file:call-id-7f41edfc5083-2, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1069.jsonl#turn-6:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1069.jsonl#episode-episode:10:7f0311f1:settlement-2026-07-30T07:37:36.802Z"
---

# Verify Seek Color Comic Build

## When to use
Use when the user asks to continue work on the 寻色漫画书 (Seek Color Comic) HTML game — e.g., a continuation message such as "继续工作@usr535" — and a new version of the local HTML game artifact must be regression-verified and delivered to the chat. The evidence covers one completed turn that delivered "状态收口版 v4" after writing and running Playwright verification scripts.

## Inputs
- The local HTML game artifact to verify and deliver (e.g., an output file like `寻色漫画书_十二主关六复玩_状态收口版_v4.html`).
- The user's continuation instruction referencing the ongoing comic game work.

## Guidance
1. Confirm the target artifact exists under the working directory and that you currently have authorization to write to the local app tmp/output directories and to send the file to the current chat. Re-resolve paths in the current environment rather than inheriting the episode's paths or permissions.
2. Write a Playwright regression script (e.g., `tmp/test_seek_color_v4.cjs`) that:
   - Launches headless Chromium with `--allow-file-access-from-files` and loads the HTML via `file://` + `encodeURI`.
   - Clears `localStorage` and reloads before assertions.
   - Asserts build identity constants (version, build id) and content invariants (level count, total target count, per-level target gradient, commission count and per-commission counts).
   - Runs the same artifact in a desktop viewport (e.g., 1440x900) and a mobile context (`isMobile` + `hasTouch`, e.g., 390x844), asserting no horizontal overflow and correct in-game target rendering.
   - Collects console errors and page errors in both contexts and fails on any.
   - Exercises the state flows under test (e.g., intro → begin → find objects → replay, and saved profile state migration).
   - Prints a PASS summary with collected data.
3. Write a separate screenshot capture script (e.g., `tmp/capture_seek_color_v4.cjs`) that captures desktop map/replay screenshots and a mobile in-game screenshot for visual confirmation.
4. Run both scripts; treat any assertion failure, console error, or page error as a blocker to fix before delivery.
5. When checks pass, deliver the HTML artifact via `send_file` with its original file name.

## Verification
- The regression script exits with PASS and reports zero console/page errors for both desktop and mobile contexts.
- Screenshots are captured for the desktop map/replay and mobile in-game views.
- The final HTML artifact is sent to the current chat.

## Boundaries
- This skill covers verification and delivery of the 寻色漫画书 HTML game build only. Do not generalize to arbitrary HTML files, other games, or unrelated domains.
- The assistant's stated fixes in the episode (permanent clearance vs replay progression overwrite, free unlimited clues, hint duration, fast level-switch popup race) are unverified claims; the regression script is a state-level smoke check, not proof of UX correctness.
- The harness manipulates game state via `page.evaluate`, which bypasses real user flows; treat results as state checks rather than user-behavior simulation.
- The Chrome executable path and device viewports in the scripts are environment-specific and must be re-resolved for the current environment.
- Do not reuse this pattern while the user is correcting or iterating on the same task.
- File write/send targets must be re-confirmed in the current environment; do not inherit access or permissions from the episode.
