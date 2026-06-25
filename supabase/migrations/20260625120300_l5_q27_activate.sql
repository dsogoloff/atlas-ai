-- Atlas Assessment — activate SAM-L5-Q27 (lines-of-symmetry MC) (2026-06-25).
--
-- Q27 was HELD in 20260625120200: its four answer choices were each a SEPARATE shape image,
-- so there was no single stimulus and per-tile minting for image-option MC is not in
-- serveQuestion.ts. The founder has now supplied a single COMBINED crop showing all four
-- shapes WITH their in-image labels (1)-(4): (1) circle, (2) hexagon, (3) heart, (4) rectangle
-- (scripts/conversion/source/5/L5-27.png). That resolves the per-tile problem — this is now a
-- standard single-stimulus MC whose options reference the in-image labels.
--
-- Source-verified 2026-06-25 against the worksheet page (Q27 "Which of the shapes has the most
-- lines of symmetry?") + the answer-key PDF (answer = (1); a circle has infinitely many lines
-- of symmetry) + the new L5-27.png crop. Stem/options/correct_index are unchanged (already
-- correct); this UPDATE wires the stimulus image_path, sharpens image_alt to the real shapes,
-- and ACTIVATES the row (is_active=true). level (5A, booklet — set in 20260625120000),
-- short_test_eligible (true, Short Test = Y — set in 20260623140000) and content_id
-- (l4-geometry-3, the Symmetry node) are already correct and untouched here.
--
-- The crop upload to the private question-images bucket is the founder's step
-- (`pnpm convert:upload-activation-images`); l5/sam-l5-q27.png must be present before/with
-- `supabase db reset` or the now-active row 500s at serve time. SOURCE_MAP entry added in
-- scripts/conversion/activation-image-set.ts. Idempotent; tenant-scoped (no-op during
-- `supabase db reset`; the dev/CI path is the seed.sql mirror).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"Which of the shapes has the most lines of symmetry?","options":["(1)","(2)","(3)","(4)"],"correct_index":0,"distractor_misconceptions":{"1":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_path":"l5/sam-l5-q27.png","image_alt":"Four labelled shapes shown together: (1) a circle, (2) a hexagon, (3) a heart, and (4) a rectangle. Identify which shape has the most lines of symmetry.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L5-Q27';
