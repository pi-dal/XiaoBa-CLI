---
name: "influencer-data-collection-entry"
description: "Design guidance for collecting influencer (达人) data through a separate dedicated entry (账号/类目/地域/报价/档期/联系方式/授权证明) that feeds a pending verification zone before filtering per business rules, without external forms modifying the formal candidate library."
user-invocable: true
x-xiaoba-capability-handle: "cap_c1a709de1da54f7a924664a727365d0e"
x-xiaoba-transition-id: "transition-90416068-392f-4372-8983-ac8f20317e53"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1326.jsonl#episode-episode:1:ccf1a5a0:settlement-2026-08-06T04:10:17.182Z"
---

# Influencer Data Collection Entry (达人资料收集入口)

## When to use
Apply when asked how to collect influencer (达人) data from external parties — e.g., whether to open a separate connection/entry for collecting influencer store info and how the influencer selection platform (达人甄选台) should connect to influencer data collection. This covers the design guidance for structuring the intake, not the execution of data collection itself.

## Guidance
- Keep influencer data collection as a **separate, dedicated collection entry** (「达人资料收集入口」) instead of letting external parties write directly into an existing selection workflow or formal library. The observed direction for this approach is confirmed correct.
- Have influencers or agencies (达人/机构) submit through this entry, collecting at minimum: 账号 (account), 类目 (category), 地域 (region), 报价 (quote/price), 档期 (schedule/availability), 联系方式 (contact), and 授权证明 (authorization proof).
- Connect the influencer selection workbench (「达人候选工作台」) to this collection entry so submissions flow into it.
- Route newly received data into a **pending verification area (待核验区) first**; only after verification should it be filtered according to the current business order (商单) rules.
- Never let an external form directly modify the formal candidate library. The verification stage is the privilege boundary: external input must not reach authoritative candidate data without passing through it.

## Boundaries
- This guidance reflects one completed exchange about how to structure the data-collection entry; do not generalize it to other data collection domains or to executing collection, verification, or filtering operations.
- Field lists, routing, and the verification boundary apply to the influencer candidate data context described here.
