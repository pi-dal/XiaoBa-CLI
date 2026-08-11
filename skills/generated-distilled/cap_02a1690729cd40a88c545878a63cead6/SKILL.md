---
name: "review-track-research-for-product-positioning"
description: "Review a user-supplied research document about an industry track and an AI/CLI-agent entry angle before discussion, producing a first-pass strategic read: a core positioning judgment (prefer narrow vertical over broad horizontal), priority closed-loop focus areas, assumptions to validate rather than accept, and suggested next discussion topics."
user-invocable: true
x-xiaoba-capability-handle: "cap_02a1690729cd40a88c545878a63cead6"
x-xiaoba-transition-id: "transition-ef2f5b3b-60df-45ca-9914-87d9d9d97a56"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1293.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1293.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1293.jsonl#episode-episode:1:325e9b0d:settlement-2026-08-05T02:49:37.065Z"
---

# Review Track Research for Product Positioning

## When to use
Use this skill when a user points you to a research document about an industry track and an AI/CLI-agent entry angle and asks you to read it first before continuing the discussion (observed trigger, e.g. "你看看…这篇东西先，我们再讨论"). The user must supply the document within the session; do not apply this to documents that are only mentioned by title without accessible content.

## Steps
1. Read the supplied document in full before responding, and open by confirming the review is complete.
2. Deliver a core strategic judgment on positioning. In the observed case, the judgment was: do not pursue a broad horizontal AI product; instead prefer a narrow vertical play — a delivery middle-platform for multi-client operations service providers. State the judgment as a recommendation grounded in the document, not as a universal rule.
3. Anchor priorities on a concrete closed loop. The observed priority order was: data aggregation → anomaly detection → weekly report/review.
4. Explicitly flag figures and claims that are assumptions rather than validated facts instead of endorsing them (observed examples: 3000元 pricing, template reuse rate, real integration cost).
5. Close by proposing the next discussion topics (observed: product entry point, customer profile, verification plan), leaving the deeper discussion to follow-up turns.

## Boundaries
- Only apply when the document to review is actually provided in the session; do not fabricate document contents, figures, or validation data beyond what is supplied.
- The ad-industry specifics (delivery middle-platform focus, 3000元 pricing, reuse-rate and integration-cost concerns) come from one observed review of one document and are not universal defaults — adapt the judgment to the actual supplied document.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- This is a first-pass discussion-oriented review; it does not validate pricing, cost, or adoption figures on its own.
