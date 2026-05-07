-- Atlas Assessment — at most one IN_PROGRESS assessment session per child.
--
-- Source-of-truth references:
--   features.md §6 — "support one assessment per child at a time
--                     (can be retaken after completion)"
--   src/lib/sessionStart/handler.ts — relies on this constraint to make the
--     "child already has IN_PROGRESS session" check race-safe. Without the
--     index, two near-simultaneous /api/assess/start calls could each pass
--     the existence check and INSERT a second IN_PROGRESS row.
--
-- The partial WHERE clause is load-bearing. A plain UNIQUE on child_id
-- would forbid retakes after a session COMPLETES (every COMPLETED row
-- would still occupy the slot). Constraining the index to status =
-- 'IN_PROGRESS' lets a child accumulate any number of COMPLETED rows
-- while permitting at most one open session at a time.
--
-- Existing-data note: this CREATE will fail if any child currently has
-- 2+ IN_PROGRESS rows. Before applying to a non-empty DB, run:
--
--   select child_id, count(*)
--   from assessment_sessions
--   where status = 'IN_PROGRESS'
--   group by child_id
--   having count(*) > 1;
--
-- and resolve duplicates (close, mark abandoned, or delete) first.

create unique index assessment_sessions_one_in_progress_per_child_idx
  on assessment_sessions (child_id)
  where status = 'IN_PROGRESS';
