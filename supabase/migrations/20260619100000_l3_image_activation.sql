-- Atlas Assessment — L3 image-question wiring + activation (lane/l3-image-activation).
--
-- Wires concrete image_path into 9 held SAM-L3 image rows and activates them, plus
-- loads 2 unloaded stragglers (Q04, Q23). Source-verified: each L3 doc page, its
-- last-page answer key (Task|Skills|Topic|Level|Short), and the actual PNG crop in
-- scripts/conversion/source/3/ were opened and viewed before authoring.
--
-- Pattern: trailing authoritative UPDATEs (content || image_path merge — preserves
-- the audit-verified stem/options/correct_index/image_alt verbatim, only ADDS
-- image_path) + is_active=true + short_test_eligible from the key's Short column.
-- These rows carry no _authoring.requires_format_swap, so the
-- questions_held_rows_inactive guardrail permits is_active=true atomically.
--
-- Image rows MUST have their crop uploaded to the private question-images bucket
-- (l3/ folder) — see scripts/conversion/upload-activation-images.ts (manifest +
-- L3_SRC root added in this lane). An active image row with no uploaded file 500s
-- at serve.
--
-- Non-destruction: only the 9 activation ids + the 2 inserted straggler ids are
-- referenced. Idempotent (merge + guarded inserts). Mirrored verbatim in seed.sql
-- before the LOCAL-DEV QA SEED marker.
--
-- HELD (not in this migration, logged in PR): Q16 (match-volume-to-tank: no source
-- crop, Short=N), Q19 (rotating-semicircle pattern: founder directs a typed "___"
-- blank, but no auto-gradeable answer string is defined yet), Q17's sibling none.

-- ── 9 image rows: wire image_path + activate ──────────────────────────────────

-- Q01 — base-ten figure = 1 ten + 2 hundreds = 210 (MC idx2). [key Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q01.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q01';

-- Q06 — thumb drive on ruler spans 1→5 cm = 4 cm (MC idx3). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q06.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q06';

-- Q08 — scale dial needle at 250 g (NUMERIC 250). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q08.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q08';

-- Q09 — clock: hour ~7, minute at 5 = 7:25; dinner → pm (MC idx3). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q09.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q09';

-- Q10 — bar model (1) shows three parts, whole unknown (MC idx0). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q10.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q10';

-- Q12 — notes $69 + coins $1.85 = $70.85 (MC idx1). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q12.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q12';

-- Q13 — figure: 4 shaded of 9 squares = 4/9 (NUMERIC, exact-match path). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q13.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q13';

-- Q17 — picture graph: pears 9, oranges 4 → (9-4)*5 = 25 students (founder-confirmed).
--   ALSO corrects the stored answer 3 → 25 (the loaded value was wrong). NUMERIC. [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q17.png","correct_answer":"25"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q17';

-- Q20 — base-ten: 2 thousand-cubes + 4 hundred-flats + 3 units = 2403 (MC idx2). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l3/sam-l3-q20.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L3-Q20';

-- ── 2 unloaded stragglers: load + activate (no image; text/numeric) ───────────

-- Q04 — "Arrange the numbers in order. Begin with the greatest." 1000/909/100/999.
--   DRAG_DROP, correct_order greatest-first. Crops L3-4_* extracted blank but the
--   numbers are in the stem, so no image needed. Key: Comparing/ordering within
--   1000, Level 2, Short=Y → content_id l2-whole_numbers-1, band 2B.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags, word_count, operation_type, num_operations,
   representation, is_active, short_test_eligible, content_id)
select t.id, 'SAM-L3-Q04', 'number_sense', '2B'::half_grade_level, -0.8,
       'DRAG_DROP'::question_format,
       '{"stem":"Arrange the numbers in order. Begin with the greatest. 1000   909   100   999","items":["1000","909","100","999"],"correct_order":["1000","999","909","100"]}'::jsonb,
       array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION']::text[],
       9, 'IDENTIFY'::operation_type, 1, 'SYMBOLIC'::representation_kind,
       true, true,
       (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l2-whole_numbers-1')
from t
on conflict (tenant_id, external_id) do nothing;

-- Q23 — "What is the missing number in the pattern below? ___, 1230, 1430, 1630, 1830"
--   step +200, so the term before 1230 is 1030. NUMERIC. Key: number-sequence
--   patterns within 10 000, Level 3, Short=Y → content_id l3-whole_numbers-1, band 3B.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags, word_count, operation_type, num_operations,
   representation, is_active, short_test_eligible, content_id)
select t.id, 'SAM-L3-Q23', 'number_sense', '3B'::half_grade_level, 0.2,
       'NUMERIC_ENTRY'::question_format,
       '{"stem":"What is the missing number in the pattern below? ___, 1230, 1430, 1630, 1830","correct_answer":"1030"}'::jsonb,
       array[]::text[],
       10, 'IDENTIFY'::operation_type, 1, 'SYMBOLIC'::representation_kind,
       true, true,
       (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l3-whole_numbers-1')
from t
on conflict (tenant_id, external_id) do nothing;
