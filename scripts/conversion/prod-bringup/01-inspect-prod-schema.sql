-- =====================================================================
-- PROD BRING-UP — STEP 1, ARTIFACT 1: READ-ONLY PROD SCHEMA INSPECTION
-- =====================================================================
-- Target: PROD = atlas-assessment (ntfaqzueppqymfkefadm), the LIVE DB.
--         NOT atlas-assessment-2 (dead).
--
-- Run this in the prod Studio SQL editor. It is 100% READ-ONLY:
-- every statement is a SELECT / catalog read / RAISE NOTICE. ZERO writes,
-- ZERO DDL, ZERO data changes. Safe to run on the live DB.
--
-- Prod was hand-applied via Studio (no CI), so its supabase_migrations.schema_migrations
-- log may NOT reflect actual schema. THIS SCRIPT TRUSTS information_schema / pg_catalog,
-- not the migration log. Paste the whole block; copy each result back for review. The
-- results decide which sections of 02-catchup-additive-schema.sql are actually needed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. (Optional cross-check) what the migration LOG claims — may be stale/wrong.
-- ---------------------------------------------------------------------
select version
from supabase_migrations.schema_migrations
order by version desc
limit 25;

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES + their current values (the highest-risk gap).
--    Expect (repo HEAD):
--      strand              = number_sense, operations_algorithms, fractions_decimals,
--                            measurement, geometry, data_statistics   (LOWERCASE)
--        ^ if prod shows UPPERCASE (NUMBER_SENSE, OPERATIONS, WORD_PROBLEMS,
--          FRACTIONS_DECIMALS, GEOMETRY, MEASUREMENT_DATA) prod is pre-20260511000200
--          and needs the NON-ADDITIVE strand recast — see catch-up Section 7, NOT the
--          additive script.
--      question_format     = MULTIPLE_CHOICE, NUMERIC_ENTRY, DRAG_DROP, TEXT_ENTRY,
--                            SELECT_MULTIPLE, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET,
--                            CLICK_IMAGE_SINGLE, CLICK_IMAGE_MULTI, IMAGE_ORDERING
--      half_grade_level    = 0A, 0B, 0C, KA, KB, 1A..8B
--      operation_type, representation_kind = present
-- ---------------------------------------------------------------------
select t.typname as enum_type,
       string_agg(e.enumlabel, ', ' order by e.enumsortorder) as values
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in (
  'strand','half_grade_level','question_format',
  'operation_type','representation_kind','assessment_test_type','admin_status'
)
group by t.typname
order by t.typname;

-- ---------------------------------------------------------------------
-- 2. questions — full column list.
-- ---------------------------------------------------------------------
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'questions'
order by ordinal_position;

-- ---------------------------------------------------------------------
-- 3. questions — explicit presence booleans for loader-required columns.
--    short_test_eligible is CONFIRMED MISSING per ATLAS; this re-confirms + checks the rest.
-- ---------------------------------------------------------------------
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='short_test_eligible') as has_short_test_eligible,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='content_id')          as has_content_id,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='word_count')          as has_word_count,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='operation_type')      as has_operation_type,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='num_operations')      as has_num_operations,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='questions' and column_name='representation')      as has_representation;

-- ---------------------------------------------------------------------
-- 4. Tables the serve / report / loader path needs — present?
-- ---------------------------------------------------------------------
select tbl, (to_regclass('public.'||tbl) is not null) as exists
from (values
  ('questions'),('assessment_sessions'),('responses'),('question_access_log'),
  ('consent_records'),('children'),('parents'),
  ('tax_strands'),('tax_sub_strands'),('tax_levels'),('tax_content'),
  ('report_narrations'),('admins')
) as v(tbl)
order by tbl;

-- ---------------------------------------------------------------------
-- 5. assessment_sessions — columns the serve path / outcome persist need.
-- ---------------------------------------------------------------------
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='assessment_sessions' and column_name='test_type')            as has_test_type,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='assessment_sessions' and column_name='short_test_outcome')   as has_short_test_outcome,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='assessment_sessions' and column_name='engine_prior_version') as has_engine_prior_version;

-- ---------------------------------------------------------------------
-- 6. report_narrations — key_findings columns (report assembly reads these).
-- ---------------------------------------------------------------------
select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_narrations' and column_name='findings_strengths')    as has_findings_strengths,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_narrations' and column_name='findings_growth_areas') as has_findings_growth_areas;

-- ---------------------------------------------------------------------
-- 7. Constraints — activation guardrail + served-question dedup.
-- ---------------------------------------------------------------------
select conname, contype
from pg_constraint
where conname in (
  'questions_held_rows_inactive',
  'responses_session_question_unique',
  'questions_num_operations_chk',
  'questions_word_count_chk'
)
order by conname;

-- ---------------------------------------------------------------------
-- 8. ACTIVE question counts by level (does prod have a bank at all?).
--    (questions always exists on the live DB, so this SELECT is safe.)
-- ---------------------------------------------------------------------
select level,
       count(*)                          as total_rows,
       count(*) filter (where is_active) as active_rows
from questions
group by level
order by level;

-- Also: how many active rows carry short_test_eligible (only valid if col 3 = true).
-- (Guarded so it never errors if the column is absent.)
do $$
declare n int;
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='questions' and column_name='short_test_eligible') then
    execute 'select count(*) from questions where is_active and short_test_eligible' into n;
    raise notice 'active & short_test_eligible rows: %', n;
  else
    raise notice 'short_test_eligible column ABSENT — cannot count (expected, per ATLAS).';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. V2026 taxonomy reference-data presence (content_id resolution needs rows).
--    Guarded so it never errors if the table is absent.
-- ---------------------------------------------------------------------
do $$
declare n int;
begin
  if to_regclass('public.tax_content') is not null then
    execute 'select count(*) from tax_content' into n;
    raise notice 'tax_content rows: % (repo expects ~145 when fully seeded)', n;
  else
    raise notice 'tax_content: TABLE MISSING — taxonomy not yet created in prod.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 10. STORAGE — the question-images bucket + object count.
--     (storage.buckets / storage.objects always exist in Supabase; read-only.)
-- ---------------------------------------------------------------------
select id, name, public, created_at
from storage.buckets
where id = 'question-images';
-- ^ ZERO rows = bucket missing (confirmed by ATLAS; created in bring-up STEP 2).

select count(*) as question_image_objects
from storage.objects
where bucket_id = 'question-images';

-- =====================================================================
-- END INSPECTION — copy every result set + the RAISE NOTICE lines back for review.
-- =====================================================================
