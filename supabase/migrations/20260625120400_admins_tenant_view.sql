-- Admin (tenant-wide) staff view.
--
-- An admin sees EVERY child in their tenant, across all centers — functionally
-- the instructor surface at tenant scope (one center exists today; built for
-- many). This migration is ADDITIVE: it does NOT alter any existing instructor
-- policy. It adds the `admins` table, an auth.uid()-scoped tenant resolver, and
-- a parallel SELECT path on children / assessment_sessions / pedagogical_notes.
-- Postgres ORs permissive SELECT policies, so an instructor still sees their
-- center via the instructor policy and an admin sees the whole tenant via the
-- admin policy — neither weakens the other.

-- =============================================================================
-- admins — one staff role per tenant with tenant-wide read. Mirrors the
-- instructors table shape, minus center_id (admins are not center-scoped).
-- =============================================================================

create type admin_status as enum ('ACTIVE', 'INACTIVE');

create table admins (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  tenant_id     uuid not null references tenants (id) on delete cascade,
  email         text not null,
  name          text not null,
  status        admin_status not null default 'ACTIVE',
  created_at    timestamptz not null default now()
);

create index admins_tenant_id_idx on admins (tenant_id);

alter table admins enable row level security;

-- Self-read only (mirrors instructors_self_select). An admin resolves their
-- own row; the table is never broadly readable.
create policy "admins_self_select" on admins
  for select using (auth_user_id = auth.uid());

-- =============================================================================
-- app_current_admin_tenant_id() — tenant_id of the calling ACTIVE admin, else
-- null. SECURITY DEFINER so RLS policies can consult `admins` (which is itself
-- RLS-protected) from within a USING clause. The body is auth.uid()-scoped and
-- status-gated, so it only ever returns the CALLER's own tenant — it cannot be
-- coerced into returning another user's tenant. Mirrors app_current_instructor_id().
-- =============================================================================

create or replace function app_current_admin_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from admins
  where auth_user_id = auth.uid() and status = 'ACTIVE';
$$;

-- =============================================================================
-- ADDITIVE admin SELECT policies — tenant-wide read for the admin roster and
-- the shared student-detail view. A non-admin caller gets NULL from
-- app_current_admin_tenant_id(), and `tenant_id = null` is never true, so these
-- policies match no rows for instructors/parents (they keep their own policies).
-- No INSERT/UPDATE/DELETE policies: admins are read-only at the DB layer (note
-- authoring stays instructor-only, gated by the unchanged instructor policies).
-- =============================================================================

create policy "children_admin_select" on children
  for select using (tenant_id = app_current_admin_tenant_id());

create policy "assessment_sessions_admin_select" on assessment_sessions
  for select using (tenant_id = app_current_admin_tenant_id());

create policy "pedagogical_notes_admin_select" on pedagogical_notes
  for select using (tenant_id = app_current_admin_tenant_id());
