-- =====================================================================
-- PROD BRING-UP — OPTION B: SCHEMA REBUILD TO REPO HEAD (REVIEW ARTIFACT)
-- =====================================================================
-- Target: PROD = atlas-assessment (ntfaqzueppqymfkefadm), the LIVE DB.
--         NOT atlas-assessment-2 (dead).
--
-- *** DO NOT APPLY BLINDLY. THIS SCRIPT CONTAINS NON-ADDITIVE AND (in the final
--     fenced section) DESTRUCTIVE statements. ***
--
-- PRECONDITIONS (in order):
--   1. Run 01-inspect-prod-schema.sql   — confirm which gaps exist (esp. strand enum case).
--   2. Run 03-inspect-prod-userdata.sql — PROVE zero real families. The DESTRUCTIVE
--      section at the end MUST NOT run until §03 shows no real parents/children/
--      completed sessions/responses.
--
-- HOW TO RUN: section by section, reviewing between each, in the prod Studio SQL
-- editor (the same manual path as the admin go-live). Do NOT `supabase db push`
-- (it would replay the entire migration history). Sections A2–A7 are additive and
-- idempotent (safe to re-run). Section A1 (strand recast) self-skips if prod is
-- already on the lowercase scheme. Section Z (DESTRUCTIVE) is fenced and gated.
--
-- Order: types -> enum reconciliation -> tables -> columns/FKs -> constraints,
-- then (last, separate) the destructive data cleanup. Each statement is tagged
-- with the repo migration it derives from.
--
-- NOTE: image_path / image_required / image_alt are NOT columns — they are keys
-- inside the questions.content JSONB (see 20260625120200_l5l6_image_path_wire.sql).
-- They need NO schema change; they arrive with the audited bank load (Step 4).
-- =====================================================================


-- =====================================================================
-- SECTION A1 — STRAND ENUM RECAST  (NON-ADDITIVE)   [from 20260511000200]
-- =====================================================================
-- Reconciles the OLD uppercase strand enum to the repo's lowercase scheme.
-- Self-guarding: the entire recast runs ONLY if prod's `strand` enum still
-- holds 'NUMBER_SENSE' (i.e. the pre-20260511000200 uppercase set). If prod is
-- already lowercase (most likely — the running app depends on it), it logs a
-- NOTICE and changes nothing. The whole swap is one DO block so it is atomic:
-- it either completes or leaves the enum untouched (never half-recast).
--
-- Value mapping (founder-locked, per docs/taxonomy.md / the migration):
--   NUMBER_SENSE       -> number_sense
--   OPERATIONS         -> operations_algorithms
--   WORD_PROBLEMS      -> operations_algorithms
--   FRACTIONS_DECIMALS -> fractions_decimals
--   GEOMETRY           -> geometry
--   MEASUREMENT_DATA   -> measurement
-- Columns recast: questions.strand, misconceptions.strand,
--   curriculum_recommendations.strand (each guarded by table existence).
--
-- COLLAPSE-COLLISION PRE-CLEAR: the OPERATIONS + WORD_PROBLEMS -> operations_algorithms
-- merge makes two old strand values identical. The ONLY unique/PK constraint on a
-- strand-typed column in the whole schema is
--   curriculum_recommendations UNIQUE (tenant_id, strand, level)  [initial_schema]
-- so two placeholder rows (OPERATIONS@2B, WORD_PROBLEMS@2B) collapse to the same key
-- and the index rebuild during ALTER ... TYPE fails with 23505 (observed in prod).
-- Since Option B discards curriculum_recommendations (pre-load scaffolding), A1 DELETEs
-- those rows BEFORE the cast — gated on the SAME prod-empty predicate as Section Z
-- (responses AND question_access_log empty), so it never touches a DB with real
-- child activity. Collision check for the other strand-typed tables:
--   * questions             — UNIQUE is (tenant_id, external_id); the strand index
--                             (tenant_id, strand, level) is NON-unique -> NO collision.
--   * misconceptions        — UNIQUE is (tenant_id, code); strand not in a key -> NO collision.
--   * curriculum_recommendations — UNIQUE (tenant_id, strand, level) -> COLLISION (pre-cleared here).
-- =====================================================================
do $$
declare
  is_upper boolean;
  n_resp   bigint := 0;
  n_log    bigint := 0;
  n_cr     bigint := 0;
