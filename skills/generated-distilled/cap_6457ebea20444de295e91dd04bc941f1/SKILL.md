---
name: "keyword-search-visible-text-only"
description: "Keyword search over conversation content matches only visible user and assistant text, excluding tool-process content (tool_use, tool_result, thinking), while attachment names are searched separately."
user-invocable: true
x-xiaoba-capability-handle: "cap_6457ebea20444de295e91dd04bc941f1"
x-xiaoba-transition-id: "transition-0f175515-627a-448c-bfe2-040c5fb00a0e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1147.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1147.jsonl#episode-episode:1:74b2f6bd:settlement-2026-07-31T06:41:11.492Z"
---

# Keyword Search: Visible Conversation Text Only

## Purpose
When keyword search is applied to conversation content, the user's stated intent is to search only the visible text of user and assistant messages, excluding tool-process content. This skill captures that decision rule for configuring or adjusting such keyword search.

## Guidance
1. **Match scope**: When the keyword search targets the conversation "text 正文" (text body), restrict matching to visible user and assistant text only. Do not match `tool_use`, `tool_result`, `thinking`, or other tool-process content (the current implementation may mis-search these).
2. **Attachment names stay separate**: Continue searching attachment names (附件名) as a separate search dimension; do not fold them into the visible-text match or drop them.
3. **Status boundary**: The underlying evidence is a feasibility question followed by an affirmative proposal ("可改为..."), not a confirmed implementation. Treat this as an intended/proposed behavior preference and decision rule, not as a claim that the change is already shipped, tested, or user-accepted.

## Boundaries
- Applies only to keyword search over conversation text where the intent is visible user/assistant text matching.
- Does not extend to arbitrary full-text search over documents, files, repositories, or other content types.
- Based on a single completed AgentTurn; do not generalize to other search semantics without further evidence.
