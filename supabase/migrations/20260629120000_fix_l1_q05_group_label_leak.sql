-- Atlas Assessment — SAM-L1-Q05 grouping item: format + label fix
-- (lane/fix-l1-q05-group-label-leak).
--
-- BUG (live prod QA): the L1 grouping item (served as Q8; content row
-- SAM-L1-Q05, geometry / 1A) had TWO defects:
--   1. FORMAT — it was NUMERIC_ENTRY with a LETTER answer ("B" / "Group B").
--      NUMERIC_ENTRY renders a numeric keypad (inputMode="decimal"), so on
--      touch devices the letter was effectively un-enterable → the item would
--      fail the live serve-and-submit gate.
--   2. LABELS — the two group labels were jammed into the stem
--      ("Group A   Group B   In which group does it belong? Answer: Group ___")
--      while the curated image (l1/sam-l1-q05.png) showed the two animal boxes
--      UNLABELLED, so the child couldn't tell which on-screen box was A (land)
--      vs B (sea). Correct group = B (sea); the stingray to classify sits below.
--
-- ROOT CAUSE (labels): a wrong coupling at activation (20260614120001 stmt 2)
-- baked the labels into the stem, and l1_crop.py cropped the boxes BELOW the
-- worksheet's "Group A / Group B" header row on the rationale "stem already
-- renders Group A / Group B". A MULTIPLE_CHOICE / NUMERIC_ENTRY item renders as
-- a single <img> (src/app/(child)/assessment/components/QuestionImage.tsx) with
-- no per-box caption, so the box labels can only live ON the image.
--
-- FIX (dev/prod parity):
--   * Format — NUMERIC_ENTRY → MULTIPLE_CHOICE, options ["Group A","Group B"],
--     correct_index 1 (= key "B"). Tap-to-answer, no typing. Grading dispatches
--     on format → options[correct_index] === submitted option text
--     (src/lib/responseSubmit/correctness.ts). Mirrors the other L1 two-option
--     image-MC items (e.g. 20260613120100 "Click on the bigger animal").
--   * Stem — folded the "Answer: Group ___" write-in into the MC options, per
--     the founder authoring note; stem is now ONLY "In which group does it
--     belong?". Drops the leaked "Group A / Group B" prefix and the dead
--     "[object]" placeholder.
--   * correct_answer "B" removed (MC reads correct_index, not correct_answer).
--   * Image — l1_crop.py Q05 re-cropped to INCLUDE the "Group A / Group B"
--     header row (faithful re-crop from source page-04, labels verbatim; stray
--     "5." question number whited out). Same bucket key l1/sam-l1-q05.png; the
--     re-minted file is uploaded separately (founder-gated prod storage step).
--
-- UNCHANGED: short_test_eligible, banding (1A), content_id (l1-geometry-1),
-- level, image_alt, image_required, image_path, strand, difficulty.
--
-- NO silent edits:
--   | id          | field   | old                                                                    | new                                  |
--   |-------------|---------|------------------------------------------------------------------------|--------------------------------------|
--   | SAM-L1-Q05  | format  | NUMERIC_ENTRY                                                          | MULTIPLE_CHOICE                      |
--   | SAM-L1-Q05  | stem    | "Group A    Group B\nIn which group does it belong?\nAnswer: Group ___" | "In which group does it belong?"     |
--   | SAM-L1-Q05  | options | (none)                                                                 | ["Group A","Group B"]                |
--   | SAM-L1-Q05  | correct_index | (none)                                                           | 1                                    |
--   | SAM-L1-Q05  | correct_answer | "B"                                                             | (removed)                            |
--
-- WHY a forward migration (not an in-place edit of 20260614120001): that file
-- applied to completion and is recorded in prod's schema_migrations. This
-- corrective is idempotent (the WHERE guard makes it a no-op once the row is
-- already MC with the target content) and is mirrored into supabase/seed.sql so
-- a fresh `supabase db reset` reaches the same final state.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE',
    content = (q.content - 'correct_answer')
      || jsonb_build_object(
           'stem', 'In which group does it belong?',
           'options', jsonb_build_array('Group A', 'Group B'),
           'correct_index', 1
         )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q05'
  and (
        q.format::text is distinct from 'MULTIPLE_CHOICE'
        or q.content ? 'correct_answer'
        or q.content->>'stem' is distinct from 'In which group does it belong?'
        or q.content->'options' is distinct from jsonb_build_array('Group A', 'Group B')
        or q.content->'correct_index' is distinct from to_jsonb(1)
      );
