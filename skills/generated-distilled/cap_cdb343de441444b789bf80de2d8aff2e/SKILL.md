---
name: "longterm-todo-route-design"
description: "When a user asks to add a loop/recurring feature for tasks that take a long time, or asks how to present long-term todos in their todo system, propose a 'long-term route' design: persistent cards showing overall goal, current stage, progress, and next action; each start records one advancement and the task persists after the session; progress advances only on stage completion; daily/weekly loops only for habit-type tasks; short tasks stay in the today list while long-term items live in a separate route view."
user-invocable: true
x-xiaoba-capability-handle: "cap_cdb343de441444b789bf80de2d8aff2e"
x-xiaoba-transition-id: "transition-fbc0395a-dbdf-4d73-993b-9e6da7871fd7"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#episode-episode:3:0cc0c618:settlement-2026-08-03T06:59:57.460Z"
---

# Long-Term Todo Route Design

## When to use
Use when a user asks to add a recurring / "loop" feature to their task or todo system because some tasks take a long time to finish, or asks for an alternative way to present long-term todos (e.g., asking how to show long-horizon tasks).

## Guidance
Instead of adding only a generic "loop", propose a "long-term route" (长期航线) design for the todo system:

1. **Route card content**: Each long-term task card shows the overall goal, current stage, progress, and next action.
2. **Session-based advancement**: Each time the user clicks "start", record exactly one advancement. When the session ends, the user fills in what they accomplished this time. The task does not disappear after a single session.
3. **Stage-based progress**: Progress advances only when a stage is completed, not on every session.
4. **Habit tasks**: Only enable daily or weekly loops when the task is a habit-type task that repeats on a schedule.
5. **Separation of views**: Keep short tasks in the "today" list and place long-term items in a separate "route" view so the two do not mix.

## Boundaries
- This is a design recommendation for long-term todo presentation; it does not cover implementing code, data models, or UI builds.
- Applies only to long-term todo / recurring-task presentation in a task-management context, not to other domains or general product design.
- Do not reuse this pattern while the user is correcting or iterating on the same task.
- The evidence is one proposed design from a single exchange; user acceptance or implementation is not evidenced.
