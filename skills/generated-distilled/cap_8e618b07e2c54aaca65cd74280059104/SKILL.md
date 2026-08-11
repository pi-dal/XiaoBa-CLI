---
name: "diagnose-all-chats-slow"
description: "Triage a chat application complaint that all chats feel slow by prioritizing global causes (API latency, local cache invalidation, front-end rendering) over per-conversation history size."
user-invocable: true
x-xiaoba-capability-handle: "cap_8e618b07e2c54aaca65cd74280059104"
x-xiaoba-transition-id: "transition-5a595f11-e129-4896-983e-ab19786f283a"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1246.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1246.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1246.jsonl#episode-episode:2:0ad9b544:settlement-2026-08-03T10:49:51.968Z"
---

# Diagnose "All Chats Are Slow" in a Chat Application

## Purpose
Triage a user complaint that all chat sessions feel slow by separating global causes (API latency, local cache invalidation, front-end rendering) from per-conversation causes (an oversized single chat history).

## When to Use
- The user reports that everything / all chats are slow (e.g., "感觉所有都慢"), rather than one specific conversation.
- The task is a diagnostic or triage question about why a chat application feels slow overall.

## Guidance
1. When slowness spans all chats instead of a single conversation, treat an oversized individual chat history as largely ruled out; the cause is more likely global.
2. Prioritize checking global factors: backend/API response latency and local cache invalidation that forces re-fetching when sessions are switched.
3. If even the first few chats opened are slow, focus on API latency and front-end rendering time.
4. Do not assert unverified cache details (e.g., a specific count of cached sessions) as fact; verify the actual cache configuration before stating any limits.

## Boundaries
- Derived from a single completed diagnostic exchange; the analysis was not confirmed by measurements in the evidence.
- Applies only to the bounded input of "all chats are slow" complaints in a chat application; do not generalize to unrelated performance or infrastructure domains.
- Do not apply while the user is correcting or iterating on the task.
