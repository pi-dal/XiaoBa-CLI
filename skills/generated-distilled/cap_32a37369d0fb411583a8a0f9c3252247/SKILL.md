---
name: "clarify-static-html-dashboard"
description: "Clarify that a delivered dashboard is static HTML (offline-openable) while distinguishing it from the dynamic Python + SQLite data pipeline (collection, dedup, enrichment, scoring, update, regeneration) that produces it, and explicitly stating the current deployment status (not yet online, no scheduled tasks)."
user-invocable: true
x-xiaoba-capability-handle: "cap_32a37369d0fb411583a8a0f9c3252247"
x-xiaoba-transition-id: "transition-75449343-c5e4-41f0-bd60-f76e528561af"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#turn-5:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#episode-episode:5:756b33bb:settlement-2026-08-05T15:28:05.003Z"
---

# Clarify Static HTML Dashboard

## When to use
Use when the user asks whether a delivered dashboard (or similar generated HTML artifact) is static HTML — for example, "你做的是个静态html么？" (Is what you made static HTML?). The user is asking about the nature of the artifact that was just delivered to them.

## Guidance
1. **Confirm the artifact's nature directly.** State clearly that the dashboard delivered is static HTML and can be opened offline.
2. **Distinguish the static artifact from the underlying pipeline.** Explain that the data underneath is not static: a Python pipeline, SQLite database, and maintenance scripts handle data collection (采集), deduplication (去重), evidence supplementation (补证), scoring (评分), and updating (更新), and then regenerate the dashboard.
3. **State deployment status explicitly rather than implying live behavior.** Note that the system is not yet deployed as an online backend and no scheduled tasks are enabled.
4. **Keep the explanation bounded to what is actually implemented and evidenced.** Do not claim online deployment, scheduled automation, real-time data, or freshness guarantees that have not been established.

## Boundaries
- Only apply when the user asks whether a delivered dashboard is static HTML / about the static-vs-dynamic nature of the delivered artifact.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Do not extend to general web development, generic static-site explanations, or deployment/scheduling planning.
- This is a conversational clarification only; do not perform deployments, scheduling changes, or pipeline modifications as part of it.
