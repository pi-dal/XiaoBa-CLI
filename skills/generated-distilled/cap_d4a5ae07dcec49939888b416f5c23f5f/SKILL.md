---
name: "html-interaction-audit"
description: "Verify that every interactive element (buttons, dialogs, task actions) in an HTML file responds correctly by running a CDP-driven full-interaction audit, and only deliver the file after all checks pass and no browser exceptions are recorded."
user-invocable: true
x-xiaoba-capability-handle: "cap_d4a5ae07dcec49939888b416f5c23f5f"
x-xiaoba-transition-id: "transition-9e006f1c-fd06-43f6-a540-f1c7425450ca"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#turn-7:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#turn-7:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1326.jsonl#episode-episode:11:4014dc51:settlement-2026-08-05T17:08:08.768Z"
---

# HTML Interaction Audit Before Delivery

## When to use
Use this guidance when a user reports that buttons or interactive elements in a delivered HTML file do not respond, and explicitly requires that all interactions be tested and verified before the file is handed over. It also applies when delivering an interactive HTML artifact where full interaction verification is requested before handoff.

## Trigger
The user states that clicking into the HTML leaves some buttons unresponsive ("有些按钮是没有反应的") and asks that all interactions be tried first and the file only delivered after checking that there are no issues ("全部试一遍 检查没问题了在交付给我").

## Guidance
1. Locate the interactive HTML file to verify on the current target and resolve its absolute path for that target. Paths are target-specific; re-resolve common directories after switching targets.
2. Write a self-iteration audit script (Node.js) that drives the page over Chrome DevTools Protocol (CDP):
   - Read the debugging port from the environment (e.g., `CDP_PORT`); fetch `http://127.0.0.1:<port>/json` with retries until it responds, and select a page tab.
   - Connect to the tab's `webSocketDebuggerUrl`; enable `Runtime` and `Page`; navigate to the HTML via a `file://` URL and allow the page to load.
   - For each interactive element, evaluate a click expression via `Runtime.evaluate` (with `returnByValue` and `awaitPromise`) and then assert the expected post-interaction state (e.g., dialog `.open` becomes false, task rows toggle to `done`/`failed` classes, `data-status` attributes update).
   - Collect `Runtime.exceptionThrown` events as browser exceptions.
   - Aggregate a report of `{total, passed, failed, failures, exceptions}` and exit non-zero if any interaction failed or any browser exception occurred.
3. Run the audit and iterate on the HTML until every interaction passes and no browser exceptions are recorded.
4. Only after all checks pass, deliver the repaired HTML file with a clear display name that identifies it as the verified fix (e.g., `<name>_全量交互验收修复版.html`).
5. When reporting results, report only checks the audit actually ran and that are evidenced. Do not assert a specific interaction count (e.g., "40 interactions") unless the full audit report confirms it.

## Boundaries
- This guidance derives from a single completed episode; the concrete interaction list and selectors depend on the specific HTML page being audited.
- The audit requires a locally running Chrome with remote debugging enabled and a CDP port; it does not cover deployment, hosting, server-side behavior, or external services.
- File paths observed in the episode belong to that target only; re-resolve them after switching targets.
- No account, credential, or permission access is implied by this pattern; do not use it to touch unauthorized mailboxes, verification codes, or plaintext secrets.
