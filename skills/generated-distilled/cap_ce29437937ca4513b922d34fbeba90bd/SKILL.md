---
name: "cross-device-project-repair"
description: "Handle a request to repair a project whose source code is only available on a different device than the currently routed environment: verify source accessibility first, request that the source device's client stay online and its project directory remain accessible, and defer any changes until access is confirmed."
user-invocable: true
x-xiaoba-capability-handle: "cap_ce29437937ca4513b922d34fbeba90bd"
x-xiaoba-transition-id: "transition-7101f4bd-20bf-4c6b-af52-607982a3f669"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_617.jsonl#episode-episode:6:ff51a327:settlement-2026-08-03T07:03:33.471Z"
---

# Cross-Device Project Repair

## When to use
Apply when a user asks you to fix or repair shortcomings of a project (for example "你帮我修复 / 想办法帮我修复") and the source code for that project lives only on a different device or environment than the one you are currently routed to. This is a cross-device source-access situation, not the repair work itself.

Evidenced trigger: the user asked for fixes while the current route had switched to a Linux cloud machine, and the source only existed on the prior Windows machine, so the project could not be located in the current environment.

## What to do
1. Before modifying anything, verify whether the project source is actually present and accessible in your current environment.
2. If the source is only available on another device, do not attempt to modify the project blindly or unsafely from the current environment.
3. Explain to the user where the source lives, and request that the source device's client stay online and its project directory remain accessible so the work can continue.
4. Continue the repair only after access is confirmed, following a safe sequence: backup first, then changes/refactoring, then live interface, then acceptance/verification.

## Boundaries
- This guidance covers only the cross-device source-access step. It does not grant or assume any access, authorization, login state, or permissions on the source device, and it does not cover the actual repair work itself.
- The observed episode contained no code, patch, diff, or acceptance result; completion of the fix was not evidenced, so do not claim a delivered repair.
- Do not apply while the user is actively correcting or iterating on the task.
- Do not reproduce raw session/group identifiers, user handles, speaker labels, or exact log paths from the underlying evidence.
