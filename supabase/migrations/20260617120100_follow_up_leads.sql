-- Atlas Assessment — follow-up lead capture (short-test "find an assessment").
--
-- The short-test report's universal comprehensive CTA opens a short capture
-- form (child's school, parent contact, best time to reach) with an explicit
-- parent opt-in. Submitting persists a lead here AND fires a notification email
-- to the pilot center (Resend; fail-soft + flag-gated — see src/lib/followUp/).
-- Triage is MANUAL at pilot — no automated target-school routing.
--
-- DATA SCOPE (consent/compliance): Tier 1/2 LEAD data only — parent contact +
-- child's school (free text). NO diagnostic result is stored or shared here.
--
-- RLS: enabled with NO policies — exactly like analytics_events. All writes flow
-- through the service-role server action (submitFollowUpLead) AFTER an RLS
-- ownership check on the session; anon/authenticated clients cannot read or
-- write this table directly. Reads for triage are operator/service-role only.
--
-- DDL runs on both the production and dev `supabase db reset` paths (before
-- seed.sql); there is no tenant-scoped ROW data here, so no seed.sql mirror.

create table follow_up_leads (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  -- child/session give triage context; kept (set null) if the child or session
  -- is later removed, since the lead's value is the parent contact.
  child_id            uuid references children(id) on delete set null,
  session_id          uuid references assessment_sessions(id) on delete set null,
  -- Nullable + gated behind LEAD_SCHOOL_FIELD_LIVE (default ON — counsel cleared
  -- collecting the school under coppa-disclosure-v1, which removed the
  -- "not collected" statement). The field is OPTIONAL: rendered + persisted when
  -- the flag is on, but never required. When the flag is explicitly set to
  -- 'false' the field is not rendered, not required, and persists NULL.
  school_name         text,
  parent_name         text not null,
  parent_email        text not null,
  parent_phone        text,
  best_time_to_reach  text,
  created_at          timestamptz not null default now()
);

alter table follow_up_leads enable row level security;
-- No policies: service-role writes only (submitFollowUpLead), mirroring
-- analytics_events. Direct client access is denied.
