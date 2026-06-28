-- =====================================================================
-- PROD BRING-UP — STEP 1, ARTIFACT 2: ADDITIVE-ONLY SCHEMA CATCH-UP
-- =====================================================================
-- Target: PROD = atlas-assessment (ntfaqzueppqymfkefadm), the LIVE DB.
--
-- DO NOT RUN BLINDLY. Run 01-inspect-prod-schema.sql FIRST, review the results,
-- then run only the sections this script's header maps to a confirmed gap. The
-- whole script is written to be SAFE to run wholesale (every statement is
-- IF NOT EXISTS or guarded by a pg_catalog check), but review-then-apply is the
-- rule for the live DB. Apply via Studio SQL (the same manual path as the admin
-- go-live). Do NOT `supabase db push` (it would replay the entire pending set).
--
-- ADDITIVE ONLY: ADD COLUMN / CREATE TABLE / CREATE TYPE / ADD VALUE /
-- ADD CONSTRAINT / CREATE INDEX — all guarded. NO DROP, NO destructive ALTER,
-- NO data writes. (The bank rows + taxonomy seed + image upload are SEPARATE
-- bring-up steps, not this script.)
--
-- Scope = the schema the 0A–L4 beta loader + child serve path + parent report
-- depend on. Each statement is tagged with the repo migration it derives from.
-- Sections 1–5 are the 0A–L4 core. Section 6 (admins) is likely already live.
-- Section 7 lists NON-ADDITIVE contingencies that this script deliberately does
-- NOT perform (they need a reviewed, separate change if inspection shows them).
--
-- NOTE on enum ADD VALUE: do not wrap this whole script in a single explicit
-- BEGIN/COMMIT and then use a newly-added enum value in the same transaction.
-- This script only ADDS values (no data uses them), so running it statement-by-
-- statement (Studio default) is safe.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — base value-tag enum types (from 20260507000000)
-- questions.operation_type / representation columns depend on these. Almost
-- certainly already in prod; guarded so they are no-ops if present.
-- =====================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'operation_type') then
    create type operation_type as enum (
      'ADDITION','SUBTRACTION','MULTIPLICATION','DIVISION','FRACTION_OP',
      'DECIMAL_OP','PERCENT_OP','GEOMETRY','MEASUREMENT','PATTERN',
      'ALGEBRA','COUNTING','IDENTIFY'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'representation_kind') then
    create type representation_kind as enum (
      'SYMBOLIC','PICTORIAL','BAR_MODEL_REQUIRED',
      'WORD_PROBLEM_SINGLE','WORD_PROBLEM_MULTI'
    );
  end if;
end $$;


-- =====================================================================
-- SECTION 2 — enum VALUE additions (idempotent ADD VALUE IF NOT EXISTS)
-- =====================================================================

-- question_format — the 8 formats the 0A–L4 bank uses beyond the 3 base values.
--   TEXT_ENTRY                         (20260610170000)
alter type question_format add value if not exists 'TEXT_ENTRY';
--   SELECT_MULTIPLE/VISUAL_MATCHING/MULTI_BLANK/EQUATION_SET (20260614120000)
alter type question_format add value if not exists 'SELECT_MULTIPLE';
alter type question_format add value if not exists 'VISUAL_MATCHING';
alter type question_format add value if not exists 'MULTI_BLANK';
alter type question_format add value if not exists 'EQUATION_SET';
--   CLICK_IMAGE_SINGLE/CLICK_IMAGE_MULTI/IMAGE_ORDERING     (20260615120000)
alter type question_format add value if not exists 'CLICK_IMAGE_SINGLE';
alter type question_format add value if not exists 'CLICK_IMAGE_MULTI';
alter type question_format add value if not exists 'IMAGE_ORDERING';

-- half_grade_level — the three pre-K levels, ordered below KA   (20260616120000)
alter type half_grade_level add value if not exists '0A' before 'KA';
alter type half_grade_level add value if not exists '0B' before 'KA';
alter type half_grade_level add value if not exists '0C' before 'KA';


-- =====================================================================
-- SECTION 3 — questions columns the loader writes (+ their checks)
-- =====================================================================

-- Norm tags (20260507000000). Almost certainly present; guarded ADD IF NOT EXISTS.
alter table questions add column if not exists word_count     integer             not null default 0;
alter table questions add column if not exists operation_type operation_type      not null default 'ADDITION';
alter table questions add column if not exists num_operations smallint            not null default 1;
alter table questions add column if not exists representation representation_kind  not null default 'SYMBOLIC';

