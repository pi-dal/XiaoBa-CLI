---
name: "fix-mobile-download-opens-in-window"
description: "Fix mobile (e.g., iOS) file downloads that open in a new window to view instead of downloading, by serving the file through a same-origin proxy with a forced attachment response."
user-invocable: true
x-xiaoba-capability-handle: "cap_48ec6b35041a4c3eb222a12b9e47b888"
x-xiaoba-transition-id: "transition-88fb4b23-736b-41e3-8950-0cd0e57cb430"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1415.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1415.jsonl#episode-episode:1:1e2f0617:settlement-2026-08-09T05:05:52.708Z"
---

# Fix Mobile Download Opens in Window

## When to use
Use when a user reports that on mobile (at least iOS), clicking a download link opens the file in a new window/preview to view it instead of downloading it.

## Do not use when
- The user is still correcting or iterating on the same task; do not reuse the pattern mid-iteration.
- The task goes beyond the evidenced scope (e.g., unrelated proxy, authentication, or deployment changes).

## Approach
1. Confirm the reported behavior: on mobile (e.g., iOS), clicking download opens the file in a window to view rather than triggering a download.
2. Change the download handling so files no longer open a new window: serve the file through a same-origin proxy and force an attachment response (e.g., `Content-Disposition: attachment`) so the client treats the response as a download.
3. Validate with focused tests and a full compilation.

## Boundaries and verification
- In the source episode, passing focused tests (23 items) and full compilation were assistant self-reports without independent verification in the available evidence.
- The fix was not accepted on a real iOS device and was not deployed; confirm with the user on the actual device, and treat deployment and real-device acceptance as open until verified.
- Do not embed local session log paths or other privileged filesystem paths in the solution.
- Keep changes scoped to the download response behavior; this episode does not evidence broader proxy, auth, or deployment changes.
