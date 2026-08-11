---
name: "influencer-talent-workspace-design"
description: "Design product structure for influencer/talent (达人) marketing candidate workspaces: two entry points (external collection link vs internal workspace), a dedup-verify-enrich pipeline into a unified talent pool, and campaign-based filtering so form data never pollutes the official roster."
user-invocable: true
x-xiaoba-capability-handle: "cap_f5e11f32b8e6409da19f0ed171376c9a"
x-xiaoba-transition-id: "transition-be1e573c-a0ea-4114-b50e-b073f8afbcd6"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#episode-episode:2:6c0927cf:settlement-2026-08-06T05:56:53.724Z"
---

# Influencer Talent Workspace Design

## When to use
Use when a task asks to design or propose the product structure / information architecture for an influencer/talent (达人) marketing candidate workspace — for example, how external talent submissions relate to an internal working list, or how to keep form-submitted data from contaminating the official roster. This covers structure design and the underlying data flow, not the production of research reports or reference documents.

## Core decision rule
For talent/influencer candidate management, split the system into **two entry points**:

1. **External "talent data collection link" (达人资料收集链接)** — the outside-facing entry where talent submits their information.
2. **Internal "talent candidate workspace" (达人候选工作台)** — the working surface used internally.

Route all submissions through a pipeline **before** they reach the official list:
- Deduplicate (去重)
- Verify (核验)
- Fill gaps (补缺)
- Then enter the **unified talent pool (统一达人池)**

The internal workspace filters candidates from the talent pool **by business order / campaign (商单)** rather than reading form submissions directly, so raw form data never directly pollutes the official roster.

## Boundaries
- Derived from a single completed design/research turn and may not generalize; keep scope to influencer/talent workspace structure design.
- Do not apply while the user is correcting or iterating on the task.
- This is a product-structure preference only. It does not grant access to session logs, subagent outputs, or any referenced research document, and does not confer any data-access or permission claims.
