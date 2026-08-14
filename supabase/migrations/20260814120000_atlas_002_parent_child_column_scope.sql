-- ATLAS-002 — constrain WHICH COLUMNS a parent may mutate.
--
-- THE FINDING
-- -----------
-- Ownership-based RLS proved "this row belongs to the caller" but said nothing
-- about which COLUMNS the caller could set. Both parent-facing policies pinned
-- exactly one column:
--
--   parents_self_update  WITH CHECK (auth_user_id = auth.uid())
--   children_parent_all  WITH CHECK (parent_id   = app_current_parent_id())
--
-- Everything else was writable through the public PostgREST interface, which no
-- server action or frontend allowlist can protect. The sharpest consequence:
-- app_current_tenant_id() is defined as
--     select tenant_id from parents where auth_user_id = auth.uid()
-- so a parent who PATCHed their OWN parents.tenant_id redefined their own
-- tenant scope, and every tenant-scoped policy (tenants_member_select,
-- centers_tenant_select, ...) then evaluated against the attacker-chosen
-- tenant. That is privilege self-elevation, not just a data-integrity dent.
--
-- Secondary: children_parent_all is FOR ALL, so it also granted hard DELETE.
-- assessment_sessions.child_id and question_access_log.child_id are ON DELETE
-- CASCADE, so a parent could erase assessment history that #203 deliberately
-- retains for staff via soft-delete.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
--   1. parents  — drop the (entirely unused) self-update policy; revoke
--                 UPDATE/DELETE so a future stray policy cannot reopen it.
--   2. children — replace FOR ALL with explicit SELECT/INSERT/UPDATE policies.
--                 No DELETE policy: parent hard-delete is gone.
--   3. children — column-level UPDATE privileges. Postgres core enforces these
--                 regardless of RLS, PostgREST, or client, so this is the
--                 client-agnostic backstop.
--   4. children — BEFORE INSERT trigger deriving tenant_id / home_center_id
--                 from the parent row and forcing the lineage columns.
--   5. children — BEFORE UPDATE trigger forcing archived_by to the acting
--                 parent and re-checking the locked columns (belt and braces
--                 with 3; a raise here means 3 was bypassed or reverted).
--   6. Structural tenant consistency: composite FKs so child.tenant == parent
--                 .tenant and child.home_center is inside child.tenant.
--
-- LAYERING NOTE. 3 and 5 overlap on purpose. A parent PATCHing children.tenant_id
-- is refused by the column privilege (SQLSTATE 42501) before the trigger runs;
-- the trigger covers any path that regains table-level UPDATE. Tests assert
-- REJECTION, not a particular SQLSTATE, so either layer satisfies them.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Purely additive and non-destructive to DATA. It drops two POLICIES and
-- narrows PRIVILEGES; no column is dropped and no row is written. Written to be
-- re-runnable, so applying it twice in Studio is a no-op.
--
-- Composite FKs (step 6) were verified cleanly additive against live prod data
-- on 2026-08-14 before being included: 14 parents / 5 centers / 17 children,
-- zero violations of child.tenant==parent.tenant, child.home_center in tenant,
-- parent.home_center in tenant, child.prior_center in tenant.
--
-- ROLLBACK
-- --------
-- To restore the previous (vulnerable) behaviour:
--   drop trigger  children_force_server_columns_upd on children;
--   drop trigger  children_force_server_columns_ins on children;
--   drop function children_force_server_columns_upd();
--   drop function children_force_server_columns_ins();
--   alter table children drop constraint children_parent_tenant_fk;
--   alter table children drop constraint children_home_center_tenant_fk;
--   alter table parents  drop constraint parents_tenant_id_key;
--   alter table centers  drop constraint centers_tenant_id_key;
--   drop policy children_parent_select on children;
--   drop policy children_parent_insert on children;
--   drop policy children_parent_update on children;
--   create policy "children_parent_all" on children for all
--     using (parent_id = app_current_parent_id())
--     with check (parent_id = app_current_parent_id());
--   create policy "parents_self_update" on parents for update
--     using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
--   grant update, delete on parents, children to authenticated;
--
-- MAINTENANCE WARNING. 20260613000000_restore_standard_role_grants.sql runs
-- `grant all on all tables in schema public to anon, authenticated,
-- service_role`. Re-running that migration (or any repeat of that statement)
-- silently re-grants blanket UPDATE/DELETE and undoes steps 1-3. If that file is
-- ever re-applied, re-apply this one after it. The integration tests in
-- tests/integration/rls-parent-child.itest.ts fail loudly if that happens.

