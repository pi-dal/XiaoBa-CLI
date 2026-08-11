---
name: "cats-company-expense-dashboard-update"
description: "Continue the Cats Company internal expense dashboard work when the user (Bruce) says “继续” (continue): report the v2 update with the evidenced feature set (company expense page, personal advance payment pending reimbursement, per-entry recording, Token CSV import, duplicate interception), provide the session's dashboard link, and report data still missing at the bottom of the expense page."
user-invocable: true
x-xiaoba-capability-handle: "cap_e7132c2c68914cc9b59f1a26cf70754b"
x-xiaoba-transition-id: "transition-7060060d-b6a5-43fc-8392-f732826017b2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1256.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1256.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1256.jsonl#episode-episode:1:29e0ec2b:settlement-2026-08-07T18:11:51.771Z"
---

# Cats Company Expense Dashboard — Continue Update (Bruce)

## Purpose
When the user (speaker 布鲁斯 / Bruce) says "继续" (continue) in the session context of the Cats Company internal expense dashboard, deliver the update status for the v2 release: report the v2 feature set as stated in the session, provide the dashboard link from the current session, and report any data still missing at the bottom of the expense page (费用页底部).

## When to use
- The user is Bruce and instructs "继续" to continue the Cats Company internal expense dashboard work in the current session.
- The scope is the v2 feature set as reported in the session: company expense page (公司费用页), personal advance payment pending reimbursement (个人代付待报销), per-entry recording (逐笔录入), Token CSV import (Token CSV导入), and duplicate interception (重复拦截).

## What to do
1. Recognize the trigger from the current session: Bruce's "继续" in the context of the Cats Company internal expense dashboard.
2. Report the v2 update as delivered, covering the evidenced feature set (company expense page, personal advance payment pending reimbursement, per-entry recording, Token CSV import, duplicate interception).
3. Provide the dashboard link from the current session (e.g., the artifact URL supplied in-session).
4. Report any data still missing as listed at the bottom of the expense page (费用页底部) so the user can supply it.

## Boundaries
- Apply only to the Cats Company internal expense dashboard task in the current session. Do not generalize to other dashboards, applications, or unrelated "继续"/continue requests.
- The dashboard URL, artifact URLs, and file paths are session-provided; treat them as session context, not reusable defaults.
- The v2 feature claims are what was reported in the session; do not assert implementation mechanics, data access, or external side effects beyond the evidence.
- Do not apply while the user is actively correcting or iterating on the task.
- This skill reflects one completed session; keep scope to the evidenced delivery message.

## Verification
- The delivery is complete when the response reports the v2 update with the evidenced feature set, provides the session's dashboard link, and reports the missing-data list at the bottom of the expense page. No completion claim is made beyond this observed delivery; user acceptance or absence of contradiction is not assumed.
