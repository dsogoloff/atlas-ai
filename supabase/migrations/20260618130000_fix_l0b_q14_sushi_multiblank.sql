-- Atlas Assessment — Defect B fix: SAM-L0B-Q14 sushi word problem.
-- (lane/young-band-content-fixes)
--
-- The "4 + 6 = __ ; There are __ pieces of sushi altogether" item was authored
-- as a single NUMERIC_ENTRY (one box, correct_answer "10"), flattening the
-- source's TWO fill blanks to one. Re-author as MULTI_BLANK with two numeric
-- blanks (both 10) so both boxes render and grade per-blank. Existing
-- MULTI_BLANK renderer + grader; no ATLAS player work.
--
-- Non-destructive: a single targeted UPDATE WHERE external_id = 'SAM-L0B-Q14'
-- (+ tenant). is_active / level / short_test_eligible / strand / norm tags are
-- left untouched. Idempotent (re-running yields the same content). Mirrored
-- verbatim into supabase/seed.sql.
--
-- AGENTS.md Section 11 parity: on a dev `supabase db reset` this migration
-- no-ops (the inspirea_singapore_math tenant is created later, by seed.sql), so
-- the seed.sql mirror applies it on the dev path; on prod the tenant exists and
-- this migration applies.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"There are 4 pieces of sushi on a tray. There are 6 pieces of sushi in a box. How many pieces of sushi are there altogether? Fill in the blanks.","tokens":[{"t":"text","value":"4 + 6 ="},{"t":"blank","id":"b1"},{"t":"text","value":". There are"},{"t":"blank","id":"b2"},{"t":"text","value":"pieces of sushi altogether."}],"blanks":{"b1":{"value":"10","numeric":true},"b2":{"value":"10","numeric":true}}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q14';
