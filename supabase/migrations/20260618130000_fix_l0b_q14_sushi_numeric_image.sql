-- Atlas Assessment — Item 1 fix: SAM-L0B-Q14 sushi word problem (source-verified).
-- (lane/young-band-content-fixes)
--
-- Source page (Level 0B Placement Worksheet, task 14) + crop scripts/conversion/
-- source/0b/0B-14.png: ONE composite figure showing a tray of 4 sushi and a box
-- of 6 sushi above "4 + 6 = ___". Founder decision: a SINGLE answer blank (the
-- worksheet's redundant "There are ___ altogether" second blank is dropped) and
-- attach the sushi stimulus image.
--
-- Re-author as NUMERIC_ENTRY (single box, correct_answer "10") with the composite
-- sushi stimulus (l0/sam-l0b-q14.png — the source 0B-14.png crop shows BOTH the
-- tray and the box; no separate crops exist, so one image_path is faithful).
-- image_required so the picture is shown; the numbers are also in the stem.
--
-- Non-destructive: single targeted UPDATE WHERE external_id = 'SAM-L0B-Q14'
-- (+ tenant). is_active / level / short_test_eligible left untouched. Idempotent.
-- Mirrored verbatim into supabase/seed.sql. AGENTS.md Section 11 parity: no-ops
-- on dev `supabase db reset` (tenant created later by seed.sql); the seed.sql
-- mirror applies it on the dev path; on prod the tenant exists.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'NUMERIC_ENTRY'::question_format,
    content = '{"stem":"There are 4 pieces of sushi on a tray. There are 6 pieces of sushi in a box. How many pieces of sushi are there altogether? 4 + 6 = ___","correct_answer":"10","image_path":"l0/sam-l0b-q14.png","image_alt":"A tray of sushi and a box of sushi.","image_required":true}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q14';
