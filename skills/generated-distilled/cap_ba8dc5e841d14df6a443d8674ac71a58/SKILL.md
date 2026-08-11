---
name: "deliver-leads-pdf"
description: "Deliver the final rendered potential-customer leads PDF (广东广告传媒潜在客户线索_<date>_终版.pdf) from the render output directory to the current chat when the user asks to continue (e.g., '继续')."
user-invocable: true
x-xiaoba-capability-handle: "cap_ba8dc5e841d14df6a443d8674ac71a58"
x-xiaoba-transition-id: "transition-43cc3923-1a6f-40c3-8cac-58fb61972d85"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#turn-1:delivery:send_file, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1347.jsonl#episode-episode:2:2f5526bc:settlement-2026-08-06T09:37:11.392Z"
---

# Deliver Final Leads PDF

## Purpose
Deliver the final rendered potential-customer leads PDF to the current chat when the user asks to continue (e.g., "继续") after the final PDF has been rendered.

## When to use
- The user says "继续" (continue) or otherwise asks to proceed with delivering the final leads document.
- A final rendered PDF matching the pattern `广东广告传媒潜在客户线索_YYYY-MM-DD_终版.pdf` exists in the render output directory (in the evidence context: `/home/xiaoba/app/tmp/gd_leads_render_final/`).

## Do not use when
- The user is correcting or iterating on the task (per episode boundaries: do not reuse the pattern while the user is correcting or iterating).
- The task involves generating, analyzing, or modifying leads data — the evidence covers only the final delivery step, not any upstream workflow.
- There is no current, available chat/session target to receive the file.

## Steps
1. **Locate the final PDF** — find the file matching `广东广告传媒潜在客户线索_<date>_终版.pdf` in the render output directory. In the evidence this was `/home/xiaoba/app/tmp/gd_leads_render_final/广东广告传媒潜在客户线索_2026-08-06_终版.pdf`.
2. **Verify the file exists** at the resolved path before sending. Paths belong to the target context (cwd `/home/xiaoba/app` in the evidence); re-resolve common directories if the working target changes.
3. **Send the file** to the current chat using `send_file`, providing the resolved `file_path` and the same `file_name` as the on-disk file.
4. **Confirm delivery** completed for the current chat.

## Boundaries and claims
- This skill is derived from a single completed delivery turn; treat it as a narrow delivery capability only.
- Evidence confirms the delivery attempt completed without contradiction; it does not show user acceptance of the file or downstream use — do not claim acceptance or any follow-on effect.
- No credentials, external systems, or account operations are involved; do not inherit any broader filesystem or delivery access from the source episode beyond sending the named rendered file to the current chat.
