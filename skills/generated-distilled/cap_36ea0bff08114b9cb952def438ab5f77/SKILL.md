---
name: "desktop-pet-form-design"
description: "When a user asks whether an existing app or assistant can appear in the form of a pet, respond by proposing a transparent-background, draggable desktop pet with a small footprint, expandable panels, and remembered position."
user-invocable: true
x-xiaoba-capability-handle: "cap_36ea0bff08114b9cb952def438ab5f77"
x-xiaoba-transition-id: "transition-fee8bdef-09a0-4b40-817e-e8b85d336d6c"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-02/catscompany_cc_group_grp_1035.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-02/catscompany_cc_group_grp_1035.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-02/catscompany_cc_group_grp_1035.jsonl#episode-episode:2:569d15da:settlement-2026-08-02T14:53:35.277Z"
---

# Desktop Pet Form Presentation

## When to use
Apply when a user asks whether an existing app, assistant, or interface can appear in the form of a pet (for example: "可不可以以一只宠物的形式出现？"). Do not apply to unrelated UI redesign, general product-design questions, or other domains.

## What to do
1. Confirm the pet form is feasible.
2. Propose a desktop-pet presentation with these characteristics. Present them as a design proposal to confirm, not as user-required requirements:
   - Transparent background so the pet blends with the desktop.
   - Small footprint by default so it does not occlude other apps.
   - Draggable.
   - Clicking the pet expands panels for the app's main areas (e.g., tasks, island, inventory); collapsing returns to the pet form.
   - Remember the pet's position.
3. Offer a friendly suggested name (e.g., "小岛精灵猫"), explicitly framed as a suggestion rather than a fixed requirement.
4. Because the detailed feature set in the source turn was assistant-proposed rather than user-specified, check with the user before treating any specific feature as a requirement.

## Boundaries
- This pattern is a design-response capability derived from a single completed turn; it does not cover implementing, deploying, or verifying a desktop pet.
- Do not reproduce speaker tags, user mentions, session paths, or identifiers in outputs or routing.
- Keep the response scoped to pet-form presentation; do not extend the pattern to other interface or product design questions.
