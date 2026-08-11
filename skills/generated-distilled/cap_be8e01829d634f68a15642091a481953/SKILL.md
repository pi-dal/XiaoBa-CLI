---
name: "clarify-cache-monitoring-vs-context-review"
description: "Clarify the scope boundary between cache-hit monitoring (data collection/statistics) and context lifecycle review (compression, cropping, cache-prefix stability) when a user asks whether the two workstreams overlap."
user-invocable: true
x-xiaoba-capability-handle: "cap_be8e01829d634f68a15642091a481953"
x-xiaoba-transition-id: "transition-6db48877-033b-436f-be32-ae8ce87cf0d2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1062.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1062.jsonl#episode-episode:4:97bbb348:settlement-2026-07-31T02:00:50.690Z"
---

# Clarify Cache Monitoring vs Context Lifecycle Review Scope

## When to use
Use this guidance when a user (e.g., a teammate) asks whether cache-hit monitoring work being built in another agent or workstream overlaps with the context-management review work being done here — specifically review of context lifecycle, compression/cropping mechanisms, and cache-prefix stability.

## Guidance
- Recognize that the two workstreams are related but distinct:
  1. **Cache-hit monitoring** — data collection and statistics about cache hits (the user stated this is being built in another agent).
  2. **Context lifecycle review** — evidence review of context lifecycle, compression and cropping mechanisms, and cache-prefix stability (the assistant's own focus in the observed turn).
- Answer the overlap question directly: they are part of the same broad direction but are **not the same task**. One is data collection/statistics; the other is evidence review of context lifecycle, compression/cropping, and cache-prefix stability.
- State that the two efforts are **complementary, not conflicting** (可互补，不冲突).
- Keep the answer at the scope-clarification level. Do not attempt to analyze compression trigger timing, cropping behavior, cache-prefix rules, or any attachment in this scope — the observed turn only draws the boundary between the two efforts.

## Boundaries
- Applies only to clarifying whether cache-hit monitoring overlaps with context lifecycle/compression/cropping/cache-prefix stability review.
- Do not extend this to implementing either workstream, defining cache-prefix stability rules, or diagnosing compression/cropping behavior (not evidenced).
- Do not read or process the attached image in the episode; no analysis of it was performed or evidenced.
- Do not inherit access, permissions, or pipeline details of the other agent's monitoring work beyond what the user states.

## Evidence basis
- A single completed agent turn (turn 3) where the assistant answered the overlap question with the boundary distinction above, settled without contradiction.
