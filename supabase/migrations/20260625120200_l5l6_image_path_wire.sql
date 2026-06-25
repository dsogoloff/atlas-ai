-- Atlas Assessment — wire image_path for inactive L5/L6 image-essential rows (2026-06-25).
--
-- The founder's per-question crops are now in scripts/conversion/source/5 + .../source/6.
-- Each row below gets its single per-question stimulus image_path; rows STAY is_active=false
-- (ACTIVATION-READY, not activated). The image upload to the private question-images bucket
-- is the founder's step (`pnpm convert:upload-activation-images`); flipping is_active=true
-- follows that upload. SOURCE_MAP entries for these keys are added in
-- scripts/conversion/activation-image-set.ts. Every crop PNG + its worksheet page was
-- source-verified 2026-06-25.
--
-- SAM-L5-Q26 is ALSO corrected here: the worksheet shows only figures A and B, but the loaded
-- row carried fabricated options C/D. Options -> ["A","B"], correct_index 1 (answer key = B);
-- image_alt rewritten to match the two real figures.
--
-- NOT wired (reported as holds, no usable single-stimulus source):
--   * SAM-L5-Q27 — its four options are each a separate shape image (circle / hexagon / heart
--     / rectangle); no single stimulus exists, and per-tile minting for image-option MC is not
--     yet in serveQuestion.ts. Needs a composite crop OR an image-tile format + minting.
--   * SAM-L6-Q18 — text-only ("volume of a cube of edge 9 cm"); no image required (already active).
--
-- UPDATEs only; idempotent (jsonb || overwrites the key on re-run). Tenant-scoped (a no-op
-- during `supabase db reset`; the dev/CI path is the seed.sql mirror).

-- ---- L5 single-stimulus ----
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l5/sam-l5-q08.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L5-Q08';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l5/sam-l5-q14.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L5-Q14';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l5/sam-l5-q25.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L5-Q25';

-- SAM-L5-Q26: options corrected to the two real figures (A, B) + stimulus wired.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"In which of the following figures is the dotted line a line of symmetry?","options":["A","B"],"correct_index":1,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY"},"image_path":"l5/sam-l5-q26.png","image_alt":"Two figures: A is a rectangle with a diagonal line drawn across it; B is a regular pentagon with a line drawn through one vertex. Identify which dotted line is a true line of symmetry.","image_required":true}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L5-Q26';

-- ---- L6 single-stimulus ----
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q14.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q14';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q15.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q15';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q16.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q16';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q19.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q19';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q25.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q25';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q26.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q26';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q30.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q30';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q31.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q31';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q32.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q32';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q33.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q33';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set content = q.content || '{"image_path":"l6/sam-l6-q34.png"}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q34';
