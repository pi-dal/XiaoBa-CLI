---
name: "employee-profit-sharing-bonus-structure"
description: "Structure an employee profit-sharing bonus pool for a short-horizon cash-harvesting business where employees are not shareholders: classify the payout as profit-sharing bonus rather than dividend, compute distributable cash after taxes, direct costs, liabilities, and six-month operating/risk reserves, and split payment 70% current / 30% year-end."
user-invocable: true
x-xiaoba-capability-handle: "cap_0594762614ce4a6f962b06e345d79946"
x-xiaoba-transition-id: "transition-7b9b2e9e-119e-44b1-9648-45603ab3833a"
x-xiaoba-evidence-refs: "/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-6:assistant-response, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#episode-episode:8:9834c8a6:settlement-2026-08-04T02:52:39.225Z, /home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-6:user-intent"
---

# Employee Profit-Sharing Bonus Structure

## What this capability is
For a company treated as a short-horizon (e.g., half-year) cash-harvesting business where employees are not shareholders, structure the employee incentive payout as a **profit-sharing bonus (利润分享奖金)** — not a dividend (分红) — computed from a defined distributable-cash formula and paid in a 70/30 current/year-end split.

## When to use
Apply when the user's scenario includes:
- The company is defined as a short-window "cash harvest": a sale is not certain, and the business likely will not run long-term.
- Employees are not shareholders; any planned equity (e.g., 15%) is initially excluded from the payout basis.
- Free cash flow generated in the window (projecting only the next six months' operating costs, with no long-term investment) is intended to fund the full personnel incentive/bonus pool.
- The shareholder expects to recover their desired value at a future internal sale regardless of whether the sale succeeds.

## Decision rules
1. **Frame the window**: Treat the company as a half-year cash-harvesting business. The eventual sale is shareholder-side upside only and must not become a condition for employee payout.
2. **Bonus, not dividend**: Employees receive profit-sharing bonus, not dividends. Even if the user calls the pool "分红" (dividend / distributable part), reclassify it as a bonus pool rather than a dividend.
3. **Distributable cash formula**:
   `distributable cash = actual collections − taxes − direct costs − liabilities − next-six-months operating reserve − risk reserve`
4. **Timing split**: Pay 70% in the current period and settle 30% at year-end, so that collection, refund, and cost volatility are absorbed before the final settlement.

## Boundaries
- Covers structuring the employee bonus pool only. Do not extend to shareholder dividend policy, equity/option terms, long-term compensation design, or sale-conditioned payouts.
- The formula line items and the 70/30 split come from the single settled episode; confirm or re-derive amounts with the user for a new case.
- Keep responses scoped to the stated scenario; do not generalize to other company, incentive, or payout contexts without additional evidence.

## Evidence
- Completion: `/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-6:assistant-response`
- Settlement: `/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#episode-episode:8:9834c8a6:settlement-2026-08-04T02:52:39.225Z`
- User intent: `/home/xiaoba/app/logs/sessions/catscompany/2026-08-04/catscompany_cc_group_grp_1256.jsonl#turn-6:user-intent`
