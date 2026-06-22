-- ============================================================================
-- prod-tenant-bootstrap.sql — AUDITED production tenant + center bootstrap.
--
-- WHAT THIS DOES
--   Inserts exactly two CONFIG rows into the PRODUCTION database:
--     1. the single v1 tenant  (slug = 'inspirea_singapore_math')
--     2. one ACTIVE center      (name = 'S.A.M Upper East Side') for that tenant
--   Values mirror supabase/seed.sql so prod matches local. No demo
--   parents/children/consent rows, no question/content rows — config only.
--
-- WHY IT EXISTS
--   The tenant + center rows live ONLY in supabase/seed.sql, which is loaded by
--   `supabase db reset` for local/CI and is NEVER applied to production
--   (seed.sql header: "Production seed is a separate, audited process"). No
--   migration inserts them either. So in prod the `tenants` table is empty, and
--   the signup server action (src/app/(auth)/signup/actions.ts) resolves the
--   tenant by slug lookup — an empty table makes it return
--   "Tenant unavailable. Try again in a moment." This file IS that separate,
--   audited prod seed for the two operational rows the app needs to function.
--
-- RUN CONTEXT (founder-attended — NOT run by the agent, NOT a migration)
--   Run once against the PRODUCTION Supabase project, e.g. via the Supabase
--   Studio SQL editor or `psql` against the prod connection string. Do NOT run
--   the whole local seed.sql against prod — it also inserts demo + placeholder
--   content. Re-running THIS file is safe: both inserts are idempotent.
--
-- IDEMPOTENCY
--   - tenant: ON CONFLICT (slug) DO NOTHING (slug is UNIQUE).
--   - center: WHERE NOT EXISTS any ACTIVE center for the tenant, so a re-run
--     can never create a second ACTIVE center (the signup action throws if it
--     finds more than one ACTIVE center for the tenant).
-- ============================================================================

-- 1. Single v1 tenant. Matches seed.sql.
insert into tenants (slug, display_name)
values ('inspirea_singapore_math', 'Inspirea Labs — Singapore Math (S.A.M. v1)')
on conflict (slug) do nothing;

-- 2. One ACTIVE center for that tenant. Matches seed.sql. Guarded so a re-run
--    never produces a second ACTIVE center for this tenant.
insert into centers (tenant_id, name, status)
select t.id, 'S.A.M Upper East Side', 'ACTIVE'::center_status
from tenants t
where t.slug = 'inspirea_singapore_math'
  and not exists (
    select 1
    from centers c
    where c.tenant_id = t.id
      and c.status = 'ACTIVE'::center_status
  );
