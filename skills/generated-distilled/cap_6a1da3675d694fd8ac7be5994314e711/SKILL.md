---
name: "explain-localhost-link-access"
description: "Explain whether a localhost URL (e.g., localhost:3000) remains reachable after the serving computer is shut down, and advise the path to keeping it accessible via cloud deployment with a public link."
user-invocable: true
x-xiaoba-capability-handle: "cap_6a1da3675d694fd8ac7be5994314e711"
x-xiaoba-transition-id: "transition-1e71b0c4-d337-4606-9438-259e800d89ab"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#episode-episode:1:92ec89c7:settlement-2026-08-03T11:05:28.423Z"
---

# Explain Localhost Link Access After Shutdown

## When to use
Use this skill when the user asks whether a link such as `http://localhost:3000/...` will still be openable after their own computer is turned off, or whether other people/devices can open it.

## Guidance
1. Answer directly: **No** — a `localhost` address refers only to the machine currently running the service. When that computer shuts down, the locally running service stops, so the link is no longer reachable.
2. Clarify other devices: another device that opens `localhost` accesses its own local machine, not the user's computer.
3. If continued access after shutdown is wanted, advise deploying the served application/dashboard to a cloud server and switching to a public (公网) URL.

## Boundaries
- Only answer the localhost-reachability question described above; do not extend this to diagnosing network faults, configuring cloud servers, port forwarding, or tunnels (not evidenced).
- Do not imply any access to the user's machine, logs, or files; the response is an explanation only.
- Do not expand this into generic hosting or deployment instructions beyond the advice to use a cloud server with a public link.
- Keep scope narrow: this derives from a single completed turn whose verification recorded only absence of contradiction.