begin
  select exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'strand' and e.enumlabel = 'NUMBER_SENSE'
  ) into is_upper;

  if not is_upper then
    raise notice 'A1 strand recast SKIPPED — enum is not the old uppercase set (already reconciled, or strand type absent). No change.';
    return;
  end if;

  raise notice 'A1 strand recast: old uppercase enum detected — recasting to lowercase scheme.';

  -- SAFETY GATE (matches Section Z): refuse to clear/recast if any real child
  -- activity exists. With prod proven placeholder-only (§03) these are both 0.
  if to_regclass('public.responses') is not null then
    execute 'select count(*) from responses' into n_resp;
  end if;
  if to_regclass('public.question_access_log') is not null then
    execute 'select count(*) from question_access_log' into n_log;
  end if;
  if n_resp <> 0 or n_log <> 0 then
    raise exception
      'ABORT A1: responses=% , question_access_log=% are NOT empty — prod is not placeholder-only. Refusing to clear curriculum_recommendations or recast strand. Nothing changed.',
      n_resp, n_log;
  end if;

  -- PRE-CLEAR curriculum_recommendations (placeholder data discarded by Option B)
  -- to avoid the OPERATIONS/WORD_PROBLEMS collapse violating UNIQUE(tenant_id,strand,level).
  if to_regclass('public.curriculum_recommendations') is not null then
    execute 'select count(*) from curriculum_recommendations' into n_cr;
    raise notice 'A1 pre-clear: deleting % curriculum_recommendations placeholder row(s) before recast.', n_cr;
    execute 'delete from curriculum_recommendations';
  end if;

  -- Clean up any leftover temp type from a prior aborted run.
  execute 'drop type if exists strand_new';

  execute $ddl$
    create type strand_new as enum (
      'number_sense','operations_algorithms','fractions_decimals',
      'measurement','geometry','data_statistics'
    )
  $ddl$;

  -- questions.strand (always present on the live DB)
  execute $ddl$
    alter table questions alter column strand type strand_new using (
      case strand::text
        when 'NUMBER_SENSE'       then 'number_sense'
        when 'OPERATIONS'         then 'operations_algorithms'
        when 'WORD_PROBLEMS'      then 'operations_algorithms'
        when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
        when 'GEOMETRY'           then 'geometry'
        when 'MEASUREMENT_DATA'   then 'measurement'
      end::strand_new
    )
  $ddl$;

  if to_regclass('public.misconceptions') is not null then
    execute $ddl$
      alter table misconceptions alter column strand type strand_new using (
        case strand::text
          when 'NUMBER_SENSE'       then 'number_sense'
          when 'OPERATIONS'         then 'operations_algorithms'
          when 'WORD_PROBLEMS'      then 'operations_algorithms'
          when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
          when 'GEOMETRY'           then 'geometry'
          when 'MEASUREMENT_DATA'   then 'measurement'
        end::strand_new
      )
    $ddl$;
  end if;

  if to_regclass('public.curriculum_recommendations') is not null then
    execute $ddl$
      alter table curriculum_recommendations alter column strand type strand_new using (
        case strand::text
          when 'NUMBER_SENSE'       then 'number_sense'
          when 'OPERATIONS'         then 'operations_algorithms'
          when 'WORD_PROBLEMS'      then 'operations_algorithms'
          when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
          when 'GEOMETRY'           then 'geometry'
          when 'MEASUREMENT_DATA'   then 'measurement'
        end::strand_new
      )
    $ddl$;
  end if;

  execute 'drop type strand';
  execute 'alter type strand_new rename to strand';
  raise notice 'A1 strand recast COMPLETE.';
end $$;


-- =====================================================================
-- SECTION A2 — base value-tag enum types          [from 20260507000000]
-- (additive, guarded; almost certainly already present)
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

