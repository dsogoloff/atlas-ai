-- Atlas Assessment — author SAM-L4-Q17 (lane/l4-q17-answer-key-audit).
--
-- "In the figure, AF, BE, GC and HD are straight lines ... name a pair of perpendicular
-- lines." Authored from source: Level 4 worksheet Q17 + Answer Key task 17 ("AF and GC")
-- + Concepts table topic "Angles, Perpendicular and Parallel Lines" (Short Test = Y) +
-- the L4-17 figure. Absent from local AND prod before now (never converted; previously
-- held because the pair was indeterminate without the key — the key is now present).
--
-- FREE-TEXT (TEXT_ENTRY) with an order-tolerant accepted set: pair-letter order
-- (AF=FA, GC=CG) and slot order (AF,GC = GC,AF). correctness.judgeAnswer's TEXT_ENTRY
-- any-of path matches each accepted form under normalizeTextAnswer (comma forms collapse
-- to space forms, so plain-space input is covered too). L4 has no perpendicular-lines
-- taxonomy node, so content_id maps to l3-geometry-2 ('Perpendicular Lines') — the same
-- backward-mapping the Q16 'Angles' item uses. Image-essential: insert held, then activate
-- with the curated image_path. Mirrored in supabase/seed.sql (l4-q17-authoring block).
-- Idempotent: ON CONFLICT DO NOTHING + a guarded activation UPDATE.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level, v.difficulty, v.format::question_format,
   v.content::jsonb, v.misconception_tags,
   v.word_count, v.operation_type::operation_type, v.num_operations, v.representation::representation_kind,
   v.is_active,
   (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    ('SAM-L4-Q17', 'geometry', '4A', -1.2, 'TEXT_ENTRY',
     '{"stem":"In the figure, AF, BE, GC and HD are straight lines. Look at the figure and name a pair of perpendicular lines.","correct_answer":"AF and GC","accepted_answers":["AF and GC","AF and CG","FA and GC","FA and CG","GC and AF","GC and FA","CG and AF","CG and FA","AF, GC","AF, CG","FA, GC","FA, CG","GC, AF","GC, FA","CG, AF","CG, FA"],"image_alt":"Four straight lines AF, BE, GC and HD drawn through a common region; two of them meet at a right angle.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     22, 'IDENTIFY', 1, 'PICTORIAL', false, 'l3-geometry-2')
  ) as v(external_id, strand, level, difficulty, format, content, misconception_tags,
         word_count, operation_type, num_operations, representation, is_active, content_key)
on conflict (tenant_id, external_id) do nothing;

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l4/sam-l4-q17.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q17';
