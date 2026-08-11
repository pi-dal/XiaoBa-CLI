---
name: "specific-company-scenario-mockup"
description: "Deeply analyze one specific company, mock its scenario and possible needs, map its information silos and systems, preset AI integration, and produce a mock sample of daily post-integration outcomes for interviewing similar enterprises."
user-invocable: true
x-xiaoba-capability-handle: "cap_621edac0984b42b4a8efc1b5595e17b1"
x-xiaoba-transition-id: "transition-46d56f31-023e-436c-9ab2-e16b0941d693"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1256.jsonl#turn-9:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1256.jsonl#turn-9:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-03/catscompany_cc_group_grp_1256.jsonl#episode-episode:10:0656a3e1:settlement-2026-08-03T18:48:16.932Z"
---

# Specific-Company Scenario Mockup

## When to use
Use when the user proposes (or asks for) a deep analysis of one specific company in order to mock its scenario and possible needs, map its information silos and systems, and preset AI integration to connect them — especially when this is presented as an alternative to building a generic platform first. The input is bounded to a single, named company scenario; do not stretch it to arbitrary market or platform analysis.

## Approach
1. **Anchor on one typical small enterprise** the user names (or asks to choose). Treat the scope as a single-company deep dive, not a platform build.
2. **Dig into the real processes and information silos** of that company: how work flows today and where data/systems are disconnected.
3. **Mock the scenario and possible needs** — reconstruct the company's concrete situation, likely requirements, and the siloed information and systems involved.
4. **Preset the AI integration** that connects the silos. Treat the self-iterating system strictly as the mechanism that lowers access and delivery cost — it does not lead the product narrative.
5. **Produce a mock sample of "what results can be delivered each day after integration"** (daily deliverable outcomes), as the concrete artifact of the analysis.
6. **Use that sample to interview similar enterprises** for validation, instead of building a generic platform first.

## Decision rules
- When the user frames the work as company-scenario mocking ("deeply analyze one company, mock its scenario and needs, map silos, preset AI integration"), prefer one deep, concrete company sample over a general-purpose platform.
- Scope self-iteration to reducing access and delivery cost only; keep product narrative anchored on the specific company's mocked scenario and daily outcomes.

## Boundaries
- Applies only when the task matches this single-company scenario-mockup intent. Do not extend to generic platform architecture, broad market analysis, or unrelated consulting deliverables.
- Do not reuse this pattern while the user is correcting or iterating on the same task.
- Derived from one completed conversation turn; confirm with the user before applying it to materially different contexts.