-- assessment_test_type — created BEFORE assessment_sessions.test_type (A5).  [20260611090000]
do $$ begin
  if not exists (select 1 from pg_type where typname = 'assessment_test_type') then
    create type assessment_test_type as enum ('short','comprehensive');
  end if;
end $$;


-- =====================================================================
-- SECTION A3 — enum VALUE additions (idempotent)
-- =====================================================================
-- question_format: the 8 formats the 0A–L4 bank uses beyond the 3 base values.
alter type question_format add value if not exists 'TEXT_ENTRY';          -- 20260610170000
alter type question_format add value if not exists 'SELECT_MULTIPLE';     -- 20260614120000
alter type question_format add value if not exists 'VISUAL_MATCHING';     -- 20260614120000
alter type question_format add value if not exists 'MULTI_BLANK';         -- 20260614120000
alter type question_format add value if not exists 'EQUATION_SET';        -- 20260614120000
alter type question_format add value if not exists 'CLICK_IMAGE_SINGLE';  -- 20260615120000
alter type question_format add value if not exists 'CLICK_IMAGE_MULTI';   -- 20260615120000
alter type question_format add value if not exists 'IMAGE_ORDERING';      -- 20260615120000

-- half_grade_level: the three pre-K levels, ordered below KA.  [20260616120000]
alter type half_grade_level add value if not exists '0A' before 'KA';
alter type half_grade_level add value if not exists '0B' before 'KA';
alter type half_grade_level add value if not exists '0C' before 'KA';
-- (5A / 6A already exist in the base enum — L5/L6 needs no new value.)


-- =====================================================================
-- SECTION A4 — V2026 taxonomy tables + RLS    [20260525000001]
-- (tables before the questions.content_id FK in A5)
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


-- =====================================================================
-- SECTION A5 — columns the loader / serve / report write (additive, guarded)
-- =====================================================================

-- questions norm tags.  [20260507000000]
alter table questions add column if not exists word_count     integer            not null default 0;
alter table questions add column if not exists operation_type operation_type     not null default 'ADDITION';
alter table questions add column if not exists num_operations smallint           not null default 1;
alter table questions add column if not exists representation representation_kind not null default 'SYMBOLIC';

-- questions.short_test_eligible — CONFIRMED MISSING; drives short-test selection.  [20260616120050]
alter table questions add column if not exists short_test_eligible boolean not null default false;

-- questions.content_id FK -> tax_content(id) (nullable; loader resolves it).  [20260525000003]
alter table questions add column if not exists content_id uuid references tax_content(id);

-- assessment_sessions: short-test routing + outcome persist.
--   NOTE: test_type is added NOT NULL DEFAULT 'short' (per 20260611090000); on a
--   populated sessions table that back-fills existing rows as 'short'. With Option B
--   (prod sessions proven empty by §03) there is nothing to back-fill.
alter table assessment_sessions add column if not exists test_type            assessment_test_type not null default 'short'; -- 20260611090000
alter table assessment_sessions add column if not exists short_test_outcome   jsonb;                                         -- 20260621130000
alter table assessment_sessions add column if not exists engine_prior_version text not null default 'v1';                     -- 20260510000000


-- =====================================================================
-- SECTION A6 — report + consent tables (additive, guarded)
-- =====================================================================

-- report_narrations  [20260525000000]  + key_findings cols  [20260526000000]
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

-- consent_records — enforceable per-child VPC record (COPPA Gate-B).  [20260528000000]
create table if not exists consent_records (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  parent_id             uuid not null references parents(id) on delete cascade,
  child_id              uuid not null references children(id) on delete cascade,
  consent_type          text not null,
  consent_text_version  text not null,
  consent_text          text not null,
  data_uses             jsonb not null default '[]'::jsonb,
  sharing_permissions   jsonb not null default '{}'::jsonb,
  revoked               boolean not null default false,
  revoked_at            timestamptz,
  ip_address            inet,
  user_agent            text,
  granted_at            timestamptz not null default now(),
  created_at            timestamptz not null default now()
);
create index if not exists consent_records_tenant_idx on consent_records(tenant_id);
create index if not exists consent_records_parent_idx on consent_records(parent_id);
create index if not exists consent_records_child_idx  on consent_records(child_id);
create index if not exists consent_records_active_idx on consent_records(child_id, tenant_id) where revoked = false;

