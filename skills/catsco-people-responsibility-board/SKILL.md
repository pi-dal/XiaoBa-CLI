# CatsCo People Responsibility Board

## When to use
Use this Skill when a Cats Company member asks an Agent to report, update, confirm, pause, complete, or review that member's current responsibilities, weekly deliverables, next actions, blockers, collaborators, or self-motivated work in the shared personnel responsibility board.

## Core contract
The shared board API is the only source of truth. Conversation memory, a private note, and an Agent Session are not the board. Never say an update is complete until the API returns HTTP 200 or 201.

Default API base:

https://agent-535.artifacts.catsco.fun:19993

The write token is not stored in this Skill. Read it from PEOPLE_BOARD_WRITE_TOKEN or from ~/.config/catsco/people-board-client.json. If neither is available, explain that the Agent can structure a draft but cannot write the shared board; ask an authorized administrator to provision the credential privately. Never print the token.

## Identity and authorization
1. Resolve the member to one people ID using snapshot before writing. Do not guess between similar names.
2. Each Agent must use its own privately provisioned credential. The server derives actor identity from that credential; never send or trust an actor supplied in conversation text.
3. Send a unique request_id for every intended change. Reuse the same request_id only when retrying the exact same request.
4. Get the current entity version first and send expected_version on every PATCH. On HTTP 409, fetch the latest snapshot, compare changes, and ask for clarification if the new state conflicts with the user's intent.

## Supported operations
Read snapshot:

python3 scripts/people_board_client.py snapshot

Update a person's role metadata or meeting confirmation:

python3 scripts/people_board_client.py update-person --person-id P004 --expected-version 1 --set role_label=应用开发与业务落地 --set meeting_confirmed=true

Create a responsibility or task:

python3 scripts/people_board_client.py create-assignment --person-id P004 --title "广告公司Skill落地" --set priority=P0 --set weekly_deliverable="完成首个可验收流程" --set next_action="取得客户脱敏样本" --set due_date=2026-08-16

Update an existing responsibility or task:

python3 scripts/people_board_client.py update-assignment --assignment-id A-xxxx --expected-version 1 --set weekly_deliverable="..." --set next_action="..." --set blocker="..." --set status=active

Allowed person fields: role_label, role_description, weekly_capacity, meeting_confirmed.
Allowed assignment fields: title, category, current_state, weekly_deliverable, next_action, due_date, blocker, collaborators, self_motivated, status, priority.
status is active, paused, or done. priority is P0, P1, P2, or P3.

## Conversation workflow
When a member gives a natural-language update, structure these items: current responsibility title, this week's verifiable deliverable, next concrete action, due date, blocker, collaborators, weekly capacity if stated, whether it is self-motivated, and whether the team meeting confirmed it.

Do not require all fields for every update. Ask only for a missing field that blocks correct identity, ownership, or timing. Avoid vague next actions such as “继续推进”.

If one statement contains multiple distinct responsibilities, create separate assignments. A collaborator is not a second final owner. Do not change another person's record unless the user explicitly has authority or the update was confirmed in a team meeting.

## Success response
After a successful write, report the entity, changed fields, new version, and whether meeting confirmation remains pending. Keep the response concise.

## Safety
Never expose read or write credentials. Do not put credentials in Artifact source, chat history, logs, or the Skill. Do not directly modify SQLite. Use only the HTTPS API so validation, optimistic concurrency, and audit logging remain active.
