---
name: "cross-task-full-text-search-scope"
description: "Confirm the search scope communicated in the prior exchange (title-only matching, no message-body/artifact search) and restate the requested cross-task full-text search over historical chat text and artifacts."
user-invocable: true
x-xiaoba-capability-handle: "cap_182300474f734eb381773e529a7a04e1"
x-xiaoba-transition-id: "transition-eb44cc6f-1cd9-4f69-854a-fff6340200f4"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1147.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-30/catscompany_cc_group_grp_1147.jsonl#episode-episode:3:d3636ca2:settlement-2026-07-30T10:58:28.722Z"
---

# Cross-task Full-Text Search Scope Confirmation

## When to apply
Apply when the user issues a retry or follow-up request (for example a `重试@...` style retry directive) about searching historical chat text and artifacts across conversations, in a context where the prior exchange already stated that search matches only conversation/group/project titles. Do not treat this as covering arbitrary full-text search requests.

## What to do
1. Restate — as what was communicated in the prior exchange, not as independently verified system behavior — that search currently matches only names such as session, group chat, and project titles; it does not cover chat message bodies or artifacts, and it cannot jump to a specific message.
2. Restate the capability the user is asking for: cross-task full-text search that queries historical text and artifacts by keyword or field, and when a result is chosen opens the corresponding conversation and locates/highlights the matching position.
3. Keep the reply as a scope confirmation and requirement statement. Do not claim that such a search index, backend, or implementation exists, and do not assert current system behavior beyond what was communicated in the exchange.

## Boundaries
- Covers only confirming the scope communicated in the prior exchange and restating the requested cross-task full-text search behavior. It does not cover implementing search, querying chat storage, accessing a search index, or performing the search itself.
- Do not apply while the user is correcting or iterating on the task.
- Do not overgeneralize to arbitrary full-text search requests, documents, articles, attachments, meeting notes, or generic domain search.
