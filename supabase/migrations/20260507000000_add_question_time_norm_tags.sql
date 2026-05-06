-- Atlas Assessment — add time-flagging norm tags to questions.
--
-- Source-of-truth references:
--   features.md §1, §2 — the four blocking norm tags
--   src/lib/timeFlagging/norms.ts — Postgres enum values mirror the TS types
--
-- Adds the four norm tags as NOT NULL columns with temporary defaults
-- during ALTER (so any existing rows satisfy the constraint), then
-- immediately drops the defaults so future inserts must supply values
-- explicitly. Per features.md §2 these are blocking — items missing
-- any of them cannot be served by the engine.

-- =============================================================================
-- Enums (mirror src/lib/timeFlagging/types.ts exactly)
-- =============================================================================

create type operation_type as enum (
  'ADDITION',
  'SUBTRACTION',
  'MULTIPLICATION',
  'DIVISION',
  'FRACTION_OP',
  'DECIMAL_OP',
  'PERCENT_OP',
  'GEOMETRY',
  'MEASUREMENT',
  'PATTERN',
  'ALGEBRA',
  'COUNTING',
  'IDENTIFY'
);

create type representation_kind as enum (
  'SYMBOLIC',
  'PICTORIAL',
  'BAR_MODEL_REQUIRED',
  'WORD_PROBLEM_SINGLE',
  'WORD_PROBLEM_MULTI'
);

-- =============================================================================
-- questions — add four norm tags as NOT NULL with transient defaults.
-- =============================================================================

alter table questions
  add column word_count       integer             not null default 0,
  add column operation_type   operation_type      not null default 'ADDITION',
  add column num_operations   smallint            not null default 1,
  add column representation   representation_kind not null default 'SYMBOLIC';

-- Drop the defaults so future INSERTs must supply values explicitly.
alter table questions
  alter column word_count       drop default,
  alter column operation_type   drop default,
  alter column num_operations   drop default,
  alter column representation   drop default;

-- =============================================================================
-- Constraints (range invariants enforced at the DB layer per features.md §1).
-- =============================================================================

alter table questions
  add constraint questions_num_operations_chk check (num_operations >= 1),
  add constraint questions_word_count_chk     check (word_count >= 0);
