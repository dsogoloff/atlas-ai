-- Atlas Assessment — Item 2: deactivate SAM-L0C-Q11 pending a player field.
-- (lane/young-band-content-fixes)
--
-- Source page (Level 0C Placement Worksheet, task 11) + crop scripts/conversion/
-- source/0c/0C-11.png: ONE number-line stimulus (endpoints + ticks, no printed
-- numerals) and four sentences, each a TWO-OPTION ORDERED pick — 31 comes
-- [before/after] 30 (after); 31 is [smaller/greater] than 30 (greater); 33 comes
-- [before/after] 36 (before); 33 is [smaller/greater] than 36 (smaller).
--
-- No shipped renderer supports four ordered two-option picks: MULTI_BLANK/
-- EquationFill renders free-text inputs only (BlankKey has no options[]),
-- SELECT_MULTIPLE is an unordered tap-all set, and there is no single-select-
-- sequence format. Rather than serve a wrong-format (free-entry) item, hold Q11
-- inactive until ATLAS adds the capability. CONVERSION authors nothing for it
-- until then.
--
-- MISSING CAPABILITY (one line, to scope the ATLAS task): MULTI_BLANK needs an
-- optional per-blank `options: [a, b]` that renders two choice buttons instead
-- of a text input, graded by the chosen value/id.
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
