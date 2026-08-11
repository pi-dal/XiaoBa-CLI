---
name: "create-briefing-encyclopedia-html"
description: "Turn a provided briefing about a character into a single self-contained, evidence-cited Chinese HTML encyclopedia page covering origin, settings, propagation path, and sources, delivered as a local artifact."
user-invocable: true
x-xiaoba-capability-handle: "cap_efddf01fdaf54c5a830894bbf68d62a2"
x-xiaoba-transition-id: "transition-0df869f6-1121-41c2-829a-dbc3ea6b89c9"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1033.jsonl#turn-1:delivery:write_file, /home/xiaoba/app/logs/sessions/catscompany/2026-07-31/catscompany_cc_group_grp_1033.jsonl#episode-episode:1:4c28f452:settlement-2026-07-31T06:14:05.766Z"
---

# Create Briefing Encyclopedia HTML

## When to use
Use when the user provides a briefing (简报) about a subject such as a character and asks to turn it into an encyclopedia-style web page (e.g., "你把这个简报做成一个百科部署在云上吧"). Do not use for general article/report writing or arbitrary web page requests.

## Input requirements
- The briefing content must be available in the conversation or attached. If it is missing, ask the user to provide it rather than inventing content.
- Identify the subject (e.g., a character such as 酒狐) and the facts to cover: origin (出处), settings (设定), and propagation/traceability path (传播路径), plus the evidence sources cited in the briefing (e.g., mod project pages, videos, repositories).

## Steps
1. Read the briefing and extract the subject's origin, settings, and propagation path, keeping a separate list of the evidence sources cited.
2. Build one self-contained HTML file (`lang="zh-CN"`, UTF-8) with:
   - a meta description summarizing the page as an evidence-based encyclopedia entry (e.g., "酒狐角色出处、设定与传播路径的证据型百科条目。");
   - a title combining the subject name with the coverage, e.g. "酒狐百科｜出处、设定与传播溯源";
   - a responsive viewport meta and a paper-toned, readable design with a hero heading, lead text, and a decorative seal;
   - a table of contents linking to the page sections;
   - sections for 出处 (origin), 设定 (settings), and 传播路径 (propagation), each grounded in the briefing;
   - an evidence/sources section linking to the external sources named in the briefing (mod pages, video links, repositories);
   - a footer disclaimer that the page is a fan-culture source-tracing entry and not an official statement;
   - a back-to-top control for long pages.
3. Keep all substantive claims traceable to the briefing or the linked sources; do not add unsourced facts.
4. Deliver by writing the file to a working directory (e.g., `<working>/tmp/<subject>-encyclopedia/index.html`) with write_file and confirm the write result (success, path, line count, size).

## Deployment note
- The episode evidence supports only the local HTML artifact; it does not evidence any cloud upload or network publish. If the user asks for cloud deployment, do not claim publication unless a real deployment step (upload/publish/server configuration) is performed and verified in the current session with current authorization. Otherwise report the artifact as a local file and state that deployment was not performed.

## Boundaries
- Applies only to the task "turn a briefing into an encyclopedia-style HTML page"; do not extend to arbitrary articles, reports, or non-HTML deliverables.
- Do not apply while the user is still correcting or iterating on the same task.
- Do not reuse the episode's claimed URL (`http://183.56.225.22:19990/artifacts/winefox-encyclopedia/latest/`), version number, or desktop/mobile acceptance claim: none of these are verified by tool results.
- Do not assume cloud credentials, servers, or publishing permissions.

## Verification
- Confirm the write_file result reports success and record the path, line count, and size.
- Spot-check that the HTML contains the title, meta description, table of contents, subject sections, sources, footer disclaimer, and a functioning back-to-top control.
- Only if deployment was actually performed and verified may the response claim a published URL.
