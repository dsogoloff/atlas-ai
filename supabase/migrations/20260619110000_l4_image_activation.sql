-- Atlas Assessment — L4 image-question wiring + activation (lane/l4-image-activation).
--
-- Wires concrete image_path into held SAM-L4 image rows and activates them.
-- Source-verified: each L4 doc page, its last-page answer key
-- (Task|Skills|Topic|Level|Short test), and the actual PNG crop in
-- scripts/conversion/source/4/ were opened and viewed before authoring.
-- (L4 doc carries symbol-font glyphs; read under PYTHONIOENCODING=utf-8.)
--
-- Pattern: trailing authoritative UPDATEs. Image-only rows use `content ||
-- image_path` merge (preserves audit-verified content). Q20 is a format
-- correction (NUMERIC single field -> MULTI_BLANK two blanks) because the source
-- is a genuine two-part (a/b) question; the single-field "a) 150 b) 900" was not
-- auto-gradeable. Q21 folds the figure's side-length labels (doc text "25 m",
-- "50 m" around the rectangle, NOT inside the crop) into the stem so the item is
-- answerable. is_active=true + short_test_eligible from the key's Short column.
-- These rows carry no _authoring.requires_format_swap, so activation is atomic.
--
-- Image rows MUST have their crop uploaded to the private question-images bucket
-- (l4/ folder) — manifest + L4_SRC root added in this lane. Mirrored in seed.sql.
--
-- Non-destruction: only the 6 referenced ids change. Idempotent.
--
-- HELD (not here, logged in PR): Q21? no — Q21 IS activated. Held: Q17 (name a
-- pair of perpendicular lines — free-text line-naming not reliably auto-gradeable
-- and the ⊥ pair is not determinable from the crop), Q19 (key Short=N, unloaded,
-- symbol-font fraction item — not cleanly gradeable from source).

-- Q01 — figure shows 9999; "1 more" = 10000 (MC idx3). [key Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l4/sam-l4-q01.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q01';

-- Q13 — jug: liquid at the 4th mark (each = 200 mL) = 800 mL (MC idx2). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l4/sam-l4-q13.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q13';

-- Q16 — angle a is the only acute angle (< right angle) (MC idx0). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l4/sam-l4-q16.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q16';

-- Q21 — rectangle 50 m x 25 m = 1250 m^2 (MC idx3). Side labels are doc text
--   around the figure (not in the crop), so they are folded into the stem.
--   [key Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"stem":"What is the area of the rectangle below? The rectangle is 50 m long and 25 m wide.","image_path":"l4/sam-l4-q21.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q21';

-- Q23 — place-value discs: 3x10000 + 2x1000 + 1 = 32001 (NUMERIC). [Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = content || '{"image_path":"l4/sam-l4-q23.png"}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q23';

-- Q20 — two-part bar-graph question -> MULTI_BLANK (NUMERIC single field was not
--   auto-gradeable). a) B-C = 225-75 = 150; b) total A..E = 150+225+75+200+250 = 900.
--   [key Short=Y]
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"The bar graph below shows the scores of five basketball teams in a tournament.","tokens":[{"t":"text","value":"a) How many more points did Team B score than Team C? "},{"t":"blank","id":"b1"},{"t":"text","value":" b) How many points did the five teams score altogether? "},{"t":"blank","id":"b2"}],"blanks":{"b1":{"value":"150","numeric":true},"b2":{"value":"900","numeric":true}},"image_path":"l4/sam-l4-q20.png","image_alt":"A bar graph showing the scores of five basketball teams (Team A through Team E) in a tournament, with a vertical axis representing points scored."}'::jsonb,
    is_active = true, short_test_eligible = true
from t where q.tenant_id = t.id and q.external_id = 'SAM-L4-Q20';
