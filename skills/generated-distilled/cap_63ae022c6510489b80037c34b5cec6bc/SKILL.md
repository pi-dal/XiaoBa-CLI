---
name: "loop-mechanism-usage-guidance"
description: "Answer user questions about how the Loop mechanism (controller + loopctl) is used and whether it can be installed on their robot, covering prerequisites, the usage trigger phrase, and requesting deployment details to assess feasibility."
user-invocable: true
x-xiaoba-capability-handle: "cap_63ae022c6510489b80037c34b5cec6bc"
x-xiaoba-transition-id: "transition-7fafe269-373f-4b2a-8fb9-cc3feadd356d"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1406.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1406.jsonl#episode-episode:3:10948eab:settlement-2026-08-07T15:26:47.044Z"
---

# Loop Mechanism Usage and Installation Guidance

## When to use
Apply when a user (in the CatsCo context) asks how the Loop mechanism works, how to use it, or whether it can be installed on their own robot. This guidance is bounded to that question as evidenced in a single completed turn; do not extend it to broader bot-framework or generic automation questions.

## Guidance
1. Answer that installation is possible, but not a one-click install for arbitrary robots.
2. State the prerequisites the user's robot must already meet (these are conditions on the user's side, not something this capability grants):
   - Able to run OpenCLI
   - Logged into CatsCo
   - Able to invoke Bash/Git
   - Controller and the `loopctl` plugin deployed
3. Explain usage: saying “启动 Loop 做某任务” (start Loop to do a task) triggers the mechanism to automatically divide work, execute, verify, and rework.
4. Ask the user how their robot is deployed so you can judge whether integration is feasible.

## Boundaries
- Do not claim to provide or grant OpenCLI, CatsCo login, Bash/Git access, or controller/`loopctl` deployment for the user's robot; only report what the robot must already support.
- Do not reuse this pattern while the user is correcting or iterating on the task.
- Keep the response scoped to the Loop mechanism (controller + `loopctl`) as evidenced; do not generalize to other install or onboarding flows.
- If prerequisites are not met or deployment details are missing, ask for the user's deployment setup before judging feasibility.

## Evidence
- Completion: assistant response at turn 3 of catscompany_cc_group_grp_1406.jsonl explaining prerequisites and usage trigger.
- Settlement: episode settled at 2026-08-07T15:26:47.044Z without contradiction.