alter table consent_records enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='consent_records' and policyname='consent_records_self_select') then
    create policy "consent_records_self_select" on consent_records
      for select using (parent_id = app_current_parent_id());
  end if;
end $$;


-- =====================================================================
-- SECTION A7 — constraints (guarded; added after the columns they reference)
-- =====================================================================

-- norm-tag checks.  [20260507000000]
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

-- one response per (session, question) — serve-path dedup (409).  [20260612090000]
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'responses_session_question_unique') then
    alter table responses add constraint responses_session_question_unique unique (session_id, question_id);
  end if;
end $$;

-- activation guardrail — held rows cannot be is_active=true.  [20260613120000]
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


-- =====================================================================
-- SECTION A8 — NOT in this script (separate bring-up steps)
-- =====================================================================
--  * question-images storage bucket  [20260512000000] — bring-up STEP 2
--    (storage.buckets insert + bucket RLS).
--  * Taxonomy REFERENCE ROWS (tax_*) + the QUESTION BANK rows — DATA, loaded by
--    the audited prod loader in bring-up STEP 4 (never a dev seed.sql run).
--    content_id stays NULL until the tax_content rows exist.
--  * admins table + admin_status  [20260625120400] — likely already live; if not,
--    see 02-catchup-additive-schema.sql Section 6 (not child-serve-critical).


-- #####################################################################
-- ## SECTION Z — DESTRUCTIVE DATA CLEANUP   *** RUN LAST, GATED ***   ##
-- #####################################################################
-- ## DO NOT RUN until 03-inspect-prod-userdata.sql has CONFIRMED prod holds
-- ## ZERO real families (no real parents/children, no COMPLETED sessions,
-- ## zero responses). This DELETES the existing placeholder question rows so
-- ## the audited bank load (Step 4) starts from a clean slate.
-- ##
-- ## This is the ONLY data-destructive statement in the file. Everything above
-- ## is schema (A1 recast is schema-level; A2–A7 are additive).
-- #####################################################################

-- Z1. PREVIEW FIRST — what would be deleted. Expect a small count (~5 placeholder
--     rows per inspection §8). If this returns more than a couple dozen rows, STOP:
--     that is not placeholder junk — escalate before deleting anything.
select id, external_id, level, question_format, is_active, created_at
from questions
order by created_at;

-- Z2. SAFETY-GATED DELETE. Refuses to run (raises an exception, deletes nothing)
--     unless responses AND question_access_log are empty — i.e. no child ever
--     answered these rows. Run ONLY after reviewing the Z1 preview and §03.
do $$
declare n_resp bigint := 0; n_log bigint := 0; n_q bigint;
begin
  if to_regclass('public.responses') is not null then
    execute 'select count(*) from responses' into n_resp;
  end if;
  if to_regclass('public.question_access_log') is not null then
    execute 'select count(*) from question_access_log' into n_log;
  end if;

  if n_resp <> 0 or n_log <> 0 then
    raise exception
      'ABORT: responses=% , question_access_log=% are NOT empty — real child activity may reference these questions. No rows deleted.',
      n_resp, n_log;
  end if;

  select count(*) into n_q from questions;
  raise notice 'SAFETY OK (responses=0, access_log=0). Deleting % placeholder question rows.', n_q;

  delete from questions;

  raise notice 'DELETE complete — questions table cleared. Proceed to bring-up STEP 4 (audited bank load).';
end $$;

-- =====================================================================
-- END OPTION B REBUILD. After A1–A7 + (gated) Z: prod schema matches repo HEAD
-- for the 0A–L4 beta serve path; the question bank is empty and ready for the
-- audited Step-4 load.
-- =====================================================================
