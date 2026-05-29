-- Atlas Assessment — analytics / conversion event store + parent satisfaction.
--
-- Source-of-truth references:
--   M2 readiness audit (2026-05-29): analytics + conversion tracking were
--     NOT BUILT — zero events emitted, no event store. M2 requires conversion
--     tracking (tests started/completed, completion rate, report viewed,
--     center follow-up opt-in) to function; parent satisfaction capture is an
--     M2 exit criterion. This migration creates the event store AND the
--     satisfaction record. Funnel touchpoints emit into analytics_events via
--     the fail-soft emit() helper (src/lib/analytics/emit.ts).
--
-- Privacy (strategy §6.4): event `props` carry NO PII — reference ids only
-- (tenant / child / session uuids) plus non-identifying scalars (rating,
-- question number, is_correct, consent version). The emit() helper and every
-- call site enforce this. Free-text (satisfaction comment) lives only in
-- parent_satisfaction, never in analytics_events.props.
--
-- =============================================================================
-- analytics_events — append-only conversion/funnel event log.
-- =============================================================================
--
-- tenant_id is NULLABLE: the top-of-funnel `landing_viewed` event fires
-- pre-auth, before any tenant context exists. Every authenticated funnel
-- event carries a tenant_id. RLS is enabled with NO client policies —
-- analytics is service-role only (write + read), mirroring question_access_log.

create type analytics_event_name as enum (
  'landing_viewed',
  'parent_consent_completed',
  'child_profile_created',
  'short_test_started',
  'short_test_item_answered',
  'short_test_completed',
  'short_result_viewed',
  'parent_report_generated',
  'parent_report_viewed',
  'center_followup_opted_in',
  'parent_satisfaction_submitted'
);

create table analytics_events (
  id          bigserial primary key,
  tenant_id   uuid references tenants(id) on delete cascade,
  event_name  analytics_event_name not null,
  -- Reference ids only (nullable: not every event has a child/session).
  child_id    uuid references children(id) on delete set null,
  session_id  uuid references assessment_sessions(id) on delete set null,
  -- Non-PII scalars only. Defaults to '{}' so a propless emit is one byte.
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index analytics_events_tenant_idx  on analytics_events(tenant_id);
create index analytics_events_name_idx     on analytics_events(event_name);
create index analytics_events_created_idx  on analytics_events(created_at);
create index analytics_events_session_idx  on analytics_events(session_id);

alter table analytics_events enable row level security;
-- (no policies — service-role only, mirrors question_access_log)

-- =============================================================================
-- parent_satisfaction — post-report rating capture (M2 exit criterion).
-- =============================================================================
--
-- One row per assessment session (unique session_id); a parent can resubmit
-- and the server action upserts, so the row holds the current rating. rating
-- is 1..5; comment is optional free text and is NEVER copied into
-- analytics_events.props (PII risk). Writes flow through the /report
-- ParentReportFeedback server action using the service role (no client insert
-- policy); parents read their own rows (mirrors consent_records /
-- vpc_audit_log self-select).

create table parent_satisfaction (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  parent_id   uuid not null references parents(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  session_id  uuid not null references assessment_sessions(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id)
);

create index parent_satisfaction_tenant_idx on parent_satisfaction(tenant_id);
create index parent_satisfaction_parent_idx on parent_satisfaction(parent_id);

alter table parent_satisfaction enable row level security;

create policy "parent_satisfaction_self_select" on parent_satisfaction
  for select using (parent_id = app_current_parent_id());
