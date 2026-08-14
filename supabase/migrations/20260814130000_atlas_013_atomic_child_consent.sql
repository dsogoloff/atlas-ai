-- ATLAS-013 — child creation and its consent record become ONE atomic operation.
--
-- THE FINDING
-- -----------
-- add-child wrote the child (RLS client) and the consent record (service role)
-- in TWO round-trips, with a best-effort rollback DELETE if the second failed.
-- Three failure modes fall out of that:
--
--   * a crash between the writes leaves a child with NO consent record — and
--     the session-start / response-submit gates read consent, so that child is
--     a permanently unassessable orphan;
--   * the rollback DELETE can itself fail (network, permissions), leaving the
--     same orphan even on the "handled" path;
--   * a double-click or a second tab runs the whole sequence twice and creates
--     duplicate children.
--
-- The invariant this establishes: a child that requires consent cannot exist
-- unless its consent record was written in the SAME committed transaction.
-- Either both land or neither does.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
--   1. A natural dedup key on children, so a double submit cannot duplicate.
--   2. A one-live-consent-per-child index, so the "exactly one" half of the
--      invariant is enforced by the database rather than by convention.
--   3. create_child_with_consent(...) — SECURITY DEFINER, one transaction,
--      returns the child id. Raise anywhere inside rolls the whole thing back.
--
-- CONSENT SEMANTICS ARE NOT TOUCHED. Consent type, text, versions, disclosure
-- hash, data uses and sharing permissions are all PARAMETERS. src/lib/consent/
-- text.ts stays the single source of truth; nothing about the instrument is
-- duplicated into SQL, where it would silently fork from the versioned
-- original. This is a write-path move, not a consent change.
--
-- INTERACTION WITH ATLAS-002 (deliberate, verified in CI)
-- ------------------------------------------------------
-- The function does NOT bypass the ATLAS-002 BEFORE INSERT trigger — the
-- INSERT below omits tenant_id / home_center_id entirely and lets
-- children_force_server_columns_ins derive them from the parent row.
--
-- That works because app_current_parent_id() reads auth.uid(), which resolves
-- from the request.jwt.claims GUC that PostgREST sets per request. That is
-- SESSION state, not role state, so it survives into a SECURITY DEFINER body
-- unchanged — the definer switches the ROLE, not the JWT. The trigger
-- therefore still sees the calling parent and still takes its
-- parent-authenticated branch. tests/integration/rls-child-consent.itest.ts
-- proves this rather than asserting it: it creates a child through the RPC and
-- checks tenant_id / home_center_id came from the parent row, and that a
-- cross-parent call is refused from inside the definer context.
--
-- What the definer DOES bypass is RLS (the function owner owns the tables), so
-- the ownership check is made explicitly at the top of the body rather than
-- being inherited from children_parent_insert.
--
-- IDEMPOTENCY — why a natural key and not a client token
-- -----------------------------------------------------
-- The requirement includes the TWO-TAB case. A client-generated idempotency
-- token is scoped to one form render, so two tabs mint two different tokens and
-- would still produce two children — it solves double-click but not the case
-- actually asked for. A natural key on (parent_id, name, birth_year) is
-- render-independent and therefore covers both.
--
-- KNOWN EDGE: twins with the SAME first name and the same birth year cannot
-- both exist un-archived. At pilot volume this is the right trade (prod today:
-- 17 children, zero collisions on this key, verified read-only 2026-08-14), and
-- the workaround is a distinguishing name, which is what a parent would type
-- anyway to tell them apart in the UI. If that stops being acceptable, add a
-- nullable client_key uuid column to children, make the partial index
-- (parent_id, client_key), and have the RPC prefer it when present — the
-- function shape below does not need to change.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Purely additive: two indexes and one function. No column, row or policy is
-- altered. Both indexes were verified cleanly additive against live prod on
-- 2026-08-14 (17 children / 17 consent records; zero natural-key collisions,
-- zero children with multiple live consents, zero children with no consent).
-- Re-runnable: IF NOT EXISTS on the indexes, CREATE OR REPLACE on the function.
--
-- ROLLBACK
-- --------
--   drop function if exists create_child_with_consent(
--     uuid, text, integer, text, text, text, text, text, text, jsonb, jsonb, text, text);
--   drop index if exists consent_records_one_live_per_child;
--   drop index if exists children_parent_natural_key;
-- Then revert src/app/(auth)/add-child/actions.ts to the two-step write. The
-- indexes are safe to keep even if the function is dropped.

