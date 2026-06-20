-- Atlas Assessment — L1-Q01 + L1-Q07 activation (lane/l1-q01-q07-activation).
--
-- Founder corrections unblock two previously-held L1 rows:
--   Q01 — NOT a single scene: 6 discrete clickable crops (L1-1_1..6). "Tap the
--         things that have the same colour" -> CLICK_IMAGE_MULTI; the 3 RED items
--         (tulip t1, car t3, top hat t5) are correct; blue drop/green apple/yellow
--         balloon are distractors. select-all (set-equality).
--   Q07 — "Match to complete the picture": scene with a missing piece (L1-7_1) =
--         stimulus; two completing-piece options (L1-7_2, L1-7_3). Founder: correct
--         = L1-7_2 (t1). CLICK_IMAGE_SINGLE + stimulus.
--
-- Source-verified (L1 doc + each crop). content_id preserved (l1-geometry-1); level
-- NOT re-banded (out of scope). Rebuilt content has no _authoring.requires_format_swap,
-- so is_active=true is atomic. short_test_eligible=true (key Short=Y). Idempotent;
-- mirrored in seed.sql; non-destructive (only these two ids).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_MULTI'::question_format,
    content = '{"stem":"Tap the things that have the same color.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q01-t1.png","image_alt":"First object."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q01-t2.png","image_alt":"Second object."},{"id":"t3","label":"Picture 3","image_path":"l1/sam-l1-q01-t3.png","image_alt":"Third object."},{"id":"t4","label":"Picture 4","image_path":"l1/sam-l1-q01-t4.png","image_alt":"Fourth object."},{"id":"t5","label":"Picture 5","image_path":"l1/sam-l1-q01-t5.png","image_alt":"Fifth object."},{"id":"t6","label":"Picture 6","image_path":"l1/sam-l1-q01-t6.png","image_alt":"Sixth object."}],"_authoring":{"answer_model":{"rule":"select-all","correct":["t1","t3","t5"]}}}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L1-Q01';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Match to complete the picture.","image_path":"l1/sam-l1-q07-stimulus.png","image_alt":"A picture with a missing piece.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q07-t1.png","image_alt":"First piece choice."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q07-t2.png","image_alt":"Second piece choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L1-Q07';
