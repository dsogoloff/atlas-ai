-- Atlas Assessment — initial schema.
--
-- Source-of-truth references:
--   features.md §1, §5, §6 — data models
--   architecture.md guardrails (tenant_id everywhere; auth indirection;
--     misconception + curriculum data not code; subject-agnostic schema)
--   compliance.md §2, §4, §8 — VPC and question-access audit
--
-- Conventions:
--   * UUID primary keys via gen_random_uuid()
--   * timestamptz for all timestamps
--   * tenant_id on every domain table (v1 = inspirea_singapore_math always)
--   * `auth_user_id` indirection for Supabase Auth (no direct FK to auth.users)
--   * Postgres enums for stable, audited value sets
--   * RLS lives in a separate migration

-- =============================================================================
-- Enums
-- =============================================================================

create type center_status         as enum ('ACTIVE', 'INACTIVE');
create type instructor_status     as enum ('ACTIVE', 'INACTIVE');
create type subscription_tier     as enum ('PILOT');
create type assessment_status     as enum ('IN_PROGRESS', 'COMPLETED');
create type question_format       as enum ('MULTIPLE_CHOICE', 'NUMERIC_ENTRY', 'DRAG_DROP');

create type strand as enum (
  'NUMBER_SENSE',
  'OPERATIONS',
  'WORD_PROBLEMS',
  'FRACTIONS_DECIMALS',
  'GEOMETRY',
  'MEASUREMENT_DATA'
);

-- 24 half-grade levels covering K-8 (architecture.md K-8 end-state target).
create type half_grade_level as enum (
  'KA','KB',
  '1A','1B',
  '2A','2B',
  '3A','3B',
  '4A','4B',
  '5A','5B',
  '6A','6B',
  '7A','7B',
  '8A','8B'
);

create type vpc_event_type as enum (
  'consent_initiated',
  'verification_sent',
  'verification_clicked',
  'verification_succeeded',
  'verification_failed',
  'consent_revoked',
  'center_selected',
  'center_changed',
  'center_restored',
  'center_removed',
  'center_grace_expired'
);

-- =============================================================================
-- Tenants
-- =============================================================================

create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  display_name text not null,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Centers (S.A.M. tutoring centers per tenant)
-- =============================================================================

create table centers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  status     center_status not null default 'ACTIVE',
  created_at timestamptz not null default now()
);

create index centers_tenant_idx on centers(tenant_id);

-- =============================================================================
-- Parents
-- =============================================================================

create table parents (
  id                 uuid primary key default gen_random_uuid(),
  auth_user_id       uuid not null unique,
    -- intentional non-FK: per architecture.md guardrail #9, domain tables
    -- reference auth_user_id without a hard FK to auth.users so we can
    -- migrate auth providers without a schema change.
  tenant_id          uuid not null references tenants(id) on delete cascade,
  home_center_id     uuid references centers(id) on delete set null,
  email              text not null,
  name               text not null,
  subscription_tier  subscription_tier not null default 'PILOT',
  created_at         timestamptz not null default now()
);

create index parents_tenant_idx on parents(tenant_id);
create index parents_home_center_idx on parents(home_center_id) where home_center_id is not null;

-- =============================================================================
-- Children (with 30-day prior-center grace fields per features.md §5)
-- =============================================================================

create table children (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  parent_id          uuid not null references parents(id) on delete cascade,
  home_center_id     uuid references centers(id) on delete set null,
  prior_center_id    uuid references centers(id) on delete set null,
  center_changed_at  timestamptz,
  name               text not null,
  birth_year         smallint not null check (birth_year between 2000 and 2030),
  grade_level        text,
  created_at         timestamptz not null default now(),
  -- prior_center_id and center_changed_at are either both null or both set.
  constraint children_grace_pair_chk
    check ((prior_center_id is null) = (center_changed_at is null))
);

create index children_parent_idx       on children(parent_id);
create index children_tenant_idx       on children(tenant_id);
create index children_home_center_idx  on children(home_center_id);
create index children_prior_center_idx on children(prior_center_id) where prior_center_id is not null;

-- =============================================================================
-- Instructors
-- =============================================================================

create table instructors (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  center_id     uuid not null references centers(id) on delete cascade,
  email         text not null,
  name          text not null,
  status        instructor_status not null default 'ACTIVE',
  created_at    timestamptz not null default now()
);

