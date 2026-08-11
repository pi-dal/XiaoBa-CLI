---
name: "summarize-background-subagent-results"
description: "When background subagents return a batch of results the user did not explicitly wait for, judge whether a short supplementary reply adds value (reply only if user-relevant; otherwise it is acceptable not to reply), without reciting internal processes; when the batch reports failures, add one short factual note flagging unverified/self-reported figures and recommending re-verification, without asserting failure causes or content provenance the results do not state."
user-invocable: true
x-xiaoba-capability-handle: "cap_550faa8628334e788802973e5dcf8fe8"
x-xiaoba-transition-id: "transition-3dcd0207-e357-4ee3-8c08-1f218330fc05"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#episode-episode:6:c4f806f5:settlement-2026-08-06T10:17:31.031Z"
---

# Handle Batch-Returned Background Subagent Results

## Purpose
When background subagents return a batch of results that the user did not explicitly wait for, judge whether a short user-facing supplementary reply adds value, and if so produce one brief, factual note. Do not recite internal subagent processes.

## Trigger
- A batch of background subagent results is returned (e.g., labeled "[后台子任务批量回流]"), with or without failures.
- The user did not explicitly wait for these results but may want a brief supplement based on them.

## Decision rule
- Reply briefly only if the results complete or advance something the user cares about (e.g., a pending report or research item). If the results add no new value, it is acceptable not to reply.
- Do not recite internal subagent processes one by one; do not repeat every raw result summary.

## When the batch reports failures (observed shape)
When the returned batch reports that some background subagent branches failed (e.g., an error status such as API 403) and a reply is judged warranted:
- Keep the note to one short, factual supplement line.
- Flag affected content as unverified where the returned results themselves mark it so (e.g., figures still labeled as self-reported) and recommend re-verification before the user acts on it (e.g., before contacting a company).
- State provenance (e.g., content based on previously saved materials or public clues) and failure causes (e.g., website access restrictions) only if the returned results themselves report them. Never assert such details when the results do not state them — the observed episode's cause wording came from the assistant's own response and is not independently corroborated.

Observed response shape from the episode (translate as appropriate, reproducing only what the results support): "补充说明：……因网站访问限制失败，报告中的……介绍基于已保存的官网资料和公开线索，部分案例与规模数据仍标注为官网自述，建议联系前再次核验。"

## Boundaries
- Applies only to batch-returned background subagent results matching this pattern; do not extend to arbitrary report writing, general workflow summaries, or internal-process reviews.
- Do not use while the user is correcting or iterating on the task.
- Do not claim site access, permissions, credentials, or external side effects beyond what is evidenced.
- Do not assert failure causes, content provenance, or data status that the returned results do not themselves report; treat such claims as unverified rather than confirmed facts.
- Reflects a single completed episode; keep the note short and scoped to what the returned results actually show.
