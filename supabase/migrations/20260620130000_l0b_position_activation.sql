-- Atlas Assessment — 0B Position activation (lane/l0b-taxonomy-activation).
--
-- SAM-L0B-Q04 ("Start at X. Go right, up, left and down...") was parked
-- "needs taxonomy code". The existing internal node l0b-geometry-1 "Positions"
-- already covers it (no new code needed) — map Q04 to it and activate.
--
-- Source-verified: 0B doc page + key + the map crop 0B-04_1.png (Bakery, School,
-- Playground, Home + starting point X). The route resolves to Bakery (idx1).
-- MULTIPLE_CHOICE (text options) + map stimulus image; rebuilt content has no
-- _authoring.requires_format_swap so is_active=true is atomic. short_test_eligible
-- from the key (Short=Y). Non-destructive (only this id), idempotent, seed-mirrored.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Start at X. Go right, up, left and down. Where are you? Tap the correct box below.","options":["School","Bakery","Playground","Home"],"correct_index":1,"image_path":"l0/sam-l0b-q04.png","image_alt":"A street map showing Bakery, School, Playground and Home, with a starting point marked X."}'::jsonb,
    is_active = true, short_test_eligible = true,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l0b-geometry-1')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0B-Q04';
