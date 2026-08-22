-- Atlas Assessment — drop two columns that were already dead and never got dropped.
--
-- WHAT HAPPENED
-- -------------
-- 20260507000100_drop_question_time_expected_seconds.sql and
-- 20260526000000_replace_misconceptions_lede_with_key_findings.sql both drop a column —
-- but a `supabase db reset` replays the FULL migration history in order, including these
-- two, so the LOCAL canonical schema has never had either column since the day those
-- migrations landed. Production, hand-applied per-migration via Studio (there is no CI
-- migration ledger, per CLAUDE.md), evidently never had these two specific DROP COLUMN
-- statements applied — the columns just sat there. A full prod-vs-migrations sweep
-- (2026-08-21, read-only, driven by scripts/conversion/prod-bringup/07-verify-prod-schema.ts's
-- existence-check extension) found them as the only two leftovers out of everything the
-- 91 migration files add or remove.
--
-- Confirmed via `grep -rn` across src/ and supabase/database.types.ts (generated from the
-- canonical schema, so it already excludes both): zero references to either column
-- anywhere in application code. Nothing reads or writes them. This was already the
-- documented conclusion of the 2026-06-27 prod-bringup analysis
-- (scripts/conversion/prod-bringup/catchup.review.md, remediation.review.md), which
-- listed both as "PROD-only columns (kept) — additive, INFO" and deliberately did not
-- drop them at the time. This migration reverses that additive-for-now call now that
-- their non-use has been reconfirmed against a live prod sweep, not just local intent.
--
-- LOW PRIORITY. Dead weight, not a bug — nothing in this migration is urgent or blocking.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Destructive but inert: both columns are already unread/unwritten by every code path,
-- confirmed above. Re-runnable (IF EXISTS).
--
-- ROLLBACK
-- --------
--   alter table questions add column time_expected_seconds integer;
--   alter table report_narrations add column misconceptions_lede text;
-- (Rollback restores the columns as empty/NULL — their original values, if any ever
-- existed in prod, are not recoverable from this migration alone.)

alter table questions
  drop column if exists time_expected_seconds;

alter table report_narrations
  drop column if exists misconceptions_lede;
