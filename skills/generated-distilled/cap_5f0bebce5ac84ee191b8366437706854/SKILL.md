---
name: "browser-check-tool-selection"
description: "Choose between opencli's browser capability and Playwright for browser verification checks (script errors, element dimensions, desktop/mobile overflow): check opencli's coverage first and prefer it when it meets the same acceptance; use Playwright connected to the existing Chrome only for checks opencli cannot cover."
user-invocable: true
x-xiaoba-capability-handle: "cap_5f0bebce5ac84ee191b8366437706854"
x-xiaoba-transition-id: "transition-2ff4650f-4981-4385-a665-195193bfe050"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1317.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-07/catscompany_cc_group_grp_1317.jsonl#episode-episode:7:435ba36e:settlement-2026-08-07T10:49:44.290Z"
---

# Browser Check Tool Selection

## When to use

Use when a task needs browser-based verification of a web page — checking script errors, element dimensions, and desktop/mobile overflow — and the choice of tool between opencli's browser capability and Playwright comes up (for example, when the user asks why Playwright is being used even though opencli exists).

## What to do

1. Before reaching for Playwright, check whether opencli's browser capability can cover the same acceptance criteria for the current task.
2. If opencli's browser capability can cover the same acceptance, prefer opencli.
3. Use Playwright only for the checks that opencli cannot cover. The evidenced case: connect Playwright directly to the existing Chrome to inspect script errors, element dimensions, and desktop/mobile overflow.

## Boundaries

- This guidance only supports the decision rule: check opencli's browser capability first, prefer it when it covers the same acceptance, and fall back to Playwright connected to the existing Chrome for the specific checks above.
- It does **not** establish that opencli actually covers the same acceptance — whether opencli suffices must be verified for each task.
- Do not apply while the user is correcting or iterating on the task.
- Do not extend to other browser automation needs, other tools, or verification types beyond what is evidenced here.
