-- Atlas Assessment — founder-confirmed S.A.M. question content fixes.
--
-- Remediation FIX 1 (root-cause memo 2026-06-10 + MC re-derivation audit,
-- PR #28): corrects the three rows whose stored content diverges from the
-- printed worksheet source, as confirmed by the founder against the source
-- PDFs. PR #28's full-bank audit found the Stage-3 off-by-one ISOLATED
-- (1 MISMATCH / 31 MC), so only confirmed rows are touched here.
--
-- NO silent edits — full before/after table (also in the PR body):
--
-- | external_id | field                              | old                                                                  | new                                                                          | source evidence |
-- |-------------|------------------------------------|----------------------------------------------------------------------|------------------------------------------------------------------------------|-----------------|
-- | SAM-L3-Q11  | content.correct_index              | 1 ("9 × 3" = 27)                                                     | 0 ("9 × 2" = 18)                                                             | L3 answer key task 11 = "1" (bare 1-based option ordinal; option (1) is "9 × 2" = 18, matching the stem "equal to 18"). Stage 3's own review flag said "correct_index corrected to 0" while emitting 1. Founder confirmed. |
-- | SAM-L3-Q11  | content.distractor_misconceptions  | {"0":"OP_MULT_AS_REPEATED_ADD","2":"WP_OPERATION_SELECTION","3":"WP_OPERATION_SELECTION"} | {"2":"WP_OPERATION_SELECTION","3":"WP_OPERATION_SELECTION"}                  | Consequence of the index fix: option 0 is now the CORRECT option and must not carry a distractor code. No code is invented for option 1. misconception_tags unchanged. |
-- | SAM-L3-Q22  | format                             | NUMERIC_ENTRY                                                        | MULTIPLE_CHOICE                                                              | L3 worksheet page 14 prints options "(1) 1000 (2) 1001 (3) 9998 (4) 9999 ( )" for task 22 (PDF reading order put them after task 23's stem — root-cause memo M2). Founder: "MC where the worksheet gave options". |
-- | SAM-L3-Q22  | content                            | {"stem":"What is the greatest 4-digit even number?","correct_answer":"9998"} | {"stem":"What is the greatest 4-digit even number?","options":["1000","1001","9998","9999"],"correct_index":2} | Options transcribed VERBATIM from page-14 extraction text; key "3" (1-based) -> correct_index 2 -> "9998". Stem matches the page; misconception_tags preserved; distractor_misconceptions omitted (not confidently derivable). |
-- | SAM-L3-Q03  | content.options                    | ["8","80","800","8000"]                                              | ["8 ones","8 tens","8 hundreds","8 thousands"]                               | L3 worksheet page 4 prints "(1) 8 ones (2) 8 tens (3) 8 hundreds (4) 8 thousands" verbatim (root-cause memo M4: model reconstructed value-equivalent options when the block was attributed to task 4). correct_index stays 2 -> "8 hundreds" = key "3". |
--
-- FLAGGED-FOR-FOUNDER (NOT changed here — page text is mojibake, options
-- cannot be transcribed from extraction text): SAM-L3-Q15, SAM-L4-Q18.
-- See the PR body for the quoted page evidence.
--
-- AGENTS.md §11: tenant-scoped UPDATEs in the established tenant-CTE
-- pattern. On a dev `supabase db reset` this migration is a no-op
-- (migrations run before seed.sql creates the tenant); the identical
-- statements are mirrored into supabase/seed.sql AFTER the stage4
-- generated marker block. Every UPDATE carries an idempotent guard on the
-- old value, so either path (or both) produces the same final state.

-- 1) SAM-L3-Q11 — correct_index 1 -> 0; drop the distractor code that now
--    sits on the correct option. Guarded on the old index.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content #- '{distractor_misconceptions,0}',
      '{correct_index}',
      '0'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q11'
  and q.format = 'MULTIPLE_CHOICE'
  and (q.content ->> 'correct_index')::int = 1;

-- 2) SAM-L3-Q22 — restore to MULTIPLE_CHOICE with the verbatim page-14
--    options; key "3" (1-based) -> correct_index 2. Stem kept as loaded
--    (it matches the page). Guarded on the old format + stored answer.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = jsonb_build_object(
      'stem', q.content ->> 'stem',
      'options', '["1000","1001","9998","9999"]'::jsonb,
      'correct_index', 2)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q22'
  and q.format = 'NUMERIC_ENTRY'
  and q.content ->> 'correct_answer' = '9998';

-- 3) SAM-L3-Q03 — replace the model-reconstructed value-equivalent options
--    with the verbatim printed option text. correct_index 2 still points
--    at the key's option ("8 hundreds" = key "3"). Guarded on the old
--    options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["8 ones","8 tens","8 hundreds","8 thousands"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q03'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["8","80","800","8000"]'::jsonb;
