-- Atlas Assessment — L2-Q1 (SAM-L1-Q28) ordering-tile stem rework (lane/qa-crosswalk-l1l2).
--
-- CONVERSION-only content correction from the QA play-through. The QA brief's
-- "L2-Q1" maps by served order (replayed via the crosswalk in
-- scripts/conversion/audit/served-crosswalk.md) to SAM-L1-Q28 — the QA Level-2
-- test's first served item — NOT to external_id SAM-L2-Q01.
--
-- Source-verified against "Level 1 Placement Worksheet.docx" task 28
-- ("Move the numbers in order from smallest to largest." with movable tiles
-- 17, 20, 10; answer 10, 17, 20). The numbers 17/20/10 are the OPERANDS to
-- arrange — kept as orderable tiles, NOT deleted.
--
-- Fix: SAM-L1-Q28 was already DRAG_DROP (tile-ordering) from
-- 20260610170100, but its stem was carried over verbatim from the original
-- NUMERIC_ENTRY row and still embedded the literal numbers
-- ("Write the numbers in order. Begin with the smallest. 17   20   10"),
-- duplicating the tiles on screen. Reword the stem to the source-faithful
-- "Arrange the numbers in order, from smallest to largest." (direction kept so
-- the ascending answer is unambiguous). items[] stays in worksheet
-- presentation order (17, 20, 10) — distinct from the answer order, so the
-- tiles still serve shuffled; correct_order stays the parsed key (10, 17, 20).
-- Grading (DRAG_DROP correct_order, src/lib/responseSubmit/correctness.ts) and
-- the format are unchanged in effect.
--
-- Non-destructive: single targeted UPDATE by external_id (+ tenant); is_active /
-- level / strand / short_test_eligible untouched. Idempotent. Mirrored verbatim
-- into supabase/seed.sql. AGENTS.md §11 parity: no-ops on dev `supabase db reset`
-- (tenant created later by seed.sql); the seed.sql mirror applies it on the dev
-- path; prod applies here. No new image asset.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'DRAG_DROP',
    content = '{"stem":"Arrange the numbers in order, from smallest to largest.","items":["17","20","10"],"correct_order":["10","17","20"]}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q28';
