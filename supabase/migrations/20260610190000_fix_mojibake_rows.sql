-- Atlas Assessment — founder-verified S.A.M. question content fixes,
-- round 2: the two mojibake-page rows.
--
-- Resolves the two rows FLAGGED-FOR-FOUNDER in
-- 20260610180000_fix_sam_question_content.sql (worksheet page text was
-- mojibake, so the loaded content was model-reconstructed and could not
-- be transcribed from extraction text). The founder has now checked the
-- source PDFs (2026-06-10) and verified both tasks:
--
--   * SAM-L3-Q15 — expression "1/6 + 3/6", answer "4/6", NO options
--     printed -> the source task is NOT multiple-choice.
--   * SAM-L4-Q18 — options exactly ["1/2","3/4","5/3","1/12"], correct
--     answer "5/3" -> correct_index 2, multiple-choice confirmed.
--
-- NO silent edits — full before/after table (also in the PR body):
--
-- | external_id | field     | old                                                                  | new                                                  | source evidence |
-- |-------------|-----------|----------------------------------------------------------------------|------------------------------------------------------|-----------------|
-- | SAM-L3-Q15  | format    | MULTIPLE_CHOICE                                                      | NUMERIC_ENTRY                                        | Founder checked the L3 source PDF: the printed task gives the expression "1/6 + 3/6" with answer "4/6" and NO options list — the MC options ["4/12","6/12","4/6","5/6"] were model-reconstructed from a mojibake page and do not exist in the source. |
-- | SAM-L3-Q15  | content   | {"stem":"What is 1/6 + 3/6?","options":["4/12","6/12","4/6","5/6"],"correct_index":2,"distractor_misconceptions":{"0":"FR_NUM_DENOM_INDEPENDENT","1":"FR_NUM_DENOM_INDEPENDENT"}} | {"stem":"What is 1/6 + 3/6?","correct_answer":"4/6"} | Stem KEPT VERBATIM — the stored stem contains no mojibake and its expression already equals the founder-verified "1/6 + 3/6", so only the answer model changes. options / correct_index / distractor_misconceptions dropped (invented for a format the source does not have). misconception_tags unchanged ({FR_NUM_DENOM_INDEPENDENT}); word_count unchanged (stem text identical). |
-- | SAM-L3-Q15  | is_active | true                                                                 | false                                                | fraction answer needs TEXT_ENTRY (PR #29) or keypad slash — reactivate after merge. The child NUMERIC_ENTRY input (src/app/(child)/assessment/components/NumericInput.tsx) is a free text input with inputMode="decimal": touch keyboards (the primary child device) show a digits+decimal-point pad with no "/" key, so "4/6" cannot be typed there; correctness.ts also only does exact string match for non-numeric answers (no fraction-aware compare in v1). |
-- | SAM-L4-Q18  | (none)    | format MULTIPLE_CHOICE; options ["1/2","3/4","5/3","1/12"]; correct_index 2; distractor_misconceptions {"0":"FR_FRACTION_AS_TWO_NUMS","1":"NS_MAGNITUDE_MISJUDGE","3":"FR_FRACTION_AS_TWO_NUMS"} | UNCHANGED — stored row already equals the founder-verified source | Founder verified options exactly ["1/2","3/4","5/3","1/12"] with correct answer "5/3" -> index 2: the stored row already matches verbatim and the stem ("Which of the following fractions is the greatest?") is clean. All distractor_misconceptions indices (0, 1, 3) still point at distractors, so none are dropped and none invented. The UPDATE below only PINS the verified values — its divergence guard matches zero rows on the current bank, so it is a no-op here and a repair on any bank where the mojibake reconstruction differed. |
--
-- AGENTS.md §11: tenant-scoped UPDATEs in the established tenant-CTE
-- pattern. On a dev `supabase db reset` this migration is a no-op
-- (migrations run before seed.sql creates the tenant); the identical
-- statements are mirrored into supabase/seed.sql AFTER the round-1
-- founder-confirmed-content-fixes block. Every UPDATE carries an
-- idempotent guard, so either path (or both) produces the same final
-- state.

-- 1) SAM-L3-Q15 — source task is not multiple-choice: convert to
--    NUMERIC_ENTRY with the founder-verified answer "4/6". Stem is kept
--    verbatim (clean, expression already matches the source); the
--    invented options/correct_index/distractor_misconceptions are
--    dropped. Deactivated: fraction answer needs TEXT_ENTRY (PR #29) or
--    keypad slash — reactivate after merge. Guarded on the old format +
--    invented options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'NUMERIC_ENTRY'::question_format,
    content = jsonb_build_object(
      'stem', q.content ->> 'stem',
      'correct_answer', '4/6'),
    is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q15'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["4/12","6/12","4/6","5/6"]'::jsonb;

-- 2) SAM-L4-Q18 — pin the founder-verified options + correct_index. The
--    stored row already matches, so the divergence guard makes this a
--    no-op on the current bank (zero rows); it only fires where the
--    stored content drifted from the verified source. Stem and
--    distractor_misconceptions are untouched.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      jsonb_set(q.content, '{options}', '["1/2","3/4","5/3","1/12"]'::jsonb),
      '{correct_index}',
      '2'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L4-Q18'
  and q.format = 'MULTIPLE_CHOICE'
  and (q.content -> 'options' is distinct from '["1/2","3/4","5/3","1/12"]'::jsonb
       or q.content -> 'correct_index' is distinct from '2'::jsonb);
