---
name: "resend-prior-artifacts"
description: "Locate and resend artifacts created earlier in the same project (e.g., a PDF pain-point summary and an HTML demo) that the user asks to have delivered again, using send_file and confirming what was sent without overclaiming artifact identity."
user-invocable: true
x-xiaoba-capability-handle: "cap_dbe4e1f465954589a4efbb9943db7293"
x-xiaoba-transition-id: "transition-42204759-50c7-43d0-9042-135751d4dfdc"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-1:delivery:send_file:call-id-8bd556364a13-1, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#turn-1:delivery:send_file:call-id-058b1ace3a88-2, /home/xiaoba/app/logs/sessions/catscompany/2026-08-05/catscompany_cc_group_grp_1272.jsonl#episode-episode:1:1b2da4c3:settlement-2026-08-05T15:40:57.001Z"
---

# Resend Prior Artifacts

## When to use
Use this when the user asks to have artifacts created earlier in the same project delivered to them again, for example "send me the PDF pain-point summary we organized earlier and the HTML you made" (把最开始我们整理的pdf痛点发给我 还有一个你做的html也发给我). The request refers to files that already exist locally from prior work — this is a retrieval-and-delivery task, not a creation task.

## Before acting
- Confirm the user is asking for artifacts that already exist from earlier work in this project, not for new files to be created.
- If the identity of a referenced artifact is ambiguous (for example, which HTML file is meant, or whether the available file matches what the user remembers), say which file you found and deliver it, or ask which one they mean. Do not assert that a delivered file is identical to the artifact the user remembers unless you can verify it.

## Steps
1. Locate the referenced artifacts in the project's working directory. Do not hard-code the paths or file names from any single past session; resolve the current working directory and search for the matching files at execution time. (In the episode this pattern comes from, the artifacts lived under `/home/xiaoba/app/tmp/daren-source-research-20260805/`.)
2. Verify each artifact exists before sending. Never fabricate a file or substitute an unrelated one.
3. Deliver each artifact with `send_file`, using a user-friendly display name that reflects the artifact's content — for example the PDF's own name, and for the HTML a descriptive name such as `达人多来源资料归集与筛选台_Mock演示版.html`.
4. Reply confirming which files were sent, and only claim what you actually delivered. Do not overclaim that the sent file is exactly the one the user had in mind.

## Boundaries
- Only applies to delivering files that already exist from earlier work. Do not use this pattern to create or generate new artifacts.
- If a referenced artifact cannot be found, report that and ask for clarification instead of guessing.
- This skill grants no access beyond the current local working directory; re-resolve paths for the current target before sending.
- Do not reuse this pattern while the user is correcting or iterating on the delivery (for example, if they say the wrong file was sent). Treat that as a correction, not as a new instance of this capability.
- A completed send action confirms only that a delivery attempt finished; it does not by itself confirm the user received or accepted the intended artifact.
