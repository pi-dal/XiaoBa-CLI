---
name: "confirm-word-list-for-vocabulary-game"
description: "When a user asks to make a vocabulary game from a specific list of words, confirm the exact words (spelling preserved) and request the list's canonical name before generating and verifying the game."
user-invocable: true
x-xiaoba-capability-handle: "cap_83465485c6fc4003854f7d50539e391b"
x-xiaoba-transition-id: "transition-e8059602-564c-4d60-bcb9-a4acebd36bca"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1012.jsonl#turn-3:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1012.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1012.jsonl#episode-episode:3:f350272c:settlement-2026-08-03T07:57:43.856Z"
---

# Confirm Word List Before Vocabulary Game

## When to use
Use when a user asks to build a vocabulary game from a specific set of words they provide (for example: `laptop, phone, tablet, ac, computer, tv, fan, tank`), often phrased as "make this game" with these words. The words are typically a defined list the user already knows and may have a canonical name.

## Steps
1. **Confirm the exact words.** Restate the words the user provided and confirm that their spelling will be preserved exactly as given. Do not translate, reorder, or "correct" the words.
2. **Request the canonical list name.** Ask the user for the accurate name of the word list (for example `U3`) before generating anything.
3. **Do not generate or verify the game until the name is confirmed.** Generation and verification proceed only after the user supplies the list name.

## Boundaries
- This covers only the word-list confirmation step for a vocabulary game. The specific game format ("this game") was not described in the available evidence; do not assume a format.
- Do not assume the user supplied the list name or that the game was actually generated or verified; the evidence shows only the confirmation request.
- Respond in the user's language (the observed interaction was in Chinese).
- Do not apply this pattern while the user is correcting or iterating on the task.
