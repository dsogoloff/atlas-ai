-- =============================================================================
-- Atlas Assessment — DEV-ONLY instructor-portal pilot seed
-- =============================================================================
-- Founder review aid: a self-contained, idempotent add-on that creates ONE
-- pilot instructor, ONE parent+child (with COPPA consent), and ONE COMPLETED
-- assessment session with REAL per-item responses across multiple sub-strands
-- — enough that the instructor diagnostic view renders FULLY: placement
-- banner, strand performance (mastery/progressing/area-of-focus), strengths,
-- patterns observed (≥1 detected misconception), curriculum recommendations,
-- and the item-level review.
--
-- This is an ADD-ON, not a replacement for supabase/seed.sql. It assumes the
-- base dev seed has already run (`supabase db reset`), so the dev tenant,
-- placeholder centers, the question bank, the V2026 taxonomy, and the
-- misconception catalog already exist. It does NOT touch the existing dev
-- parent/instructor/child or any conversion data — it adds a parallel pilot
-- dataset with its own UUIDs.
--
-- Re-runnable: every insert is `on conflict ... do nothing`; the per-item
-- responses are delete-then-insert keyed to the pilot session only. Safe to
-- run as many times as you like.
--
-- Credentials created:
--   instructor  instructor@atlas.test  /  Atlas-Pilot-2026
--   parent      parent@atlas.test      /  Atlas-Pilot-2026   (bonus, optional)
--
-- UUIDs keep the v4/variant nibbles (4 at pos 13, 8 at pos 17) so they pass
-- the Zod uuid checks on the assessment routes, per the note in seed.sql.
-- =============================================================================

-- Stop on the FIRST error so a failure is loud, not buried under a cascade of
-- "current transaction is aborted" lines (psql meta-command; needs psql).
\set ON_ERROR_STOP on

-- pgcrypto's crypt()/gen_salt() live in the `extensions` schema on Supabase.
-- A `supabase db reset` run has it on the path implicitly; a raw psql session
-- (e.g. via `docker exec ... psql`) does NOT — config.toml pins the API path
-- to just ["public"]. Without this, the first crypt() call throws and the
-- whole transaction rolls back, leaving no login (the "invalid credentials"
-- symptom). `public` stays first so unqualified table names resolve there.
set search_path = public, extensions;

begin;

