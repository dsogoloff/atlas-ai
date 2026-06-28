# Prod type/constraint remediation — REVIEW (human decision required)

_Generated: 2026-06-28T01:57:35.640Z. Source = LOCAL (canonical). Target = PROD (direct Postgres)._

These drifts are **NOT** in `remediation.generated.sql` because applying them could fail
on existing rows, lose data, or change intent. Decide each manually.

## Lossy / narrowing / incompatible type casts

- `responses.time_taken_seconds`: prod `numeric` -> local `numeric(10,3)` — **NARROW** cast (lossy/uncertain); decide manually.

## Tighten NULL -> NOT NULL (backfill first)

- `responses.expected_time_sec`: prod NULLABLE -> local NOT NULL — **backfill nulls first**, then `ALTER COLUMN expected_time_sec SET NOT NULL`.
- `responses.time_ratio`: prod NULLABLE -> local NOT NULL — **backfill nulls first**, then `ALTER COLUMN time_ratio SET NOT NULL`.
- `responses.time_flag_config_version`: prod NULLABLE -> local NOT NULL — **backfill nulls first**, then `ALTER COLUMN time_flag_config_version SET NOT NULL`.
- `responses.used_fallback`: prod NULLABLE -> local NOT NULL — **backfill nulls first**, then `ALTER COLUMN used_fallback SET NOT NULL`.

## Default change / drop (new-row semantics)

- `questions.word_count`: prod has default `0`, local has none — kept (additive). Drop manually only if intended.
- `questions.operation_type`: prod has default `'ADDITION'::operation_type`, local has none — kept (additive). Drop manually only if intended.
- `questions.num_operations`: prod has default `1`, local has none — kept (additive). Drop manually only if intended.
- `questions.representation`: prod has default `'SYMBOLIC'::representation_kind`, local has none — kept (additive). Drop manually only if intended.
- `responses.time_flag`: prod has default `'NORMAL'::time_flag`, local has none — kept (additive). Drop manually only if intended.

## Prod-only objects (kept — additive, INFO)

- `questions` prod-only columns (kept): `time_expected_seconds`.
- `report_narrations` prod-only columns (kept): `misconceptions_lede`.

## Missing objects (use 06 catch-up, not 09 — INFO)

_None._
