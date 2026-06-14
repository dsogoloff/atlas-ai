-- Atlas Assessment — add the four L1 answer-input formats to question_format.
--
-- L1 input-wiring lane (lane/answer-input-wiring): the held L1 rows need
-- four answer-input types to WORK in the live player + server grading before
-- CONVERSION can activate them. This migration only widens the enum; it does
-- NOT activate any row and does NOT touch held-row data or the bare-is_active
-- guardrail (questions_held_rows_inactive stays valid).
--
--   * SELECT_MULTIPLE — tap N option targets; graded select-all / select-count.
--   * VISUAL_MATCHING  — pair left↔right items; graded match-pairs (binary).
--   * MULTI_BLANK      — fill a template of blanks; graded per-blank.
--   * EQUATION_SET     — N number sentences; graded set-equality / validity.
--
-- Content shapes + judging: src/lib/responseSubmit/correctness.ts and
-- src/lib/grading/grade.ts. Render-safe stripping: src/lib/questionPicker/
-- serialize.ts.
--
-- Postgres constraint: ALTER TYPE ... ADD VALUE may run inside a transaction
-- (PG >= 12) but the new value cannot be USED until that transaction commits.
-- Supabase runs each migration file in its own transaction, so the enum DDL
-- lives ALONE here; any data migration that USES these values must follow in
-- a later migration file.
--
-- AGENTS.md §11 note: enum DDL is schema, not tenant-scoped row data.
-- Migrations run on BOTH the production path and the dev `supabase db reset`
-- path (before seed.sql), so NO seed.sql mirror is needed for this file.

alter type question_format add value if not exists 'SELECT_MULTIPLE';
alter type question_format add value if not exists 'VISUAL_MATCHING';
alter type question_format add value if not exists 'MULTI_BLANK';
alter type question_format add value if not exists 'EQUATION_SET';
