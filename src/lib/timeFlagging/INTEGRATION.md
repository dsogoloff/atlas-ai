# `timeFlagging` integration contract

This document is for whoever builds the response-submit API and the
session-close logic. The library landed first (Path 1 of the v1 plan); the
integration is deferred. The contract below is what your code must do when
you call into `@/lib/timeFlagging`.

If a caller diverges from this contract, the divergence usually shows up as
silently-wrong telemetry, not as a crash. Read this once before wiring it up.

## Where this fits

```
[student answer]
   ↓
[response-submit API route]                  ← YOU
   ↓
  question row (DB)                           ← columns from Migration A1
   ↓
  flagResponseTime({...})                     ← @/lib/timeFlagging
   ↓
  responses INSERT (with 5 new columns)       ← Migration B
   ↓
[student finishes session]
   ↓
[session-close logic]                         ← YOU
   ↓
  SELECT * FROM responses WHERE session_id=… ← all 5 columns required
   ↓
  aggregateSessionFlags([…])                  ← @/lib/timeFlagging
   ↓
  toSessionSummaryJson(…)
   ↓
  UPDATE assessment_sessions SET
    session_time_flag, time_flag_summary      ← Migration B
```

The flagger never touches the database. It is pure deterministic
TypeScript. The caller (you) is responsible for reads, writes, and
transactional boundaries.

## Per-response: how to call `flagResponseTime`

When the student submits an answer:

```ts
import { flagResponseTime, type ItemNormTags } from "@/lib/timeFlagging";

// 1. Read the question row. All four norm columns are NOT NULL
//    (Migration A1), so a successful read produces a complete ItemNormTags.
const q = await db.from("questions")
  .select("id, level, format, word_count, operation_type, num_operations, representation")
  .eq("id", questionId)
  .single();

const tags: ItemNormTags = {
  word_count: q.word_count,
  operation_type: q.operation_type,
  num_operations: q.num_operations,
  representation: q.representation,
};

// 2. Compute the flag. Pure call — no I/O.
const flag = flagResponseTime({
  level: q.level,
  format: q.format,
  tags,
  timeMs: elapsedMs,           // milliseconds from question-served to answer-submitted
  // usedFallback omitted — production reads NOT NULL columns directly.
});

// 3. Persist. All five new columns on `responses` come from the FlagResult.
await db.from("responses").insert({
  tenant_id, session_id, question_id, answer_given, is_correct,
  time_taken_seconds: elapsedMs / 1000,        // numeric(10,3) per Migration B
  expected_time_sec: flag.expectedTimeSec,
  time_ratio: flag.timeRatio,
  time_flag: flag.flag,
  time_flag_config_version: flag.configVersion,
  used_fallback: flag.usedFallback,
  detected_misconceptions,                      // from your misconception detector
});
```

### What can throw

`flagResponseTime` (and `expectedTimeSec` underneath it) throws on:

- `tags.num_operations < 1`  — content authoring bug
- `tags.word_count < 0`      — content authoring bug
- a null `(operation_type × level)` cell in non-production  — pedagogically
  off-curriculum tag combination (e.g., ALGEBRA at KA). In production, the
  flagger error-logs and uses a high sentinel (60s) so the response visibly
  flags TOO_FAST instead of silently passing as NORMAL.

The first two should be caught at content-authoring time. The third
indicates an upstream tagging error — surface it to your error reporter.

### Do NOT use `withFallbackTags` from production

`withFallbackTags(partial)` is a non-production hatch. Migration A1 makes
the four tag columns NOT NULL, so a question row read always produces a
full `ItemNormTags`. If you find yourself reaching for `withFallbackTags`,
the bug is upstream — somewhere a tag wasn't supplied to the import script,
or you're constructing tags manually without using the row read. Fix the
upstream gap; don't paper over it.

`withFallbackTags` exists for tests, ETL probes, and manual tooling. It
fires `assertFallbackStillNeeded`, which throws in non-prod (so dev/CI
catches it loudly) and error-logs in prod (so live traffic doesn't crash
on a content-tagging error).

## At session close: how to call `aggregateSessionFlags`

When the session transitions to COMPLETED:

