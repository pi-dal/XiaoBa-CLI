---
name: "diagnose-trycloudflare-tunnel-unreachable"
description: "Diagnose why a temporary TryCloudflare tunnel link no longer opens (e.g., on mobile): the cause is tunnel reclamation by the system, not a device problem. When providing a replacement link, verify that it returns HTTP 200 before presenting it as working, warn that the link remains temporary, and recommend formal hosting for long-term publishing."
user-invocable: true
x-xiaoba-capability-handle: "cap_959f0571526c4469b27e219ac1c14393"
x-xiaoba-transition-id: "transition-d63725ae-9fd6-4abf-b285-c9b3feaff03e"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1069.jsonl#episode-episode:1:8ec8402a:settlement-2026-08-06T11:09:26.822Z"
---

# Diagnose TryCloudflare Temporary Tunnel Link Unreachable

## When to use
Use when a user reports that a web page shared over a temporary TryCloudflare tunnel link (`*.trycloudflare.com`) will not open (for example on a mobile device), and asks why. This guidance is derived from a single completed episode and applies only to this same user-facing capability: diagnosing an unreachable temporary tunnel link.

Do not reuse this pattern while the user is actively correcting or iterating on the task.

## What to do
1. Confirm the reported URL is a temporary TryCloudflare tunnel address (e.g., `https://<subdomain>.trycloudflare.com`).
2. Explain that the page cannot open because the temporary tunnel was reclaimed by the system — this is not a phone or device problem.
3. If a replacement link is provided, verify that it returns HTTP 200 (e.g., by requesting the URL and confirming the response status) before presenting it as working.
4. Explicitly state that the new link is still a temporary address and may be reclaimed again later.
5. Recommend switching to formal (official) hosting for long-term publishing, since a temporary tunnel is not a durable deployment target.

## Boundaries
- Applies only to temporary TryCloudflare tunnel links reported as unreachable; do not generalize to arbitrary websites, other hosting providers, or general mobile/device troubleshooting.
- The evidence covers one completed turn, so the skill is intentionally narrow.
- Do not treat the specific tunnel URL from the source episode as reusable; temporary tunnel addresses expire and must be re-verified each time.
- Do not imply access to or control over the hosting service, accounts, or credentials beyond what the user supplies in the current task.
