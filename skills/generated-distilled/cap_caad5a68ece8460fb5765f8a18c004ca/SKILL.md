---
name: "preview-dashboard-over-http"
description: "Serve a temporary, read-only HTTP preview of a dashboard when the user asks to see it and explicitly accepts HTTP instead of HTTPS for now."
user-invocable: true
x-xiaoba-capability-handle: "cap_caad5a68ece8460fb5765f8a18c004ca"
x-xiaoba-transition-id: "transition-c29a7846-9b36-4ef8-b47f-804613d7c41a"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1317.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1317.jsonl#episode-episode:2:56be8362:settlement-2026-08-06T00:26:34.436Z"
---

# Preview a dashboard over HTTP for a temporary look

## When to use
Use when the user asks to view a dashboard or preview and explicitly accepts HTTP for now (e.g., says HTTPS is not needed yet), matching the episode request: "发我看看，先不需要https，http就行" ("Send it over so I can look; no HTTPS needed for now, HTTP is fine").

## What to do
- Provide a temporary HTTP (not HTTPS) preview URL so the user can see the content immediately, honoring the stated HTTP preference.
- Serve the preview as read-only and verify that write requests are rejected before presenting it to the user.
- Tell the user the URL, that it is temporary, and that it is read-only.

## Boundaries
- Apply only to this narrow scenario (a user-requested temporary preview where HTTP is explicitly accepted). Do not generalize to authentication flows, durable deployments, or other content types.
- Do not reuse, hard-code, or inherit the episode's URL (http://183.56.225.22:18083/) or any access granted in the episode.
- An unauthenticated HTTP preview is visible to anyone with the link and poses an information-disclosure risk; only do this for content the user is authorized to share, and surface that exposure risk rather than presenting it as a normal deployment.
- A temporary URL's liveness is not guaranteed; treat it as short-lived and do not assume it remains reachable.
- Do not use this pattern for content that must remain confidential or that requires HTTPS or authentication.
