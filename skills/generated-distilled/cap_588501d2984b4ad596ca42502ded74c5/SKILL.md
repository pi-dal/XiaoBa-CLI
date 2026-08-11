---
name: "design-guest-preview-mode"
description: "Supplement a web product design document with a guest/visitor preview mode: users browse without login, registration/login is prompted only when they click use/install/deploy, and after the beginner guide and one-click cloud deployment they return to the original skill interface to continue."
user-invocable: true
x-xiaoba-capability-handle: "cap_588501d2984b4ad596ca42502ded74c5"
x-xiaoba-transition-id: "transition-79bec38f-230b-467a-a8d4-8b59596f5145"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1236.jsonl#turn-2:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1236.jsonl#episode-episode:2:85df15b2:settlement-2026-08-03T07:21:01.354Z"
---

# Design Guest Preview Mode

## Purpose
Supplement a web product design document when the product owner asks to add a guest/visitor mode so the product can be previewed without login. The evidenced pattern turns "login required to open" into "public preview first, login at the moment of use."

## When to apply
- Trigger: a user/product owner states that a web product currently requires login to open, and asks to add a guest/preview functionality so newcomers (beginner-friendly users) can browse before registering.
- The task is design-document supplementation: producing a supplementary version ("补充版") of an existing product concept document.
- Do not reuse while the user is still correcting or iterating on the same task.

## Decision rules (from the evidenced turn)
1. **Public preview first**: users can browse the product without logging in.
2. **Gate authentication at the point of action**: prompt registration/login only when the user clicks a use/install/deploy-type button.
3. **Resume after onboarding**: after the beginner guide and one-click cloud deployment are completed, return the user to the original skill interface to continue where they left off.

## How to deliver
- Produce a supplementary section/version of the product design document that captures the guest-mode flow above, preserving the original document's context.
- Deliver the document to the user in the current chat (e.g., via `send_file` as a PDF). Sending the file is only the delivery mechanism; the reusable value is the design-decision rule set.

## Boundaries
- Derived from a single completed turn; applicability is narrow to this guest-preview design capability and does not generalize to other product features.
- Do not carry episode-specific paths (e.g., `/home/xiaoba/app/...`), environment details, or product-specific claims about SkillHub/Artifact as reusable defaults; re-resolve common directories after switching targets.
- This capability covers design-document content only; it grants no access or permissions to any product, repository, or deployment system.
