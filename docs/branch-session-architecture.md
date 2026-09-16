# Branch Session Architecture

## Context lanes

XiaoBa currently has two model-visible transient context lanes:

- Text transient context: short system-like/user-like hints built by `TurnContextBuilder`.
  This includes runtime rules, runner hints, plan status, runtime feedback, and sub-agent status.
- Synthetic observation context: branch-produced results injected as a synthetic
  `runtime_observation` tool call/tool result pair.

Keep these lanes separate for now. They have different provider-shape requirements and
different lifecycles:

- Text transient context is turn-scoped guidance and is stripped from durable history.
- Synthetic observation context is queue-based, can be carried for one extra turn, and
  records injected/dropped lifecycle events.

The common boundary is semantic rather than physical: both are transient runtime context and
must not be treated as durable user input.

## Branch sessions

`BranchSession` owns the isolated agent loop mechanics:

- independent messages
- branch-local tools
- branch-local logs
- cancellation through an abort signal
- no durable write-back into the parent session transcript

`ObservationBranchSession<TFinishPayload>` is the reusable base for branches that publish
synthetic observations back to the parent runner. A concrete branch only needs to provide:

- initial system/user messages
- branch tools
- a finish tool that calls `complete(payload)`
- a disposition function that decides whether to inject or suppress
- a payload-to-`SyntheticObservation` formatter

`MemorySearchBranchSession` is the first concrete implementation. Future observation-producing
branches should extend `ObservationBranchSession` instead of reimplementing publish, suppress,
drop, and cancel bookkeeping.

## CatsLog retrieval receipts

When the memory branch fetches a Skill body through `catslog_skill_fetch`, CatsLog returns a
one-time `retrieval_receipt` bound to the exact Skill Version. Receipts are process-private:
they never enter tool results, model messages, synthetic observations, branch logs, or errors.
During the run they live only in the run-scoped `CatsLogReceiptLedger`. Each receipt leaves the
ledger exactly one way:

- consumed mid-run via `drainCatsLogReceipts()` (owner polling), or
- transferred once at run end to the `onRunEndReceipts` owner callback, which fires on every
  terminal path (finish, suppress, cancel, failure) before `done` resolves and before the
  ledger is cleared, or
- dropped (FIFO bound overflow, no consumer, or a consumer that throws — cleanup still runs).

A branch run whose ranked `catslog_skill_memory` query is metadata-only never mints receipts:
body delivery is exclusively the exact-fetch path, and a fetch response without a nonempty
receipt fails closed. This phase performs no outcome reporting: no `succeeded`/`failed`/
`corrected` verdict is derived anywhere, and the disposition only describes the branch run
itself, never the main agent's task result.

The production consumer of `onRunEndReceipts` is the process-private `CatsLogUseStageReporter`
(`src/utils/catslog-use-stage-reporter.ts`). Enqueue only maps the final private stages to the
wire vocabulary (`fetched` → `fetched_not_consumed`, `consumed` → `consumed_not_selected`,
`selected` → `selected`), copies, chunks (at most 8 per request, the server batch bound), and
returns; the network work runs strictly outside the branch. Chunks post once each, in order;
a failed chunk is dropped and counted (`failedChunkCount`), the pending queue is bounded
(`MAX_PENDING_USE_STAGE_REPORTS`, FIFO overflow counted), and logs carry only counts plus a
safe status/error class — never a receipt, token, body, or entry JSON. The reports are
non-voting use-stage telemetry on `POST /catsco/agent/memory/use-stages`; they never consume
a terminal outcome slot and never influence ranking, probation, publication, or suppression.
