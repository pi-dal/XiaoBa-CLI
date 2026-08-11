---
name: "guangzhou-advertising-company-strategy-map"
description: "Produce and deliver the dated Guangzhou advertising-related company strategic map report (print-ready HTML plus PDF), including contact-priority scoring, first-batch contact recommendations, batch acquisition channels, sourced references with verification dates, and an explicit limitations callout."
user-invocable: true
x-xiaoba-capability-handle: "cap_328db936fbf2488eb4e5d8ccf5a66e75"
x-xiaoba-transition-id: "transition-43281ae6-5e8c-4412-bd0a-adbf47269051"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#turn-3:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#turn-3:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1317.jsonl#episode-episode:6:bf521b2e:settlement-2026-08-05T12:13:57.129Z"
---

# Guangzhou Advertising Company Strategy Map

## When to use
Use when the task is to produce or finalize the **广州广告相关公司战略地图** (Guangzhou advertising-related company strategic map) deliverable — for example a continuation prompt such as `[发言人: 布鲁斯] 继续` arriving within that research task — and the expected output is a dated strategic map report (HTML) plus its PDF sent to the user.

Do **not** use for:
- Arbitrary company research, lead lists, or general report-writing beyond this Guangzhou advertising company strategic map.
- Reusing this pattern while the user is correcting or iterating on the current task.
- Tasks that require data this episode never evidenced (see Boundaries).

## Input and working context
- The episode only evidences the finalization/delivery step of a longer research task (the user prompt was a bare "继续"). Before writing, confirm the prior research state and working directory for the current target; re-resolve common directories instead of assuming the episode's absolute paths.
- Work under a dated directory such as `tmp/gz_ad_strategy_map_YYYYMMDD/` (the episode used `tmp/gz_ad_strategy_map_20260805/`).

## Deliverable structure
Produce a self-contained, print-ready A4 HTML report titled `广州广告相关公司战略地图_YYYY-MM-DD.html` with:
- A **cover page** (dark gradient background, white text) containing the title, subtitle, and a verdict callout that states the recommended next action in one short paragraph.
- **Company entries** describing each company's business type, relevant capabilities (e.g., AI/私域/SaaS capabilities, platform service qualifications such as 抖音生活服务/美团点评/阿里本地生活), location, and a source URL.
- A **contact-priority score** per company, used **only to order the contact sequence** — never presented as a quality or capability ranking.
- A **sources section** listing each source with its verification date and URL, plus the local prior research artifacts used.
- An explicit **"重要限制" callout** stating: no internal client data, contracts, quotes, hours, platform authorizations, renewals, margins, procurement, or AI usage data was used; no paid business database was called; some small-company addresses and operating status require secondary re-verification.
- Print styling with page numbers and page breaks so the HTML converts cleanly to PDF.

## Delivery steps
1. Write the HTML file with `write_file` into the dated directory above.
2. Send the PDF with the same base name (e.g., `广州广告相关公司战略地图_YYYY-MM-DD.pdf`) via `send_file`.
3. Reply with a short confirmation that the strategic map was sent, plus:
   - a small **first-batch contact recommendation** (the episode recommended 扬悦博众、茉莉数科、伊智科技、奇异果互动、乐颐网络), and
   - **batch acquisition channels** (the episode named the 穗广协 industry association and the 琶洲数智广告集聚区 industrial cluster).

## Boundaries
- Do not fabricate internal client data, contracts, quotes, hours, platform authorizations, renewals, margins, procurement, or AI usage data.
- Do not claim access to paid business databases; mark company addresses and operating status that need re-verification.
- Scores only arrange contact order; they are not company quality ratings.
- This skill is limited to the Guangzhou advertising company strategic map deliverable evidenced here. Do not extend it to arbitrary articles, attachments, meeting notes, transcripts, or general domain analysis.
- Do not reuse this pattern while the user is correcting or iterating on the task; apply it only when a new task matches this same user-facing capability.
