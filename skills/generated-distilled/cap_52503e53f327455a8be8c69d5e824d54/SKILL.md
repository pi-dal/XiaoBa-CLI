---
name: "identify-today-island-desktop-widget-version"
description: "Recognize and describe the Today's Island desktop widget version (Todo embedded as a draggable, resizable desktop window that remembers position/size, is not always-on-top, and preserves account and task data) when a user asks to identify which embedded desktop version they want to revert to, distinguishing it from the Chrome shortcut and desktop pet versions."
user-invocable: true
x-xiaoba-capability-handle: "cap_52503e53f327455a8be8c69d5e824d54"
x-xiaoba-transition-id: "transition-597a4951-5d63-49c7-b476-d89651694bc1"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1035.jsonl#episode-episode:2:f0fd583b:settlement-2026-08-03T12:24:44.396Z"
---

# Identify Today's Island Desktop Widget Version

## Purpose

Recognize and describe the **今日小岛桌面组件版** (Today's Island desktop widget version) when a user asks to identify which embedded desktop version of their Todo app they want to revert to, and distinguish it from other versions the user may currently have.

## Trigger

A user asks to identify which embedded desktop version they want to return to — for example: "我想回到嵌入我的桌面的哪个版本 你能识别吗？" (I want to go back to the version embedded on my desktop, can you identify it?). This is a recognition/identification request, not a request to perform a change.

## Guidance

When the user asks to identify the embedded desktop version they want to revert to:

- Identify it as the **今日小岛桌面组件版** (Today's Island desktop widget version) — the version that existed before the desktop pet change.
- Describe its distinguishing attributes:
  - Todo is embedded on the desktop as a draggable, resizable small window.
  - It remembers its position and size.
  - It is not always-on-top.
  - It preserves the original account and task data.
- Distinguish it from the other versions the user may currently have:
  - The current **Chrome shortcut** is not the target.
  - The **desktop pet version** is not the target.

## Boundaries

- Apply only when the task matches this user-facing capability: identifying which embedded desktop version of the Today's Island Todo app the user wants to revert to.
- Do not apply while the user is correcting or iterating on the task.
- Do not extend this to other applications, arbitrary desktop-version questions, or general product-version identification without further evidence.
- Do not embed raw user identifiers or personal account/task data in the response beyond what is needed to answer.
- This guidance derives from a single completed episode; keep claims bounded to what the evidence supports.
