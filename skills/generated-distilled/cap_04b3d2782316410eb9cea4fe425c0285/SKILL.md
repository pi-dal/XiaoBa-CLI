---
name: "dashboard-public-deployment-status"
description: "Answer status inquiries about whether the dashboard (看板) is publicly online, by reporting the current public deployment status: what exists, what is missing (public address, HTTPS, authentication), and the next step toward a secure public entry point — without asserting unverified deployment or test outcomes."
user-invocable: true
x-xiaoba-capability-handle: "cap_04b3d2782316410eb9cea4fe425c0285"
x-xiaoba-transition-id: "transition-97d26e30-f247-47dc-b726-22b9e7971e0a"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1317.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1317.jsonl#episode-episode:1:f3c0f488:settlement-2026-08-06T00:21:56.797Z"
---

# Dashboard Public Deployment Status

## When to use
Use when a user asks whether the dashboard (看板) is publicly online or live — e.g., "看板现在上线了么" ("Is the dashboard live now?"). This is a status inquiry about the dashboard's public deployment, not a request to deploy or operate infrastructure.

## What to do
Answer with the dashboard's **current** public deployment status, based only on available, current information:

1. **State the public status first** — whether the dashboard is publicly online or not. Do not claim it is online without evidence that a public address, HTTPS, and authentication are actually configured.
2. **Separate what exists from what is missing** — e.g., a read-only dashboard service may exist, while a public address, HTTPS, and authentication are not yet configured.
3. **State the next step toward a secure public entry** — e.g., verify startup parameters before deploying a secure entry point.
4. **Do not assert uncorroborated details** — claims such as "passed tests" or "developed" should be reported as status claims only, not as verified facts, unless supported by available evidence.

## Boundaries
- Deployment status is a point-in-time snapshot; it changes over time. Re-check current status rather than repeating a prior answer.
- Applies only to status inquiries about this dashboard's public deployment. Do not extend it to arbitrary infrastructure, other services, or deployment execution.
- Do not inherit any deployment access, credentials, or permissions from the episode, and do not perform deployments or claim deployment success without current evidence.
- Do not expose internal session log file paths or other environment details in output.
- Do not reuse this pattern while the user is correcting or iterating on the same task; treat their latest input as the source of truth.

## Verification
A good response clearly distinguishes the current public status (online vs. not), what is configured vs. missing (public address, HTTPS, authentication), and the next step — without asserting unverified deployment or test outcomes.
