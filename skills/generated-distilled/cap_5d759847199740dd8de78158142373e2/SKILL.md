---
name: "draft-cli-agent-customer-reply"
description: "Draft a reply to a customer who is considering the company's CLI agent: express interest first, propose a demo, avoid committing to job substitution, and suggest validating the agent in a clear, high-repetition workflow before defining an entry point."
user-invocable: true
x-xiaoba-capability-handle: "cap_5d759847199740dd8de78158142373e2"
x-xiaoba-transition-id: "transition-cdcf10c4-eaf7-404d-b07b-34842ae28c09"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1363.jsonl#turn-1:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-06/catscompany_cc_group_grp_1363.jsonl#episode-episode:1:127cb282:settlement-2026-08-06T12:05:58.952Z"
---

# Draft CLI Agent Customer Reply

## Purpose
Draft a reply for a customer who previously discussed and is now considering the company's CLI agent product, when the user (e.g., a sales or customer-success colleague) asks for help with the reply wording.

## When to use
- The user asks for help drafting a reply ("帮我看看怎么回复") to a customer who is considering the company's CLI agent.
- The user has shared conversation context for that customer (e.g., a screenshot of the prior chat) and wants suggested wording.

## Guidance
When drafting the reply:

1. **Express interest first** — acknowledge the customer's consideration positively rather than leading with caveats.
2. **Propose a demo** — invite the customer to demonstrate the existing capabilities and cases, and set up a joint session.
3. **Do not commit to job substitution** — avoid promising the agent will replace jobs or headcount.
4. **Propose a validation entry point** — suggest picking a clear-process, high-repetition scenario to validate CLI Agent landing before jointly defining the entry point.

Reference wording observed in evidence (adapt to the actual conversation):

> 最近我们正好在看 CLI Agent 的落地。想先找一个流程清晰、重复度高的场景做验证。你们方便时演示下现有能力和案例，我们再一起定切入点。

## Boundaries
- Applies only to reply drafting for customers considering the company's CLI agent. Do not extend to general sales/marketing copywriting, other products, or internal product-policy decisions.
- Do not claim the reply was accepted or effective — the evidence records only the absence of contradiction at settlement, with no explicit user acceptance.
- If a screenshot attachment is provided, read it via the path given at execution time; never embed a past episode's absolute file path as a fixed constant.
- Only apply when the new task matches this capability; do not reuse the pattern while the user is correcting or iterating on the task.
- Derived from a single completed turn; treat the guidance as narrow and verify the reply against the customer's actual conversation context before sending.
