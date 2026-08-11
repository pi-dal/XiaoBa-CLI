---
name: "classify-local-life-operation-service-provider"
description: "When a user describes a business that serves Meituan/Dianping local-life merchants (sales, platform operations, content placement, and data analysis), classify it as a local-life operation service provider rather than an advertising company, and design industry-standard packages around the provider as the first-layer client."
user-invocable: true
x-xiaoba-capability-handle: "cap_8e39817431ed49c38c491db5dc590664"
x-xiaoba-transition-id: "transition-6742b575-6407-432f-a2c6-b8e23bb17562"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-5:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-5:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#episode-episode:5:22da54de:settlement-2026-08-04T06:53:05.964Z"
---

# Classify Local-Life Operation Service Provider Positioning

## When to apply
Apply when the user describes a business (e.g., a prospective first-layer client) whose work centers on local-life merchants (生活圈商铺) listed on Meituan (美团) and Dianping (大众点评), and that business performs merchant sales, platform operations, content placement (including live streaming or video), and periodic business data analysis (e.g., daily data downloads from Meituan for analysis).

## What to do
1. Classify the described entity as a **local-life operation service provider** (本地生活运营服务商) rather than a traditional advertising company. The label fits because the entity combines merchant sales, platform operations, content placement, and business data analysis for the merchants it serves.
2. When the conversation turns to client segmentation or industry-standard package design (行业标准包), treat the local-life operation service provider as the **first-layer client** instead of the individual store: serving one provider can indirectly reach dozens to hundreds of merchants, so the standard package should be designed around the provider's needs, not around a single storefront.
3. Keep the classification descriptive and limited to the observed operations mix; do not extend the label to general advertising agencies, standalone merchants, or businesses outside the Meituan/Dianping local-life scope described.

## Boundaries
- Only apply when the user describes the specific Meituan/Dianping local-life operations mix (merchant sales + platform operations + content placement + data analysis).
- Do not reuse this pattern while the user is correcting or iterating on the task, and do not apply it to unrelated business models or industries.
- This is advisory positioning/segmentation guidance only; it grants no account access, credentials, or external side effects.
