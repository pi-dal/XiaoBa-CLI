---
name: "verify-chat-ui-issues-from-screenshots"
description: "When a user shares chat-UI screenshots with local cache paths and asks you to review them, read each attachment via read_file, verify the reported issues against source code and test coverage, and deliver a bounded HTML inspection report (via create-html-report) without modifying code."
user-invocable: true
x-xiaoba-capability-handle: "cap_e89022e1b15a43a980a651e4d453ec82"
x-xiaoba-transition-id: "transition-18110d12-5da6-420a-b0d8-8771696b1a6d"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1125.jsonl#turn-2:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1125.jsonl#turn-2:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1125.jsonl#episode-episode:2:f00606a7:settlement-2026-07-30T06:00:46.182Z"
---

# Verify Chat UI Issues from Screenshots

## Purpose
Verify reported chat-UI issues by reading user-provided screenshots (via their local cache paths), checking each issue against source code and existing tests, and delivering a bounded inspection report. This is an inspection-only capability — do not modify source code.

## When to use
Use when a user sends screenshot attachments of a chat UI together with a 本地缓存路径 (local cache path) for each image and asks you to review them (e.g., "你看一下[图片] Screenshot ..."). The user may state that attachments are read via `read_file` using the given local cache path.

## Input requirements
- Each screenshot must come with a current local cache path supplied in the current task. Never reuse paths from earlier tasks or assume a specific repo layout.
- Read every attachment with `read_file` using the provided path before drawing conclusions.
- Proceed only when you can actually view the screenshots and the relevant source in the current session; do not assert corroboration you cannot see.

## Procedure
1. Read all attached screenshots with `read_file`, using each provided 本地缓存路径.
2. For each reported issue, fill in four evidence columns:
   - 截图 (screenshot): whether the issue is reproduced in the screenshot.
   - 源码 (source): whether the responsible code path was located.
   - 当前测试 (current tests): which existing tests cover it and which paths are missing (e.g., no attachment-editing cases, no drag-and-drop cases).
   - 下一步 (next step): the concrete next action (product decision, code fix, or added regression tests).
3. Call out missing test coverage explicitly rather than treating the existing suite as sufficient.
4. Do not modify source code in this pass. State clearly that verification was completed and code was not changed.
5. If baseline test results are available for the affected area, report the run scope and pass count, and note that passing baseline tests do not cover the identified gaps and do not imply the issues are fixed.
6. Build the inspection report with the create-html-report skill (self-contained HTML, A4-print-ready Chinese styling) and deliver it via `send_file`.

## Report structure
- Title: 补充核查报告 (supplementary inspection report) with date and section numbering.
- Issues table with the four evidence columns above.
- Baseline verification note: tests run, pass count, and the limits of that coverage.
- Priority recommendation: fix the issue with the highest user-content-loss risk first, then resolve product-semantics ambiguities, then the remaining gaps.
- Status line: 已核查，待产品决策与代码修复 (verified; pending product decision and code fix).

## Decision rules
- If the screenshots or source code are not available in the current task, do not claim "截图与源码相互印证" (screenshots and source code corroborate).
- Surface product-semantics questions instead of silently assuming behavior (e.g., whether "edit" means re-send vs. true message replacement; whether in-chat drag-and-drop should support URI/HTML images or be limited to local files).
- Keep the deliverable to inspection findings and recommendations; leave code changes and product decisions as explicit next steps.

## Boundaries
- Applies to inspecting chat-UI issues from user-provided screenshots in the current session; it is not authorization to modify the repository or to analyze unrelated documents.
- Local paths and repo access come from the current task only; do not carry over episode-specific paths or permissions.
- Findings are bounded to what is visible in the supplied screenshots and source; unresolved product decisions remain open.
