-- Atlas Assessment — L5/L6 short_test_eligible from the Question Summary key (2026-06-23).
--
-- The L5/L6 question rows were loaded by a prior conversion run with source-correct
-- content + answers, but the loader's INSERT carried no short_test_eligible column, so
-- every L5/L6 row defaulted to false. This sets short_test_eligible STRICTLY from each
-- worksheet's last-page "Short Test" column (source-verified against the rendered
-- Question Summary + the answer-key PDF, 2026-06-23):
--   * L5 (30 tasks): Short = Y for all EXCEPT Task 12 ("Drawing angles to 180°" — manual
--     draw, no auto-grade). Q01/Q10/Q16/Q18 are not yet loaded (prior-run skips) — omitted.
--   * L6 (38 tasks): Short = Y for all EXCEPT Task 17 (draw solid views) and Task 35
--     (draw parallelogram) — both manual draw. Q17/Q22/Q27/Q35 are not yet loaded — omitted.
-- Explicit IN-lists (not LIKE) so every id named here is genuinely short-eligible in both
-- migration and seed (keeps the seed↔migration parity guard's id extraction honest).
-- Tenant-scoped (no-ops on `supabase db reset`; the dev/CI path is the seed mirror).
-- Idempotent. Image-essential rows stay is_active=false until curated crops are wired —
-- short_test_eligible=true is correct (the picker also requires is_active=true to serve).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L5-Q02','SAM-L5-Q03','SAM-L5-Q04','SAM-L5-Q05','SAM-L5-Q06','SAM-L5-Q07',
    'SAM-L5-Q08','SAM-L5-Q09','SAM-L5-Q11','SAM-L5-Q13','SAM-L5-Q14','SAM-L5-Q15',
    'SAM-L5-Q17','SAM-L5-Q19','SAM-L5-Q20','SAM-L5-Q21','SAM-L5-Q22','SAM-L5-Q23',
    'SAM-L5-Q24','SAM-L5-Q25','SAM-L5-Q26','SAM-L5-Q27','SAM-L5-Q28','SAM-L5-Q29','SAM-L5-Q30'
  );

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L6-Q01','SAM-L6-Q02','SAM-L6-Q03','SAM-L6-Q04','SAM-L6-Q05','SAM-L6-Q06',
    'SAM-L6-Q07','SAM-L6-Q08','SAM-L6-Q09','SAM-L6-Q10','SAM-L6-Q11','SAM-L6-Q12',
    'SAM-L6-Q13','SAM-L6-Q14','SAM-L6-Q15','SAM-L6-Q16','SAM-L6-Q18','SAM-L6-Q19',
    'SAM-L6-Q20','SAM-L6-Q21','SAM-L6-Q23','SAM-L6-Q24','SAM-L6-Q25','SAM-L6-Q26',
    'SAM-L6-Q28','SAM-L6-Q29','SAM-L6-Q30','SAM-L6-Q31','SAM-L6-Q32','SAM-L6-Q33',
    'SAM-L6-Q34','SAM-L6-Q36','SAM-L6-Q37','SAM-L6-Q38'
  );
