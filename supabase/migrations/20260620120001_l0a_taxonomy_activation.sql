-- Atlas Assessment — 0A "Same or Different" + "Position" taxonomy + activation
-- (lane/l0a-taxonomy-activation).
--
-- The content_id codes are OUR internal organizing scheme (NOT external/S.A.M.).
-- These 0A items were previously parked "needs taxonomy code"; we own the codes,
-- so we create two new internal nodes under the geometry sub-strand (the only
-- non-number sub-strand that applies at l0a) derived from the worksheet's own
-- Topic column, then wire + activate the auto-gradeable image-tap rows.
--
-- New tax_content nodes:
--   l0a-geometry-5  "Same or Different"  (Topic: Same or different)
--   l0a-geometry-6  "Positions"          (Topic: Position and Direction Words)
--
-- Source-verified: 0A doc page + last-page key + each PNG crop opened/viewed.
-- Activations rebuild content to CLICK_IMAGE_SINGLE (two image tiles, select-one);
-- the new content carries no _authoring.requires_format_swap, so is_active=true is
-- valid atomically. short_test_eligible from the key's Short column (all Y here).
-- Non-destructive (only the listed ids), idempotent, mirrored in seed.sql.
--
-- HELD (non-taxonomy blocker) — content_id assigned for organization, left inactive:
--   Q15 (tap bowl on bottom shelf) — source art inadequate: only a single bowl +
--        an EMPTY 3-shelf rack exist, not a bowl on each shelf. Needs curated art.
--   Q16 (draw a sweet outside the bowl) — manual drawing, no auto-grade path; Short=N.

-- ── new taxonomy nodes ───────────────────────────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_content (tenant_id, sub_strand_id, level_id, code, name, display_order, mvp)
select t.id,
  (select ss.id from tax_sub_strands ss where ss.tenant_id = t.id and ss.code = v.sub_strand_code),
  (select l.id  from tax_levels       l  where l.tenant_id  = t.id and l.code  = v.level_code),
  v.code, v.name, v.display_order, v.mvp
from t, (values
  ('l0a-geometry-5', 'geometry', 'l0a', 'Same or Different', 5, false),
  ('l0a-geometry-6', 'geometry', 'l0a', 'Positions',         6, false)
) as v(code, sub_strand_code, level_code, name, display_order, mvp)
on conflict (tenant_id, code) do nothing;

-- ── activations: CLICK_IMAGE_SINGLE, two tiles, select-one ────────────────────

-- Q03 "Tap the big bowl" — same-object size comparison (resize tiles). correct=t2 (big).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the big bowl.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q03-t1.png","image_alt":"First bowl choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q03-t2.png","image_alt":"Second bowl choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-5')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q03';

-- Q05 "Tap the thick book" — t1 thin (0A-05_1), t2 thick (0A-05_2). correct=t2.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the thick book.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q05-t1.png","image_alt":"First book choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q05-t2.png","image_alt":"Second book choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-5')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q05';

-- Q06 "Tap the long branch" — t1 long (0A-06_1), t2 short (0A-06_2). correct=t1.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the long branch.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q06-t1.png","image_alt":"First branch choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q06-t2.png","image_alt":"Second branch choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-5')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q06';

-- Q07 "Tap the tall animal" — t1 donkey (0A-07_1), t2 giraffe (0A-07_2). correct=t2.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the tall animal.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q07-t1.png","image_alt":"First animal choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q07-t2.png","image_alt":"Second animal choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-5')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q07';

-- Q10 "Tap the taller door" — t1 green/taller (0A-10_1), t2 brown (0A-10_2). correct=t1.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the taller door.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q10-t1.png","image_alt":"First door choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q10-t2.png","image_alt":"Second door choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-5')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q10';

-- Q13 "Tap the bird facing left" — t1 left (0A-13_1), t2 right (0A-13_2). correct=t1.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the bird facing left.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q13-t1.png","image_alt":"First bird choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q13-t2.png","image_alt":"Second bird choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-6')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q13';

-- Q14 "Tap the bird that is flying up" — t1 up (0A-14_1), t2 down (0A-14_2). correct=t1.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the bird that is flying up.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q14-t1.png","image_alt":"First bird choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q14-t2.png","image_alt":"Second bird choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-6')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q14';

-- ── held rows: assign content_id only (organization), stay inactive ───────────

-- Q15 — inadequate source art (single bowl + empty shelves). Position node.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-6')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q15';

-- Q16 — manual drawing (no auto-grade), Short=N. Position node.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-geometry-6')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q16';
