---
name: "calibrate-evidence-gated-pilot-selection"
description: "When batch background sub-agent screening results return, reply with a brief calibration: promote only evidence-qualified pilot targets from the official database, leave slots empty instead of padding to quotas, and defer unverified leads to a supplementary-evidence step before any promotion decision."
user-invocable: true
x-xiaoba-capability-handle: "cap_138a9e0a5b8b4f7baa812082b3e9398a"
x-xiaoba-transition-id: "transition-f7ad52cb-4355-4d4d-90ea-11e4780f6090"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1317.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1317.jsonl#episode-episode:2:73ec8f5c:settlement-2026-08-08T15:36:29.648Z, /home/xiaoba/app/logs/sessions/catscompany/2026-08-08/catscompany_cc_group_grp_1317.jsonl#turn-2:user-intent"
---

# Calibrate Evidence-Gated Pilot Selection

## When to use
Use when batch background sub-agent results return (e.g., a "[后台子任务批量回流]" flow) containing a screening/selection finding — such as choosing companies from an official database for an end-to-end pilot — and you must judge whether and how to reply to the user.

## Core behavior
1. **Judge whether to reply.** If the background results complete a user-cared item, reply with a brief supplement; if they add no value, you may refrain. Do not recite internal process item-by-item (per-sub-agent status, tool errors, or sub-task summaries) unless they change the decision.
2. **Calibrate the key takeaway.** State the single decision-relevant conclusion concisely (e.g., "only one target qualifies for the pilot; the other slot has no evidence-qualified target").
3. **Promote only evidence-qualified targets.** In the official database, promote entries that meet the evidence threshold (e.g., partially_verified with structured one-hand evidence: legal entity, official domain, location). Do not elevate external-search-only claims (media reports, event locations, unverified leads) to facts.
4. **Do not pad to fill quotas.** If a slot (e.g., a region/city) has no qualifying target, leave it empty rather than force-selecting a weaker entry to meet a "1 + 1" quota.
5. **Defer unverified leads.** Keep lead-level entries (lead_only, evidence score 0, claims from external search only) as supplementary-evidence samples: verify legal entity, official website/account, and location attribution before deciding on promotion.
6. **Note the verification basis when relevant.** If conclusions were cross-checked against a read-only snapshot (e.g., the latest output/dashboard.html) because direct database access was unavailable, state that basis without overclaiming.

## Boundaries
- Applies to screening/selection results that carry an evidence threshold; do not generalize to arbitrary background task results, reports, transcripts, or broader domain analysis.
- Do not claim verified facts (public contacts, scale, service facts, location) beyond what the database snapshot supports.
- Single-episode evidence; keep guidance bounded to the observed pattern.
