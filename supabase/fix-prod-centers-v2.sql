-- ============================================================================
-- fix-prod-centers-v2.sql — converge tenant to EXACTLY ONE ACTIVE center,
--                           which must be the REAL UES center.
--
-- WHAT HAPPENED (supersedes fix-prod-centers.sql / PR #130)
--   Inspection of PRODUCTION showed the 4 ACTIVE centers for tenant
--   c939c2ff-6b4b-46dc-b50e-97338932143f are ALL seed.sql placeholders —
--   none is the real center:
--     02a3ed17-64dd-47e2-b5cf-aa51046433b6  Placeholder Center — Singapore HQ
--     1e876d60-2cdf-4e46-863f-3c24df18a94a  Placeholder Center — Online
--     54eefef2-8fdd-494d-9357-a0afa6fc4ebe  Placeholder Center — East
--     fdce07d4-a3f6-4993-a0a7-4072982b0892  Placeholder Center — North
--   There is NO 'S.A.M Upper East Side' row. #127's guarded bootstrap insert
--   correctly SKIPPED (it only inserts when no ACTIVE center exists, and these
--   placeholders were already ACTIVE). So prod has the WRONG centers AND is
--   MISSING the right one. v1 (PR #130) assumed the UES row existed and only
--   deactivated extras — wrong for this state. This v2 INSERTS the UES center
--   first, then deactivates the placeholders.
--
-- WHAT THIS DOES
--   1. Inserts the canonical 'S.A.M Upper East Side' center (ACTIVE) for the
--      tenant if it does not already exist (idempotent by name+tenant).
--   2. Forces that UES center ACTIVE (covers a pre-existing-but-inactive row).
--   3. Deactivates EVERY OTHER center for the tenant — the 4 placeholders and,
--      defensively, any ACTIVE center whose name <> 'S.A.M Upper East Side'.
--   Result: exactly one ACTIVE center, named 'S.A.M Upper East Side'.
--
-- IDEMPOTENT / NEVER-ZERO
--   Re-running always converges to exactly one ACTIVE center and NEVER zero:
--   the UES keeper is inserted + force-set ACTIVE BEFORE anything is
--   deactivated, and the deactivate step is guarded on a keeper existing, so it
--   can never deactivate the whole tenant. Keeper is chosen deterministically
--   (name = 'S.A.M Upper East Side', oldest created_at, id tie-break) so even a
--   duplicated UES name converges to a single ACTIVE row.
--
-- ENUM / COLUMNS (verified, do not guess)
--   public.center_status = enum ('ACTIVE', 'INACTIVE')
--   — supabase/migrations/20260426000000_initial_schema.sql:21
--   centers columns: id, tenant_id, name, status, created_at
--   (id default gen_random_uuid(); created_at default now(); NOT-NULL no-default
--    cols are tenant_id + name)
--   — supabase/migrations/20260426000000_initial_schema.sql:78-84
--
-- RUN CONTEXT (founder-attended — NOT run by the agent, NOT a migration)
--   Run once against PRODUCTION (Supabase Studio SQL editor or psql on the prod
--   connection string). Run STEP 1 (inspect) by itself FIRST; then STEP 2 (the
--   fix); then STEP 3 to confirm exactly one ACTIVE remains, named UES.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — INSPECT FIRST. Run this SELECT on its own before STEP 2.
-- ----------------------------------------------------------------------------
-- select id, name, status, created_at
-- from centers
-- where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
-- order by
--   (name = 'S.A.M Upper East Side') desc,  -- canonical keeper candidates first
--   created_at asc,
--   id asc;


-- ----------------------------------------------------------------------------
-- STEP 2 — THE FIX. Converges to exactly one ACTIVE center = UES.
-- ----------------------------------------------------------------------------

-- 2a. Insert the canonical UES center if it does not already exist (by
--     name + tenant). Matches #127's bootstrap intent. Idempotent.
insert into centers (tenant_id, name, status)
select
  'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid,
  'S.A.M Upper East Side',
  'ACTIVE'::center_status
where not exists (
  select 1
  from centers
  where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
    and name = 'S.A.M Upper East Side'
);

-- 2b. Force the UES keeper ACTIVE (covers a pre-existing-but-inactive UES row).
--     Guarantees >= 1 ACTIVE center exists BEFORE any deactivation below.
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

-- 2c. Deactivate every OTHER center for the tenant (the 4 placeholders, plus
--     defensively any non-UES active row and any duplicate UES). The
--     `exists (select 1 from keeper)` guard means this only runs once a keeper
--     is present, so it can never deactivate all rows (never zero ACTIVE).
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
-- STEP 3 — VERIFY. Expect exactly ONE row: 'S.A.M Upper East Side', ACTIVE.
-- ----------------------------------------------------------------------------
-- select id, name, status, created_at
-- from centers
-- where tenant_id = 'c939c2ff-6b4b-46dc-b50e-97338932143f'::uuid
--   and status = 'ACTIVE'::center_status;
