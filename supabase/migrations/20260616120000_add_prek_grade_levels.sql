-- Atlas Assessment — add the three S.A.M. pre-Kindergarten levels to
-- half_grade_level (lane/l0-authoring).
--
-- S.A.M. Levels 0A/0B/0C are age-related pre-K grades (founder-confirmed
-- 2026-06-15): 0A = age 3 (Nursery 3), 0B = age 4 (pre-K), 0C = age 5 (K).
-- They must be KEPT DISTINCT (not collapsed into KA/KB as the 2026-06-11
-- full-library pipeline run did). half_grade_level previously started at KA,
-- so the L0 booklets had nowhere faithful to band. This migration widens the
-- enum with 0A < 0B < 0C, inserted BEFORE 'KA' so the placement axis stays
-- monotonic (pre-K below Kindergarten):
--
--     0A, 0B, 0C, KA, KB, 1A, 1B, ... 8A, 8B
--
-- This ONLY widens the enum. It does NOT re-band any row; the L0 overlay load
-- (next migration) re-bands the existing SAM-L0* rows from KA/KB to their true
-- 0A/0B/0C level and inserts the previously-skipped L0 tasks.
--
-- Placement-axis note (flagged for the founder): the adaptive engine and the
-- picker level-band logic read half_grade_level ordinally. Adding sub-KA
-- levels means a child CAN now place below Kindergarten. That is the intended,
-- faithful behaviour for the 0A/0B/0C bank; no engine code changes here.
--
-- Postgres constraint: ALTER TYPE ... ADD VALUE may run inside a transaction
-- (PG >= 12) but the new value cannot be USED until that transaction commits.
-- Supabase runs each migration file in its own transaction, so the enum DDL
-- lives ALONE here; the L0 overlay load that USES these values is a later
-- migration file.
--
-- AGENTS.md §11 note: enum DDL is schema, not tenant-scoped row data. It runs
-- on BOTH the production path and the dev `supabase db reset` path (before
-- seed.sql), so NO seed.sql mirror is needed for this file.

alter type half_grade_level add value if not exists '0A' before 'KA';
alter type half_grade_level add value if not exists '0B' before 'KA';
alter type half_grade_level add value if not exists '0C' before 'KA';
