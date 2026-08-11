---
name: "create-daren-multi-source-screening-demo"
description: "Build and deliver a self-contained mock HTML demo for a multi-source 达人 (influencer/talent) data collection and screening platform, with staged multi-source upload, normalization/dedup, screening, manual-handoff views, and a plain-text confirmation summary export."
user-invocable: true
x-xiaoba-capability-handle: "cap_7680bbd2298349f29131167a4e37ba19"
x-xiaoba-transition-id: "transition-fdc5ed57-4632-497a-8bb2-cb824a06fd8a"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-9:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-9:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:9:76db80e9:settlement-2026-08-05T10:00:17.896Z"
---

# Create Multi-Source Daren Collection & Screening Demo（达人资料归集与筛选 Demo）

## Purpose
Produce and deliver a self-contained, static HTML mock demo for a multi-source 达人 (influencer/talent) data collection and screening platform (多来源达人资料归集与筛选台), when the user asks to start producing the demo output (e.g., "开始做吧可以开始产出了").

## When to apply
- User signals to begin production of the multi-source 达人 data collection/screening demo, typically right after a daren-source-research task.
- A mock/demo version with sample data is acceptable; no real data-source integration or authorization is expected.

## What to build
A single HTML file with inline CSS and JavaScript (no external dependencies), presenting a staged workflow:

1. Two-column layout: left sidebar (brand, badge, 4-stage navigation) + main content area.
2. Four stages in the workflow:
   - **多来源上传/归集** — separate source entries for 负责人上传资料 (person-in-charge upload, treated as a dedicated source), 历史库 (history library), 官方平台导出 (official platform export), and 员工或达人推荐 (employee/influencer recommendations).
   - **归一与去重** — normalization and deduplication of collected records.
   - **筛选** — hard screening of candidates.
   - **人工交接** — manual handoff with per-candidate checkboxes (e.g., 核对最新报价和档期、账号归属/内容调性/品牌安全、确认最终联系人与项目负责人) and a plain-text confirmation summary export.
3. Client-side mock behaviors: per-source file pickers, mock data loading, missing-data alerts, filtering/sorting, and export of a downloadable "达人人工确认摘要" text file.
4. In-demo note that 负责人上传资料、公司历史库、官方平台导出和推荐表 are independent sources, and that 真实接入前需要授权 (authorization is required before real integration).

## How to deliver
1. `write_file` the HTML to a working tmp directory (e.g., `/home/xiaoba/app/tmp/daren-source-research-<date>/daren-multi-source-demo.html`).
2. `send_file` the same path with a Chinese display filename such as `达人多来源资料归集与筛选台_Mock演示版.html`.

## Boundaries
- Mock demo only: do not claim that upload/normalization/dedup/screening behaviors were verified against real data — the evidence only shows the demo UI and artifact delivery, not backend verification.
- No real data access, credentials, or platform authorization is implied; real integration requires explicit authorization.
- Keep scope to the 达人 multi-source collection/screening demo; do not generalize to arbitrary report or dashboard generation.
