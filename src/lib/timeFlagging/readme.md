# Response Time Flagging

Synthetic time norms for flagging suspicious response patterns in Atlas AI. **Used as a secondary signal — does not adjust scores in V1.**

## Approach

Per item, expected time is computed as:

```
T_expected = T_read + T_solve + T_input
```

Where:
- `T_read = word_count × seconds_per_word(half_grade)`
- `T_solve = base_solve_time(operation, half_grade) × num_operations × representation_multiplier`
- `T_input = input_format_seconds(input_format, half_grade)`

Then:
- `actual < 1.0s` → flag `invalid` (likely accidental tap / double-submit, not a real attempt — checked before ratio bands)
- `actual / expected < 0.4` → flag `too_fast` (likely guess / pattern-match)
- `actual / expected > 2.5` → flag `too_slow` (struggle / distraction / interruption)
- Otherwise → `normal`

Norms are derived from:
- **Hasbrouck & Tindal (2017)** silent reading fluency norms
- **AIMSweb / easyCBM** curriculum-based math computation fluency
- **Expert estimates** for Singapore Math representation costs (bar model, pictorial)

## Usage

```ts
import { flagResponseTime, ItemTags } from './time-flagging';

const tags: ItemTags = {
  half_grade: '3.0',
  word_count: 22,
  operation_type: 'multi_digit_add_sub_regroup',
  num_operations: 1,
  representation: 'word_problem_single',
  input_format: 'numeric_entry',
};

const result = flagResponseTime(tags, /* actual_time_sec */ 4.2);
// {
//   expected_time_sec: 24.7,
//   actual_time_sec: 4.2,
//   ratio: 0.17,
//   flag: 'too_fast',
//   components: { t_read: 11.0, t_solve: 11.7, t_input: 4.5 },
//   reason: 'Answered in 4.2s vs 24.7s expected (17%). Possible guess or pattern-match.'
// }
```

## Item authoring requirements

Every question in the bank must be tagged with all 6 fields in `ItemTags`. Add this to the question authoring spec — it's blocking for any item that should be subject to time analysis.

| Tag | Notes |
|---|---|
| `half_grade` | Target placement level, not the student's actual grade |
| `word_count` | Stem only — exclude answer choices |
| `operation_type` | Pick the *primary* operation; multi-step problems use the dominant one and bump `num_operations` |
| `num_operations` | Discrete operations the student must perform (≥1) |
| `representation` | `bar_model_required` only when student must construct/interpret |
| `input_format` | UI-determined |

## Supabase integration

Recommended additions to your `responses` table:

```sql
ALTER TABLE responses
  ADD COLUMN time_flag TEXT,                  -- 'invalid' | 'too_fast' | 'too_slow' | 'normal'
  ADD COLUMN expected_time_sec NUMERIC,
  ADD COLUMN time_ratio NUMERIC;

CREATE INDEX idx_responses_time_flag ON responses(time_flag) WHERE time_flag != 'normal';
```

Compute and store on each response submission. Aggregate at session close using `aggregateSessionFlags()`.

## Session-level aggregation

Single-item flags are noisy; don't surface them individually to parents. The `aggregateSessionFlags()` helper rolls them up:

- `pct_invalid ≥ 20%` → session flag `unreliable` → recommend re-take; **do not surface diagnostic results** (the data isn't trustworthy). Rushed/struggling are not computed in this case.
- `pct_too_fast ≥ 30%` (over valid items) → session flag `rushed` → caveat the diagnostic report ("the assessment was completed quickly; consider a re-take to confirm results")
- `pct_too_slow ≥ 25%` (over valid items) → session flag `struggling` → caveat differently ("your child engaged thoughtfully but found the material challenging — placement may underestimate ceiling")
- Both rushed and struggling thresholds met → `mixed` → recommend re-take

Note: rushed/struggling percentages are computed over **valid items only** (excluding sub-second responses). This way a single accidental tap doesn't dilute a 6-of-19 rushed pattern down to 6-of-20.

Thresholds (`20% / 30% / 25%`) are starting points. Revisit once you have ~50 sessions of empirical data.

## Versioning & swap-out

`DEFAULT_CONFIG` is the synthetic norm table. When you have ≥200–300 responses per item, replace it with empirical p25/p50/p75 by producing a new `TimeNormConfig` with `source: 'empirical'`. Same code path — no callsite changes.

```ts
import { flagResponseTime } from './time-flagging';
import { EMPIRICAL_CONFIG_V2 } from './configs/empirical-2026-q3';

flagResponseTime(tags, actualSec, EMPIRICAL_CONFIG_V2);
```

Store `version` on every response row so you can re-analyze under newer configs without losing audit trail.

## Calibration TODOs

In rough priority order for empirical refinement:

1. **`bar_model_required` multiplier (1.5)** — least-confident parameter; very specific to Singapore Math and not directly grounded in published norms. First candidate for empirical replacement.
2. **K-grade norms generally** — sparser research base; expect more drift from synthetic estimates.
3. **Tolerance bands (0.4× / 2.5×)** — verify against actual response distributions; the lognormal response-time literature suggests these will need to widen for high-difficulty items and tighten for fluency items.
4. **Multi-step word problem multiplier (1.85)** — likely too coarse; may need to split into 2-step vs 3+ step.
5. **Grade × operation interactions** — e.g., long division at grade 4.0 may have much higher variance than the point estimate suggests.

## What this does NOT do

- Does not adjust correctness scores (V1 design decision).
- Does not detect cheating, copying, or external help.
- Does not account for accessibility needs (extended time accommodations) — handle upstream by skipping flagging for flagged accounts.
- Does not handle items with no operation (pure recall, definitions) — extend `OperationType` if needed.