```ts
import {
  aggregateSessionFlags,
  toSessionSummaryJson,
  TIME_FLAG_CONFIG_VERSION,
  type FlagResult,
} from "@/lib/timeFlagging";

// 1. Read all responses for the session — include used_fallback so the
//    session summary's fallback_count / fallback_ratio are accurate.
const rows = await db.from("responses")
  .select("expected_time_sec, time_ratio, time_flag, time_flag_config_version, used_fallback")
  .eq("session_id", sessionId);

// 2. Reconstitute minimal FlagResult[] for the aggregator. Most fields
//    are unused at session level, but the function signature takes the
//    full shape — pass zeros / placeholders for unused fields. The five
//    fields the aggregator actually reads are flag, usedFallback, and
//    (transitively, via reconstitution from the row) the persisted ones.
const results: FlagResult[] = rows.map((r) => ({
  expectedTimeSec: r.expected_time_sec,
  actualTimeSec: 0,             // unused at session level
  timeRatio: r.time_ratio,
  flag: r.time_flag,
  configVersion: r.time_flag_config_version,
  components: { tRead: 0, tSolve: 0, tInput: 0 },   // unused
  usedFallback: r.used_fallback,
}));

// 3. Aggregate.
const summary = aggregateSessionFlags(results);

// 4. Persist as the snake_case JSONB shape.
await db.from("assessment_sessions").update({
  session_time_flag: summary.flag,
  time_flag_summary: toSessionSummaryJson(summary),
}).eq("id", sessionId);
```

### Reading the summary back

If a parent dashboard or instructor portal needs to display the rollup,
read it as `SessionSummaryJson` and convert back to camelCase with
`fromSessionSummaryJson`:

```ts
import { fromSessionSummaryJson, type SessionSummaryJson } from "@/lib/timeFlagging";

const session = await db.from("assessment_sessions")
  .select("time_flag_summary")
  .eq("id", sessionId)
  .single();

const summary = fromSessionSummaryJson(
  session.time_flag_summary as SessionSummaryJson,
);
// summary is SessionFlagResult — camelCase, ready to use in UI code.
```

## Things you must not do

1. **Do not adjust the placement score from time signals.** v1 hard rule
   per features.md §2. The engine reads `is_correct` only; flags caveat
   the parent report and feed misconception detection but never alter
   placement math.
2. **Do not store the synthetic config inline.** `TIME_FLAG_CONFIG_VERSION`
   is the single source of truth. Persist it on every response row from
   `FlagResult.configVersion` so historical responses stay re-analyzable
   when norms are recalibrated.
3. **Do not bypass the row read.** Even if you have the question's level
   and format from another source (e.g., the engine's NextQuestionRequest),
   read the four norm columns from the questions row at flag-time. Cached
   inputs go stale when items are re-tagged.
4. **Do not use `time_flag_summary` as queryable structure.** It's a
   JSONB blob for display + audit. If you need to query (e.g., "all
   sessions flagged unreliable"), use the `session_time_flag` column,
   which is indexable.
5. **Do not write the session summary mid-session.** Aggregate only at
   session close; intermediate aggregates would be misleading because the
   denominator is shifting.

## When to update this document

- Whenever a new field is added to `responses` or `assessment_sessions`
  via a migration.
- Whenever a new exported function is added to the timeFlagging module.
- Whenever the TIME_FLAG_CONFIG_VERSION bumps (note the version transition
  here so future readers can trace which calls produced which historical data).
  - `synthetic-v1.2026-05` → `synthetic-v1.2026-06`: TEXT_ENTRY (6s) added
    to `inputSecondsByFormat` for the QA Bucket 2 format reclassification.
    No values changed for the pre-existing formats, so rows flagged under
    2026-05 are numerically identical to what 2026-06 would have produced.

## Calibration handoff

When empirical norms are ready (≥200–300 responses per item), the swap is
single-line in the caller — pass the new config to `flagResponseTime` and
`aggregateSessionFlags` as the optional second argument. No other changes
needed; every persisted row already records the version it was scored
against.

```ts
import { EMPIRICAL_CONFIG } from "@/lib/timeFlagging/configs/empirical-2026-q3";
flagResponseTime(input, EMPIRICAL_CONFIG);
```
