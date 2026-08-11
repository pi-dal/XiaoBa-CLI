---
name: "describe-search-discovery-channels"
description: "Answer inquiries about which search engine the search discovery mainly uses, based on the observed discovery setup: 360 search is not the primary channel (it was only an attempted channel with timeouts); discovery relies on external search result imports and Agent queries, with no stable search-engine-based auto-collector."
user-invocable: true
x-xiaoba-capability-handle: "cap_f28e5fe10e4e4a8f8d85e05fe451fbdd"
x-xiaoba-transition-id: "transition-0337e249-2015-4eb4-a595-342f80793073"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#turn-8:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#turn-8:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#episode-episode:10:51e0f9f5:settlement-2026-08-05T17:27:28.032Z"
---

# Describe Search Discovery Channels

## Purpose
Answer inquiries about which search engine the search discovery mainly uses, and how search results are currently sourced.

## Trigger
A user asks whether the search discovery mainly uses a particular search engine, for example: "你主要通过360搜索？" ("Do you mainly use 360 search?").

## Guidance
When responding to such an inquiry, convey the observed state of the search discovery setup:

- No single search engine is the primary discovery channel. 360 search is not the main channel; it was only one of the discovery channels attempted, and it experienced timeouts.
- Current search discovery mainly relies on external search result imports and Agent queries.
- A stable, search-engine-based automatic collector has not yet been established.

## Boundaries
- This describes the discovery setup as observed on 2026-08-05; do not present it as a live guarantee of the current configuration.
- Apply only to inquiries about the search discovery channels described here; do not generalize to other engines, environments, or domains.
- Do not claim any credentials, access rights, or external side effects.
- Do not reuse this pattern while the user is correcting or iterating on the task.
