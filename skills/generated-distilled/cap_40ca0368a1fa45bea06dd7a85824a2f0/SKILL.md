---
name: "publish-random-idea-station"
description: "Complete the publish of the Random Idea Station (随机灵感站) web artifact when the user confirms to run the task to completion, and return its openable latest URL."
user-invocable: true
x-xiaoba-capability-handle: "cap_40ca0368a1fa45bea06dd7a85824a2f0"
x-xiaoba-transition-id: "transition-8a3d6678-de97-4deb-82ec-a540d5cce5e2"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1346.jsonl#turn-2:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1346.jsonl#episode-episode:2:d5ab0c8f:settlement-2026-08-06T08:24:25.864Z"
---

# Publish Random Idea Station Web Artifact

## When to use
Use this skill when the user confirms that the Random Idea Station (随机灵感站) web artifact is ready and asks to run the task to completion / finish publishing it (e.g., "现在可以了，你跑完" — "It's OK now, run it to completion"). It covers the transferable operation of completing the publish of that artifact and returning its openable URL, not any broader web-deployment workflow.

## Steps
1. Confirm the request is to finish/publish the Random Idea Station web artifact, not to keep iterating or correcting it.
2. Complete the publish/deployment of the artifact (observed as version v1 in the evidence episode) using the deployment environment currently available in the session.
3. Return the openable "latest" URL for the published artifact. Observed example:
   `https://agent-535.artifacts.catsco.fun:19991/artifacts/random-idea-station/latest/`
   At execution time, confirm the current artifact location and version rather than hard-coding the observed URL.

## Boundaries
- Applies only to publishing the Random Idea Station (随机灵感站) web artifact. Do not generalize this single-episode pattern to arbitrary web deployments or other artifacts.
- Do not reuse this pattern while the user is still correcting or iterating on the task.
- Use only the deployment environment, authorization, and login state present in the current session. Do not assume credentials, external accounts, or side effects beyond what is available.
- Evidence is one completed turn; keep expectations of versioning, hosting, and URL shape limited to what the session actually shows.
