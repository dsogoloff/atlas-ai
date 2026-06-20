-- Atlas Assessment — 0C "Comparing & Ordering" + "Odd & Even" taxonomy + activation
-- (lane/l0c-taxonomy-activation).
--
-- content_id codes are OUR internal scheme. Two new internal nodes derived from
-- the worksheet Topic column:
--   l0c-geometry-4       "Comparing and Ordering"  (Topic: Comparing and Ordering)
--   l0c-whole_numbers-6  "Odd and Even Numbers"    (Topic: Odd and Even Numbers)
--
-- Source-verified (0C doc + key + crops). Non-destructive, idempotent, mirrored.
--
-- Q05 — order by size. Source crop is a SINGLE object (carrot, 0C-05); modelled as
--   IMAGE_ORDERING over 3 generated sizes (smallest->biggest) — same-object size
--   adaptation, skill preserved + auto-gradeable. (gen_l0c_q05_tiles.py)
-- Q14 — count pairs (already active NUMERIC); re-home content_id to Odd/Even node.
-- Q15 — tap circles with odd numbers -> SELECT_MULTIPLE over the docx circle set
--   {1,5,10,12,24,35,40,41}; correct = odds {1,5,35,41}. (No crop; text labels.)
--   NOTE: the docx digits extract with some merge ambiguity; if the printed set
--   actually includes more even circles (e.g. 6,2 per an earlier read) the answer
--   is unchanged — only the displayed evens would differ. Flagged for QA.

-- ── new taxonomy nodes ───────────────────────────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_content (tenant_id, sub_strand_id, level_id, code, name, display_order, mvp)
select t.id,
  (select ss.id from tax_sub_strands ss where ss.tenant_id = t.id and ss.code = v.sub_strand_code),
  (select l.id  from tax_levels       l  where l.tenant_id  = t.id and l.code  = v.level_code),
  v.code, v.name, v.display_order, v.mvp
from t, (values
  ('l0c-geometry-4',      'geometry',      'l0c', 'Comparing and Ordering', 4, false),
  ('l0c-whole_numbers-6', 'whole_numbers', 'l0c', 'Odd and Even Numbers',   6, false)
) as v(code, sub_strand_code, level_code, name, display_order, mvp)
on conflict (tenant_id, code) do nothing;

-- Q05 — IMAGE_ORDERING, 3 carrot sizes smallest->biggest.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'IMAGE_ORDERING'::question_format,
    content = '{"stem":"Put the pictures in order by size, from smallest to biggest.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0c-q05-t1.png","image_alt":"First picture."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0c-q05-t2.png","image_alt":"Second picture."},{"id":"t3","label":"Picture 3","image_path":"l0/sam-l0c-q05-t3.png","image_alt":"Third picture."}],"_authoring":{"answer_model":{"rule":"order-equality","order":["t1","t2","t3"]}}}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0c-geometry-4')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0C-Q05';

-- Q14 — re-home content_id to Odd/Even (already active NUMERIC).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0c-whole_numbers-6'),
    short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0C-Q14';

-- Q15 — SELECT_MULTIPLE odd numbers.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'SELECT_MULTIPLE'::question_format,
    content = '{"stem":"Tap the circles with odd numbers.","select_rule":"all","options":[{"id":"o1","label":"1"},{"id":"o2","label":"5"},{"id":"o3","label":"10"},{"id":"o4","label":"12"},{"id":"o5","label":"24"},{"id":"o6","label":"35"},{"id":"o7","label":"40"},{"id":"o8","label":"41"}],"correct":["o1","o2","o6","o8"]}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0c-whole_numbers-6')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0C-Q15';
