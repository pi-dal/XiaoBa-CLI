---
name: "implementation-alignment-analysis"
description: "When a user proposes an alternative design approach (e.g., avoiding core code modification in favor of trigger/hook, zero-core skill scripts, or an independent Supervisor) and asks for analysis or alignment ('给我分析下', '跟我对齐一下'), verify the current implementation state in the repository and produce an alignment analysis comparing the proposed approach with the current one, citing source evidence, then deliver it as an HTML/PDF document."
user-invocable: true
x-xiaoba-capability-handle: "cap_ad8a0c78fcd14be181032ceae388008c"
x-xiaoba-transition-id: "transition-733980f6-0fcb-4240-b1ec-6c033be3c14b"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_980.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_980.jsonl#turn-1:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_980.jsonl#turn-1:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_980.jsonl#episode-episode:2:8924f128:settlement-2026-07-30T05:32:47.064Z"
---

# Implementation Alignment Analysis

## Purpose
When a user proposes an alternative design approach — for example avoiding core code modification in favor of a trigger/hook, a zero-core skill script, or an independent Supervisor prototype — and asks for analysis or alignment ("给我分析下", "跟我对齐一下", "做到哪一步了"), verify what the current implementation actually does and produce an alignment analysis comparing the proposed approach against the current one, citing concrete source evidence.

## Trigger
- The user discusses a design approach change, e.g. "是不是可以不做核心代码的修改", "trigger（hook）... 可以完全先独立做", "先做零核心的 Skill 脚本＋独立 Supervisor 原型".
- The user explicitly asks to analyze or align: "给我分析下", "跟我对齐一下".

## Steps
1. Restate the proposed approach and the current-state comparison target so the alignment is explicit.
2. Verify the actual current implementation state against the repository working tree before making claims: which components were modified, what is already built, and what review/quality issues are still pending. Do not rely on memory or on conclusions from a prior episode.
3. Compare the proposed approach vs the current implementation along concrete dimensions (what already exists, what is pending, effort/risk of each path, integration implications such as plugin vs deep-integration).
4. State a clear conclusion and recommendation, and support each claim with concrete source locations (file:line references such as `src/runtime/runtime-factory.ts:24–50`).
5. Deliver the analysis as a self-contained document — HTML with A4-print-ready Chinese styling, optionally also as PDF — and send it to the user.

## Boundaries
- Analysis-only round: do not modify core code during the alignment unless explicitly authorized.
- Require current authorization and an available repository/working tree; do not inherit access or permissions from any prior session.
- Episode-specific conclusions (e.g., "two pending P2 review issues", "freeze expansion", particular file paths or line numbers) are not reusable defaults — re-verify the current state each time and cite what you actually observe.
- Keep scope to the requested alignment/analysis; do not extend to unrelated document generation or to arbitrary architectural consulting beyond the supplied design question.

## Dependencies
- Use the create-html-report skill to produce the deliverable HTML report document (and PDF delivery via send_file).
