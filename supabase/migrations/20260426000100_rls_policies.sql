-- Atlas Assessment — Row Level Security policies.
--
-- Source-of-truth references:
--   architecture.md §1 (RLS enforcement at DB layer)
--   compliance.md §7 (RLS test cases that must pass)
--   features.md §6 + compliance.md §2 (school-operator + 30-day grace)
--
-- Policy strategy:
--   * Every domain table has RLS enabled. Service role bypasses RLS by
--     default — admin / job code uses the service-role key.
--   * Parents see only their own row and their own children's data.
--   * Instructors see children whose home_center_id matches the
--     instructor's center_id, OR whose prior_center_id matches AND we're
--     still inside the 30-day grace window. Grace is read-only.
--   * Reference tables (centers, misconceptions, curriculum_recommendations)
--     are readable by any authenticated user in the same tenant.
--   * Question rows are NEVER directly queryable by clients (compliance.md
--     §8 — no bulk client-side access). All question access goes through
--     server-side APIs using the service role.
--   * Audit logs are write-only from the app perspective; reads are
--     service-role only.

-- =============================================================================
-- Helpers
-- =============================================================================

-- Returns the parent.id for the currently authenticated user, or null.
create or replace function app_current_parent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from parents where auth_user_id = auth.uid();
$$;

-- Returns the instructor.id for the currently authenticated user, or null.
-- Only returns an id for ACTIVE instructors.
create or replace function app_current_instructor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from instructors
  where auth_user_id = auth.uid() and status = 'ACTIVE';
$$;

-- Returns the tenant_id the current user belongs to (parent OR instructor).
create or replace function app_current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select tenant_id from parents     where auth_user_id = auth.uid()),
    (select tenant_id from instructors where auth_user_id = auth.uid() and status = 'ACTIVE')
  );
$$;

-- Returns true if the calling instructor can SELECT data for a given child.
-- True when the instructor's center matches the child's home center, OR
-- the instructor's center matches the child's prior center AND we are
-- within the 30-day grace window.
create or replace function app_instructor_can_access_child(
  p_home_center_id    uuid,
  p_prior_center_id   uuid,
  p_center_changed_at timestamptz,
  p_child_tenant_id   uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from instructors i
    where i.auth_user_id = auth.uid()
      and i.status = 'ACTIVE'
      and i.tenant_id = p_child_tenant_id
      and (
        i.center_id = p_home_center_id
        or (
          i.center_id = p_prior_center_id
          and p_center_changed_at is not null
          and p_center_changed_at > now() - interval '30 days'
        )
      )
  );
$$;

-- Returns true if the calling instructor can WRITE data for a given child
-- (active enrollment only — never during prior-center grace).
create or replace function app_instructor_can_write_for_child(
  p_home_center_id    uuid,
  p_child_tenant_id   uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from instructors i
    where i.auth_user_id = auth.uid()
      and i.status = 'ACTIVE'
      and i.tenant_id = p_child_tenant_id
      and i.center_id = p_home_center_id
  );
$$;

-- =============================================================================
-- tenants — readable by any authenticated user in the same tenant.
-- =============================================================================

alter table tenants enable row level security;

create policy "tenants_member_select" on tenants
  for select using (id = app_current_tenant_id());

-- =============================================================================
-- centers — readable by any authenticated user in the same tenant.
-- Writes are service-role only (no policies for INSERT/UPDATE/DELETE).
-- =============================================================================

alter table centers enable row level security;

create policy "centers_tenant_select" on centers
  for select using (tenant_id = app_current_tenant_id());

-- =============================================================================
-- parents — self-management only.
-- =============================================================================

alter table parents enable row level security;

create policy "parents_self_select" on parents
  for select using (auth_user_id = auth.uid());

create policy "parents_self_insert" on parents
  for insert with check (auth_user_id = auth.uid());

create policy "parents_self_update" on parents
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Instructors at the parent's home center can see the parent row (limited
-- visibility for roster context). Read only.
create policy "parents_instructor_select" on parents
  for select using (
    exists (
      select 1 from instructors i
      where i.auth_user_id = auth.uid()
        and i.status = 'ACTIVE'
        and i.tenant_id = parents.tenant_id
        and i.center_id = parents.home_center_id
    )
  );

