-- Atlas Assessment — 0A-Q17 activation (lane/l0a-taxonomy-activation, follow-up).
--
-- Founder replaced the balloon crop with the corrected 5-balloon image (source/0a/
-- 0A-17.png; previously 6, which contradicted the "Count within 5" skill and was
-- held+flagged). Source-verified: crop now shows 5 balloons (3 blue, 2 green); doc
-- stem "Count the balloons. Tap the number." with options [6,5,2] -> correct = 5
-- (correct_index 1). MULTIPLE_CHOICE + balloon stimulus. Rebuilt content drops the
-- held _authoring block (no requires_format_swap), so is_active=true is atomic.
-- short_test_eligible=true (key Short=Y). content_id l0a-whole_numbers-1. Idempotent;
-- mirrored in seed.sql; non-destructive (only this id).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = '{"stem":"Count the balloons. Tap the number.","options":["6","5","2"],"correct_index":1,"image_path":"l0/sam-l0a-q17.png","image_alt":"A group of balloons."}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0a-whole_numbers-1')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q17';
