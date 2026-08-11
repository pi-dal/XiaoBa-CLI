---
name: "verify-model-capability-claims"
description: "When the user asks to check a named AI model, verify its capability claims against the model's official documentation, separating confirmed from not-yet-proven capabilities and re-verifying prior assertions at execution time."
user-invocable: true
x-xiaoba-capability-handle: "cap_606e58900fcf4b5aafb12246e921760f"
x-xiaoba-transition-id: "transition-f0f0e193-c278-4a1f-8770-a273ea47aac2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1408.jsonl#turn-3:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1408.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1408.jsonl#episode-episode:3:f72ac7e1:settlement-2026-08-07T19:52:35.498Z"
---

# Verify a Named Model's Capability Claims

## Purpose
When the user names a specific AI model and asks to check or look it up (observed: "你去看gemma 4啊" — go check out Gemma 4), verify that model's capability claims against its official documentation, separating capabilities the official source supports from capabilities it has not proven. This skill covers single-model capability verification only, not generic model review, benchmarking, or model comparison.

## Trigger
The user asks to check, review, or look up a named model's capabilities (e.g., "go check out Gemma 4"). Apply to stable, standalone verification requests only.

## Guidance
1. Use the model's official documentation/site as the primary source, and re-check it at execution time; do not treat this episode's claims as established fact.
2. In the reply, explicitly separate capabilities the official source supports from capabilities it has not proven (supported vs. unproven), based on what the official source states.
3. If the current request references a prior assessment or report, do not reproduce its content — the prior report is not part of the evidence here. Base the reply on the current official source and note anything that requires re-verification.
4. If a prior statement in the conversation was wrong, acknowledge the correction plainly rather than repeating the earlier claim.
5. Treat capability claims as time-sensitive: model documentation changes, so re-verify against the live official source each time the skill is used.

## Episode observations (uncorroborated)
The following specifics come from the single observed turn and are not corroborated by any source in the evidence bundle. Re-verify them against the live official site before reuse; do not treat them as established fact:
- The assistant reported that the Gemma 4 E2B/E4B official site supports realtime on-device audio and vision understanding with offline operation, and that the site had not proven native speech output or reception of unlimited continuous audio/video streams.
- The assistant also stated that a prior report should be voided and redone; that prior report's content is not present in the evidence bundle.

## Boundaries
- Applies only to verifying a named model's capability claims against its official documentation — not generic model review, model comparison, or benchmarking.
- Do not apply while the user is actively correcting or iterating on the same task or report. The source turn itself included an assistant self-correction, so use this skill for fresh, standalone check requests rather than mid-correction loops.
- The Gemma 4 specifics above are uncorroborated episode observations; always re-verify against the current official source.
- This skill grants no access to any systems, credentials, or permissions.

## Evidence Basis
- One completed turn: the user asked to check Gemma 4; the assistant acknowledged a misreading, restated capability boundaries, and noted a prior report required rework.
- The episode settled at 2026-08-07T19:52:35.498Z with status "eligible" because no contradiction signal appeared by the deadline. This records only the absence of contradiction; the evidence does not show explicit user confirmation of the assistant's assessment, and the assistant's model specifics are uncorroborated in the bundle.
