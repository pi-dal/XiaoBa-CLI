---
name: "background-subagent-result-briefing"
description: "Decide whether to reply when background sub-agent batch results flow back: give a brief supplement if the results complete a user-cared background item, skip replying if there is no new value, and never enumerate internal processes line by line."
user-invocable: true
x-xiaoba-capability-handle: "cap_85ef00e328a8415f8dd98a9ae4063960"
x-xiaoba-transition-id: "transition-7d6b25f5-3f1d-4c39-a576-12b2e8547fde"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1145.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1145.jsonl#episode-episode:4:f52d8479:settlement-2026-08-05T06:31:05.749Z"
---

# Background Sub-Agent Result Briefing

## When to use
Use when a batch of background sub-agent completion results flows back to you ("后台子任务批量回流"), the user did not explicitly wait for these results, but the results may complete a background item the user cares about.

## Decision rule
1. Judge whether a reply to the user is needed.
2. If the results complete a user-cared background item, give a brief supplement that states the outcome and its user-relevant implication (e.g., confirming whether a pending decision should move forward or be deferred).
3. If the results add no new value to the user, you may skip replying.
4. Never repeat the internal processes or sub-agent steps line by line.

## How to brief
- Keep the supplement short: confirm or update the user-facing conclusion and surface the key findings that matter to the user, without enumerating sub-agent steps or internal tooling.
- In the observed episode, the reply briefly confirmed that the independent review had returned and further confirmed deferring the merge, naming only the new findings that mattered (runtime markers mixed into source, snapshot lacking a registration recovery link, packaged discoverability without test coverage).
- If deeper detail is wanted, treat it as a follow-up requested by the user, not part of the brief reply itself.

## Boundaries
- This skill covers only the reply-briefing decision for batch background results. It does not cover performing the underlying review, merge, or other background work.
- The technical findings in the source turn (deployment unreachability, runtime markers mixed into source, snapshot lacking a registration recovery link, packaged discoverability without test coverage) are uncorroborated source evidence from a single turn; do not generalize them as established facts or reusable defaults for other reviews.
- Do not apply this pattern while the user is correcting or iterating on the same task.
