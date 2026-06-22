-- ============================================================================
-- fix-prod-centers.sql — converge tenant to EXACTLY ONE ACTIVE center.
--
-- WHAT HAPPENED
--   Production ended up with 4 ACTIVE centers for tenant
--   c939c2ff-6b4b-46dc-b50e-97338932143f. The signup server action
--   (src/app/(auth)/signup/actions.ts) requires EXACTLY ONE ACTIVE center and
--   throws loudly when it finds more than one, so signup is blocked. The
--   duplicates came from an UN-guarded insert path (manual prod-config attempts
--   and/or seed.sql's plain `insert into centers`), NOT from the audited
--   prod-tenant-bootstrap.sql — that file's center insert is guarded by
--   `WHERE NOT EXISTS (any ACTIVE center for the tenant)`, so re-running it
--   alone cannot create a second ACTIVE center.
--
-- WHAT THIS DOES
--   Keeps the canonical "S.A.M Upper East Side" center (the one the bootstrap
--   intended) ACTIVE and sets every OTHER center for the tenant to INACTIVE.
--   The keeper is chosen deterministically: name = 'S.A.M Upper East Side',
--   then OLDEST created_at, tie-broken by id — so the result is identical on
--   every run even if the name itself was duplicated.
--
-- IDEMPOTENT / SAFE
--   Re-running always converges to exactly one ACTIVE center and NEVER zero:
--   the keeper is force-set ACTIVE first, and the deactivate step only runs
--   when a keeper actually exists (guarded), so it can never deactivate the
--   whole tenant.
--
-- ENUM VALUES (verified, do not guess)
--   public.center_status = enum ('ACTIVE', 'INACTIVE')
--   — supabase/migrations/20260426000000_initial_schema.sql:21
--   centers columns: id, tenant_id, name, status, created_at
--   — supabase/migrations/20260426000000_initial_schema.sql:78-84
--
-- RUN CONTEXT (founder-attended — NOT run by the agent, NOT a migration)
--   Run once against PRODUCTION (Supabase Studio SQL editor or psql on the prod
--   connection string). Run STEP 1 (the inspect SELECT) by itself FIRST to see
--   the 4 rows before changing anything; then run STEP 2 (the fix); then STEP 3
--   to confirm exactly one ACTIVE remains.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — INSPECT FIRST. Run this SELECT on its own before STEP 2.
-- Shows every center for the tenant so you can SEE the 4 before any change.
-- ----------------------------------------------------------------------------
-- select id, name, status, created_at
-- from centers
-- where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
-- order by
--   (name = 'S.A.M Upper East Side') desc,  -- canonical keeper candidates first
--   created_at asc,                          -- then oldest
--   id asc;


-- ----------------------------------------------------------------------------
-- STEP 2 — THE FIX. Converges to exactly one ACTIVE center.
-- ----------------------------------------------------------------------------

-- 2a. Force the keeper ACTIVE first, so there is always >= 1 ACTIVE center
--     throughout (guarantees we can never land on zero).
with keeper as (
  select id
  from centers
  where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
    and name = 'S.A.M Upper East Side'
  order by created_at asc, id asc
  limit 1
)
update centers c
set status = 'ACTIVE'::center_status
where c.id = (select id from keeper)
  and c.status <> 'ACTIVE'::center_status;

-- 2b. Deactivate every OTHER center for the tenant. The `exists (select 1 from
--     keeper)` guard means this only runs when a keeper was found, so it can
--     never deactivate all rows (never zero ACTIVE).
with keeper as (
  select id
  from centers
  where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
    and name = 'S.A.M Upper East Side'
  order by created_at asc, id asc
  limit 1
)
update centers c
set status = 'INACTIVE'::center_status
where c.tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
  and exists (select 1 from keeper)
  and c.id <> (select id from keeper)
  and c.status <> 'INACTIVE'::center_status;


-- ----------------------------------------------------------------------------
-- STEP 3 — VERIFY. Expect exactly one row, status ACTIVE.
-- ----------------------------------------------------------------------------
-- select id, name, status, created_at
-- from centers
-- where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
--   and status = 'ACTIVE'::center_status;