-- -----------------------------------------------------------------------------
-- 1. Pilot instructor — GoTrue user + identity + instructors profile.
--    Attached to the existing dev center "Placeholder Center — Singapore HQ".
-- -----------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  'a7100000-0000-4000-8000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'instructor@atlas.test',
  crypt('Atlas-Pilot-2026', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Pilot Instructor"}'::jsonb,
  now(), now(), false, false,
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'a7100000-0000-4000-8000-000000000005',
  'a7100000-0000-4000-8000-000000000005',
  'email',
  '{"sub":"a7100000-0000-4000-8000-000000000005","email":"instructor@atlas.test","email_verified":true,"phone_verified":false}'::jsonb,
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

with t as (select id from tenants where slug = 'inspirea_singapore_math'),
     c as (
       select id from centers
       where tenant_id = (select id from tenants where slug = 'inspirea_singapore_math')
         and name like '%Singapore HQ'
       limit 1
     )
insert into instructors (id, auth_user_id, tenant_id, center_id, email, name, status)
select
  'a7100000-0000-4000-8000-000000000006',
  'a7100000-0000-4000-8000-000000000005',
  t.id,
  c.id,
  'instructor@atlas.test',
  'Pilot Instructor',
  'ACTIVE'::instructor_status
from t, c
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Pilot parent — GoTrue user + identity + parents profile.
-- -----------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  'a7100000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'parent@atlas.test',
  crypt('Atlas-Pilot-2026', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Pilot Parent"}'::jsonb,
  now(), now(), false, false,
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'a7100000-0000-4000-8000-000000000001',
  'a7100000-0000-4000-8000-000000000001',
  'email',
  '{"sub":"a7100000-0000-4000-8000-000000000001","email":"parent@atlas.test","email_verified":true,"phone_verified":false}'::jsonb,
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into parents (id, auth_user_id, tenant_id, email, name)
select
  'a7100000-0000-4000-8000-000000000002',
  'a7100000-0000-4000-8000-000000000001',
  t.id,
  'parent@atlas.test',
  'Pilot Parent'
from t
on conflict (auth_user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Pilot child — home center = Singapore HQ so the pilot instructor's
--    center-scoped RLS roster read can see them. grade_level '1' => K-4 tier.
-- -----------------------------------------------------------------------------
with t as (select id from tenants where slug = 'inspirea_singapore_math'),
     c as (
       select id from centers
       where tenant_id = (select id from tenants where slug = 'inspirea_singapore_math')
         and name like '%Singapore HQ'
       limit 1
     )
insert into children (id, parent_id, tenant_id, home_center_id, name, birth_year, grade_level)
select
  'a7100000-0000-4000-8000-000000000003',
  'a7100000-0000-4000-8000-000000000002',
  t.id,
  c.id,
  'Maya Tan (Pilot)',
  2019,
  '1'
from t, c
on conflict (id) do nothing;

-- 3b. Per-child COPPA consent so the child's data collection is on record
--     (mirrors what the /add-child server action writes in production).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into consent_records (
  id, tenant_id, parent_id, child_id, consent_type,
  consent_text_version, consent_text, data_uses, sharing_permissions
)
select
  'a7100000-0000-4000-8000-000000000004',
  t.id,
  'a7100000-0000-4000-8000-000000000002',
  'a7100000-0000-4000-8000-000000000003',
  'coppa_vpc',
  'dev-pilot-seed',
  'Seeded per-child parental consent for local instructor-portal review only.',
  '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb,
  '{}'::jsonb
from t
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. COMPLETED assessment session for the pilot child.
--    overall_level '1B' => taxonomy level L1, where the dev question bank has
--    content mapped across four sub-strands (whole_numbers, measurement,
--    geometry, data_representation) — so the strand-performance table renders
--    with real per-strand data, not "not assessed". strand_levels (engine's
--    6 strands) drive the curriculum-recommendation lookup.
--    session_time_flag 'normal' => full report, no reliability caveat banner.
-- -----------------------------------------------------------------------------
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into assessment_sessions (
  id, tenant_id, child_id, status, current_estimate, session_time_flag,
  started_at, completed_at
)
select
  'a7100000-0000-4000-8000-000000000007',
  t.id,
  'a7100000-0000-4000-8000-000000000003',
  'COMPLETED'::assessment_status,
  '{"overall_level":"1B","confidence":0.68,"strand_levels":{"number_sense":"1B","operations_algorithms":"1B","fractions_decimals":"1A","measurement":"2A","geometry":"1B","data_statistics":"1A"}}'::jsonb,
  'normal'::session_time_flag,
  now() - interval '22 minutes',
  now()
from t
on conflict (id) do nothing;

-- 4b. Narration prose backing the Strengths / focus-area sections. Plain demo
--     copy — no "diagnostic/validated/guaranteed" claims.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into report_narrations (
  session_id, tenant_id, generated_at, model, status,
  placement_line, strand_lede, findings_strengths, findings_growth_areas,
  recommendations_lede
)
select
  'a7100000-0000-4000-8000-000000000007',
  t.id,
  now(),
  'seed-fixture',
  'ok',
  'Maya worked steadily through the assessment, and Level 1B is a solid, workable starting point.',
  'Maya shows confident number and measurement work, with a few specific areas worth a closer look with an instructor.',
  array[
    'Counts, compares, and orders numbers to 100 with confidence.',
    'Reads and reasons about measurement comparisons accurately.'
  ]::text[],
  array[
    'Place value: occasionally reads the tens and ones digits independently.',
    'Shape properties: still firming up which features define each 2-D shape.',
    'Reading graphs: misreads the scale on picture graphs.'
  ]::text[],
  'A focused start on the areas above will help Maya build fluency.'
from t
on conflict (session_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Per-item responses (delete-then-insert; idempotent for this session).
--    Each row references a real seeded question by external_id so the
--    question -> content_id -> sub_strand resolution drives strand mastery.
--    Incorrect rows carry detected_misconceptions whose codes exist in the
--    misconception catalog, so they surface in "Patterns observed" and as
--    item-level pills.
--
--    Resulting picture:
--      Whole Numbers       4/6  (67%, progressing)
--      Measurement         1/1  (100%, mastery)
--      Geometry            2/3  (67%, progressing)
--      Data Representation 0/1  (0%,  area of focus)
--      Overall            7/11  (64%)
--    Patterns observed: NS_PLACE_VALUE_CONFUSION ×2, GE_SHAPE_PROPERTY ×1,
--                       MD_CHART_SCALE ×1.
-- -----------------------------------------------------------------------------
delete from responses where session_id = 'a7100000-0000-4000-8000-000000000007';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into responses (
  tenant_id, session_id, question_id, answer_given, is_correct,
  time_taken_seconds, detected_misconceptions, created_at
)
select
  t.id,
  'a7100000-0000-4000-8000-000000000007',
  q.id,
  v.answer_given,
  v.is_correct,
  v.secs,
  v.mc::text[],
  (now() - interval '22 minutes') + (v.seq * interval '95 seconds')
from t
join (values
  -- seq, external_id, answer_given, is_correct, secs, detected_misconceptions
  (1,  'SAM-L1-Q20', 'smaller than', true,  18, '{}'),
  (2,  'SAM-L2-Q01', '9',            true,  22, '{}'),
  (3,  'SAM-L1-Q21', '8',            true,  15, '{}'),
  (4,  'SAM-L1-Q23', '10',           true,  31, '{}'),
  (5,  'SAM-L2-Q07', '70',           false, 40, '{NS_PLACE_VALUE_CONFUSION}'),
  (6,  'SAM-L2-Q06', '(1)',          false, 35, '{NS_PLACE_VALUE_CONFUSION}'),
  (7,  'SAM-L1-Q04', 'Lin',          true,  20, '{}'),
  (8,  'SAM-L2-Q02', '5',            true,  27, '{}'),
  (9,  'SAM-L1-Q05', 'B',            true,  19, '{}'),
  (10, 'SAM-L2-Q03', 'quarter circle and square', false, 44, '{GE_SHAPE_PROPERTY}'),
  (11, 'SAM-L2-Q05', '5',            false, 52, '{MD_CHART_SCALE}')
) as v(seq, external_id, answer_given, is_correct, secs, mc)
  on true
join questions q on q.tenant_id = t.id and q.external_id = v.external_id;

-- Report what landed so a missing question bank is obvious rather than silent.
do $$
declare
  resp_count int;
begin
  select count(*) into resp_count
  from responses where session_id = 'a7100000-0000-4000-8000-000000000007';
  raise notice '[instructor-pilot seed] responses inserted for pilot session: % (expected 11)', resp_count;
  if resp_count = 0 then
    raise warning '[instructor-pilot seed] 0 responses — has the base seed (supabase db reset) loaded the question bank?';
  end if;
end
$$;

commit;

-- -----------------------------------------------------------------------------
-- Self-check (runs after commit). Every column should read 1. If auth_user is
-- 0 the inserts didn't persist; if instructor_row is 0 the dev tenant/center
-- from the base seed is missing (run `supabase db reset` first); if
-- password_ok is 0 the stored hash doesn't match the expected password.
-- -----------------------------------------------------------------------------
\echo '--- instructor-pilot seed self-check (all values should be 1) ---'
select
  (select count(*) from auth.users
     where email = 'instructor@atlas.test')                       as auth_user,
  (select count(*) from instructors
     where email = 'instructor@atlas.test' and status = 'ACTIVE') as instructor_row,
  (select count(*) from auth.users
     where email = 'instructor@atlas.test'
       and encrypted_password = crypt('Atlas-Pilot-2026', encrypted_password))
                                                                  as password_ok,
  (select count(*) from responses
     where session_id = 'a7100000-0000-4000-8000-000000000007')  as responses;
