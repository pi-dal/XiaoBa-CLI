---
name: "create-todo-hotspot-embed-demo"
description: "Create a standalone HTML demo previewing hotspot-card embedding into a Todo list (今日小岛 · Todo 热点嵌入), using clearly marked demo data, deliver it via send_file, and defer real hotspot API integration until the user confirms the direction."
user-invocable: true
x-xiaoba-capability-handle: "cap_776ca8ed48304c82b2ddff2d215f5fa5"
x-xiaoba-transition-id: "transition-06436795-965f-4531-88ca-2e91be9ccf4d"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#turn-9:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#turn-9:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#episode-episode:9:46058cba:settlement-2026-08-03T07:37:27.403Z"
---

# Create Todo Hotspot Embed Demo

## When to use
Use when the user (e.g., "发言人: ddl") asks to "试试呗" or "先做个demo给我看看" — i.e., wants a demo first to review a proposed UI embedding where hotspot/trending cards are embedded into a Todo list ("今日小岛 · Todo 热点嵌入"), before any real integration is done.

## What to do
1. Build a **standalone, self-contained HTML file** (single file, inline CSS/JS, zh-CN interface) that demonstrates the proposed embedding layout: a Todo list area plus a collapsible hotspot/trending card panel, with filter tabs and item completion toggles for interactivity.
2. Use **clearly marked demo data** (labeled as "演示数据") — do not fabricate real API results. Any auto-refresh shown in the demo is visual-only (fake refresh); keep it clearly demo-scoped.
3. Write the file to a temp/demo path (e.g., `tmp/今日小岛_Todo热点嵌入_Demo.html`) via `write_file`.
4. Deliver the file to the current chat via `send_file` so the user can open and preview it directly.
5. In the reply, explicitly state that the demo only shows the embedding approach, and that real hotspot API integration and modification of the original Todo are deferred until the user confirms this direction.

## Boundaries
- This covers only the demo/preview step of the feature. Do not claim real hotspot API integration, live data refresh, or changes to the existing Todo app — none of those are evidenced.
- Do not reuse this pattern while the user is correcting or iterating on the task; re-confirm the direction before proceeding further.
- No external APIs, credentials, or privileged operations are involved; keep the demo local and self-contained.