-- Norm-tag check constraints (20260507000000) — guarded (no IF NOT EXISTS on ADD CONSTRAINT).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'questions_num_operations_chk') then
    alter table questions add constraint questions_num_operations_chk check (num_operations >= 1);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'questions_word_count_chk') then
    alter table questions add constraint questions_word_count_chk check (word_count >= 0);
  end if;
end $$;

-- short_test_eligible (20260616120050) — CONFIRMED MISSING in prod. Drives short-test selection.
alter table questions add column if not exists short_test_eligible boolean not null default false;


-- =====================================================================
-- SECTION 4 — V2026 taxonomy + questions.content_id (20260525000001 / 20260525000003)
-- content_id is the sub-strand axis the report + #161 picker use. The loader
-- resolves content_id from these tables. Tables first, then the FK column.
-- (RLS SELECT policies depend on app_current_tenant_id(), which prod already has
--  from the base RLS migration 20260426000100.)
-- =====================================================================

create table if not exists tax_strands (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_strands_code_unique unique (tenant_id, code)
);
create index if not exists tax_strands_tenant_idx on tax_strands(tenant_id);

create table if not exists tax_sub_strands (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  strand_id              uuid not null references tax_strands(id) on delete cascade,
  code                   text not null,
  name                   text not null,
  display_order          int  not null,
  applies_to_level_codes text[] not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint tax_sub_strands_code_unique unique (tenant_id, code)
);
create index if not exists tax_sub_strands_tenant_idx on tax_sub_strands(tenant_id);
create index if not exists tax_sub_strands_strand_idx on tax_sub_strands(strand_id);

create table if not exists tax_levels (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  mvp           boolean not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_levels_code_unique unique (tenant_id, code)
);
create index if not exists tax_levels_tenant_idx on tax_levels(tenant_id);

