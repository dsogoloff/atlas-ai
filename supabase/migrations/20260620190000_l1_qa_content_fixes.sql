-- Atlas Assessment — L1 young-band QA fix batch (TASK B) (lane/qa-fixes-l1-l4).
--
-- CONVERSION-only content corrections from the QA play-through. Source-verified
-- against the worksheet docx + the per-figure crops in scripts/conversion/source/.
-- Served-order ≠ external_id: the QA brief's "L1-Q1/Q2/Q4/Q8" map by content to the
-- external_ids below (the odd-numbers item is the re-banded SAM-L0C-Q15).
--
-- Fixes:
--   L1-Q1  SAM-L0C-Q15  stem said "Tap the circles with odd numbers" but the tiles
--          are plain number tiles (not circles). SELECT_MULTIPLE is wired + the row
--          is well-formed (select_rule/options/correct intact), so this is a stem-
--          wording fix only: "Tap the odd numbers." (options/correct unchanged).
--   L1-Q2  SAM-L1-Q02  "bigger animal" re-authored MULTIPLE_CHOICE → CLICK_IMAGE_SINGLE
--          with two clickable per-figure tiles (elephant=correct, bear); text options
--          removed. Tiles are composited at true relative scale on a shared canvas
--          (gen_l1_q02_q04_tiles.py) so the size comparison survives the player's
--          equal-height tile clamp.
--   L1-Q4  SAM-L1-Q04  "who is shorter, Lin or George?" re-authored NUMERIC_ENTRY →
--          CLICK_IMAGE_SINGLE with two per-figure tiles (Lin=correct/shorter, George);
--          free-text answer removed. Same relative-scale tile treatment (height cue
--          preserved: Lin's figure is shorter on the shared-ground canvas).
--   L1-Q8  SAM-L1-Q17  IMAGE_ORDERING (daily routine) served pre-sorted (content.tiles
--          order == answer order). Tiles presented shuffled (t3,t1,t4,t2); the correct
--          order (_authoring.answer_model.order) stays t1,t2,t3,t4 — id-keyed grading.
--
-- Non-destructive: targeted UPDATEs by external_id (+ tenant); is_active / level /
-- short_test_eligible untouched. Idempotent. Mirrored verbatim into supabase/seed.sql.
-- AGENTS.md Section 11 parity: no-ops on dev `supabase db reset` (tenant created later
-- by seed.sql); the seed.sql mirror applies it on the dev path; prod applies here.
-- NOTE: Q02/Q04 now reference l1/sam-l1-q02-t1/t2.png + l1/sam-l1-q04-t1/t2.png
-- (added to activation-image-set.ts SOURCE_MAP); run the image uploader after reset.

-- L1-Q1 — SAM-L0C-Q15 stem wording (tiles are not circles).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Tap the odd numbers.","select_rule":"all","options":[{"id":"o1","label":"1"},{"id":"o2","label":"5"},{"id":"o3","label":"10"},{"id":"o4","label":"12"},{"id":"o5","label":"24"},{"id":"o6","label":"35"},{"id":"o7","label":"40"},{"id":"o8","label":"41"}],"correct":["o1","o2","o6","o8"]}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q15';

-- L1-Q2 — SAM-L1-Q02 bigger-animal → CLICK_IMAGE_SINGLE, two image tiles.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Click on the bigger animal.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q02-t1.png","image_alt":"An animal."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q02-t2.png","image_alt":"An animal."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q02';

-- L1-Q4 — SAM-L1-Q04 who-is-shorter → CLICK_IMAGE_SINGLE, two image tiles.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Who is shorter, Lin or George?","tiles":[{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q04-t1.png","image_alt":"A child."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q04-t2.png","image_alt":"A child."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q04';

-- L1-Q8 — SAM-L1-Q17 ordering: present tiles shuffled; correct order unchanged.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"The pictures show what Tom does in one day. Put them in order from first to last.","tiles":[{"id":"t3","label":"Picture 3","image_path":"l1/sam-l1-q17-studying.png","image_alt":"A picture of part of a child''s day."},{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q17-brushing-teeth.png","image_alt":"A picture of part of a child''s day."},{"id":"t4","label":"Picture 4","image_path":"l1/sam-l1-q17-sleeping.png","image_alt":"A picture of part of a child''s day."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q17-walking-to-school.png","image_alt":"A picture of part of a child''s day."}],"_authoring":{"answer_model":{"rule":"order-equality","order":["t1","t2","t3","t4"]}}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q17';
