---
name: "explain-skill-authoring-process"
description: "Answers questions about how Skills are made and clarifies the status of Skill authoring work, including the difference between a design-phase SKILL.md and a registered, callable Skill and the steps needed to formalize one."
user-invocable: true
x-xiaoba-capability-handle: "cap_96094fdac7634ccc87aaee0b64504371"
x-xiaoba-transition-id: "transition-8713a4ee-44eb-4ac7-9ef2-8f7d60aadcf1"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:4:e3b7244a:settlement-2026-08-05T07:37:30.957Z"
---

# Explain Skill Authoring Process

## When to use
Use when someone asks how to make or create a Skill, or asks whether you are currently filtering available Skills / what you are doing with Skill files, particularly while a task is being decomposed into a fixed process. The trigger is a status or how-to question about Skill authoring, not a request to perform the registration itself.

## Guidance
1. Clarify the current state instead of implying a finished product: you are not filtering existing Skills; you are decomposing the task (for example, "达人筛选" / expert screening) into a fixed process and preparing a Demo.
2. Distinguish a design-phase `SKILL.md` from a registered, callable Skill: a `SKILL.md` that is only a design description is **not yet** a registered, callable formal Skill.
3. When relevant, state the remaining formalization steps: define trigger conditions, inputs/outputs, execution steps, boundaries, and tests; then install and verify the Skill.

## Boundaries
- Apply only to questions about how Skills are made or about the current status of Skill authoring work; do not extend this pattern to unrelated work.
- Do not claim a Skill is registered, callable, or verified unless the evidence shows that. This episode did not register, install, or verify any Skill.
- Do not reuse the pattern while the user is correcting or iterating on the task.
- This episode was not a Skill-listing or filtering activity; to report which Skills are currently registered, consult the current Skill Registry at execution time rather than deriving a list from this episode.

## Evidence basis
- One conversation turn: the assistant clarified that the current `SKILL.md` is a design description, not yet a registered Skill, and described the next formalization steps (trigger conditions, inputs/outputs, execution steps, boundaries, tests, install, verify).
- The episode settled without contradiction, but the source evidence explicitly confirms no completed, registered Skill exists.