-- =============================================================================
-- children — parents own; instructors view via center matching (with grace).
-- =============================================================================

alter table children enable row level security;

create policy "children_parent_all" on children
  for all
  using (parent_id = app_current_parent_id())
  with check (parent_id = app_current_parent_id());

create policy "children_instructor_select" on children
  for select using (
    app_instructor_can_access_child(
      home_center_id, prior_center_id, center_changed_at, tenant_id
    )
  );

-- =============================================================================
-- instructors — self-read only.
-- =============================================================================

alter table instructors enable row level security;

create policy "instructors_self_select" on instructors
  for select using (auth_user_id = auth.uid());

-- =============================================================================
-- pedagogical_notes — instructors at the child's current center can write;
-- visible to instructors at home + prior (grace) centers; never to parents.
-- =============================================================================

alter table pedagogical_notes enable row level security;

create policy "pedagogical_notes_instructor_select" on pedagogical_notes
  for select using (
    exists (
      select 1
      from children c
      where c.id = pedagogical_notes.child_id
        and app_instructor_can_access_child(
          c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id
        )
    )
  );

create policy "pedagogical_notes_instructor_insert" on pedagogical_notes
  for insert with check (
    instructor_id = app_current_instructor_id()
    and exists (
      select 1 from children c
      where c.id = pedagogical_notes.child_id
        and app_instructor_can_write_for_child(c.home_center_id, c.tenant_id)
    )
  );

create policy "pedagogical_notes_author_update" on pedagogical_notes
  for update
  using (instructor_id = app_current_instructor_id())
  with check (instructor_id = app_current_instructor_id());

-- =============================================================================
-- misconceptions — readable by any tenant member; service-role writes only.
-- =============================================================================

alter table misconceptions enable row level security;

create policy "misconceptions_tenant_select" on misconceptions
  for select using (tenant_id = app_current_tenant_id());

-- =============================================================================
-- curriculum_recommendations — readable by any tenant member.
-- =============================================================================

alter table curriculum_recommendations enable row level security;

create policy "curriculum_recommendations_tenant_select"
  on curriculum_recommendations
  for select using (tenant_id = app_current_tenant_id());

-- =============================================================================
-- questions — NO client policies (service-role only).
-- Per compliance.md §8, raw question content is never sent to the browser
-- in bulk; questions are served one at a time via authenticated server APIs
-- using the service-role key. RLS is enabled with no public policies so
-- all client-side reads are denied.
-- =============================================================================

alter table questions enable row level security;
-- (no policies)

-- =============================================================================
-- assessment_sessions — parents see their child's; instructors see via center.
-- Writes from clients flow through server APIs (service-role); RLS allows
-- parent reads for the dashboard and instructor reads for the roster.
-- =============================================================================

alter table assessment_sessions enable row level security;

create policy "assessment_sessions_parent_select" on assessment_sessions
  for select using (
    child_id in (
      select id from children where parent_id = app_current_parent_id()
    )
  );

create policy "assessment_sessions_instructor_select" on assessment_sessions
  for select using (
    exists (
      select 1
      from children c
      where c.id = assessment_sessions.child_id
        and app_instructor_can_access_child(
          c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id
        )
    )
  );

-- =============================================================================
-- responses — same scope as their parent session.
-- =============================================================================

alter table responses enable row level security;

create policy "responses_parent_select" on responses
  for select using (
    session_id in (
      select s.id
      from assessment_sessions s
      join children c on c.id = s.child_id
      where c.parent_id = app_current_parent_id()
    )
  );

create policy "responses_instructor_select" on responses
  for select using (
    exists (
      select 1
      from assessment_sessions s
      join children c on c.id = s.child_id
      where s.id = responses.session_id
        and app_instructor_can_access_child(
          c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id
        )
    )
  );

-- =============================================================================
-- vpc_audit_log + question_access_log — service-role only.
-- Parents can read their own VPC events for transparency; instructors and
-- the public never read audit logs.
-- =============================================================================

alter table vpc_audit_log enable row level security;

create policy "vpc_audit_log_self_select" on vpc_audit_log
  for select using (parent_id = app_current_parent_id());

alter table question_access_log enable row level security;
-- (no policies — service-role only)
