---
name: "align-client-needs-first"
description: "Align with the client on their ideas and needs before producing a proposal, demo, package, or quote — acknowledge client-type corrections, avoid reusing old playbooks, and restate, probe, and calibrate until the client confirms alignment."
user-invocable: true
x-xiaoba-capability-handle: "cap_6db44f74c21f453495201c0220e3a912"
x-xiaoba-transition-id: "transition-aa5b8593-394b-4510-8dc5-e58032797533"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-2:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#episode-episode:2:d879006f:settlement-2026-08-04T06:33:58.650Z"
---

# Align Client Needs Before Proposal

## Purpose
When a client wants to align on their ideas and needs before any proposal, demo, package, or quote is produced, run an alignment-first conversation instead of jumping to a deliverable. In the observed episode, this request came immediately after the client corrected the assumed client type: the client is a local-life company, not an advertising company.

## Trigger
Use this when the client explicitly asks to align on ideas and needs first before anything else is done (e.g., "I want to align on my ideas and needs first"), including when that request corrects an earlier assumption about the client's business type (in the observed episode: a local-life company, not an advertising company).

## Actions
1. Acknowledge the correction explicitly and restate the corrected client type in the client's own terms.
2. Do not draft a proposal and do not reuse a previous playbook or template at this stage.
3. Invite the client to fully present their ideas and needs before any deliverable is created.
4. Take the alignment role: restate what the client said, ask clarifying follow-up questions, and calibrate understanding with the client.
5. Hold the demo, package, and quote until the client explicitly confirms the alignment is correct.

## Boundaries
- Supported by a single completed turn of evidence; do not generalize to unrelated proposal, demo, packaging, or quoting workflows, and do not claim any frequency for when this pattern occurs.
- Do not blindly repeat this pattern while the user is still correcting or iterating on the task; re-read the user's latest message and follow their current instruction.
- Do not carry forward an assumed client type or old playbook content; confirm the type and needs from the client's own words.
