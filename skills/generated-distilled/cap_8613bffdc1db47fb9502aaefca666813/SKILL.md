---
name: "market-opportunity-agentic-validation"
description: "Follow-up guidance for market opportunity analysis: treat crawler output (company names/signals) as discovery only, run agentic per-company deep search with multi-source cross-validation to build a decision-support package (contacts, trigger events, pain-point hypotheses, demo plans, pricing conditions, counterevidence, unknowns), and only afterwards stabilize reproducible steps into a pipeline while keeping judgmental steps with agent and human review."
user-invocable: true
x-xiaoba-capability-handle: "cap_8613bffdc1db47fb9502aaefca666813"
x-xiaoba-transition-id: "transition-1481d86a-fdf5-4a38-8a97-cb17711d14fd"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1317.jsonl#turn-1:user-intent, /home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1317.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-09/catscompany_cc_group_grp_1317.jsonl#episode-episode:1:2335f440:settlement-2026-08-09T09:08:03.318Z"
---

# Market Opportunity Agentic Validation

## Purpose
Guidance for following up on market opportunity analysis when the available input is a crawler/scraper layer's output (company names and signals). The crawl layer only **discovers** companies and signals; a scraped company name must not be treated as a validated opportunity by itself. Follow-up work is agentic: per-company deep search with multi-source cross-validation to build a decision-support package, and only afterwards a retrospective review of which steps can be stabilized into a pipeline.

## When to Use (Trigger)
- The user has market-opportunity crawl output (company names plus signals) and asks what the follow-up analysis should be or how to proceed.
- The user asks whether agentic deep search and multi-source cross-validation should come after the scrape, and which parts can later be fixed into a pipeline.

## Do Not Use When
- The user is still correcting or iterating on this task; apply the pattern only once the task has settled without contradiction.
- The input is not scraped company leads/signals for market opportunity analysis (e.g., arbitrary articles, transcripts, or unrelated domain analysis).

## Guidance
1. **Treat crawl output as discovery only.** Company names and signals from the crawler are candidates for investigation, not confirmed opportunities.
2. **Run agentic per-company deep search with multi-source cross-validation.** For each company of interest, search beyond the single source and cross-check claims across multiple sources.
3. **Build a decision-support package per company** that records: contacts, trigger events, pain-point hypotheses, demo plan angles, pricing conditions, counterevidence, and explicit unknowns. Distinguish what is confirmed, what is assumed, and what is unknown.
4. **Only afterwards review the trajectory.** After the decision package has been run through repeatedly with real companies, look back at the search and analysis steps.
5. **Solidify only what is stable and reproducible** into the pipeline. Keep highly judgmental steps with the agent and human review rather than automating them.

## Boundaries and Evidence Basis
- This guidance derives from a single completed episode and may not generalize beyond scraped company leads used for market opportunity analysis.
- It implies no external access, credentials, or permissions; it applies to crawl output already provided by the user.
- Do not embed or reproduce raw log paths, file ranges, or unredacted chat content from the source session in downstream artifacts.
