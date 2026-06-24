-- Atlas Assessment — L5/L6 re-leveling to the source booklet Level (2026-06-23).
--
-- Audit (scripts/conversion/audit/l5l6-conversion-status-2026-06-23.md + the leveling
-- audit) found the prior load derived the half-grade `level` from difficulty, so many
-- L5/L6 rows sit a booklet BELOW their source level and ZERO rows reach 6A/6B. This
-- corrects `level` to the source "Level" column of each worksheet's Question Summary
-- (booklet placement), verified against the rendered keys:
--   L5: tasks 1-27 = Level 4, tasks 28-30 = Level 5.
--   L6: tasks 1-35 = Level 5, tasks 36-38 = Level 6.
-- A/B SUB-SPLIT RULE: the source does not specify A vs B; preserve each row's existing
-- A/B sub-letter and replace only the booklet number (3A->4A, 4A->5A, 4B->5B, 5A->6A).
-- This keeps the within-booklet ordering the prior load already assigned.
--
-- Also fixes two content_id load errors uncovered by the audit (UPDATE, source-verified):
--   SAM-L5-Q22 ("___ seconds = 2 minutes" = Time) content_id l4-decimals-1 -> l3-measurement-2
--     (the V2026 taxonomy caps `measurement` at l3; l3-measurement-2 "Time" is the
--     highest Time node — the skill is a lower-grade review item in the L5 booklet).
--     Its `strand` was also mis-tagged fractions_decimals -> corrected to measurement.
--   SAM-L6-Q09 ("sum of 5 2/7 and 2 3/4" = add mixed numbers) content_id
--     l0b-whole_numbers-1 (gross error) -> l5-fractions-3 (strand fractions_decimals is
--     already correct, unchanged).
--
-- UPDATEs only (re-INSERT is dead: ON CONFLICT DO NOTHING). Applies to ALL loaded
-- matching rows (active or inactive) — level/content_id are row attributes independent
-- of activation. Does NOT touch short_test_eligible, content, or the 8 unloaded rows.
-- Tenant-scoped: no-ops on `supabase db reset` (tenant created later by seed); the
-- dev/CI path is the seed mirror. Idempotent.

-- ── L5: tasks 1-27 -> Level 4 (preserve A/B) ─────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '4A'::half_grade_level
from t where q.tenant_id = t.id
  and q.external_id in ('SAM-L5-Q02','SAM-L5-Q03','SAM-L5-Q15');

-- L5-Q22 (Time): -> Level 4 + correct strand/content_id (Time skill node)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '4A'::half_grade_level,
    strand = 'measurement'::strand,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l3-measurement-2')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L5-Q22';

-- ── L5: tasks 28-30 -> Level 5 ───────────────────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '5A'::half_grade_level
from t where q.tenant_id = t.id
  and q.external_id in ('SAM-L5-Q28','SAM-L5-Q29','SAM-L5-Q30');

-- ── L6: tasks 1-35 -> Level 5 (preserve A/B) ─────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '5A'::half_grade_level
from t where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L6-Q01','SAM-L6-Q02','SAM-L6-Q03','SAM-L6-Q04','SAM-L6-Q05','SAM-L6-Q07',
    'SAM-L6-Q08','SAM-L6-Q10','SAM-L6-Q11','SAM-L6-Q12','SAM-L6-Q13','SAM-L6-Q14',
    'SAM-L6-Q15','SAM-L6-Q18','SAM-L6-Q21','SAM-L6-Q23','SAM-L6-Q30'
  );

-- L6-Q20 was 4B -> 5B (preserve B)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '5B'::half_grade_level
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q20';

-- L6-Q09 (add mixed numbers): -> Level 5 + correct content_id
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '5A'::half_grade_level,
    content_id = (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = 'l5-fractions-3')
from t where q.tenant_id = t.id and q.external_id = 'SAM-L6-Q09';

-- ── L6: tasks 36-38 -> Level 6 (algebra) ─────────────────────────────────────
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set level = '6A'::half_grade_level
from t where q.tenant_id = t.id
  and q.external_id in ('SAM-L6-Q36','SAM-L6-Q37','SAM-L6-Q38');
