-- Atlas Assessment — retire the original single SAM-L0C-Q11 row.
-- (lane/young-band-content-fixes)
--
-- Source page (Level 0C Placement Worksheet, task 11) + crop scripts/conversion/
-- source/0c/0C-11.png: ONE number-line stimulus (endpoints + ticks, no printed
-- numerals) and four sentences, each a TWO-OPTION ORDERED pick.
--
-- ATLAS confirmed the shipped grader has no per-slot (multi-blank options)
-- mapping, so the wired, faithful path is FOUR independent single-selects. Those
-- are authored as SAM-L0C-Q11A..D (CLICK_IMAGE_SINGLE) in migration
-- 20260618130400. This migration RETIRES the original single SAM-L0C-Q11 row
-- (is_active=false) so it does not double-serve alongside the four sub-items.
-- (Original supersession reason was a free-entry MULTI_BLANK with no constrained-
-- choice renderer; the 4-single-select path replaces it.)
--
-- Non-destructive: single targeted UPDATE WHERE external_id = 'SAM-L0C-Q11'
-- (+ tenant); sets is_active=false only (content/level/short_test_eligible
-- untouched). Idempotent. Mirrored verbatim into supabase/seed.sql. AGENTS.md
-- Section 11 parity: no-ops on dev `supabase db reset` (tenant created later by
-- seed.sql); the seed.sql mirror applies it on the dev path; prod applies here.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q11';
