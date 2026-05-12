-- =============================================================================
-- Item #12 Phase 5 — strand taxonomy row-level audit
-- =============================================================================
--
-- Phase 2's default-cast (CASE expression on the strand enum migration) gave
-- every row a syntactically valid new band, but some rows landed in a band
-- chosen for safety, not diagnostic accuracy. Phase 5 audits the 5 deferred
-- rows and corrects them via UPDATE.
--
-- Per AGENTS.md §11: every row update in this file is mirrored verbatim in
-- supabase/seed.sql, because `supabase db reset` runs migrations BEFORE
-- seed.sql. In dev/CI the migration's tenant-scoped UPDATE is a no-op (the
-- inspirea_singapore_math tenant doesn't exist yet); seed.sql is the dev
-- write path. The migration is the production-update path.
--
-- =============================================================================
-- Row 1: MD_CHART_SCALE misconception
-- =============================================================================
--
-- Phase 2 default-cast MEASUREMENT_DATA → measurement. MD_CHART_SCALE is a
-- chart/scale-reading misconception that belongs in data_statistics (the new
-- band carved out of MEASUREMENT_DATA in Item #12), not measurement.

update misconceptions m
  set strand = 'data_statistics'
  from tenants t
  where t.slug = 'inspirea_singapore_math'
    and m.tenant_id = t.id
    and m.code = 'MD_CHART_SCALE';
