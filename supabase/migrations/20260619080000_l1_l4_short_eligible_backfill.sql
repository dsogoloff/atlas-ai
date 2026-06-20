-- Atlas Assessment — L1–L4 short_test_eligible backfill (lane/l1-l4-short-eligible-backfill).
--
-- The stage4 loader (20260610151306_load_sam_questions.sql) and the full-library
-- delta (20260611134158) both predate the questions.short_test_eligible column
-- (added 20260616120050_add_short_test_eligible_column.sql for the L0 work), so
-- every SAM-L1/L2/L3/L4 row defaults to short_test_eligible=false. The short /
-- readiness picker filters `short_test_eligible = true`, so NO L1–L4 item can be
-- drawn into the short test today.
--
-- This sets short_test_eligible from each level doc's last-page QUESTION SUMMARY
-- "Short (Y/N)" column (the founder-authored key), keyed by external_id. Only
-- rows whose Short=Y are flipped to true; Short=N rows are left at the default
-- false. TARGETED + NON-DESTRUCTIVE: only short_test_eligible is written, and only
-- on the enumerated external_ids — no stem / format / answer / level / strand /
-- content_id is touched (the L2-Q17 banding duplicate is reported separately, NOT
-- fixed here). Idempotent: re-running sets the same booleans.
--
-- AGENTS.md §11 parity: prod path here; the identical UPDATEs are mirrored into
-- supabase/seed.sql (dev/CI path) before the LOCAL-DEV QA SEED marker.
--
-- Only existing rows are listed. Key Short=Y tasks with NO loaded row (skipped by
-- the converter) are intentionally omitted and recorded in the PR:
--   L3-Q04, L3-Q23 (key Y, no DB row); L4-Q17 (key Y, no DB row).
-- L4 doc carries symbol-font glyphs; its Short column was read cleanly under
-- PYTHONIOENCODING=utf-8 (no L4 rows skipped on glyph grounds).

-- L1 — Short=Y (17 of 28 tasks)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L1-Q01','SAM-L1-Q02','SAM-L1-Q03','SAM-L1-Q04','SAM-L1-Q05',
    'SAM-L1-Q06','SAM-L1-Q07','SAM-L1-Q08','SAM-L1-Q10','SAM-L1-Q12',
    'SAM-L1-Q17','SAM-L1-Q18','SAM-L1-Q21','SAM-L1-Q22','SAM-L1-Q23',
    'SAM-L1-Q24','SAM-L1-Q28'
  );

-- L2 — Short=Y (21 of 22 tasks; only Q08 is N)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L2-Q01','SAM-L2-Q02','SAM-L2-Q03','SAM-L2-Q04','SAM-L2-Q05',
    'SAM-L2-Q06','SAM-L2-Q07','SAM-L2-Q09','SAM-L2-Q10','SAM-L2-Q11',
    'SAM-L2-Q12','SAM-L2-Q13','SAM-L2-Q14','SAM-L2-Q15','SAM-L2-Q16',
    'SAM-L2-Q17','SAM-L2-Q18','SAM-L2-Q19','SAM-L2-Q20','SAM-L2-Q21',
    'SAM-L2-Q22'
  );

-- L3 — Short=Y, existing rows (18; key Y for Q04/Q23 too but those have no DB row)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L3-Q01','SAM-L3-Q03','SAM-L3-Q05','SAM-L3-Q06','SAM-L3-Q07',
    'SAM-L3-Q08','SAM-L3-Q09','SAM-L3-Q10','SAM-L3-Q11','SAM-L3-Q12',
    'SAM-L3-Q13','SAM-L3-Q14','SAM-L3-Q17','SAM-L3-Q18','SAM-L3-Q19',
    'SAM-L3-Q20','SAM-L3-Q21','SAM-L3-Q22'
  );

-- L4 — Short=Y, existing rows (24; key Y for Q17 too but it has no DB row)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L4-Q01','SAM-L4-Q02','SAM-L4-Q03','SAM-L4-Q04','SAM-L4-Q05',
    'SAM-L4-Q06','SAM-L4-Q07','SAM-L4-Q08','SAM-L4-Q09','SAM-L4-Q10',
    'SAM-L4-Q11','SAM-L4-Q12','SAM-L4-Q13','SAM-L4-Q14','SAM-L4-Q15',
    'SAM-L4-Q16','SAM-L4-Q20','SAM-L4-Q21','SAM-L4-Q22','SAM-L4-Q23',
    'SAM-L4-Q24','SAM-L4-Q25','SAM-L4-Q26','SAM-L4-Q27'
  );
