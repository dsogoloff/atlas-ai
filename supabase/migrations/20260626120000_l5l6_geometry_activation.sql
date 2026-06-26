-- Atlas Assessment — activate L5/L6 image rows so the short test serves them (2026-06-26).
--
-- Cross-lane QA from ATLAS: the L5/L6 short test served no geometry. Root cause is ACTIVATION,
-- not the picker — these rows are is_active=false even though their crops are uploaded to the
-- private question-images bucket, image_path is already wired (20260625120200, merged in #169),
-- and short_test_eligible=true. The #161 coverage picker filters is_active FIRST, so they never
-- serve. This flips is_active=true.
--
-- These UPDATEs ONLY flip is_active; image_path is already persisted from #169. Every crop was
-- re-source-verified 2026-06-26 (worksheet page + answer-key PDF + the PNG) and confirmed
-- present on disk via the image preflight. content_id is already source-accurate on every row
-- and is NOT changed here — the V2026 sub-strand each resolves to:
--   * geometry      — SAM-L5-Q14 (l4-geometry-2, Squares & Rectangles), SAM-L5-Q26
--                     (l4-geometry-3, Symmetry), SAM-L6-Q31/Q32/Q33/Q34 (l6-geometry-1, Angles)
--   * area_volume   — SAM-L5-Q25 (l4-area_volume-1); SAM-L6-Q14/Q15/Q16 (l5-area_volume-1, area);
--                     SAM-L6-Q19/Q25 (l5-area_volume-4, volume)
--   * percentage    — SAM-L6-Q30 (l5-percentage-3, pie chart)
-- (SAM-L6-Q30 is percentage, not geometry — it is in ATLAS's list and is activated with its
-- correct percentage tag, improving percentage coverage; it is NOT re-tagged to geometry.)
--
-- SAM-L5-Q27 is already active (PR #169) — not re-touched. SAM-L5-Q24 / SAM-L6-Q18 are the
-- text-only rows, already active — left alone. SAM-L6-Q17 (draw top/side view) is a manual,
-- Short=N task never loaded — cannot be activated (no gradeable row); reported held.
--
-- Idempotent; tenant-scoped (no-op during `supabase db reset`; the dev/CI path is the seed
-- mirror). The bucket crops must be present before serving (per the QA report they are); a
-- missing bucket file would 500 at serve for a now-active row.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set is_active = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L5-Q14','SAM-L5-Q25','SAM-L5-Q26'
  );

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q set is_active = true
from t
where q.tenant_id = t.id
  and q.external_id in (
    'SAM-L6-Q14','SAM-L6-Q15','SAM-L6-Q16','SAM-L6-Q19','SAM-L6-Q25',
    'SAM-L6-Q30','SAM-L6-Q31','SAM-L6-Q32','SAM-L6-Q33','SAM-L6-Q34'
  );
