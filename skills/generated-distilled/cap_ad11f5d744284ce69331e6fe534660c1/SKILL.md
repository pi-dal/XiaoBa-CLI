---
name: "stop-automatic-monitoring"
description: "Stop an ongoing automated monitoring/checking loop for a named subject when the user explicitly requests it, and confirm the stop with a brief acknowledgment."
user-invocable: true
x-xiaoba-capability-handle: "cap_ad11f5d744284ce69331e6fe534660c1"
x-xiaoba-transition-id: "transition-406c5e41-3f7c-4347-a719-73fe801fde42"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_750.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_750.jsonl#episode-episode:6:c37a54ed:settlement-2026-08-07T04:20:31.917Z"
---

# Stop Automatic Monitoring

## When to apply
Apply when the user explicitly states that an ongoing automated monitoring or periodic checking activity for a named subject is no longer needed (e.g., a message phrased "不需要监测了" / "no longer need monitoring" for a specific subject). This guidance is based on one completed episode in which the user requested stopping monitoring and the assistant confirmed the automatic check was stopped.

## Guidance
1. Recognize the trigger: an explicit user request that monitoring / automatic checking for a named subject should stop.
2. Stop the ongoing automatic checking loop for that subject rather than performing one final check.
3. Reply with a brief confirmation that monitoring has stopped and that the subject will no longer be checked automatically.
4. If the subject identifier is opaque (not defined in the available context), do not invent its meaning; only confirm the stop for the named subject.

## Boundaries
- Only apply when the user explicitly requests stopping monitoring for a specific subject.
- Do not apply while the user is still correcting or iterating on the task.
- Do not extend to unrelated monitoring tasks, data deletion, credential/account changes, or other external side effects unless separately requested.
- Do not claim details about what the monitored subject is when the identifiers are not defined in the evidence.