create table if not exists tax_content (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  sub_strand_id uuid not null references tax_sub_strands(id) on delete cascade,
  level_id      uuid not null references tax_levels(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  mvp           boolean not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_content_code_unique unique (tenant_id, code)
);
create index if not exists tax_content_tenant_idx     on tax_content(tenant_id);
create index if not exists tax_content_sub_strand_idx on tax_content(sub_strand_id);
create index if not exists tax_content_level_idx      on tax_content(level_id);

-- RLS: tenant-scoped SELECT (writes are service-role only). Guarded CREATE POLICY.
alter table tax_strands     enable row level security;
alter table tax_sub_strands enable row level security;
alter table tax_levels      enable row level security;
alter table tax_content     enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tax_strands'     and policyname='tax_strands_tenant_select') then
    create policy "tax_strands_tenant_select"     on tax_strands     for select using (tenant_id = app_current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tax_sub_strands' and policyname='tax_sub_strands_tenant_select') then
    create policy "tax_sub_strands_tenant_select" on tax_sub_strands for select using (tenant_id = app_current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tax_levels'      and policyname='tax_levels_tenant_select') then
    create policy "tax_levels_tenant_select"      on tax_levels      for select using (tenant_id = app_current_tenant_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tax_content'     and policyname='tax_content_tenant_select') then
    create policy "tax_content_tenant_select"     on tax_content     for select using (tenant_id = app_current_tenant_id());
  end if;
end $$;

-- questions.content_id FK -> tax_content(id)  (20260525000003). Nullable; loader resolves it.
alter table questions add column if not exists content_id uuid references tax_content(id);


-- =====================================================================
-- SECTION 5 — serve / report supporting schema
-- =====================================================================

-- assessment_test_type enum (20260611090000) — created BEFORE the test_type column below.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'assessment_test_type') then
    create type assessment_test_type as enum ('short','comprehensive');
  end if;
end $$;

-- assessment_sessions: short-test routing + outcome persist.
-- NOTE on test_type: migration 20260611090000 adds it NOT NULL DEFAULT 'short'. Adding a
-- NOT NULL DEFAULT column to a populated prod table back-fills every existing session as
-- 'short'. If that back-fill is not wanted on live history, add it nullable here and set
-- the default separately after review. Kept faithful to the migration below:
alter table assessment_sessions add column if not exists test_type            assessment_test_type not null default 'short'; -- (20260611090000)
alter table assessment_sessions add column if not exists short_test_outcome   jsonb;                                         -- (20260621130000)
alter table assessment_sessions add column if not exists engine_prior_version text not null default 'v1';                     -- (20260510000000)

-- responses: one response per (session, question)  (20260612090000) — serve-path dedup (409).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'responses_session_question_unique') then
    alter table responses add constraint responses_session_question_unique unique (session_id, question_id);
  end if;
end $$;

-- questions activation guardrail  (20260613120000) — held rows cannot be is_active=true.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'questions_held_rows_inactive') then
    alter table questions add constraint questions_held_rows_inactive
      check (
        not (
          is_active
          and coalesce((content #>> '{_authoring,requires_format_swap}')::boolean, false)
        )
      );
  end if;
end $$;

-- report_narrations  (20260525000000) + key_findings columns  (20260526000000) — parent report.
create table if not exists report_narrations (
  session_id            uuid primary key references assessment_sessions(id) on delete cascade,
  tenant_id             uuid not null references tenants(id) on delete cascade,
  generated_at          timestamptz not null default now(),
  model                 text not null,
  status                text not null,
  placement_line        text,
  strand_lede           text,
  misconceptions_lede   text,
  recommendations_lede  text,
  constraint report_narrations_status_chk check (status in ('ok','failed'))
);
create index if not exists report_narrations_tenant_idx on report_narrations(tenant_id);
alter table report_narrations add column if not exists findings_strengths    text[];
alter table report_narrations add column if not exists findings_growth_areas text[];
-- (report_narrations RLS policies, if absent, mirror migration 20260525000000 — add only if
--  inspection shows the table was newly created here AND parents cannot read their narration.)


-- =====================================================================
-- SECTION 6 — admins (20260625120400). Likely ALREADY live (admin go-live used
-- the same manual Studio path). Guarded; no-op if present. Not on the child
-- serve path — include only if inspection shows it missing and admin view is wanted.
-- =====================================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'admin_status') then
    create type admin_status as enum ('ACTIVE','INACTIVE');
  end if;
end $$;

create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  tenant_id     uuid not null references tenants (id) on delete cascade,
  email         text not null,
  name          text not null,
  status        admin_status not null default 'ACTIVE',
  created_at    timestamptz not null default now()
);
-- NOTE: the admin tenant-wide SELECT *policies* on children / assessment_sessions /
-- pedagogical_notes from 20260625120400 are NOT reproduced here (they are additive
-- permissive policies, not child-serve-critical). Apply that migration's policy block
-- separately if the admin surface is being brought up in prod.


-- =====================================================================
-- SECTION 7 — NON-ADDITIVE CONTINGENCIES (this script does NOT perform these)
-- =====================================================================
-- These are flagged by the inspection but require a separate, reviewed change
-- because they are NOT additive / not pure schema:
--
--  (a) strand enum recast (20260511000200). IF inspection Section 1 shows prod's
--      `strand` enum holds the OLD uppercase values (NUMBER_SENSE, OPERATIONS,
--      WORD_PROBLEMS, FRACTIONS_DECIMALS, GEOMETRY, MEASUREMENT_DATA), the bank
--      (lowercase number_sense/operations_algorithms/.../data_statistics) will NOT
--      load. Fixing it is a column-type recast + type drop/rename (destructive on
--      the old type) — author it as its own reviewed migration; it is intentionally
--      OUT OF SCOPE for this additive script. (Most likely prod is already on the
--      lowercase enum, since the running app depends on it — confirm via inspection.)
--
--  (b) question-images storage bucket. CONFIRMED MISSING. Created in bring-up
--      STEP 2 (storage.buckets insert + bucket RLS), not here. Original DDL:
--      supabase/migrations/20260512000000_add_question_images_bucket.sql.
--
--  (c) Taxonomy REFERENCE DATA (tax_strands/tax_sub_strands/tax_levels/tax_content
--      ROWS) and the QUESTION BANK rows are DATA, not schema — loaded in bring-up
--      STEP 4 (audited prod load), never via a dev seed.sql run. content_id stays
--      NULL until those rows exist; the report sub-strand axis needs them populated.


-- =====================================================================
-- L5 / L6 OPTIONAL TAIL
-- =====================================================================
-- There is NO L5/L6-specific SCHEMA. The L5/L6 rows reuse the same columns,
-- enum values (5A/6A are in the base half_grade_level; their formats are the
-- same 0A–L4 set), taxonomy tables, and constraints created above. L5/L6 bring-up
-- is therefore DATA-ONLY (load + image upload + the held geometry activation),
-- handled in the load step — nothing additional is required in this schema script.
-- =====================================================================
