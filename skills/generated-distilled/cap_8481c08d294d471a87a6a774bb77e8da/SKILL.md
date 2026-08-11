---
name: "todo-task-type-presentation"
description: "Keep a single add-todo entry where the user picks normal, long-term, or cycle at creation, and present each type distinctly (progress bar/stage/advance for long-term; frequency/round/auto-advance for cycle) in the same list via card style, without adding separate navigation items."
user-invocable: true
x-xiaoba-capability-handle: "cap_8481c08d294d471a87a6a774bb77e8da"
x-xiaoba-transition-id: "transition-3b121159-668d-462c-a0e6-a4d4a8b65af9"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#turn-4:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#turn-4:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#episode-episode:4:fc8788a0:settlement-2026-08-03T07:02:24.401Z"
---

# Single Add-Todo with Type-Aware Presentation (Todo Apps)

## When to use
Use when working on a Todo app UI where the user wants to support different task types (normal, long-term, cycle/recurring) **without** adding multiple separate navigation entries, and instead wants a single add-todo control whose presentation differs from the normal task.

This capability is derived from one completed, settled episode. Apply narrowly to similar Todo-app UI design tasks; do not generalize to other domains (project management, calendars, generic task apps) or to unrelated UI work.

## Guidance

1. **Keep one add entry point.** Do not add a separate navigation item per task type. Retain a single "新增 Todo" (Add Todo) control.
2. **Select the type at creation.** When creating a todo, let the user choose the type: 普通 (normal), 长期 (long-term), or 循环 (cycle).
3. **Render each type distinctly in the same list.** All three types continue to be mixed in the original list and are distinguished by card style:
   - **Normal (普通):** keep existing behavior unchanged.
   - **Long-term (长期):** show a progress bar, the current stage, and an "推进一次" (advance once) action.
   - **Cycle (循环):** show the frequency and current-round status; when a round completes, automatically advance to the next round.

## Boundaries

- The exact card-style visuals, stage labels, progress-bar layout, and cycle display details were proposed in the source episode and settled without contradiction; if the target app has different conventions, confirm specifics with the user before applying.
- This is a UI/UX preference only — it involves no credentials, data access, or external side effects. Do not extend it to other task types, other products, or non-Todo UI features without further evidence.