-- =============================================================================
-- 1. Natural dedup key — a double submit cannot create a second child.
-- =============================================================================
-- Partial on archived_at IS NULL so a parent who removes a child can re-add one
-- with the same name later; only LIVE children compete for the key.

create unique index if not exists children_parent_natural_key
  on children (parent_id, lower(btrim(name)), birth_year)
  where archived_at is null;

comment on index children_parent_natural_key is
  'ATLAS-013: idempotency key for create_child_with_consent. Double-click / two-tab submits collapse to one child.';

-- =============================================================================
-- 2. Exactly one LIVE consent per child, per instrument.
-- =============================================================================
-- Revoked rows are excluded, so a revoke-then-re-grant cycle still works.

create unique index if not exists consent_records_one_live_per_child
  on consent_records (child_id, consent_type)
  where revoked = false;

comment on index consent_records_one_live_per_child is
  'ATLAS-013: the "exactly one consent" half of the atomicity invariant.';

-- =============================================================================
-- 3. The atomic RPC.
-- =============================================================================
-- Scalar parameters are widened to text/integer rather than smallint/inet
-- because PostgREST resolves overloads from JSON and coerces less predictably
-- for narrow types; casts happen inside where the failure mode is legible.

create or replace function create_child_with_consent(
  p_parent_id                 uuid,
  p_name                      text,
  p_birth_year                integer,
  p_grade_level               text,
  p_consent_type              text,
  p_consent_text_version      text,
  p_consent_text              text,
  p_disclosure_version        text,
  p_disclosure_content_sha256 text,
  p_data_uses                 jsonb,
  p_sharing_permissions       jsonb,
  p_ip_address                text,
  p_user_agent                text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := app_current_parent_id();
  v_child  uuid;
  v_tenant uuid;
  v_name   text := btrim(p_name);
begin
  -- ---------------------------------------------------------------------
  -- Ownership. SECURITY DEFINER bypasses RLS, so this is not inherited from
  -- children_parent_insert — it is stated explicitly and is the only thing
  -- standing between a parent and creating rows for someone else.
  -- ---------------------------------------------------------------------
  if v_caller is null then
    raise exception 'create_child_with_consent: no authenticated parent'
      using errcode = 'insufficient_privilege';
  end if;

  if p_parent_id is distinct from v_caller then
    raise exception 'create_child_with_consent: cannot create a child for another parent'
      using errcode = 'insufficient_privilege';
  end if;

  if v_name is null or v_name = '' then
    raise exception 'create_child_with_consent: name is required'
      using errcode = 'check_violation';
  end if;

  -- ---------------------------------------------------------------------
  -- Idempotent fast path. A retry, a double-click, or a second tab lands
  -- here and returns the SAME child id instead of creating a duplicate.
  -- If that existing child somehow has no live consent — a legacy row from
  -- the old two-step path, or a partially-applied retry — the consent is
  -- written now, so calling this function always converges on the invariant.
  -- ---------------------------------------------------------------------
  select c.id, c.tenant_id
    into v_child, v_tenant
    from children c
   where c.parent_id = v_caller
     and c.archived_at is null
     and lower(btrim(c.name)) = lower(v_name)
     and c.birth_year = p_birth_year::smallint
   limit 1;

  if found then
    if not exists (
      select 1 from consent_records r
       where r.child_id = v_child
         and r.consent_type = p_consent_type
         and r.revoked = false
    ) then
      insert into consent_records (
        tenant_id, parent_id, child_id, consent_type,
        consent_text_version, consent_text,
        disclosure_version, disclosure_content_sha256,
        data_uses, sharing_permissions, ip_address, user_agent
      ) values (
        v_tenant, v_caller, v_child, p_consent_type,
        p_consent_text_version, p_consent_text,
        p_disclosure_version, p_disclosure_content_sha256,
        p_data_uses, p_sharing_permissions,
        nullif(btrim(coalesce(p_ip_address, '')), '')::inet, p_user_agent
      );
    end if;
    return v_child;
  end if;

  -- ---------------------------------------------------------------------
  -- Create. tenant_id and home_center_id are deliberately NOT supplied:
  -- the ATLAS-002 BEFORE INSERT trigger derives them from the parent row
  -- and forces the lineage columns. Omitting them is what keeps this
  -- function honest about not bypassing that control.
  -- ---------------------------------------------------------------------
  begin
    insert into children (parent_id, name, birth_year, grade_level)
    values (v_caller, v_name, p_birth_year::smallint, p_grade_level)
    returning id, tenant_id into v_child, v_tenant;
  exception when unique_violation then
    -- A concurrent identical submit committed first. Adopt its row: the
    -- caller gets the same id either way, which is the whole point.
    select c.id, c.tenant_id
      into v_child, v_tenant
      from children c
     where c.parent_id = v_caller
       and c.archived_at is null
       and lower(btrim(c.name)) = lower(v_name)
       and c.birth_year = p_birth_year::smallint
     limit 1;

    if not found then
      raise exception 'create_child_with_consent: lost the insert race but no sibling row found'
        using errcode = 'internal_error';
    end if;

    if not exists (
      select 1 from consent_records r
       where r.child_id = v_child
         and r.consent_type = p_consent_type
         and r.revoked = false
    ) then
      insert into consent_records (
        tenant_id, parent_id, child_id, consent_type,
        consent_text_version, consent_text,
        disclosure_version, disclosure_content_sha256,
        data_uses, sharing_permissions, ip_address, user_agent
      ) values (
        v_tenant, v_caller, v_child, p_consent_type,
        p_consent_text_version, p_consent_text,
        p_disclosure_version, p_disclosure_content_sha256,
        p_data_uses, p_sharing_permissions,
        nullif(btrim(coalesce(p_ip_address, '')), '')::inet, p_user_agent
      );
    end if;
    return v_child;
  end;

  -- ---------------------------------------------------------------------
  -- Consent, in the SAME transaction. If this raises — bad cast, constraint,
  -- anything — the child INSERT above is rolled back with it. That is the
  -- invariant, and it needs no rollback DELETE to hold.
  -- ---------------------------------------------------------------------
  insert into consent_records (
    tenant_id, parent_id, child_id, consent_type,
    consent_text_version, consent_text,
    disclosure_version, disclosure_content_sha256,
    data_uses, sharing_permissions, ip_address, user_agent
  ) values (
    v_tenant, v_caller, v_child, p_consent_type,
    p_consent_text_version, p_consent_text,
    p_disclosure_version, p_disclosure_content_sha256,
    p_data_uses, p_sharing_permissions,
    nullif(btrim(coalesce(p_ip_address, '')), '')::inet, p_user_agent
  );

  return v_child;
end;
$$;

-- Callable only by signed-in parents. anon reaches the body but cannot get
-- past the app_current_parent_id() check; revoking is cheaper than relying on
-- that, and 20260613000000_restore_standard_role_grants.sql grants EXECUTE on
-- all routines to anon by default, so this REVOKE is load-bearing.
revoke all on function create_child_with_consent(
  uuid, text, integer, text, text, text, text, text, text, jsonb, jsonb, text, text
) from public, anon;

grant execute on function create_child_with_consent(
  uuid, text, integer, text, text, text, text, text, text, jsonb, jsonb, text, text
) to authenticated;

comment on function create_child_with_consent(
  uuid, text, integer, text, text, text, text, text, text, jsonb, jsonb, text, text
) is
  'ATLAS-013: creates a child and its consent record in one transaction. Idempotent on (parent_id, lower(btrim(name)), birth_year) among non-archived children. Consent content is passed in from src/lib/consent/text.ts and never duplicated here.';
