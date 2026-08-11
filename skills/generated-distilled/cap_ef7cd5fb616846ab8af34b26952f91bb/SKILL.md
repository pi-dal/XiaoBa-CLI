---
name: "diagnose-macos-app-signing-failure"
description: "Analyze a user-provided screenshot of a macOS app install/verification error and identify a code-signing/notarization verification failure (as opposed to a download failure), including checks on release signing, notarization, and post-signing modification or recompression."
user-invocable: true
x-xiaoba-capability-handle: "cap_ef7cd5fb616846ab8af34b26952f91bb"
x-xiaoba-transition-id: "transition-d53b9d8b-d4d1-41fc-9d8f-c35754a1956b"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_session_v2_catscompany_p2p_p2p_38_535_agent_usr535.jsonl#episode-episode:1:5693a1b6:settlement-2026-07-31T08:18:29.589Z"
---

# Diagnose macOS App Signing Failure from an Install-Error Screenshot

## Purpose
Analyze a user-provided screenshot of a macOS application install/verification error and determine whether the failure is a code-signing/notarization verification failure rather than a download failure, then point the user to the relevant release-package checks.

## When to use
- The user asks to analyze what problem is shown in an attached image (e.g., "帮我分析下这个是什么问题[图片]"), and the image is a macOS app install/verification error screenshot.
- A local cache path for the attachment is supplied by the user (e.g., under `/home/xiaoba/app/data/attachments/...`).

## Guidance
1. **Read the attached image** at the exact local cache path the user supplied (e.g., via `read_file` with that `file_path`). Restrict file access to the attachment provided for this task; do not turn this into a generic arbitrary file-read capability.
2. **Classify the failure type first.** A macOS install/verification error can be a *signature/notarization verification failure* (signature invalid or certificate mismatch) — this is distinct from a *download failure*. Do not conflate the two.
3. **Key diagnostic rule.** If the package was downloaded and extracted but the `.app` bundle's signature is invalid, or inconsistent with the signing certificate of a previously working version, the problem is a signing/notarization verification failure, not a download problem.
4. **Advise the release checks that follow from that diagnosis:**
   - Was the release package actually signed?
   - Was it notarized?
   - Was the bundle modified or recompressed after signing (which invalidates the signature)?
5. State the diagnosis and the specific checks clearly; do not prescribe fixes beyond what the evidence supports.

## Boundaries
- Applies only to analyzing a user-provided screenshot of a macOS app install/verification error. Do not extend to arbitrary images, articles, documents, meeting notes, or general domain analysis.
- Derived from a single observed episode; treat it as a starting diagnosis, not an exhaustive macOS installer troubleshooting procedure.
- Episode-specific details (e.g., the exact version numbers and app identity in the source turn) are not independently corroborated in the evidence and must not be carried forward as reusable facts — compare against the user's actual versions.
- The episode completed without contradiction but no explicit user acceptance of the diagnosis was recorded; confirm the diagnosis with the user before acting on it.
