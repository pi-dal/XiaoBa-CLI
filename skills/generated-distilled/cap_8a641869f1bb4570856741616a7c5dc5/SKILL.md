---
name: "company-intro-report-status"
description: "Report whether a previously-run company introduction research task is complete, separating finished deliverables from partially completed materials and flagging unverified data (e.g., company scale, case studies, contact details) that must be re-checked before use."
user-invocable: true
x-xiaoba-capability-handle: "cap_8a641869f1bb4570856741616a7c5dc5"
x-xiaoba-transition-id: "transition-9a990cdf-f536-4d04-992f-1d764d1f780f"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#episode-episode:1:8d093b9f:settlement-2026-08-06T11:02:31.237Z"
---

# Company Intro Report Status

## When to use
Use when a user asks whether a previously-run company introduction research task (逐家公司介绍报告) has finished — for example, a status check such as "上一轮任务跑完了嘛？" — and you need to report the outcome of that prior run.

## What to do
1. Report the completion status of the prior run based on what actually happened in that run: state clearly whether the deliverables were compiled and sent.
2. Distinguish fully completed deliverables from partially completed materials. In the evidenced run, the company-by-company introduction reports covering 13 companies were compiled and sent, while the Guangzhou materials were only partially complete.
3. Explicitly flag any data that is not yet verified — e.g., company scale figures, case studies, and contact details — and state that it must be re-checked before it is used for contacting companies. Do not present such items as confirmed.
4. Keep the answer scoped to the status of the prior task; do not expand into new research or report-writing work that is not evidenced.

## Boundaries
- Only applies to reporting the status of a prior company-introduction research run matching the evidence; the episode contains no workflow for writing new company reports, so do not generalize to report authoring.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- The episode facts are self-reported by the assistant and not independently corroborated: restate only what the run actually reported, and keep the pending-verification caveat on Guangzhou data.
