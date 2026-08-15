-- ATLAS-007 — single-use recovery codes for staff MFA.
--
-- WHY THIS TABLE EXISTS
-- ---------------------
-- Supabase Auth MFA has NO native recovery/backup codes (verified against the
-- current MFA guide, 2026-08-14 — the docs have no such concept and offer no
-- guidance for a user who loses every enrolled factor). ATLAS-007 makes MFA a
-- hard requirement for staff, and the pilot has exactly one admin and no staff
-- invite flow, so "lost authenticator" would otherwise mean the founder hand-
-- editing auth tables. These codes are that escape hatch.
--
-- WHAT A RECOVERY CODE CAN AND CANNOT DO
-- --------------------------------------
-- It CANNOT mint an AAL2 session: Supabase only elevates assurance through
-- mfa.verify() against a real factor, and there is deliberately no way around
-- that. So redemption does NOT log anyone in at AAL2. It authorises exactly one
-- thing — dropping the lost factor so the holder can enrol a new one:
--
--   redeem code  ->  server deletes the stale factor (admin API, service role)
--                ->  user falls back to aal1/aal1  ->  /mfa/enrol  ->  aal2
--
-- That keeps the security property intact: privileged access still requires a
-- freshly verified TOTP factor, never a stored secret alone.
--
-- STORAGE
-- -------
-- Codes are hashed (SHA-256, hex) by the application before they ever reach the
-- database; the plaintext is displayed to the staff member exactly once at
-- enrolment and never persisted. The codes are high-entropy random strings, so
-- an unsalted digest is appropriate here — this is not a password, and a salt
-- per row would prevent the O(1) lookup redemption needs.
--
-- ACCESS
-- ------
-- No client write path. RLS grants the owner SELECT only (so the UI can show
-- "N codes remaining" without revealing anything useful — the column is a
-- digest). Issuing and redeeming both go through SECURITY DEFINER functions
-- that verify the caller is ACTIVE staff and operate only on their OWN rows.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Purely additive: one new table plus two functions. No existing object is
-- altered. Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). Nothing to backfill:
-- staff generate codes the first time they enrol, which the hard cutover forces
-- at their next sign-in anyway.
--
-- ROLLBACK
-- --------
--   drop function if exists redeem_staff_recovery_code(text);
--   drop function if exists issue_staff_recovery_codes(text[]);
--   drop table if exists staff_mfa_recovery_codes;
-- Dropping these does not lock anyone out — it only removes the escape hatch.

-- =============================================================================
-- Table
-- =============================================================================

create table if not exists staff_mfa_recovery_codes (
  id           uuid primary key default gen_random_uuid(),
  -- Intentional non-FK to auth.users, matching the architecture guardrail the
  -- rest of the schema follows (parents.auth_user_id and instructors.auth_user_id
  -- are the same shape) so the auth provider can change without a schema change.
  auth_user_id uuid        not null,
  code_hash    text        not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now(),
  constraint staff_mfa_recovery_codes_unique unique (auth_user_id, code_hash)
);

create index if not exists staff_mfa_recovery_codes_user_idx
  on staff_mfa_recovery_codes (auth_user_id)
  where used_at is null;

comment on table staff_mfa_recovery_codes is
  'ATLAS-007: hashed single-use recovery codes. Redeeming one authorises dropping a lost MFA factor — it never grants AAL2 by itself.';

alter table staff_mfa_recovery_codes enable row level security;

drop policy if exists "staff_recovery_codes_self_select" on staff_mfa_recovery_codes;
create policy "staff_recovery_codes_self_select" on staff_mfa_recovery_codes
  for select using (auth_user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policy: every write goes through the SECURITY
-- DEFINER functions below, so a client cannot mint itself a code or un-use one.
revoke insert, update, delete on staff_mfa_recovery_codes from authenticated, anon;

-- =============================================================================
-- Helper — is the caller ACTIVE staff?
-- =============================================================================
-- Reuses the existing ACTIVE-only resolvers rather than re-querying the tables,
-- so "who counts as staff" has exactly one definition.

create or replace function app_caller_is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_current_instructor_id() is not null
      or app_current_admin_tenant_id() is not null;
$$;

-- =============================================================================
-- Issue — replaces the caller's codes with a fresh set
-- =============================================================================
-- Called at enrolment. Replacing rather than appending means the codes shown on
-- screen are the complete set, and a re-enrolment invalidates anything printed
-- earlier.

create or replace function issue_staff_recovery_codes(p_hashes text[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_hash text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'issue_staff_recovery_codes: no authenticated user'
      using errcode = 'insufficient_privilege';
  end if;

  if not app_caller_is_active_staff() then
    raise exception 'issue_staff_recovery_codes: caller is not active staff'
      using errcode = 'insufficient_privilege';
  end if;

  if p_hashes is null or array_length(p_hashes, 1) is null then
    raise exception 'issue_staff_recovery_codes: no codes supplied'
      using errcode = 'check_violation';
  end if;

  delete from staff_mfa_recovery_codes where auth_user_id = v_user;

  foreach v_hash in array p_hashes loop
    insert into staff_mfa_recovery_codes (auth_user_id, code_hash)
    values (v_user, v_hash);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- =============================================================================
-- Redeem — consume ONE unused code, atomically
-- =============================================================================
-- The UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) shape is
-- what makes single-use hold under concurrency: two simultaneous redemptions of
-- the same code cannot both observe it as unused.

create or replace function redeem_staff_recovery_code(p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'redeem_staff_recovery_code: no authenticated user'
      using errcode = 'insufficient_privilege';
  end if;

  if not app_caller_is_active_staff() then
    raise exception 'redeem_staff_recovery_code: caller is not active staff'
      using errcode = 'insufficient_privilege';
  end if;

  update staff_mfa_recovery_codes
     set used_at = now()
   where id = (
     select c.id
       from staff_mfa_recovery_codes c
      where c.auth_user_id = v_user
        and c.code_hash = p_code_hash
        and c.used_at is null
      for update skip locked
      limit 1
   )
  returning id into v_id;

  return v_id is not null;
end;
$$;

-- Signed-in staff only. 20260613000000_restore_standard_role_grants.sql grants
-- EXECUTE on all routines to anon, so these REVOKEs are load-bearing.
revoke all on function app_caller_is_active_staff() from public, anon;
revoke all on function issue_staff_recovery_codes(text[]) from public, anon;
revoke all on function redeem_staff_recovery_code(text) from public, anon;

grant execute on function app_caller_is_active_staff() to authenticated;
grant execute on function issue_staff_recovery_codes(text[]) to authenticated;
grant execute on function redeem_staff_recovery_code(text) to authenticated;
