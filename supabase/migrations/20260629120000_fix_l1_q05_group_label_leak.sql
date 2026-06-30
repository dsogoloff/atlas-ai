-- Atlas Assessment — SAM-L1-Q05 "Group A / Group B" label-leak fix
-- (lane/conversion).
--
-- BUG (live prod QA): the L1 grouping item (served as Q8; content row
-- SAM-L1-Q05, geometry / 1A, NUMERIC_ENTRY, key "B") rendered with its two
-- group LABELS jammed into the stem —
--   "Group A   Group B   In which group does it belong? Answer: Group ___"
-- — while the curated image (l1/sam-l1-q05.png) showed the two animal boxes
-- UNLABELLED. So the child saw "Group A / Group B" as words in the question
-- but had no way to tell which on-screen box was A (land) and which was B
-- (sea). The stingray stimulus to classify sits below; correct answer = B.
--
-- ROOT CAUSE: a deliberate but wrong coupling introduced when the row was
-- activated (20260614120001 statement 2). The art crop (scripts/conversion/
-- l1_crop.py, Q05) was cropped BELOW the worksheet's "Group A / Group B"
-- header row on the rationale "stem already renders Group A / Group B", and
-- the stem was authored to carry those labels. Both halves are wrong: the
-- engine renders a NUMERIC_ENTRY item as a SINGLE <img> (no per-box caption
-- support — see src/app/(child)/assessment/components/QuestionImage.tsx), so
-- the only place the box labels can live is ON the image.
--
-- FIX (two parts, dev/prod parity):
--   * Image  — l1_crop.py Q05 re-cropped to INCLUDE the "Group A / Group B"
--     header row (faithful re-crop from the source worksheet page, labels
--     verbatim; the stray "5." question number is whited out). Same bucket
--     key l1/sam-l1-q05.png; the re-minted file is uploaded separately
--     (founder-gated prod storage step — see the lane PR).
--   * Stem (THIS migration + the seed.sql mirror) — drop the leaked
--     "Group A   Group B\n" prefix so the stem is ONLY the question:
--       "In which group does it belong?\nAnswer: Group ___"
--
-- NO silent edits:
--   | id          | field | old                                                                 | new                                                |
--   |-------------|-------|---------------------------------------------------------------------|----------------------------------------------------|
--   | SAM-L1-Q05  | stem  | "Group A    Group B\nIn which group does it belong?\nAnswer: Group ___" | "In which group does it belong?\nAnswer: Group ___" |
-- (correct_answer "B" / image_alt / image_required / image_path unchanged.)
--
-- WHY a forward migration (not an in-place edit of 20260614120001): that
-- file applied to completion and is recorded in prod's schema_migrations —
-- editing it in place would never re-run. This corrective is idempotent
-- (the WHERE guard makes it a no-op once the stem is clean) and is mirrored
-- into supabase/seed.sql so a fresh `supabase db reset` reaches the same
-- final state.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content, '{stem}',
      to_jsonb(('In which group does it belong?' || E'\n' ||
               'Answer: Group ___')::text)
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q05'
  and q.content->>'stem' is distinct from
      ('In which group does it belong?' || E'\n' || 'Answer: Group ___');
