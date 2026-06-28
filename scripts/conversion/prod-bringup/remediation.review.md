# Prod type/constraint remediation — REVIEW (human decision required)

_Generated: 2026-06-28T02:40:11.401Z. Source = LOCAL (canonical). Target = PROD (direct Postgres)._

These drifts are **NOT** in `remediation.generated.sql` because applying them could fail
on existing rows, lose data, or change intent. Decide each manually.

## Accepted for beta (no action, no remediation)

- `questions.word_count` default: prod `0` -> local `∅` — accepted for beta (kept).
- `questions.operation_type` default: prod `'ADDITION'::operation_type` -> local `∅` — accepted for beta (kept).
- `questions.num_operations` default: prod `1` -> local `∅` — accepted for beta (kept).
- `questions.representation` default: prod `'SYMBOLIC'::representation_kind` -> local `∅` — accepted for beta (kept).
- `responses.expected_time_sec` nullable: prod NULL -> local NOT NULL — accepted for beta (tightening deferred).
- `responses.time_ratio` nullable: prod NULL -> local NOT NULL — accepted for beta (tightening deferred).
- `responses.time_flag` default: prod `'NORMAL'::time_flag` -> local `∅` — accepted for beta (kept).
- `responses.time_flag_config_version` nullable: prod NULL -> local NOT NULL — accepted for beta (tightening deferred).
- `responses.used_fallback` nullable: prod NULL -> local NOT NULL — accepted for beta (tightening deferred).

## Lossy / narrowing / incompatible type casts

_None._

## Tighten NULL -> NOT NULL (backfill first)

_None._

## Default change / drop (new-row semantics)

_None._

## Prod-only objects (kept — additive, INFO)

- `questions` prod-only columns (kept): `time_expected_seconds`.
- `report_narrations` prod-only columns (kept): `misconceptions_lede`.

## Missing objects (use 06 catch-up, not 09 — INFO)

_None._
