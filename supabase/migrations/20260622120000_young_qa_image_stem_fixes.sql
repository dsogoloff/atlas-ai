-- Atlas Assessment — young-band QA image/stem fixes (2026-06-22).
--
-- Founder QA (band-{0A} and band-{0B} short tests) found three young-band items
-- serving WITHOUT the stimulus their stem refers to, plus one stem that did not
-- match the worksheet. Each fix is source-verified against the rendered worksheet
-- page + last-page key (Question Summary) AND every PNG; stimulus crops are taken
-- DIRECTLY from the doc page (scripts/conversion/gen_young_qa_stimuli.py), so they
-- are faithful — no re-drawing. Bucket keys resolved by SOURCE_MAP in
-- scripts/conversion/activation-image-set.ts; founder uploads via
-- `pnpm convert:upload-activation-images`.
--
-- Defects fixed here (UPDATEs; rows already active):
--   SAM-L0A-Q11  pattern "Look at the pattern below. Tap what comes next." — the
--                repeating strip (red,blue,red,blue,red,?) was never wired; only the
--                two flower CHOICE tiles served. Stem already matches the doc; we add
--                the missing stimulus image_path.
--   SAM-L0B-Q02  pattern "Tap the object that comes next in the pattern below." — the
--                repeating strip (magnet,baseball x3) was never wired; only the four
--                choice tiles served. Add the missing stimulus image_path.
--   SAM-L0C-Q13  days-of-week — (a) the torn-calendar stimulus (Mon-Thu | Sat-Sun,
--                Friday torn out) was never wired; (b) the stem had been reworded into
--                an inline list of the days to compensate for the missing picture.
--                Re-authored stem VERBATIM from the worksheet and wired the calendar
--                stimulus. Choices reduced to the doc's two: Friday (correct) vs the
--                misspelt "Fryday" (reusing the existing q13-t2 / q13-t4 word tiles).
--
-- NOT in this migration:
--   * SAM-L0B-Q03 cake — the served stimulus (0B-03_1) was a WHOLE cake; the doc shows
--     the cake with a triangular wedge missing. Fixed by RE-POINTING the existing
--     bucket key l0/sam-l0b-q03-stimulus.png to the doc-faithful crop in SOURCE_MAP
--     (no DB change — the row already references that key; founder re-uploads).
--   * SAM-L0C-Q04 fact-family — renders blank because EQUATION_SET has no given/prefill
--     concept (operands live only in content.canonical, for grading). Cross-topic seam;
--     flagged for a dedicated lane rather than forced here.
--
-- Tenant-scoped: no-ops during `supabase db reset` (tenant created later by seed.sql);
-- the dev/CI path is the mirrored block in supabase/seed.sql. Idempotent.

-- ── SAM-L0A-Q11: wire the missing pattern stimulus ───────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Look at the pattern below. Tap what comes next.","image_path":"l0/sam-l0a-q11-stimulus.png","image_alt":"A repeating pattern of flowers: red, blue, red, blue, red, then a box with a question mark for the missing flower.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q11-t1.png","image_alt":"First flower choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q11-t2.png","image_alt":"Second flower choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0A-Q11';

-- ── SAM-L0B-Q02: wire the missing pattern stimulus ───────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Tap the object that comes next in the pattern below.","image_path":"l0/sam-l0b-q02-stimulus.png","image_alt":"A repeating pattern: magnet, baseball, magnet, baseball, magnet, baseball.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0b-q02-t1.png","image_alt":"First object choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0b-q02-t2.png","image_alt":"Second object choice."},{"id":"t3","label":"Picture 3","image_path":"l0/sam-l0b-q02-t3.png","image_alt":"Third object choice."},{"id":"t4","label":"Picture 4","image_path":"l0/sam-l0b-q02-t4.png","image_alt":"Fourth object choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t4"}}}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0B-Q02';

-- ── SAM-L0C-Q13: verbatim stem + torn-calendar stimulus + two choices ────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Read aloud the days of the week from Monday. A part of the page is torn. What is the missing day? Tap your answer.","image_path":"l0/sam-l0c-q13-stimulus.png","image_alt":"An open weekly planner. The left page lists Monday, Tuesday, Wednesday, Thursday; the right page lists Saturday and Sunday. The line above Saturday is torn off.","tiles":[{"id":"t1","label":"Friday","image_path":"l0/sam-l0c-q13-t2.png","image_alt":"The word Friday."},{"id":"t2","label":"Fryday","image_path":"l0/sam-l0c-q13-t4.png","image_alt":"The word Fryday."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t1"}}}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0C-Q13';
