-- Atlas Assessment — local seed data.
--
-- Loaded by `supabase db reset` after migrations. Safe for dev / CI.
-- Production seed is a separate, audited process (S.A.M. licensed content).
--
-- Per architecture.md #5: this file MUST contain clearly placeholder
-- content only — do not author Singapore-Math-looking questions that
-- could accidentally ship. Real S.A.M. content loads via a separate,
-- gated import once licensing is formalized.

-- =============================================================================
-- Single v1 tenant (architecture.md guardrail #1)
-- =============================================================================

insert into tenants (slug, display_name) values
  ('inspirea_singapore_math', 'Inspirea Labs — Singapore Math (S.A.M. v1)');

-- =============================================================================
-- Local dev auth user + linked parent + test child (Item #12 Phase 7.5)
-- =============================================================================
-- `supabase db reset` wipes auth.users along with public tables. Without a
-- seeded dev user, the founder must re-sign-up through /signup after every
-- reset, which costs minutes and isn't reproducible across contributors.
--
-- Credentials (LOCAL DEV ONLY — never deploy this file to prod):
--   email:    dev@atlas.local
--   password: dev-password
--
-- This block lives in seed.sql (NOT a migration) because seed.sql is the
-- dev/CI write path; production never runs it. The bcrypt hash is
-- computed at seed time via pgcrypto's crypt() — pgcrypto is enabled by
-- default in Supabase.
--
-- All conflicts no-op so a re-run (e.g., second `db reset` in the same
-- session) doesn't fail on the pkey.

-- 1. auth.users — the GoTrue identity row.
--
-- Two seed-time landmines to be aware of (both bitten Item #12 Phase 7.5):
--
-- LANDMINE 1 — GoTrue scan-time failure on NULL string columns.
--   GoTrue's Go struct scans the following columns as `string` (not
--   `*string`). When the row has NULL in any of them, every login
--   attempt 500s with:
--     "Scan error on column index 3, name 'confirmation_token':
--      converting NULL to string is unsupported"
--   The Supabase auth.users schema does NOT default these to '' at the
--   DB level, so an INSERT that omits them leaves them as NULL and
--   silently breaks GoTrue. Fix: stamp '' explicitly.
--     - confirmation_token
--     - recovery_token
--     - email_change_token_new
--     - email_change
--   Other token columns (phone_change, phone_change_token,
--   email_change_token_current, reauthentication_token) DO have
--   ''::character varying defaults at the DB level and don't need
--   restating.
--
-- LANDMINE 2 — Zod's `.uuid()` enforces RFC 4122 (Postgres `uuid` does not).
--   The UUIDs below intentionally look like obvious-seed-data
--   (aaaa.../bbbb.../cccc...) but satisfy Zod's regex:
--     /^...-[1-5][hex]{3}-[89ab][hex]{3}-.../
--   Position 13 must be a version nibble (we use 4 = "random"). Position
--   17 must be a variant nibble (we use 8 = RFC-4122 variant 10xx).
--   All-N UUIDs (e.g., 11111111-...) fail Zod's check on POST
--   /api/assess/start even though Postgres accepts them as `uuid`.
--   When refreshing the seed UUIDs, KEEP the 4 and 8 nibbles in those
--   positions or the dev assessment flow 400s out before the handler runs.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev@atlas.local',
  crypt('dev-password', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Parent"}'::jsonb,
  now(),
  now(),
  false,
  false,
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- 2. auth.identities — required by GoTrue for password-based sign-in.
--    provider_id is the user id for email-provider identities.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'email',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","email":"dev@atlas.local","email_verified":true,"phone_verified":false}'::jsonb,
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

-- 3. public.parents — the app-domain row, FK-equivalent to auth_user_id.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into parents (id, auth_user_id, tenant_id, email, name)
select
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  t.id,
  'dev@atlas.local',
  'Dev Parent'
from t
on conflict (auth_user_id) do nothing;

-- 4. public.children — one test child so the founder can run an
--    assessment immediately after login. grade_level='2' so the
--    engine targets the populated 1A-2B levels of the v1 bank.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into children (id, parent_id, tenant_id, name, birth_year, grade_level)
select
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  t.id,
  'Dev Child',
  2018,
  '2'
from t
on conflict (id) do nothing;

-- 4b. public.consent_records — a blanket VPC grant for the dev parent so the
--     session-start / response-submit consent gate (migration
--     20260528000000) passes in local dev. child_id NULL = covers all of the
--     parent's children. Mirrors what the /coppa server action writes in
--     production; without it, a freshly seeded dev DB blocks every assessment
--     with "consent_required".
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into consent_records (
  id, tenant_id, parent_id, child_id, consent_type,
  consent_text_version, consent_text, data_uses, sharing_permissions
)
select
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  t.id,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  null,
  'coppa_vpc',
  'dev-seed',
  'Seeded blanket parental consent for local development only.',
  '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb,
  '{}'::jsonb
from t
on conflict (id) do nothing;

-- =============================================================================
-- Placeholder centers
-- =============================================================================
-- Names are intentionally generic. Replace with the real S.A.M. roster
-- when licensing lands.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into centers (tenant_id, name, status)
select t.id, name, 'ACTIVE'::center_status
from t,
  (values
    ('Placeholder Center — Singapore HQ'),
    ('Placeholder Center — North'),
    ('Placeholder Center — East'),
    ('Placeholder Center — Online')
  ) as v(name);

-- =============================================================================
-- Misconception taxonomy (starter set per features.md §2)
-- =============================================================================

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into misconceptions (tenant_id, code, strand, label, description)
select t.id, code, strand::strand, label, description
from t,
  (values
    -- Number Sense
    ('NS_COUNTING_ERROR',         'number_sense',
       'Counting error',
       'Skips, double-counts, or miscounts items in a set.'),
    ('NS_PLACE_VALUE_CONFUSION',  'number_sense',
       'Place value confusion',
       'Treats digits as independent values without regard to place.'),
    ('NS_MAGNITUDE_MISJUDGE',     'number_sense',
       'Number magnitude misjudgement',
       'Misjudges relative size of multi-digit numbers.'),

    -- Operations
    ('OP_NO_REGROUPING',          'operations_algorithms',
       'No regrouping (subtraction)',
       'In subtraction, takes the smaller from the larger digit in each '
       'column instead of borrowing.'),
    ('OP_SUBTRACTION_DIRECTION',  'operations_algorithms',
       'Subtraction direction error',
       'Subtracts in the wrong direction (smaller minus larger).'),
    ('OP_MULT_AS_REPEATED_ADD',   'operations_algorithms',
       'Multiplication as repeated addition fails',
       'Treats multiplication as repeated addition but loses count or '
       'uses the wrong addend.'),
    ('OP_DIV_REMAINDER',          'operations_algorithms',
       'Division remainder errors',
       'Drops or misinterprets the remainder in long division.'),

    -- Word Problems
    ('WP_OPERATION_SELECTION',    'operations_algorithms',
       'Operation selection error',
       'Picks the wrong operation (e.g., adds when the problem requires '
       'subtraction).'),
    ('WP_IRRELEVANT_INFO',        'operations_algorithms',
       'Irrelevant information distraction',
       'Uses an irrelevant number from the problem in the calculation.'),
    ('WP_MULTI_STEP_SEQUENCE',    'operations_algorithms',
       'Multi-step sequencing error',
       'In a multi-step problem, performs steps in the wrong order or '
       'omits a step.'),

    -- Fractions / Decimals
    ('FR_NUM_DENOM_INDEPENDENT',  'fractions_decimals',
       'Numerator/denominator treated independently',
       'Adds or subtracts numerators and denominators separately as if '
       'they were unrelated whole numbers.'),
    ('FR_FRACTION_AS_TWO_NUMS',   'fractions_decimals',
       'Fraction-as-two-numbers misconception',
       'Reads a fraction as two separate whole numbers rather than a '
       'single value.'),
    ('FR_COMMON_DENOMINATOR',     'fractions_decimals',
       'Common denominator errors',
       'Adds fractions without finding a common denominator.'),

    -- Geometry
    ('GE_PERIMETER_AREA',         'geometry',
       'Perimeter / area confusion',
       'Computes perimeter when asked for area, or vice versa.'),
    ('GE_SHAPE_PROPERTY',         'geometry',
       'Shape property error',
       'Misidentifies defining properties of a shape (e.g., counts a '
       'rectangle with non-equal sides as a square).'),

    -- Measurement & Data  (added in Item #9 to fill the features.md §3
    -- starter-taxonomy gap; mirrors the migration in
    -- 20260509000000_misconception_classifier_audit.sql)
    ('MD_UNIT_CONFUSION',         'measurement',
       'Unit confusion',
       'Mixes units when calculating, or omits the unit conversion when '
       'needed (e.g., adds centimetres to metres without converting).'),
    ('MD_RULER_ZERO_POINT',       'measurement',
       'Ruler zero-point error',
       'Measures length starting from the 1 mark on the ruler instead of 0, '
       'or aligns the object with the wrong end of the ruler.'),
    ('MD_TIME_READING',           'measurement',
       'Time-reading error',
       'Reads the wrong hand on an analog clock, or miscounts elapsed time '
       'across hour boundaries.'),
    ('MD_CHART_SCALE',            'data_statistics',
       'Chart scale misreading',
       'Misreads the scale on a bar chart or pictogram (e.g., reads each '
       'picture as 1 when each represents 5).'),

    -- Added in Item #11 Phase 1 to support S.A.M. Level 2 content load;
    -- mirrors the migration in 20260511000000_sam_l2_misconception_taxonomy.sql.
    ('NS_ZERO_VALUE',             'number_sense',
       'Zero placeholder error',
       'Treats zero as absence-of-quantity rather than a placeholder digit. '
       'Drops zero-tens or zero-hundreds positions when reading or writing '
       'multi-digit numerals (e.g., reads 204 as 24, or writes 648 as 6048).'),
    ('WP_KEYWORD_TRAP',           'operations_algorithms',
       'Surface keyword operation trap',
       'Picks an operation from a surface keyword in the problem text '
       '(e.g., "gave" suggesting addition, "more" suggesting addition) rather '
       'than from the relational structure of the problem.')
  ) as v(code, strand, label, description);

-- =============================================================================
-- Curriculum recommendation stubs
-- =============================================================================
-- Single illustrative row per strand at level 2B so the report code path
-- can be exercised without S.A.M. content. Real mapping comes from S.A.M.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into curriculum_recommendations
  (tenant_id, strand, level, primary_recommendation, supplementary, notes)
select t.id, strand::strand, '2B'::half_grade_level,
       primary_rec, supplementary, notes
from t,
  (values
    -- Six rows, one per Atlas diagnostic band (new taxonomy per Item #12).
    -- The WORD_PROBLEMS placeholder from the prior taxonomy has no analog
    -- here; word problems classify by underlying content. A data_statistics
    -- placeholder is new since MEASUREMENT_DATA split into measurement +
    -- data_statistics.
    ('number_sense',          'PLACEHOLDER — Number Sense Pack 2B',
       array['PLACEHOLDER — Extra Practice 2A'],
       'Placeholder. Replace with S.A.M. mapping once licensing lands.'),
    ('operations_algorithms', 'PLACEHOLDER — Dimensions Math 2B',
       array['PLACEHOLDER — Extra Practice 2A Chapter 5'],
       'Placeholder.'),
    ('fractions_decimals',    'PLACEHOLDER — Fractions & Decimals Pack 2B',
       array[]::text[],
       'Placeholder.'),
    ('measurement',           'PLACEHOLDER — Measurement Pack 2B',
       array[]::text[],
       'Placeholder.'),
    ('geometry',              'PLACEHOLDER — Geometry Pack 2B',
       array[]::text[],
       'Placeholder.'),
    ('data_statistics',       'PLACEHOLDER — Data & Statistics Pack 2B',
       array[]::text[],
       'Placeholder.')
  ) as v(strand, primary_rec, supplementary, notes);

-- =============================================================================
-- Relational strand taxonomy seed REMOVED (Item #12 Phase 9 Part A)
-- =============================================================================
-- The old flat-taxonomy `strands`, `strand_cohorts`, and `misconception_strands`
-- tables were dropped in 20260525000004_drop_old_flat_taxonomy.sql. The
-- corresponding seed blocks (mirrored from 20260519000000 and 20260520000000)
-- are no longer relevant — those migration files remain as history; this
-- seed file no longer carries the mirrored INSERTs.

-- =============================================================================
-- S.A.M. Level 2 v1 content (11 founder-approved items from Item #11).
-- =============================================================================
-- MIRRORED FROM: supabase/migrations/20260511000100_sam_l2_content_v1.sql
--
-- These INSERT rows are duplicated VERBATIM (same VALUES, same content
-- payloads, same misconception_tags, same derived fields) from the migration.
-- Both must stay in sync.
--
-- Why the duplication: `supabase db reset` runs migrations BEFORE seed.sql,
-- so the migration's tenant-scoped INSERT is a no-op in dev (the
-- inspirea_singapore_math tenant doesn't exist yet when the migration fires).
-- The migration is the production-update path; seed.sql is the dev/CI path.
-- See AGENTS.md §11 for the rule.
--
-- Both inserts use `ON CONFLICT (tenant_id, external_id) DO NOTHING` so neither
-- duplicates rows if both ever effectively run against the same DB.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active)
select t.id, external_id, strand::strand, level::half_grade_level,
       difficulty, format::question_format,
       content::jsonb, misconception_tags,
       word_count, operation_type::operation_type, num_operations,
       representation::representation_kind,
       true
from t,
  (values
    -- Q01 / 1A / Number Sense / Missing-addend number bond (1 + ? = 10).
    ('SAM-L2-Q01', 'number_sense', '1A', -1.9, 'MULTIPLE_CHOICE',
       '{"stem":"What is the missing number? 1 and ___ make 10.",'
       '"options":["1","0","9","11"],"correct_index":2,'
       '"distractor_misconceptions":{"1":"NS_ZERO_VALUE",'
                                    '"3":"OP_SUBTRACTION_DIRECTION"}}',
       array['NS_PLACE_VALUE_CONFUSION','OP_SUBTRACTION_DIRECTION'],
       9, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q07 / 1B / Number Sense / Place-value decomposition (76 = ? tens 6 ones).
    ('SAM-L2-Q07', 'number_sense', '1B', -1.6, 'MULTIPLE_CHOICE',
       '{"stem":"What is the missing number? 76 = ___ tens 6 ones",'
       '"options":["6","7","10","70"],"correct_index":1,'
       '"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION",'
                                    '"2":"NS_PLACE_VALUE_CONFUSION",'
                                    '"3":"NS_PLACE_VALUE_CONFUSION"}}',
       array['NS_PLACE_VALUE_CONFUSION'],
       9, 'IDENTIFY', 1, 'SYMBOLIC'),

    -- Q09 / 1A / Number Sense / Symbolic addition "3 more than 54".
    ('SAM-L2-Q09', 'number_sense', '1A', -1.7, 'MULTIPLE_CHOICE',
       '{"stem":"What is 3 more than 54?",'
       '"options":["51","57","84","543"],"correct_index":1,'
       '"distractor_misconceptions":{"0":"OP_SUBTRACTION_DIRECTION",'
                                    '"2":"NS_PLACE_VALUE_CONFUSION"}}',
       array['OP_SUBTRACTION_DIRECTION','NS_PLACE_VALUE_CONFUSION'],
       6, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q10 / 1B / Number Sense / Order 3 numbers ascending.
    ('SAM-L2-Q10', 'number_sense', '1B', -1.5, 'DRAG_DROP',
       '{"stem":"Arrange the following numbers. Begin with the smallest. 68, 81, 9",'
       '"items":["68","81","9"],"correct_order":["9","68","81"]}',
       array['NS_PLACE_VALUE_CONFUSION'],
       11, 'COUNTING', 1, 'SYMBOLIC'),

    -- Q11 / 2A / Word Problems / Change-unknown apples (35 - 7).
    ('SAM-L2-Q11', 'operations_algorithms', '2A', -1.1, 'NUMERIC_ENTRY',
       '{"stem":"Jo had 7 apples. Her brother gave her some more apples. '
       'She has 35 apples now. How many apples did her brother give her?",'
       '"correct_answer":"28"}',
       array['WP_OPERATION_SELECTION','WP_KEYWORD_TRAP','OP_NO_REGROUPING'],
       24, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q14 / 2A / Operations / Partitive division (12 birds, 3 cages).
    ('SAM-L2-Q14', 'operations_algorithms', '2A', -1.1, 'MULTIPLE_CHOICE',
       '{"stem":"Mrs Tan puts 12 birds into 3 cages. How many birds are '
       'there in each cage?","options":["6","2","3","4"],"correct_index":3,'
       '"distractor_misconceptions":{"0":"OP_DIV_REMAINDER",'
                                    '"1":"OP_DIV_REMAINDER"}}',
       array['WP_OPERATION_SELECTION','OP_DIV_REMAINDER'],
       16, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q17 / 2A / Word Problems / Money subtraction with regrouping (45 - 29).
    -- Strand reassigned from MEASUREMENT_DATA: money framing is incidental;
    -- diagnostic is subtraction with regrouping in a word-problem frame.
    ('SAM-L2-Q17', 'operations_algorithms', '2A', -1.0, 'NUMERIC_ENTRY',
       '{"stem":"Larry has $45. He buys a school bag for $29. '
       'How much money does he have left?","correct_answer":"16"}',
       array['OP_NO_REGROUPING','WP_OPERATION_SELECTION'],
       17, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q19 / 2A / Number Sense / Expanded form to standard form (600+40+8).
    ('SAM-L2-Q19', 'number_sense', '2A', -1.3, 'NUMERIC_ENTRY',
       '{"stem":"What is the missing number? 600 + 40 + 8 = ___",'
       '"correct_answer":"648"}',
       array['NS_PLACE_VALUE_CONFUSION'],
       8, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q20 / 2A / Number Sense / Hundreds-place increment with zero placeholder.
    ('SAM-L2-Q20', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',
       '{"stem":"What is 100 more than 504?","correct_answer":"604"}',
       array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
       6, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q21 / 2B / Number Sense / Order 4 three-digit numbers descending.
    ('SAM-L2-Q21', 'number_sense', '2B', -0.9, 'DRAG_DROP',
       '{"stem":"Arrange the following numbers in order. Begin with the '
       'greatest. 652, 716, 629, 708",'
       '"items":["652","716","629","708"],'
       '"correct_order":["716","708","652","629"]}',
       array['NS_PLACE_VALUE_CONFUSION'],
       14, 'COUNTING', 1, 'SYMBOLIC'),

    -- Q22 / 2B / Number Sense / Skip-counting backward across hundreds boundary.
    ('SAM-L2-Q22', 'number_sense', '2B', -0.7, 'NUMERIC_ENTRY',
       '{"stem":"What comes next in the number pattern below? '
       '860, 840, 820, 800, ?","correct_answer":"780"}',
       array['NS_PLACE_VALUE_CONFUSION'],
       12, 'PATTERN', 1, 'SYMBOLIC')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation)
on conflict (tenant_id, external_id) do nothing;

-- =============================================================================
-- Item #13a Phase 3 — visual-gate placeholder question with image.
-- =============================================================================
-- DEV ONLY. This row exists solely so the Phase 3 visual gate has an
-- image-bearing question to render against
-- docs/item-13a-phase-3-visual-gate.md. The PLACEHOLDER external_id
-- prefix, PLACEHOLDER stem text, and the "PLACEHOLDER" watermark baked
-- into the SVG asset all make this row obviously not real content.
--
-- DO NOT MIRROR TO A MIGRATION. Production seed is the gated S.A.M.
-- import path; this placeholder must not reach prod. The §11 dev/prod
-- parity rule applies in REVERSE here: this row lives ONLY in seed.sql
-- (dev/CI write path); migrations have nothing to mirror.
--
-- REMOVE AT PHASE 5 CLOSE. Once Phase 5 lands real image assets for
-- the 8 image-essential SAM-L2 items (Q02, Q03, Q05, Q06, Q12, Q15,
-- Q16, Q18), this placeholder is no longer needed and the entire
-- block below should be deleted in the Phase 5 commit. The SVG asset
-- under supabase/storage-seed/question-images/ may stay (useful
-- regression fixture) or be deleted at the same time.
--
-- is_active=false by default. Visual gate runbook documents the
-- toggle SQL the founder runs to activate this row and deactivate
-- the SAM-L2 rows just for the gate, then `supabase db reset` to
-- revert. Default-off keeps the engine from accidentally serving
-- the placeholder during normal dev workflows.
--
-- The asset file (placeholder-grid.svg) must already be in the
-- question-images bucket before this row is useful. Run
-- `pnpm storage:seed` after the first `supabase start` with
-- [storage] enabled in config.toml (per AGENTS.md §11).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active)
select t.id, 'PLACEHOLDER-Q-IMG-GRID-001', 'number_sense'::strand,
       '2A'::half_grade_level, -1.5, 'MULTIPLE_CHOICE'::question_format,
       jsonb_build_object(
         'stem', 'PLACEHOLDER — which cell is highlighted in the grid?',
         'options', jsonb_build_array(
           'Cell 1,1', 'Cell 2,2', 'Cell 2,3', 'Cell 3,4'
         ),
         'correct_index', 0,
         'image_path', 'placeholder-grid.svg',
         'image_alt',
           'Placeholder math grid: 4 columns and 3 rows with cells labeled by coordinates, used for layout and sizing verification only. Not real assessment content.',
         'image_required', true
       ),
       array[]::text[],
       9, 'IDENTIFY'::operation_type, 1, 'PICTORIAL'::representation_kind,
       false  -- is_active=false; flip to true at visual gate time
from t
on conflict (tenant_id, external_id) do nothing;

-- =============================================================================
-- Strand-relational backfill REMOVED (Item #12 Phase 9 Part A)
-- =============================================================================
-- questions.strand_id_new, curriculum_recommendations.strand_id_new, and the
-- misconception_strands join table were dropped in
-- 20260525000004_drop_old_flat_taxonomy.sql. The Phase 3 backfill block
-- mirrored from 20260520000000_backfill_strand_relational_columns.sql is
-- no longer relevant. Migration file remains as history.

-- =============================================================================
-- V2026 taxonomy seed (Item #12 Phase 6 + Phase 7 Part A)
-- =============================================================================
-- Source-of-truth: docs/sam-v2026-taxonomy.md §7 (machine-readable JSON).
-- The four tax_* tables created by 20260525000001 are populated here.
--
-- MIRRORED FROM: supabase/migrations/20260525000002_seed_v2026_taxonomy.sql
-- (Phase 7 Part A added the production-rollout migration). VALUES blocks
-- below are byte-identical to that migration; the test at
-- src/lib/taxonomy/seed.test.ts asserts that — drift fails the test.
--
-- AGENTS.md §11 parity: `supabase db reset` runs the migration first
-- (which inserts the rows), then runs seed.sql which re-runs the same
-- inserts; both files use `on conflict (tenant_id, code) do nothing` so
-- the second pass is a no-op. Either file run alone also produces a
-- correct final state.
--
-- FK strategy: parent rows are looked up by `code` via scalar subquery.
-- If any parent reference is missing, the subquery returns null and the
-- INSERT fails on the NOT NULL FK column — seed-time FK integrity check.

-- 3 strands (top-level MOE)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_strands (tenant_id, code, name, display_order)
select t.id, v.code, v.name, v.display_order
from t, (values
  ('number_algebra',       'Number and Algebra',       1),
  ('measurement_geometry', 'Measurement and Geometry', 2),
  ('statistics',           'Statistics',               3)
) as v(code, name, display_order)
on conflict (tenant_id, code) do nothing;

-- 9 levels (0A, 0B, 0C, 1–6; mvp = true for L1–L4 only)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_levels (tenant_id, code, name, display_order, mvp)
select t.id, v.code, v.name, v.display_order, v.mvp
from t, (values
  ('l0a', 'Level 0A', 1, false),
  ('l0b', 'Level 0B', 2, false),
  ('l0c', 'Level 0C', 3, false),
  ('l1',  'Level 1',  4, true),
  ('l2',  'Level 2',  5, true),
  ('l3',  'Level 3',  6, true),
  ('l4',  'Level 4',  7, true),
  ('l5',  'Level 5',  8, false),
  ('l6',  'Level 6',  9, false)
) as v(code, name, display_order, mvp)
on conflict (tenant_id, code) do nothing;

-- 12 sub-strands (FK → tax_strands by code; applies_to_level_codes denormalised from spec)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_sub_strands (tenant_id, strand_id, code, name, display_order, applies_to_level_codes)
select
  t.id,
  (select s.id from tax_strands s where s.tenant_id = t.id and s.code = v.parent_code),
  v.code, v.name, v.display_order, v.applies::text[]
from t, (values
  ('whole_numbers',       'Whole Numbers',                          'number_algebra',        1, '{l0a,l0b,l0c,l1,l2,l3,l4,l5}'),
  ('fractions',           'Fractions',                              'number_algebra',        2, '{l2,l3,l4,l5,l6}'),
  ('decimals',            'Decimals',                               'number_algebra',        3, '{l4,l5}'),
  ('money',               'Money',                                  'number_algebra',        4, '{l3}'),
  ('percentage',          'Percentage',                             'number_algebra',        5, '{l5,l6}'),
  ('rate',                'Rate',                                   'number_algebra',        6, '{l5}'),
  ('ratio',               'Ratio',                                  'number_algebra',        7, '{l6}'),
  ('algebra',             'Algebra',                                'number_algebra',        8, '{l6}'),
  ('measurement',         'Measurement',                            'measurement_geometry',  9, '{l0b,l0c,l1,l2,l3}'),
  ('geometry',            'Geometry',                               'measurement_geometry', 10, '{l0a,l0b,l0c,l1,l2,l3,l4,l5,l6}'),
  ('area_volume',         'Area and Volume',                        'measurement_geometry', 11, '{l3,l4,l5,l6}'),
  ('data_representation', 'Data Representation and Interpretation', 'statistics',           12, '{l0c,l1,l2,l3,l4,l6}')
) as v(code, name, parent_code, display_order, applies)
on conflict (tenant_id, code) do nothing;

-- 145 content items (FK → tax_sub_strands + tax_levels by code)
-- Grouped by level. display_order = spec §7 `seq` (sequence within each
-- (level, sub_strand) pair). mvp = true for L1–L4 items (71 of 145 total).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into tax_content (tenant_id, sub_strand_id, level_id, code, name, display_order, mvp)
select
  t.id,
  (select ss.id from tax_sub_strands ss where ss.tenant_id = t.id and ss.code = v.sub_strand_code),
  (select l.id  from tax_levels       l  where l.tenant_id  = t.id and l.code  = v.level_code),
  v.code, v.name, v.display_order, v.mvp
from t, (values
  -- Level 0A (7 items, mvp=false)
  ('l0a-whole_numbers-1', 'whole_numbers', 'l0a', 'Numbers to 20',                      1, false),
  ('l0a-whole_numbers-2', 'whole_numbers', 'l0a', 'Number Bonds to 10',                 2, false),
  ('l0a-whole_numbers-3', 'whole_numbers', 'l0a', 'Addition and Subtraction Within 10', 3, false),
  ('l0a-geometry-1',      'geometry',      'l0a', 'Lines and Curves',                   1, false),
  ('l0a-geometry-2',      'geometry',      'l0a', 'Parts and Whole',                    2, false),
  ('l0a-geometry-3',      'geometry',      'l0a', 'Plane Shapes',                       3, false),
  ('l0a-geometry-4',      'geometry',      'l0a', 'Patterns',                           4, false),
  -- Level 0B (9 items, mvp=false)
  ('l0b-whole_numbers-1', 'whole_numbers', 'l0b', 'Numbers to 50',                      1, false),
  ('l0b-whole_numbers-2', 'whole_numbers', 'l0b', 'Number Bonds to 10',                 2, false),
  ('l0b-whole_numbers-3', 'whole_numbers', 'l0b', 'Addition and Subtraction Within 20', 3, false),
  ('l0b-whole_numbers-4', 'whole_numbers', 'l0b', 'Ordinal Numbers',                    4, false),
  ('l0b-measurement-1',   'measurement',   'l0b', 'Calendar and Time',                  1, false),
  ('l0b-geometry-1',      'geometry',      'l0b', 'Positions',                          1, false),
  ('l0b-geometry-2',      'geometry',      'l0b', 'Plane Shapes',                       2, false),
  ('l0b-geometry-3',      'geometry',      'l0b', 'Solid Shapes',                       3, false),
  ('l0b-geometry-4',      'geometry',      'l0b', 'Patterns',                           4, false),
  -- Level 0C (11 items, mvp=false)
  ('l0c-whole_numbers-1',        'whole_numbers',       'l0c', 'Numbers to 100',                       1, false),
  ('l0c-whole_numbers-2',        'whole_numbers',       'l0c', 'Tens and Ones',                        2, false),
  ('l0c-whole_numbers-3',        'whole_numbers',       'l0c', 'Addition and Subtraction Within 100',  3, false),
  ('l0c-whole_numbers-4',        'whole_numbers',       'l0c', 'Multiplication',                       4, false),
  ('l0c-whole_numbers-5',        'whole_numbers',       'l0c', 'Division',                             5, false),
  ('l0c-measurement-1',          'measurement',         'l0c', 'Calendar and Time',                    1, false),
  ('l0c-measurement-2',          'measurement',         'l0c', 'Money',                                2, false),
  ('l0c-geometry-1',             'geometry',            'l0c', 'Plane Shapes',                         1, false),
  ('l0c-geometry-2',             'geometry',            'l0c', 'Solid Shapes',                         2, false),
  ('l0c-geometry-3',             'geometry',            'l0c', 'Patterns',                             3, false),
  ('l0c-data_representation-1',  'data_representation', 'l0c', 'Picture Graphs',                       1, false),
  -- Level 1 (16 items, mvp=true)
  ('l1-whole_numbers-1',         'whole_numbers',       'l1',  'Numbers 0 to 10',                       1, true),
  ('l1-whole_numbers-2',         'whole_numbers',       'l1',  'Number Bonds',                          2, true),
  ('l1-whole_numbers-3',         'whole_numbers',       'l1',  'Addition Within 10',                    3, true),
  ('l1-whole_numbers-4',         'whole_numbers',       'l1',  'Subtraction from Within 10',            4, true),
  ('l1-whole_numbers-5',         'whole_numbers',       'l1',  'Ordinal Numbers and Positions',         5, true),
  ('l1-whole_numbers-6',         'whole_numbers',       'l1',  'Numbers to 20',                         6, true),
  ('l1-whole_numbers-7',         'whole_numbers',       'l1',  'Addition and Subtraction',              7, true),
  ('l1-whole_numbers-8',         'whole_numbers',       'l1',  'Numbers to 100',                        8, true),
  ('l1-whole_numbers-9',         'whole_numbers',       'l1',  'Addition and Subtraction Within 100',   9, true),
  ('l1-whole_numbers-10',        'whole_numbers',       'l1',  'Multiplication',                       10, true),
  ('l1-whole_numbers-11',        'whole_numbers',       'l1',  'Division',                             11, true),
  ('l1-measurement-1',           'measurement',         'l1',  'Length',                                1, true),
  ('l1-measurement-2',           'measurement',         'l1',  'Time',                                  2, true),
  ('l1-measurement-3',           'measurement',         'l1',  'Money',                                 3, true),
  ('l1-geometry-1',              'geometry',            'l1',  'Introduction to Basic Shapes',          1, true),
  ('l1-data_representation-1',   'data_representation', 'l1',  'Picture Graphs',                        1, true),
  -- Level 2 (15 items, mvp=true)
  ('l2-whole_numbers-1',         'whole_numbers',       'l2',  'Numbers to 1000',                                                            1, true),
  ('l2-whole_numbers-2',         'whole_numbers',       'l2',  'Addition and Subtraction Within 1000',                                       2, true),
  ('l2-whole_numbers-3',         'whole_numbers',       'l2',  'Multiplication and Division Within Tables of 2, 3, 4, 5 and 10',             3, true),
  ('l2-whole_numbers-4',         'whole_numbers',       'l2',  'Word Problems Involving the Four Operations',                                4, true),
  ('l2-fractions-1',             'fractions',           'l2',  'Understanding Fractions',                                                    1, true),
  ('l2-fractions-2',             'fractions',           'l2',  'Addition and Subtraction',                                                   2, true),
  ('l2-measurement-1',           'measurement',         'l2',  'Length',                                                                     1, true),
  ('l2-measurement-2',           'measurement',         'l2',  'Mass',                                                                       2, true),
  ('l2-measurement-3',           'measurement',         'l2',  'Time',                                                                       3, true),
  ('l2-measurement-4',           'measurement',         'l2',  'Money',                                                                      4, true),
  ('l2-measurement-5',           'measurement',         'l2',  'Volume',                                                                     5, true),
  ('l2-geometry-1',              'geometry',            'l2',  'Forming patterns with 2-Dimension shapes',                                   1, true),
  ('l2-geometry-2',              'geometry',            'l2',  '3-Dimension shapes and figures',                                             2, true),
  ('l2-data_representation-1',   'data_representation', 'l2',  'Picture Graphs',                                                             1, true),
  ('l2-data_representation-2',   'data_representation', 'l2',  'Tally Chart',                                                                2, true),
  -- Level 3 (20 items, mvp=true)
  ('l3-whole_numbers-1',         'whole_numbers',       'l3',  'Numbers to 10 000',                                                          1, true),
  ('l3-whole_numbers-2',         'whole_numbers',       'l3',  'Addition and Subtraction Within 10 000',                                     2, true),
  ('l3-whole_numbers-3',         'whole_numbers',       'l3',  'Mental Addition and Subtraction',                                            3, true),
  ('l3-whole_numbers-4',         'whole_numbers',       'l3',  'Multiplication and Division Within Tables of 6, 7, 8 and 9',                 4, true),
  ('l3-whole_numbers-5',         'whole_numbers',       'l3',  'Multiplication and Division of 3-Digit Numbers',                             5, true),
  ('l3-whole_numbers-6',         'whole_numbers',       'l3',  'Word Problems Involving the Four Operations',                                6, true),
  ('l3-fractions-1',             'fractions',           'l3',  'Understanding Equivalent Fractions',                                         1, true),
  ('l3-fractions-2',             'fractions',           'l3',  'Addition and Subtraction',                                                   2, true),
  ('l3-money-1',                 'money',               'l3',  'Addition and Subtraction of Money',                                          1, true),
  ('l3-money-2',                 'money',               'l3',  'Word Problems',                                                              2, true),
  ('l3-measurement-1',           'measurement',         'l3',  'Length, Mass and Volume (Conversions)',                                      1, true),
  ('l3-measurement-2',           'measurement',         'l3',  'Time',                                                                       2, true),
  ('l3-measurement-3',           'measurement',         'l3',  'Word Problems',                                                              3, true),
  ('l3-geometry-1',              'geometry',            'l3',  'Angles',                                                                     1, true),
  ('l3-geometry-2',              'geometry',            'l3',  'Perpendicular Lines',                                                        2, true),
  ('l3-geometry-3',              'geometry',            'l3',  'Parallel Lines',                                                             3, true),
  ('l3-area_volume-1',           'area_volume',         'l3',  'Understanding Area and Perimeter',                                           1, true),
  ('l3-area_volume-2',           'area_volume',         'l3',  'Finding Perimeter and Area on a Grid',                                       2, true),
  ('l3-area_volume-3',           'area_volume',         'l3',  'Area of Rectangle',                                                          3, true),
  ('l3-data_representation-1',   'data_representation', 'l3',  'Bar Graphs',                                                                 1, true),
  -- Level 4 (20 items, mvp=true)
  ('l4-whole_numbers-1',         'whole_numbers',       'l4',  'Numbers up to 100 000',                                                      1, true),
  ('l4-whole_numbers-2',         'whole_numbers',       'l4',  'Multiplication and Division of Whole Numbers',                               2, true),
  ('l4-whole_numbers-3',         'whole_numbers',       'l4',  'Mental Multiplication and Division',                                         3, true),
  ('l4-whole_numbers-4',         'whole_numbers',       'l4',  'Word Problems',                                                              4, true),
  ('l4-fractions-1',             'fractions',           'l4',  'Mixed Numbers and Improper Fractions',                                       1, true),
  ('l4-fractions-2',             'fractions',           'l4',  'Addition and Subtraction of Fractions',                                      2, true),
  ('l4-fractions-3',             'fractions',           'l4',  'Word Problems',                                                              3, true),
  ('l4-decimals-1',              'decimals',            'l4',  'Understanding Decimals',                                                     1, true),
  ('l4-decimals-2',              'decimals',            'l4',  'Rounding Decimals',                                                          2, true),
  ('l4-decimals-3',              'decimals',            'l4',  'Fractions and Decimals',                                                     3, true),
  ('l4-decimals-4',              'decimals',            'l4',  'The Four Operations of Decimals',                                            4, true),
  ('l4-geometry-1',              'geometry',            'l4',  'Angles',                                                                     1, true),
  ('l4-geometry-2',              'geometry',            'l4',  'Squares and Rectangles',                                                     2, true),
  ('l4-geometry-3',              'geometry',            'l4',  'Symmetry',                                                                   3, true),
  ('l4-geometry-4',              'geometry',            'l4',  'Nets',                                                                       4, true),
  ('l4-area_volume-1',           'area_volume',         'l4',  'Area and Perimeter of Rectangles, Squares, Composite Figures',               1, true),
  ('l4-area_volume-2',           'area_volume',         'l4',  'Word Problems',                                                              2, true),
  ('l4-data_representation-1',   'data_representation', 'l4',  'Tables',                                                                     1, true),
  ('l4-data_representation-2',   'data_representation', 'l4',  'Line Graphs',                                                                2, true),
  ('l4-data_representation-3',   'data_representation', 'l4',  'Pie Charts',                                                                 3, true),
  -- Level 5 (25 items, mvp=false)
  ('l5-whole_numbers-1',         'whole_numbers',       'l5',  'Numbers up to 10 Million',                                                                                       1, false),
  ('l5-whole_numbers-2',         'whole_numbers',       'l5',  'The Four Operations of Whole Numbers',                                                                           2, false),
  ('l5-whole_numbers-3',         'whole_numbers',       'l5',  'Word Problems',                                                                                                  3, false),
  ('l5-fractions-1',             'fractions',           'l5',  'Division of Whole Numbers with Quotient as a Fraction/Mixed Number',                                             1, false),
  ('l5-fractions-2',             'fractions',           'l5',  'Conversion of Fractions to Decimals',                                                                            2, false),
  ('l5-fractions-3',             'fractions',           'l5',  'Addition and Subtraction of Mixed Numbers',                                                                      3, false),
  ('l5-fractions-4',             'fractions',           'l5',  'Multiplication of Fractions, Multiplication of Fractions/Mixed Numbers and Whole Numbers',                       4, false),
  ('l5-fractions-5',             'fractions',           'l5',  'Word Problems',                                                                                                  5, false),
  ('l5-decimals-1',              'decimals',            'l5',  'Multiplying and Dividing by 10, 100, 1000 and Their Multiples',                                                  1, false),
  ('l5-decimals-2',              'decimals',            'l5',  'Converting Measurements',                                                                                        2, false),
  ('l5-decimals-3',              'decimals',            'l5',  'Word Problems',                                                                                                  3, false),
  ('l5-percentage-1',            'percentage',          'l5',  'Understanding Percent',                                                                                          1, false),
  ('l5-percentage-2',            'percentage',          'l5',  'Percentages, Fractions and Decimals',                                                                            2, false),
  ('l5-percentage-3',            'percentage',          'l5',  'Percentage in Pie Charts',                                                                                       3, false),
  ('l5-percentage-4',            'percentage',          'l5',  'Word Problems',                                                                                                  4, false),
  ('l5-rate-1',                  'rate',                'l5',  'Understanding Rate',                                                                                             1, false),
  ('l5-rate-2',                  'rate',                'l5',  'Word Problems',                                                                                                  2, false),
  ('l5-geometry-1',              'geometry',            'l5',  'Angle Properties',                                                                                               1, false),
  ('l5-geometry-2',              'geometry',            'l5',  'Triangles and Angles',                                                                                           2, false),
  ('l5-geometry-3',              'geometry',            'l5',  'Quadrilaterals and Angles',                                                                                      3, false),
  ('l5-area_volume-1',           'area_volume',         'l5',  'Area of a Triangle and Composite Figures',                                                                       1, false),
  ('l5-area_volume-2',           'area_volume',         'l5',  'Building Solids with Unit Cubes',                                                                                2, false),
  ('l5-area_volume-3',           'area_volume',         'l5',  'Volume of Cubes and Cuboids',                                                                                    3, false),
  ('l5-area_volume-4',           'area_volume',         'l5',  'Volume of a Liquid in a Rectangular Tank',                                                                       4, false),
  ('l5-area_volume-5',           'area_volume',         'l5',  'Word Problems',                                                                                                  5, false),
  -- Level 6 (22 items, mvp=false)
  ('l6-fractions-1',             'fractions',           'l6',  'Division with Fractions',                                                                                        1, false),
  ('l6-fractions-2',             'fractions',           'l6',  'Word Problems',                                                                                                  2, false),
  ('l6-percentage-1',            'percentage',          'l6',  'Finding Percentages',                                                                                            1, false),
  ('l6-percentage-2',            'percentage',          'l6',  'Percentage Change',                                                                                              2, false),
  ('l6-percentage-3',            'percentage',          'l6',  'Word Problems',                                                                                                  3, false),
  ('l6-ratio-1',                 'ratio',               'l6',  'Notation, Representations and Interpretation of Ratio',                                                          1, false),
  ('l6-ratio-2',                 'ratio',               'l6',  'Finding Equivalent Ratios',                                                                                      2, false),
  ('l6-ratio-3',                 'ratio',               'l6',  'Finding New Ratios',                                                                                             3, false),
  ('l6-ratio-4',                 'ratio',               'l6',  'Fractions and Ratio',                                                                                            4, false),
  ('l6-ratio-5',                 'ratio',               'l6',  'Word Problems',                                                                                                  5, false),
  ('l6-algebra-1',               'algebra',             'l6',  'Using Letters to Represent Unknown Numbers',                                                                     1, false),
  ('l6-algebra-2',               'algebra',             'l6',  'Evaluating and Simplifying Algebraic Expressions',                                                               2, false),
  ('l6-algebra-3',               'algebra',             'l6',  'Solving Simple Equations',                                                                                       3, false),
  ('l6-algebra-4',               'algebra',             'l6',  'Word Problems',                                                                                                  4, false),
  ('l6-geometry-1',              'geometry',            'l6',  'Angles in Geometric Shapes',                                                                                     1, false),
  ('l6-area_volume-1',           'area_volume',         'l6',  'Area and Circumference of a Circle',                                                                             1, false),
  ('l6-area_volume-2',           'area_volume',         'l6',  'Area and Perimeter of Semicircle, Quarter Circle, Composite Figures',                                            2, false),
  ('l6-area_volume-3',           'area_volume',         'l6',  'Finding One Dimension or Area of a Face of a Cube/Cuboid Given Other Dimensions and Volume',                     3, false),
  ('l6-area_volume-4',           'area_volume',         'l6',  'Finding Volume of Liquid',                                                                                       4, false),
  ('l6-area_volume-5',           'area_volume',         'l6',  'Introduction to Square Root and Cube Root Symbols',                                                              5, false),
  ('l6-data_representation-1',   'data_representation', 'l6',  'Average',                                                                                                        1, false),
  ('l6-data_representation-2',   'data_representation', 'l6',  'Word Problems',                                                                                                  2, false)
) as v(code, sub_strand_code, level_code, name, display_order, mvp)
on conflict (tenant_id, code) do nothing;

-- =============================================================================
-- questions.content_id backfill (Item #12 Phase 7 Part B)
-- =============================================================================
-- MIRRORED FROM: supabase/migrations/20260525000003_bridge_questions_to_tax_content.sql
--
-- AGENTS.md §11: the migration's UPDATE runs against ZERO rows during
-- `supabase db reset` because all question seed migrations are themselves
-- tenant-CTE no-ops at migration time (questions only exist after seed.sql
-- runs). The migration's RAISE NOTICE shows total=0 in dev.
--
-- We re-run the same UPDATE + summary here, after the questions are
-- seeded, so the dev DB matches what prod would look like post-migration.
-- Keep the UPDATE + DO blocks byte-identical to the migration.

update questions q
set content_id = tc.id
from tax_content tc
join tax_sub_strands ss
  on ss.id = tc.sub_strand_id and ss.tenant_id = tc.tenant_id
join tax_levels tl
  on tl.id = tc.level_id and tl.tenant_id = tc.tenant_id
where tc.tenant_id = q.tenant_id
  and ss.code = case q.strand::text
    when 'geometry'        then 'geometry'
    when 'measurement'     then 'measurement'
    when 'data_statistics' then 'data_representation'
  end
  and tl.code = case q.level::text
    when '1A' then 'l1' when '1B' then 'l1'
    when '2A' then 'l2' when '2B' then 'l2'
    when '3A' then 'l3' when '3B' then 'l3'
    when '4A' then 'l4' when '4B' then 'l4'
    when '5A' then 'l5' when '5B' then 'l5'
    when '6A' then 'l6' when '6B' then 'l6'
  end
  and 1 = (
    select count(*) from tax_content tc2
    where tc2.tenant_id = q.tenant_id
      and tc2.level_id = tl.id
      and tc2.sub_strand_id = ss.id
  );

do $$
declare
  total_count        int;
  matched_count      int;
  null_count         int;
  null_strand_skip   int;
  null_level_oor     int;
  null_pair_ambig    int;
begin
  select count(*) into total_count   from questions;
  select count(*) into matched_count from questions where content_id is not null;
  null_count := total_count - matched_count;

  select count(*) into null_strand_skip
    from questions
    where content_id is null
      and strand::text not in ('geometry','measurement','data_statistics');

  select count(*) into null_level_oor
    from questions
    where content_id is null
      and strand::text in ('geometry','measurement','data_statistics')
      and level::text not in ('1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B');

  null_pair_ambig := null_count - null_strand_skip - null_level_oor;

  raise notice '[questions content_id backfill] total=% matched=% null=%',
    total_count, matched_count, null_count;
  raise notice '[questions content_id backfill] null breakdown: strand-not-mapped=% level-out-of-range=% pair-has-multiple-content=%',
    null_strand_skip, null_level_oor, null_pair_ambig;
end
$$;
