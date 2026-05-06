# `timeFlagging` — response-time flagging

Implements **features.md §2 — Response Time Flagging**.

## Hard rule

Time is a **secondary signal**. v1 NEVER adjusts the placement score from time. The flagger produces:

- **Per-response flags** — `INVALID | TOO_FAST | TOO_SLOW | NORMAL`
- **Session-level rollup** — `unreliable | rushed | struggling | mixed | normal`

Both caveat the parent report and feed misconception detection. Score-as-fluency is **Phase 2** (features.md "Fluency Analysis"), out of scope here.

## Module layout

| File | Purpose |
|---|---|
| `types.ts` | Shape types + schema-aligned enums (`TimeFlag`, `SessionTimeFlag`, `OperationType`, `RepresentationKind`, `ItemNormTags`, `FlagInput`, `FlagResult`, `SessionFlagResult`, `SessionSummaryJson`) |
| `norms.ts` | `TimeFlagConfig` shape + synthetic `DEFAULT_CONFIG` covering K-8 + `DEFAULT_FALLBACK_TAGS` + `TIME_FLAG_CONFIG_VERSION` |
| `flagger.ts` | Pure functions: `expectedTimeSec`, `flagResponseTime`, `aggregateSessionFlags` |
| `serialization.ts` | Boundary translation: `withFallbackTags`, `assertFallbackStillNeeded`, `toSessionSummaryJson`, `fromSessionSummaryJson` |
| `index.ts` | Public barrel |
| `INTEGRATION.md` | Contract for the response-submit caller (read this if you're wiring the flagger into an API route) |

## Public API at a glance

```ts
import {
  flagResponseTime,
  aggregateSessionFlags,
  expectedTimeSec,
  toSessionSummaryJson,
  fromSessionSummaryJson,
  withFallbackTags,
  DEFAULT_CONFIG,
  TIME_FLAG_CONFIG_VERSION,
  type FlagInput,
  type FlagResult,
  type SessionFlagResult,
  type ItemNormTags,
} from "@/lib/timeFlagging";
```

For end-to-end call shapes (per-response + session-close + how to persist into Postgres), see **`INTEGRATION.md`** in this directory.

## The expected-time formula

```
T_expected = T_read + T_solve + T_input

T_read  = (word_count / (oralWcpm[level] × silentReadingMultiplier)) × 60
T_solve = secondsPerOperation[op_type][level] × num_operations × representation_multiplier
T_input = inputSecondsByFormat[format]
```

Reading rates are stored as Hasbrouck & Tindal (2017) **oral** WCPM; the flagger applies `silentReadingMultiplier` (default 1.3) to convert to silent-reading rate. Word-problem reading is silent in normal use, so converting at flag-time keeps the source values traceable to H&T.

`(op × level)` cells may be `null` to mark off-curriculum combinations (e.g. `ALGEBRA` at `KA`). Hitting a null cell throws in non-production and error-logs in production with a high sentinel — designed to surface content-tagging errors instead of silently producing a normal-looking expected time.

## Schema dependencies

- **Migration `20260507000000`** — adds the four NOT NULL norm-tag columns to `questions` (`word_count`, `operation_type`, `num_operations`, `representation`).
- **Migration `20260507000100`** — drops the unused `questions.time_expected_seconds`.
- **Migration `20260507000200`** — adds `expected_time_sec`, `time_ratio`, `time_flag`, `time_flag_config_version`, `used_fallback` to `responses` (all NOT NULL); type-widens `responses.time_taken_seconds` to `numeric(10,3)` for sub-second precision; adds `session_time_flag` + `time_flag_summary` to `assessment_sessions`.

## Calibration plan

`DEFAULT_CONFIG` is **synthetic**:

- Reading WCPM grounded in Hasbrouck & Tindal (2017)
- Per-operation seconds approximated from AIMSweb / easyCBM medians (K-5) and NAEP grade-level proficiency curves (6-8)
- Bar-model + Singapore-Math representation multipliers expert-estimated

Recalibration priority (once ≥200–300 responses per item):

1. `BAR_MODEL_REQUIRED` multiplier — least-confident parameter
2. Grades 6A–8B per-operation seconds — extrapolated, not measured
3. `silentReadingMultiplier` — default 1.3, conservative end of research range
4. Per-response thresholds (0.4× / 2.5×) — verify against actual response distributions

To swap in empirical norms: build a same-shape `TimeFlagConfig`, bump `version` (e.g. `"empirical-v1.2026-Q3"`), pass it as the optional `config` argument. Every response row stores the `time_flag_config_version` it was scored against, so historical responses can be re-analyzed under newer norms without losing audit trail. See **`compliance.md` §12** for the version-on-row audit policy.

## Escape hatch — `withFallbackTags` and `DEFAULT_FALLBACK_TAGS`

Production reads NOT NULL columns from `questions` and constructs `ItemNormTags` directly — no fallback. The fallback path exists for tests, ETL probes, and manual tooling that flag without DB-backed tags.

`withFallbackTags(partial)` fills missing fields from `DEFAULT_FALLBACK_TAGS` and fires `assertFallbackStillNeeded` (throws in non-prod, error-logs in prod). The mechanism self-decommissions: when content authoring is fully enforced upstream and the assert no longer fires anywhere, delete `withFallbackTags` and `DEFAULT_FALLBACK_TAGS`. Grep for `REMOVE-WHEN-TAGS-LAND`.

## Accessibility

Extended-time accommodations are **not** wired in v1. They must be handled upstream by skipping flagging for accommodated accounts. Schema for accommodations TBD; until then, flagging is universal.

## What this module is NOT

- Not a placement decision input. The IRT/Bayesian engine reads `is_correct` only; flags don't enter placement math. Phase 2's "Fluency Analysis" feature changes that.
- Not an LLM caller. Per `architecture.md` decision #3, the flagger is pure deterministic TypeScript.
- Not a cheating detector. It identifies suspicious *patterns* (rushed, struggling, accidental tap) but cannot identify *external help* or *answer-sharing*.
