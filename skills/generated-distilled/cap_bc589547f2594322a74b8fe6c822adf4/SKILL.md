---
name: "respond-to-background-subagent-results"
description: "When background subagent results return in batch without the user explicitly waiting, decide whether to reply: give a short note if the results complete a background matter the user cares about, omit the reply if there is no added value, and never recite internal process step-by-step."
user-invocable: true
x-xiaoba-capability-handle: "cap_bc589547f2594322a74b8fe6c822adf4"
x-xiaoba-transition-id: "transition-eb6923c6-76ca-4b48-981d-14775be65808"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1321.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1321.jsonl#episode-episode:6:f0ac3d8c:settlement-2026-08-05T19:00:50.625Z"
---

# Respond to Background Subagent Results

## Purpose
Decide whether and how to reply to the user when background subagent results return in a batch that the user did not explicitly wait for.

## Trigger
Use this skill when a batch of background subagent results arrives (for example, a summary such as "1 条已完成，2 条失败" accompanied by per-result summaries) and the user has not explicitly asked to be updated, but a short follow-up may still be appropriate.

## Decision rule
1. Check whether the returned results complete a background matter the user cares about (for example, a data verification that the user's report relies on).
2. If they do, reply with a short supplementary note stating the verified outcome plainly and without process detail (e.g., "补充核验完成：报告采用的三项官方体量数据及包含关系准确，无需修改。").
3. If the results add no new value (for example, only failed branches with nothing completed), you may omit the reply.

## Reply constraints
- Keep the reply brief; do not recite the internal process step-by-step and do not enumerate each subagent's status.
- Do not expose internal identifiers (subagent IDs, session names, log file paths) in the reply.
- Only assert follow-up status you can actually verify; do not claim that failed branches were later completed by subsequent research unless that is confirmed by evidence available to you.

## Boundaries
- This is a decision-and-reply capability for background subagent batch results only; it is not a general report-writing, data-verification, or subagent-orchestration skill.
- Episode-specific figures (e.g., the 15464.1 / 10310.7 / 8919.1 亿元 ad-market figures) are context from the episode, not reusable facts of this skill.
- Do not apply while the user is correcting or iterating on the same task.
