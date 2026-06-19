-- Atlas Assessment — L3+ source-vs-authored audit fixes (2026-06-19).
-- (lane/audit-L3plus)
--
-- Source-verified against the Stage-1 page renders:
--   Level 5/6: scripts/conversion/output/Level {5,6} Placement Worksheet{,  Answer Key}/page-*.png
--   (Level 3/4 renders were also reviewed; their authored rows either already
--    match the source or were previously founder-touched — see the audit table
--    scripts/conversion/audit/L3plus-audit.md and the BLOCKED notes there.)
--
-- Only CLEAR-CUT discrepancies with an actually-viewed source page are fixed
-- here. Every UPDATE carries an idempotent guard on the old (buggy) value, so a
-- re-run is a no-op, and so the fix only fires on the exact drifted content.
-- Non-destructive: targeted UPDATEs WHERE external_id = ... (+ tenant). Mirrored
-- verbatim into supabase/seed.sql. AGENTS.md Section 11 parity: this migration is
-- a no-op on dev `supabase db reset` (the tenant is created later by seed.sql);
-- the seed.sql mirror applies it on the dev path, on prod the tenant exists.
--
-- BLOCKED / not touched here (founder-verified rows that contradict the now-
-- available source page — do NOT auto-override a founder decision; flagged for
-- founder review in the audit table):
--   * SAM-L3-Q15 — stored "1/6 + 3/6" → "4/6"; source page 10 is "3/5 + 1/5" → 4/5.
--   * SAM-L4-Q18 — stored options [1/2,3/4,5/3,1/12] ans 5/3; source page 10 is
--     [3/8,2/5,1/2,5/12] ans 1/2.

-- 1) SAM-L5-Q09 — stem fractions disagree with source page 6. Stored stem says
--    "1 1/4 kg of flour and 1 1/6 kg of butter"; the source is "1 3/4 kg of
--    flour and 1 5/6 kg of butter". The stored answer ("5 1/12") already matches
--    the source key and is only correct for the SOURCE fractions (3/2+7/4+11/6 =
--    61/12 = 5 1/12), so we fix the stem to the source and keep the answer.
--    Guarded on the old (buggy) stem fractions.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{stem}',
      to_jsonb('Patricia used 1¹⁄₂ kg of sugar, 1³⁄₄ kg of flour and 1⁵⁄₆ kg of butter to make a cake. What was the total mass of ingredients used?'::text))
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L5-Q09'
  and q.content ->> 'stem' = 'Patricia used 1¹⁄₂ kg of sugar, 1¹⁄₄ kg of flour and 1¹⁄₆ kg of butter to make a cake. What was the total mass of ingredients used?';

-- 2) SAM-L6-Q07 — "which is NOT the correct answer?" Source page 6 options are
--    (1) 4 × 10  (2) 10 ÷ 4  (3) 1/4 of 10  (4) 10 × 1/4 ; answer key (1).
--    The stored row had option[0] "4 ÷ 10" (operator flipped from the source's
--    "4 × 10") and option[2] "10/4" (reworded from "1/4 of 10"). correct_index 0
--    still points at the printed "not-correct" option; restore verbatim source
--    option text. Guarded on the old options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["4 × 10","10 ÷ 4","1/4 of 10","10 × 1/4"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L6-Q07'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["4 ÷ 10","10 ÷ 4","10/4","10 × 1/4"]'::jsonb;

-- 3) SAM-L6-Q20 — "1.08 as a fraction in its simplest form". Source page 14
--    options are (1) 108/100 (2) 1 4/50 (3) 1 2/25 (4) 1 4/5 ; answer key (3) =
--    "1 2/25". The stored row had garbled, partly-duplicated options
--    ["1 2/25","1 4/50","1 8/100","1 2/25"] with correct_index 2 pointing at the
--    WRONG, unsimplified value "1 8/100". Restore verbatim source options; with
--    them, correct_index 2 correctly selects "1 2/25". Guarded on the old options.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["108/100","1 4/50","1 2/25","1 4/5"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L6-Q20'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["1 2/25","1 4/50","1 8/100","1 2/25"]'::jsonb;
