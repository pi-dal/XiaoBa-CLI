---
name: "validate-html-game-multi-viewport"
description: "Deliver a self-contained single-file HTML game and validate its layout and runtime behavior across multiple viewport sizes using headless Playwright with mocked speech/audio APIs, per-viewport screenshots, and a JSON acceptance report."
user-invocable: true
x-xiaoba-capability-handle: "cap_69bf90e4bbdf4eb4a689520a222c9e2b"
x-xiaoba-transition-id: "transition-0a43641e-f99d-4b04-9c59-9a3578657d50"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-7:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-7:delivery:send_file:call-id-19e8ea5e5e16-1, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#turn-7:delivery:send_file:call-id-5714f57d67a9-2, /home/xiaoba/app/logs/sessions/catscompany/2026-07-29/catscompany_cc_group_grp_1012.jsonl#episode-episode:7:ed783d64:settlement-2026-07-29T09:54:06.747Z"
---

# Validate a Self-Contained HTML Game Across Multiple Viewports

## When to use
- The user asks to place their game materials into a webpage (evidenced trigger: `OK，你现在来给我把这些放在网页里吧`), and the expected deliverable is a self-contained, single-file HTML game that must render correctly at multiple viewport sizes.
- Apply only to this bounded input type: a single-file HTML game whose assets are embedded and which must be checked for layout and runtime correctness before delivery.
- Do **not** apply to arbitrary web pages, reports, documents, or generic HTML authoring. Do not reuse the pattern while the user is correcting or iterating on the same task.

## Prerequisites
- The HTML file exists under the current working directory (the episode used a local `tmp/` directory such as `/home/xiaoba/app/tmp/`). Re-resolve paths for the current target; do not carry over paths from this episode.
- A local Chrome/Chromium binary and the `playwright` npm package are available in the runtime.
- Only operate on files the user explicitly provides or authorizes. Do not inherit any access, permissions, or file scope beyond the current session.

## Validation workflow
1. Write a Playwright validation script (episode named it like `验收_<name>_布局.js`) that launches headless Chromium with the local Chrome executable.
2. Before page navigation, inject an init script that mocks browser APIs unavailable in headless Chrome:
   - `SpeechSynthesisUtterance` and `speechSynthesis` (stub `speak`/`cancel`/`resume`/`getVoices`, and record spoken text into `window.__spoken`).
   - `AudioContext` (stub `createGain`/`createOscillator`/`connect`/`start`/`stop` with no-op value setters).
3. Run the page at multiple viewport sizes (the episode used 800×500, 1024×650, and 1440×900).
4. For each viewport, collect:
   - `pageerror` and console `error` messages;
   - layout metrics: overflow beyond the viewport, layout holes, interactive elements, and word/score display state;
   - embedded asset health: images with `complete === true` and `naturalWidth > 0`; flag any broken or missing assets;
   - modal/settings state metrics when the page exposes them (e.g., visibility and option lists).
5. Capture a screenshot per viewport and write a JSON report (episode wrote `布局验收.json`).
6. Print a summary of overflow, broken assets, and collected errors; exit non-zero on script failure so the run fails loudly.

## Delivery
- After validation completes, send the single-file HTML (assets embedded) and one rendered screenshot of the primary viewport (episode sent an 800×500 actual render).
- State only what the validation report supports. Do not claim acceptance of gameplay features or scoring behavior that the report does not cover; in the episode, claims like full gameplay, unit coverage, and six-star scoring were asserted by the assistant but are not independently evidenced here.

## Security and boundaries
- The episode's script launched Chrome with `--no-sandbox`, which disables the Chrome sandbox; use this only in a trusted local environment and never run it against untrusted page content.
- File paths from the episode (`/home/xiaoba/app/tmp/...`) are local and non-portable; always re-resolve for the current runtime target.
- This skill is derived from a single completed turn; keep it narrow and re-validate assumptions when the page structure differs.