create index instructors_center_idx on instructors(center_id);
create index instructors_tenant_idx on instructors(tenant_id);

-- =============================================================================
-- Pedagogical notes (instructor-only; follow the child across center changes)
-- =============================================================================

create table pedagogical_notes (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  child_id               uuid not null references children(id) on delete cascade,
  instructor_id          uuid not null references instructors(id) on delete cascade,
  authored_at_center_id  uuid not null references centers(id) on delete cascade,
    -- preserved across center changes so new-center instructors see the source
  body                   text not null,
  created_at             timestamptz not null default now()
);

create index pedagogical_notes_child_idx on pedagogical_notes(child_id);

-- =============================================================================
-- Misconception taxonomy (data, not code — architecture.md guardrail #3)
-- =============================================================================

create table misconceptions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  code        text not null,
  strand      strand not null,
  label       text not null,
  description text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, code)
);

-- =============================================================================
-- Curriculum recommendations (data, not code — architecture.md guardrail #4)
-- =============================================================================

create table curriculum_recommendations (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  strand                  strand not null,
  level                   half_grade_level not null,
  primary_recommendation  text not null,
  supplementary           text[] not null default '{}',
  notes                   text,
  created_at              timestamptz not null default now(),
  unique (tenant_id, strand, level)
);

-- =============================================================================
-- Questions (S.A.M. licensed content per compliance.md §8)
-- =============================================================================

create table questions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  external_id           text,
    -- S.A.M. catalog ID (when present) for licensing audit and provenance
  strand                strand not null,
  level                 half_grade_level not null,
  difficulty            real not null,
    -- IRT difficulty parameter; calibrated by experts initially, refined later
  format                question_format not null,
  content               jsonb not null,
    -- shape: { stem, options[]?, correct_answer, distractor_misconceptions{}? }
  misconception_tags    text[] not null default '{}',
    -- references misconceptions.code (denormalised for fast filtering)
  time_expected_seconds integer,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  unique (tenant_id, external_id)
);

create index questions_tenant_strand_level_idx
  on questions(tenant_id, strand, level)
  where is_active;
create index questions_difficulty_idx on questions(difficulty);

-- =============================================================================
-- Assessment sessions
-- =============================================================================

create table assessment_sessions (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  child_id          uuid not null references children(id) on delete cascade,
  status            assessment_status not null default 'IN_PROGRESS',
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  current_estimate  jsonb,
    -- shape: PlacementEstimate per features.md (overall_level, strand_levels{}, confidence)
  created_at        timestamptz not null default now(),
  constraint assessment_sessions_completed_chk
    check ((status = 'COMPLETED') = (completed_at is not null))
);

create index assessment_sessions_child_idx  on assessment_sessions(child_id);
create index assessment_sessions_tenant_idx on assessment_sessions(tenant_id);

-- =============================================================================
-- Responses
-- =============================================================================

create table responses (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  session_id               uuid not null references assessment_sessions(id) on delete cascade,
  question_id              uuid not null references questions(id) on delete restrict,
  answer_given             text not null,
  is_correct               boolean not null,
  time_taken_seconds       integer not null check (time_taken_seconds >= 0),
  detected_misconceptions  text[] not null default '{}',
  created_at               timestamptz not null default now()
);

create index responses_session_idx  on responses(session_id);
create index responses_question_idx on responses(question_id);

-- =============================================================================
-- VPC audit log (compliance.md §2 + school-operator extension)
-- =============================================================================

create table vpc_audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  parent_id   uuid references parents(id) on delete set null,
  event_type  vpc_event_type not null,
  center_id   uuid references centers(id) on delete set null,
  ip_address  inet,
  user_agent  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index vpc_audit_log_parent_idx  on vpc_audit_log(parent_id);
create index vpc_audit_log_created_idx on vpc_audit_log(created_at);

-- =============================================================================
-- Question access log (compliance.md §8 — every question served is logged)
-- =============================================================================

create table question_access_log (
  id          bigserial primary key,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  session_id  uuid not null references assessment_sessions(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  ip_address  inet,
  created_at  timestamptz not null default now()
);

create index question_access_log_session_idx  on question_access_log(session_id);
create index question_access_log_question_idx on question_access_log(question_id);
create index question_access_log_created_idx  on question_access_log(created_at);