-- =============================================================================
-- 1. parents — no parent-facing write path exists, so grant none.
-- =============================================================================
-- Verified against the whole app: the only two parents writes are INSERTs in
-- signup/actions.ts and dashboard/recover-profile.ts, both service-role
-- (service_role bypasses RLS and keeps its grants, so both are unaffected).

drop policy if exists "parents_self_update" on parents;

revoke update, delete on parents from authenticated;
revoke update, delete on parents from anon;

-- =============================================================================
-- 2. children — explicit per-command policies; DELETE deliberately absent.
-- =============================================================================

drop policy if exists "children_parent_all" on children;
drop policy if exists "children_parent_select" on children;
drop policy if exists "children_parent_insert" on children;
drop policy if exists "children_parent_update" on children;

create policy "children_parent_select" on children
  for select using (parent_id = app_current_parent_id());

create policy "children_parent_insert" on children
  for insert with check (parent_id = app_current_parent_id());

create policy "children_parent_update" on children
  for update
  using (parent_id = app_current_parent_id())
  with check (parent_id = app_current_parent_id());

-- No children_parent_delete. The one caller that needed it — the consent-failure
-- rollback in add-child/actions.ts — now uses the service-role client.

-- =============================================================================
-- 3. children — column-level UPDATE privileges (the client-agnostic backstop).
-- =============================================================================
-- Revoke the blanket table-level UPDATE, then grant back exactly the columns a
-- parent legitimately edits:
--   name, birth_year, grade_level   <- edit-child action (#203)
--   archived_at                     <- dashboard soft-delete (#203)
--   archived_by                     <- dashboard soft-delete (#203), VALUE FORCED
-- Everything else (tenant_id, parent_id, home_center_id, prior_center_id,
-- center_changed_at, id, created_at) becomes unwritable by `authenticated` at
-- the privilege layer.
--
-- WHY archived_by IS GRANTED. It is server-controlled in the sense that a
-- parent must not choose its VALUE — but the parent's own archive statement
-- does carry the column (dashboard/actions.ts writes archived_at + archived_by
-- together). Revoking it would make the whole legitimate archive fail with
-- "permission denied for column archived_by" rather than succeeding with a
-- trusted value. So the privilege is granted and step 5's trigger overwrites
-- whatever arrives with app_current_parent_id(). The grant is inert: no value
-- a client sends can survive. Spoofing is prevented by derivation, not denial.

revoke update on children from authenticated;
revoke update on children from anon;
revoke delete on children from authenticated;
revoke delete on children from anon;

grant update (name, birth_year, grade_level, archived_at, archived_by)
  on children to authenticated;

-- =============================================================================
-- 4. children — BEFORE INSERT: derive lineage, never trust the client.
-- =============================================================================
-- Two callers, two postures:
--   * parent-authenticated (app_current_parent_id() is not null): ownership is
--     enforced and every server-controlled column is overwritten.
--   * service_role / migrations / seed (no current parent): tenant_id and
--     home_center_id are FILLED IN when omitted but otherwise left alone, so
--     admin tooling and supabase/seed.sql keep working unchanged.
-- security definer: parents is itself RLS-protected, and this must resolve the
-- parent row deterministically for both postures.

create or replace function children_force_server_columns_ins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_parent uuid := app_current_parent_id();
  v_tenant         uuid;
  v_home_center    uuid;
begin
  select p.tenant_id, p.home_center_id
    into v_tenant, v_home_center
    from parents p
   where p.id = new.parent_id;

  if not found then
    raise exception 'children: parent_id % does not exist', new.parent_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_current_parent is not null then
    -- A parent may only ever create their OWN child. RLS says the same thing;
    -- this makes it true even if the policy is later loosened.
    if new.parent_id is distinct from v_current_parent then
      raise exception 'children: cannot create a child for another parent'
        using errcode = 'insufficient_privilege';
    end if;

    new.tenant_id         := v_tenant;
    new.home_center_id    := v_home_center;
    new.prior_center_id   := null;
    new.center_changed_at := null;
    new.archived_at       := null;
    new.archived_by       := null;
  else
    new.tenant_id      := coalesce(new.tenant_id, v_tenant);
    new.home_center_id := coalesce(new.home_center_id, v_home_center);
  end if;

  return new;
end;
$$;

drop trigger if exists children_force_server_columns_ins on children;
create trigger children_force_server_columns_ins
  before insert on children
  for each row execute function children_force_server_columns_ins();

-- =============================================================================
-- 5. children — BEFORE UPDATE: force archived_by, re-check the locked columns.
-- =============================================================================
-- Only engages for parent-authenticated callers. service_role keeps full
-- control (staff center transfers, admin corrections) exactly as before.

create or replace function children_force_server_columns_upd()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_parent uuid := app_current_parent_id();
begin
  if v_current_parent is null then
    return new;                       -- service_role / admin path: unchanged
  end if;

  if new.id                is distinct from old.id
     or new.parent_id      is distinct from old.parent_id
     or new.tenant_id      is distinct from old.tenant_id
     or new.home_center_id is distinct from old.home_center_id
     or new.prior_center_id is distinct from old.prior_center_id
     or new.center_changed_at is distinct from old.center_changed_at
     or new.created_at     is distinct from old.created_at
  then
    raise exception 'children: server-controlled column may not be modified'
      using errcode = 'insufficient_privilege';
  end if;

  -- archived_by is an audit pointer, so its value is DERIVED, never accepted.
  if new.archived_at is null then
    new.archived_by := null;                    -- un-archived: clear the pointer
  elsif old.archived_at is null then
    new.archived_by := v_current_parent;        -- archiving now: it was them
  else
    new.archived_by := old.archived_by;         -- already archived: immutable
  end if;

  return new;
end;
$$;

drop trigger if exists children_force_server_columns_upd on children;
create trigger children_force_server_columns_upd
  before update on children
  for each row execute function children_force_server_columns_upd();

-- =============================================================================
-- 6. Structural tenant consistency (defence in depth).
-- =============================================================================
-- Single-column FKs proved each id EXISTS but never that they belonged to the
-- same tenant. These composite FKs make "a child's tenant is its parent's
-- tenant" and "a child's centre is inside the child's tenant" true by
-- construction, independent of policies, triggers and application code.
--
-- ON DELETE actions mirror the existing single-column FKs so delete behaviour
-- is unchanged: cascade from parents, null-the-centre from centres. The
-- targeted `set null (home_center_id)` form is required because tenant_id is
-- NOT NULL and must survive a centre deletion (Postgres 15+; this DB is 17).
--
-- home_center_id is nullable and these are MATCH SIMPLE, so a NULL centre
-- skips the check rather than failing it.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'parents_tenant_id_key'
  ) then
    alter table parents add constraint parents_tenant_id_key unique (tenant_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'centers_tenant_id_key'
  ) then
    alter table centers add constraint centers_tenant_id_key unique (tenant_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'children_parent_tenant_fk'
  ) then
    alter table children add constraint children_parent_tenant_fk
      foreign key (tenant_id, parent_id) references parents (tenant_id, id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'children_home_center_tenant_fk'
  ) then
    alter table children add constraint children_home_center_tenant_fk
      foreign key (tenant_id, home_center_id) references centers (tenant_id, id)
      on delete set null (home_center_id);
  end if;
end
$$;

comment on constraint children_parent_tenant_fk on children is
  'ATLAS-002: guarantees child.tenant_id = parent.tenant_id structurally.';
comment on constraint children_home_center_tenant_fk on children is
  'ATLAS-002: guarantees child.home_center_id belongs to child.tenant_id.';
