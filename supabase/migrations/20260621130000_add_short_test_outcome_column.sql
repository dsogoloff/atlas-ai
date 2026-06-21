-- Atlas Assessment — Picker Calibration PR1: persist the short-test outcome as
-- the single hand-off surface the comprehensive picker reads.
--
-- On short-test completion the engine computes a ShortTestOutcome (measured_level,
-- intake_level, pass_band, clean_pass_ratio, per-strand correct/seen map, and the
-- served item ids). The comprehensive picker (PR2/PR3) reads the child's most
-- recent completed short session's outcome to anchor on the MEASURED level and
-- weight its draw, and to subtract already-seen items.
--
-- Shape is owned by src/lib/shortTest/outcome.ts (ShortTestOutcome). Nullable:
-- comprehensive-first sessions, in-progress sessions, and legacy short sessions
-- have none (the picker falls back to the grade-derived intake level).
--
-- General schema column (NOT tenant-scoped); written at runtime on session close,
-- never seeded — the column DDL needs NO seed.sql mirror. Runs on BOTH the prod
-- path and the dev `supabase db reset` path (before seed.sql).

alter table assessment_sessions
  add column if not exists short_test_outcome jsonb;
