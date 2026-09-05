# Conformance cases

Nine cases that any implementation reading x402 delivery declarations should agree on. They are data, not code: `cases.json` states an input and the properties an implementation must derive from it.

    node conformance/run.js

To test your own implementation, replace the two adapter functions at the top of `run.js`. Everything else is fixed — the cases decide what passes, not the runner.

## What they pin down

**Units convert, and they convert the same way everywhere.** Milliseconds, hours and minutes all resolve to seconds, rounded to the nearest second, whether an exact adapter or a heuristic read the field. This case exists because it caught a real disagreement: one adapter returned 1141 and the heuristic 1140.535 for the same input.

**Absence is information.** A body with nothing recognisable yields nulls and `basis: none`, not zeros. An implementation that fills in a default has invented a declaration the provider never made.

**Inference is never presented as declaration.** A value derived from a field name carries `basis: heuristic`. Anything acting on a verdict — a settlement layer, a contract — should treat that as a signal to verify, not as truth.

**A unit is only inferred from a recognisable suffix.** `elapsed_ms` resolves; `elapsed` does not. Guessing the unit is worse than returning nothing.

**Fault attribution is a two-sided question.** A provider that breaks what it declared is at fault. A provider that delivered exactly what it declared, to a caller whose policy was stricter, is not. Only the first justifies not charging, so the distinction has to survive normalisation.

**Normalisation is not lossy.** The original body survives in `_raw`.

## What they do not cover

Payment flow, settlement semantics, signing, or the schema of the declaration itself. These cases only cover reading what a provider emits and deciding whether it is usable.

## Adding cases

A case is worth adding when two reasonable implementations could disagree. Pull requests welcome; each case carries a `why` explaining what would go wrong without it.
