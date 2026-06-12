-- Atlas Assessment — one response per served question (race-safe idempotency).
--
-- Source-of-truth references:
--   External security audit Lane 2 (2026-06-12): the response-submit path
--     (src/lib/responseSubmit/handler.ts) guards duplicate submits with a
--     pre-insert existence SELECT on (session_id, question_id). Two truly
--     concurrent submits for the same (session, question) can both pass that
--     SELECT before either INSERTs, producing two `responses` rows that replay
--     into a double-counted answer and corrupt the placement estimate. The
--     application gate is necessary but not sufficient on its own; the database
--     must be the final arbiter.
--
-- This constraint makes (session_id, question_id) unique, so a concurrent
-- second INSERT fails with SQLSTATE 23505 instead of landing a duplicate row.
-- The handler detects 23505 and returns the SAME deterministic wire response
-- the first (winning) submit produced — idempotent on the wire, exactly one
-- persisted response per served question.
--
-- DDL ONLY — no tenant-scoped rows. Per the repo's AGENTS.md seed-mirror
-- convention (a `with t as (select id from tenants ...) insert ...` row
-- migration is a no-op during `supabase db reset` and must be mirrored into
-- supabase/seed.sql), a seed.sql mirror is required only for tenant-scoped
-- DATA inserts. This migration adds no rows, so NO seed.sql mirror is needed.
-- The constraint reflects an invariant the existing seed data already
-- satisfies (verified Lane 2: supabase/seed.sql inserts zero `responses` rows;
-- supabase/dev-seed-instructor-pilot.sql inserts 11 responses for a single
-- session, each against a distinct external_id-resolved question_id), so
-- `supabase db reset` does not fail on it.
--
-- A UNIQUE constraint reflects columns-as-keys, not new columns, so it does
-- NOT change the generated src/lib/supabase/database.types.ts.

alter table responses
  add constraint responses_session_question_unique
  unique (session_id, question_id);
