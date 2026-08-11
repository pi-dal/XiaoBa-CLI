---
name: "plan-replay-queue-remediation"
description: "Propose a two-layer remediation plan for a stuck or unhealthy replay/queue processing pipeline when the user asks how to fix it: first a rolling restart so the final single-quantum fix takes effect (verified by processing volume and queue decline), then a controlled drain mode with small concurrency, failure isolation, task priority, paused replay ingestion, and circuit-breaker alerting on consecutive zero-processing rounds to avoid fake heartbeats. Bounded to fix planning for a replay/queue pipeline from a single observed exchange; it is a proposed plan, not an executed change, and does not generalize to other pipelines."
user-invocable: true
x-xiaoba-capability-handle: "cap_5d1666bb0a0c48b095adca103057ec30"
x-xiaoba-transition-id: "transition-6d085a28-9d73-43a7-a6d2-4dc972c8e92c"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1145.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1145.jsonl#episode-episode:3:134eaeca:settlement-2026-08-03T08:13:08.854Z"
---

# Plan Replay-Queue Pipeline Remediation

## When to use
Use when the user asks, in a fresh request, how to fix an unhealthy or stuck replay/queue processing pipeline — for example a prompt like "那你思考下要怎么修复？" ("think about how to fix this?") — where a final single-quantum fix may have been applied but has not taken effect, and processing volume is stalled or health signals may be misleading.

Do **not** use this pattern while you are actively executing the remediation, or while the user is correcting or iterating on an already-proposed fix plan; that is a continuation of the current task, not a fresh fix-planning request.

## What to do
Propose the remediation as a two-layer plan, in order:

1. **Rolling restart first** — restart instances in a rolling fashion so the final single-quantum fix actually takes effect. Verify the fix by observing **processing volume and queue decline**, not by assuming the fix is live.
2. **Controlled drain mode** — add a bounded drain regime while pausing new replay ingestion:
   - small concurrency
   - failure isolation
   - task priority
   - pause new replay ingestion during the drain
   - if processing volume is **0 for consecutive rounds**, trigger automatic circuit-breaker alerting so a stalled pipeline cannot masquerade as healthy (avoiding "fake heartbeats").

## Boundaries
- This is a **planning proposal drawn from one observed exchange** in which the assistant proposed the two-layer plan. Present it as a proposed plan only; do not execute it or present it as already performed without current-task authorization, credentials, or access evidence.
- The pattern is bounded to fix-planning for a replay/queue processing pipeline with a pending single-quantum fix. Do not generalize the two-layer structure to unrelated pipelines, queues, or systems.
- Do not assume the single-quantum fix, drain mode, or circuit breaker already exist in the target system, and do not claim system state beyond what the current task evidences.
