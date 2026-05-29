-- Atlas Assessment — verifiable parental consent (VPC) records.
--
-- Source-of-truth references:
--   compliance.md §2 (VPC "email plus" flow + audit trail)
--   M2 readiness audit (2026-05-28): consent was recorded as audit *events*
--     in vpc_audit_log at signup, and the /coppa screen collected consent
--     without ever persisting it. There was no enforceable consent record,
--     so a child assessment could begin with no recorded consent — a COPPA /
--     Gate-B integrity blocker. This table IS that enforceable record; the
--     session-start and response-submit handlers gate on it server-side.
--
-- Model: parent-scoped consent. Under COPPA the *parent* is the consenting
-- party, and this app's existing VPC trail (vpc_audit_log) is already
-- parent-scoped (no child_id). consent_records follows that precedent:
--   * child_id is NULLABLE. A row with child_id NULL is a blanket grant
--     covering all of the parent's children. This is what the /coppa screen
--     writes — /coppa runs BEFORE /add-child in the signup flow
--     (signup -> verify -> /coppa -> /add-child), so no child profile exists
--     yet at consent time. A non-null child_id scopes a grant to one child
--     (room for future per-child consent without a schema change).
--   * The gate verifies an unrevoked consent row exists for the child's
--     parent in the tenant; the child is already proven to belong to that
--     parent upstream (explicit parent_id eq in both handlers).
--
-- `revoked` is a boolean (drives the gate via a cheap equality filter and a
-- partial index); `revoked_at` is the audit timestamp. Revoking flips both.

create table consent_records (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  parent_id             uuid not null references parents(id) on delete cascade,
  -- NULL = blanket grant covering all of the parent's children (the /coppa
  -- case, written before any child profile exists). Non-null scopes to one.
  child_id              uuid references children(id) on delete cascade,
  -- The consent instrument granted, e.g. 'coppa_vpc'.
  consent_type          text not null,
  -- Version tag + verbatim text of the disclosure the parent agreed to, so a
  -- later wording change is provable against what each parent actually saw
  -- (compliance.md §12 version-on-row pattern).
  consent_text_version  text not null,
  consent_text          text not null,
  -- Data uses the parent authorized, e.g.
  -- ["diagnostic_assessment","progress_reporting_to_parent",
  --  "progress_reporting_to_instructor","ai_misconception_classification"].
  data_uses             jsonb not null default '[]'::jsonb,
  -- Sharing permissions. Default '{}' = none beyond the assessment itself.
  sharing_permissions   jsonb not null default '{}'::jsonb,
  -- Revocation status. `revoked` drives the enforcement gate; revoked_at is
  -- the audit timestamp (NULL while active).
  revoked               boolean not null default false,
  revoked_at            timestamptz,
  ip_address            inet,
  user_agent            text,
  granted_at            timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create index consent_records_tenant_idx on consent_records(tenant_id);
create index consent_records_parent_idx on consent_records(parent_id);
create index consent_records_child_idx  on consent_records(child_id);
-- Gate lookup: "does this parent have a live consent in this tenant?"
create index consent_records_active_idx
  on consent_records(parent_id, tenant_id)
  where revoked = false;

-- =============================================================================
-- RLS — parents read their own consent records (transparency, mirrors
-- vpc_audit_log_self_select). All writes flow through the /coppa server
-- action and the gate reads via the service role, both of which bypass RLS;
-- no client-facing insert/update policy is granted.
-- =============================================================================

alter table consent_records enable row level security;

create policy "consent_records_self_select" on consent_records
  for select using (parent_id = app_current_parent_id());
