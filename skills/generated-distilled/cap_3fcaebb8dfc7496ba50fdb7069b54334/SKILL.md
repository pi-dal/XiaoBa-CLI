---
name: "explain-temporary-link-availability"
description: "Explains that a temporary server-and-tunnel link stays usable while the server and tunnel keep running, is unaffected by the user closing their own device, fails on server restart or tunnel interruption, and requires formal deployment for long-term stable use."
user-invocable: true
x-xiaoba-capability-handle: "cap_3fcaebb8dfc7496ba50fdb7069b54334"
x-xiaoba-transition-id: "transition-aec87275-339f-4f1f-9bc4-a5df907767c5"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1069.jsonl#turn-3:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1069.jsonl#episode-episode:4:da3a1600:settlement-2026-08-05T10:39:44.343Z"
---

# Explain Temporary Link Availability

## When to use

Use when a user asks whether closing their computer (or phone/device) means they can no longer use a temporary link or continue playing through a temporary link that was provided to them, and the question concerns what the link depends on.

## What to convey

Based on the observed preference and answer pattern:

- The temporary link can stop working — but not because of the user's own device.
- The temporary link depends on the serving side: the server and the tunnel must keep running for the link to stay valid.
- The user closing their phone or computer does not affect the link.
- The link becomes invalid when the server restarts or the tunnel is interrupted.
- For long-term stable use, the temporary link must be replaced by a formal deployment.

## Boundaries

- Only apply when the task matches this user-facing capability: explaining the availability/lifetime of a temporary server-and-tunnel link relative to the user's device.
- Do not apply while the user is correcting or iterating on the same task.
- Do not extend this to claims about specific infrastructure, uptime guarantees, or access to any particular server or tunnel; the underlying technical arrangement is not independently verified in the source evidence.
- Do not inherit any access, credentials, or deployment permissions from the episode.
