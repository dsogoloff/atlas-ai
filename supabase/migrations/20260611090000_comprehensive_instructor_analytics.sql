-- Atlas Assessment — comprehensive funnel + instructor analytics scaffolding.
--
-- Instrument-only change (no engine reparameterization here):
--   1. Extend analytics_event_name with the comprehensive_* funnel events,
--      the instructor report-viewed / usefulness events, and the
--      placement_recommendation_created completion event. Call sites branch
--      short_* vs comprehensive_* on assessment_sessions.test_type.
--   2. Add assessment_test_type ('short' | 'comprehensive') + a test_type
--      column on assessment_sessions (default 'short', so existing sessions
--      and the short-test path are unchanged).
--   3. instructor_usefulness — post-report "was this useful for placement?"
--      capture, mirroring parent_satisfaction but instructor-scoped (same
--      instructor_id FK + center-scoping RLS predicate as pedagogical_notes).
--
-- Privacy (strategy §6.4): instructor_usefulness.comment is free text and is
-- NEVER copied into analytics_events.props (mirrors parent_satisfaction). The
-- usefulness event carries {rating, has_comment} only.
--
-- AGENTS.md §11 note: this is pure DDL (enum values, a type, a column, an
-- empty RLS-protected table) — schema, not tenant-scoped row data — so no
-- seed.sql mirror is needed. Migrations run on BOTH the production path and
-- the dev `supabase db reset` path.
--
-- Postgres constraint: ALTER TYPE ... ADD VALUE may run inside a transaction
-- (PG >= 12) but the new value cannot be USED until that transaction commits.
-- This file does NOT use the new analytics enum values; the call sites that
-- emit them live in application code, not in a later migration.

-- =============================================================================
-- 1. New analytics event names.
-- =============================================================================

alter type analytics_event_name add value if not exists 'comprehensive_test_started';
alter type analytics_event_name add value if not exists 'comprehensive_item_answered';
alter type analytics_event_name add value if not exists 'comprehensive_test_completed';
alter type analytics_event_name add value if not exists 'instructor_report_viewed';
alter type analytics_event_name add value if not exists 'placement_recommendation_created';
alter type analytics_event_name add value if not exists 'instructor_usefulness_submitted';

-- =============================================================================
-- 2. test_type discriminator on assessment_sessions.
-- =============================================================================

create type assessment_test_type as enum ('short', 'comprehensive');

alter table assessment_sessions
  add column test_type assessment_test_type not null default 'short';

-- =============================================================================
-- 3. instructor_usefulness — post-report usefulness rating capture.
-- =============================================================================
--
-- One row per (session, instructor): an instructor can resubmit and the
-- server action upserts on (session_id, instructor_id), so the row holds the
-- current rating. rating is 1..5; comment is optional free text and is NEVER
-- copied into analytics_events.props. instructor_id mirrors the
-- pedagogical_notes FK (references instructors(id)); writes flow through the
-- instructor lib actions using the service role.

create table instructor_usefulness (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  instructor_id uuid not null references instructors(id) on delete cascade,
  child_id      uuid not null references children(id) on delete cascade,
  session_id    uuid not null references assessment_sessions(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (session_id, instructor_id)
);

create index instructor_usefulness_tenant_idx     on instructor_usefulness(tenant_id);
create index instructor_usefulness_instructor_idx on instructor_usefulness(instructor_id);

alter table instructor_usefulness enable row level security;

-- Select: any instructor who can access this child (current + prior/grace
-- center), mirroring pedagogical_notes_instructor_select.
create policy "instructor_usefulness_instructor_select" on instructor_usefulness
  for select using (
    exists (
      select 1
      from children c
      where c.id = instructor_usefulness.child_id
        and app_instructor_can_access_child(
          c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id
        )
    )
  );

-- Insert: author must be the current instructor AND the child must be at the
-- instructor's current center, mirroring pedagogical_notes_instructor_insert.
create policy "instructor_usefulness_instructor_insert" on instructor_usefulness
  for insert with check (
    instructor_id = app_current_instructor_id()
    and exists (
      select 1 from children c
      where c.id = instructor_usefulness.child_id
        and app_instructor_can_write_for_child(c.home_center_id, c.tenant_id)
    )
  );

-- Update: author only, mirroring pedagogical_notes_author_update (the upsert
-- on resubmit re-stamps the author's own row).
create policy "instructor_usefulness_author_update" on instructor_usefulness
  for update
  using (instructor_id = app_current_instructor_id())
  with check (instructor_id = app_current_instructor_id());
