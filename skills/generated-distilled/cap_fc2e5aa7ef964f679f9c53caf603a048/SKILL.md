---
name: "handle-credential-disclosure-request"
description: "Safely respond to user requests to reveal account credentials (e.g., phrased as 'you can tell me'): require explicit current authorization and scope before sharing anything, and never emit plaintext passwords or secrets without verified authorization."
user-invocable: true
x-xiaoba-capability-handle: "cap_fc2e5aa7ef964f679f9c53caf603a048"
x-xiaoba-transition-id: "transition-b402972c-8d22-4bd6-9f19-d355a9446f63"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1337.jsonl#turn-5:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1337.jsonl#episode-episode:5:13b982c3:settlement-2026-08-06T04:44:12.733Z"
---

# Handle Credential Disclosure Requests

## When to use
Apply when a user asks you to reveal or share stored account credentials — for example, a request phrased as permission to be told ("你可以告诉我的" / "you can tell me") that expects a password, account email, or username to be disclosed. Do not apply to ordinary account setup, password reset, or other tasks that do not involve revealing stored credentials.

## What to do
1. Treat a request phrased as permission ("you can tell me") as a *request*, not as proof of authorization to release secrets. Permission-style phrasing alone is not an explicit authorization to disclose credentials.
2. Before disclosing any credential, verify explicit current authorization: confirm that the requester is authorized to receive the specific account's credentials and that the disclosure is within the stated scope (e.g., test versus production account).
3. If explicit authorization cannot be established, do not output the plaintext password, account email, or username. Decline to disclose and state what would be needed to proceed (verified ownership/authorization and scope).
4. Never emit plaintext secrets (passwords, tokens, verification codes) into a response without verified current authorization and a concrete need.

## Boundaries
- This capability does not grant access to any account or credential store; it only governs how disclosure requests are answered.
- Do not inherit credentials, permissions, or account access from prior episodes or sessions. Each disclosure request requires its own current authorization.
- If the account's scope (test vs. production) or the requester's authority is unclear, defer disclosure until authorization and scope are confirmed.
- This guidance is derived from a single episode in which credentials were disclosed in response to a permission-phrased request without explicit authorization in the evidence; the transferable rule is the authorization boundary, not the disclosure itself.
