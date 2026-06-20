-- Atlas Assessment — 0B-Q03 + 0B-Q06 activation (lane/l0b-taxonomy-activation, follow-up).
--
-- Founder unblocked two previously-held 0B rows:
--   Q03 — the cake art shows a VISIBLE missing piece; tap the piece that fills it.
--         Stimulus = 0B-03_1 (cake), tiles = 0B-03_2/_3/_4, correct = 0B-03_2 (t1).
--         CLICK_IMAGE_SINGLE + stimulus. content_id l0a-geometry-2 "Parts and Whole".
--   Q06 — FOUNDER DECISION overrides the worksheet key's contradictory "color 7 and 6":
--         authoritative stem "tap the numbers greater than 6" -> correct = {7,8}.
--         SELECT_MULTIPLE over text tiles 4/5/6/7/8 (the number line has no usable
--         printed tiles, so numbers are text labels), set-equality grading.
--         content_id l0a-whole_numbers-1.
--
-- Source-verified (doc + key + crops). Rebuilt content carries no
-- _authoring.requires_format_swap, so is_active=true is atomic. short_test_eligible
-- from the key (both Short=Y). Idempotent; mirrored in seed.sql; non-destructive.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the part that is missing from the cake.","image_path":"l0/sam-l0b-q03-stimulus.png","image_alt":"A tiered cake with a piece missing.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0b-q03-t1.png","image_alt":"First piece choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0b-q03-t2.png","image_alt":"Second piece choice."},{"id":"t3","label":"Picture 3","image_path":"l0/sam-l0b-q03-t3.png","image_alt":"Third piece choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-2')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0B-Q03';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'SELECT_MULTIPLE'::question_format,
    content = '{"stem":"Tap the numbers greater than 6.","select_rule":"all","options":[{"id":"o1","label":"4"},{"id":"o2","label":"5"},{"id":"o3","label":"6"},{"id":"o4","label":"7"},{"id":"o5","label":"8"}],"correct":["o4","o5"]}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-whole_numbers-1')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0B-Q06';
