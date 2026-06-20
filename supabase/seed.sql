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

-- 4b. public.consent_records — a PER-CHILD VPC grant for the dev child so the
--     session-start / response-submit consent gate (migration
--     20260528000000) passes in local dev. Keyed to the dev child above;
--     mirrors what the /add-child server action writes in production. Without
--     it, a freshly seeded dev DB blocks that child's assessment with
--     "consent_required".
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into consent_records (
  id, tenant_id, parent_id, child_id, consent_type,
  consent_text_version, consent_text, disclosure_version,
  disclosure_content_sha256, data_uses, sharing_permissions
)
select
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  t.id,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'coppa_vpc',
  'dev-seed',
  'Seeded per-child parental consent for local development only.',
  'coppa-disclosure-v1',
  'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea',
  '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb,
  '{}'::jsonb
from t
on conflict (id) do nothing;

-- =============================================================================
-- Pilot center (single, day-1)
-- =============================================================================
-- Day-1 is single-center: the parent signup flow no longer offers a center
-- selector and the signup server action attaches whoever the ONE ACTIVE
-- center is (and fails loudly if it ever finds more than one). Seed exactly
-- that single center so a fresh `supabase db reset` yields a working signup.
-- This is the same center the signup attaches to. Add more centers here only
-- alongside reintroducing the selector (ENABLE_MULTI_TENANT).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into centers (tenant_id, name, status)
select t.id, 'S.A.M Upper East Side', 'ACTIVE'::center_status
from t;

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

-- =============================================================================
-- Per-question content_id backfill for the v1 SAM-L2 bank
-- =============================================================================
-- MIRRORED FROM: supabase/migrations/20260610000000_backfill_question_content_ids.sql
--
-- AGENTS.md §11: the migration's UPDATE matches ZERO rows during
-- `supabase db reset` (the tenant and the SAM-L2 questions only exist
-- after seed.sql runs), so the same UPDATE is re-run here — after the
-- questions INSERT and after the tax_content seed it looks up — so the
-- dev DB matches what prod looks like post-migration. The migration is
-- the production path.
--
-- Per-question mapping rationale + skip list live in the migration
-- header. Skipped on purpose: PLACEHOLDER-Q-IMG-GRID-001 (dev-only
-- visual-gate fixture, is_active=false — not real content). The
-- `content_id is null` guard keeps re-runs and later manual corrections
-- safe. The sentinel comments mark the shared block;
-- src/lib/taxonomy/content-id-backfill.test.ts asserts it stays
-- byte-identical between this file and the migration.

-- BEGIN sam-l2-content-id-backfill
update questions q
set content_id = tc.id
from tenants t,
     tax_content tc,
     (values
       ('SAM-L2-Q01', 'l1-whole_numbers-2'),
       ('SAM-L2-Q07', 'l1-whole_numbers-8'),
       ('SAM-L2-Q09', 'l1-whole_numbers-9'),
       ('SAM-L2-Q10', 'l1-whole_numbers-8'),
       ('SAM-L2-Q11', 'l2-whole_numbers-4'),
       ('SAM-L2-Q14', 'l2-whole_numbers-3'),
       ('SAM-L2-Q17', 'l1-whole_numbers-9'),
       ('SAM-L2-Q19', 'l2-whole_numbers-1'),
       ('SAM-L2-Q20', 'l2-whole_numbers-1'),
       ('SAM-L2-Q21', 'l2-whole_numbers-1'),
       ('SAM-L2-Q22', 'l2-whole_numbers-1')
     ) as m(external_id, content_code)
where t.slug = 'inspirea_singapore_math'
  and q.tenant_id = t.id
  and q.external_id = m.external_id
  and q.content_id is null
  and tc.tenant_id = t.id
  and tc.code = m.content_code;

-- Summary notice — visible at production apply time and during
-- `supabase db reset` (where the migration pass reports 0/0/0; the
-- seed.sql mirror pass reports the real counts).
do $$
declare
  sam_total     int;
  sam_mapped    int;
  sam_unmapped  int;
begin
  select count(*),
         count(*) filter (where q.content_id is not null),
         count(*) filter (where q.content_id is null)
    into sam_total, sam_mapped, sam_unmapped
    from questions q
    join tenants t on t.id = q.tenant_id
   where t.slug = 'inspirea_singapore_math'
     and q.external_id like 'SAM-L2-%';

  raise notice '[per-question content_id backfill] sam-l2 total=% mapped=% unmapped=%',
    sam_total, sam_mapped, sam_unmapped;
end
$$;
-- END sam-l2-content-id-backfill

-- =============================================================================
-- Dev demo report — a viewable COMPLETED assessment so the parent report and
-- the instructor view render immediately after `supabase db reset`, with no
-- test-taking and no live narration API key.
--
-- Scope (deliberate): a COMPLETED session + placement + a report_narrations
-- row (placement line / strengths / focus areas), plus a separate instructor
-- login. NO `responses` are seeded, so strand_mastery stays empty (radar reads
-- "not assessed") and the instructor banner shows "Overall 0%". Seeding valid
-- responses (10+ NOT NULL columns + per-question lookups) is a follow-up.
--
-- Center is matched by `name like '%Singapore HQ'` to avoid depending on the
-- em-dash in the placeholder name. Ids keep the v4/variant nibbles (4 at pos
-- 13, 8 at pos 17) per the seed-UUID note above. Idempotent via on-conflict.
-- =============================================================================

-- Instructor identity (GoTrue), distinct from the dev parent so the two roles
-- are separate logins.  instructor@atlas.local / instructor-password
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'instructor@atlas.local',
  crypt('instructor-password', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Dev Instructor"}'::jsonb,
  now(),
  now(),
  false,
  false,
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'email',
  '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","email":"instructor@atlas.local","email_verified":true,"phone_verified":false}'::jsonb,
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

-- Instructor profile at the first placeholder center.
with t as (select id from tenants where slug = 'inspirea_singapore_math'),
     c as (
       select id from centers
       where tenant_id = (select id from tenants where slug = 'inspirea_singapore_math')
         and name like '%Singapore HQ'
       limit 1
     )
insert into instructors (id, auth_user_id, tenant_id, center_id, email, name, status)
select
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  t.id,
  c.id,
  'instructor@atlas.local',
  'Dev Instructor',
  'ACTIVE'::instructor_status
from t, c
on conflict (id) do nothing;

-- Link the dev child to that center so the instructor can see them (RLS keys
-- off children.home_center_id).
update children
set home_center_id = (
  select id from centers
  where tenant_id = (select id from tenants where slug = 'inspirea_singapore_math')
    and name like '%Singapore HQ'
  limit 1
)
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

-- A COMPLETED assessment for the dev child. current_estimate is the persisted
-- PlacementEstimate (overall_level '2B' -> "S.A.M Level 2B"; tier K_4).
-- session_time_flag 'normal' -> full report, no caveat banner.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into assessment_sessions (
  id, tenant_id, child_id, status, current_estimate, session_time_flag,
  started_at, completed_at
)
select
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  t.id,
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'COMPLETED'::assessment_status,
  '{"overall_level":"2B","confidence":0.72,"strand_levels":{"number_sense":"2B","operations_algorithms":"2A","fractions_decimals":"1B","measurement":"2A","geometry":"2B","data_statistics":"2A"}}'::jsonb,
  'normal'::session_time_flag,
  now() - interval '20 minutes',
  now()
from t
on conflict (id) do nothing;

-- The narration row (status 'ok') that backs the report's prose sections:
-- placement line, Strengths, and the focus areas. Plain demo prose — no
-- "diagnostic/validated/guaranteed" and no prescriptions on the parent side.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into report_narrations (
  session_id, tenant_id, generated_at, model, status,
  placement_line, strand_lede, findings_strengths, findings_growth_areas,
  recommendations_lede
)
select
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  t.id,
  now(),
  'seed-fixture',
  'ok',
  'Dev settled into a steady rhythm, and this placement is a solid, workable starting point.',
  'Dev shows strong number work, with a few specific areas worth a closer look with an instructor.',
  array[
    'Solid number sense to 100: counts, compares, and orders with confidence.',
    'Reads bar models well, including for multi-step problems.'
  ]::text[],
  array[
    'Bar-model drawing: reads bar models but does not yet construct them independently.',
    'Fraction equal-parts: treats a larger denominator as a larger fraction.',
    'Multiplication as scaling: works procedurally, leaning on repeated addition only.'
  ]::text[],
  'A focused start on the areas above will help Dev build fluency.'
from t
on conflict (session_id) do nothing;

-- BEGIN stage4-generated-questions (scripts/conversion/stage4-load.ts — do not hand-edit; re-runs replace this block)
-- =============================================================================
-- Stage 4 generated S.A.M. questions (conversion pipeline)
-- =============================================================================
-- MIRRORED FROM: supabase/migrations/20260610151306_load_sam_questions.sql
-- Generated at: 2026-06-10T16:34:53.437Z
--
-- AGENTS.md §11: the migration above is the prod path and a no-op on
-- dev reset (it runs before this file creates the tenant); this block
-- is the dev/CI path. The INSERT statement is byte-identical in both.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    -- SAM-L1-Q04 | l1-measurement-1 | measurement / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q04', 'measurement', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"Who is shorter, Lin or George?","correct_answer":"Lin","image_alt":"Two figures, Lin and George, shown side by side for a height comparison.","image_required":true}',
     array[]::text[],
     6, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l1-measurement-1'),

    -- SAM-L1-Q05 | l1-geometry-1 | geometry / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q05', 'geometry', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"Group A    Group B\\nIn which group does [object] belong?\\nAnswer: Group ___","correct_answer":"B","image_alt":"Two groups of objects labelled Group A and Group B, sorted by a shared attribute, with a separate target object whose group membership must be identified.","image_required":true}',
     array[]::text[],
     11, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q10 | l1-whole_numbers-1 | number_sense / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q10', 'number_sense', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"Count. Write the number.","correct_answer":"9","image_alt":"A group of countable objects (up to 10) arranged on the page for the student to count.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     4, 'COUNTING', 1, 'PICTORIAL', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q12 | l1-whole_numbers-1 | number_sense / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q12', 'number_sense', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"Which set has more? Set A: [image] Set B: [image] Answer: Set ___","correct_answer":"A","image_alt":"Two sets of objects labelled Set A and Set B, each containing a different number of items to be counted and compared.","image_required":true}',
     array['NS_COUNTING_ERROR','NS_MAGNITUDE_MISJUDGE'],
     13, 'COUNTING', 1, 'PICTORIAL', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q19 | l1-whole_numbers-1 | number_sense / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q19', 'number_sense', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"How many cherries are there? Write the number. Is the number of cherries in the box below the same? Write Yes or No.","correct_answer":"9; yes","image_alt":"A group of cherries arranged in two configurations — one loose arrangement and one inside a box — for the student to count and compare.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     23, 'COUNTING', 1, 'PICTORIAL', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q20 | l1-whole_numbers-1 | number_sense / 1A | NUMERIC_ENTRY
    ('SAM-L1-Q20', 'number_sense', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"Write greater than or smaller than. 5 is ___ 7.","correct_answer":"smaller than"}',
     array['NS_MAGNITUDE_MISJUDGE'],
     10, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-1'),

    -- SAM-L1-Q21 | l1-whole_numbers-1 | operations_algorithms / 1A | NUMERIC_ENTRY
    ('SAM-L1-Q21', 'operations_algorithms', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"What is 1 more than 7?","correct_answer":"8"}',
     array['NS_COUNTING_ERROR'],
     6, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-1'),

    -- SAM-L1-Q22 | l1-whole_numbers-2 | number_sense / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L1-Q22', 'number_sense', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Study this number bond. Now, complete this number bond.","correct_answer":"8","image_alt":"A number bond diagram showing a whole number at the top connected to two parts below, with one part filled in and one blank for the student to complete.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     9, 'ADDITION', 1, 'PICTORIAL', false, 'l1-whole_numbers-2'),

    -- SAM-L1-Q23 | l1-whole_numbers-3 | operations_algorithms / 1A | NUMERIC_ENTRY
    ('SAM-L1-Q23', 'operations_algorithms', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Lily has 7 ribbons. She buys another 3 red ribbons. How many ribbons does Lily have now?","correct_answer":"10"}',
     array['WP_OPERATION_SELECTION','NS_COUNTING_ERROR'],
     17, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-3'),

    -- SAM-L1-Q24 | l1-whole_numbers-4 | operations_algorithms / 1A | NUMERIC_ENTRY
    ('SAM-L1-Q24', 'operations_algorithms', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Alan has 10 apples. 5 apples are red. The rest are green. How many apples are green?","correct_answer":"5"}',
     array['WP_OPERATION_SELECTION','WP_KEYWORD_TRAP'],
     17, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-4'),

    -- SAM-L1-Q25 | l1-whole_numbers-4 | number_sense / 1B | NUMERIC_ENTRY
    ('SAM-L1-Q25', 'number_sense', '1B', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Write a fact family with these numbers: 6, 8, 2","correct_answer":"6 + 2 = 8, 2 + 6 = 8, 8 – 2 = 6, 8 – 6 = 2"}',
     array['WP_OPERATION_SELECTION','WP_MULTI_STEP_SEQUENCE'],
     10, 'SUBTRACTION', 4, 'SYMBOLIC', true, 'l1-whole_numbers-4'),

    -- SAM-L1-Q28 | l1-whole_numbers-6 | number_sense / 1B | NUMERIC_ENTRY
    ('SAM-L1-Q28', 'number_sense', '1B', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Write the numbers in order. Begin with the smallest. 17   20   10","correct_answer":"10, 17, 20"}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-6'),

    -- SAM-L2-Q01 | l1-whole_numbers-2 | number_sense / 1A | MULTIPLE_CHOICE
    ('SAM-L2-Q01', 'number_sense', '1A', -2, 'MULTIPLE_CHOICE',
     '{"stem":"What is the missing number?\n1 and ___ make 10.","options":["1","0","9","11"],"correct_index":2,"distractor_misconceptions":{"0":"WP_IRRELEVANT_INFO","1":"NS_ZERO_VALUE","3":"NS_COUNTING_ERROR"}}',
     array['WP_IRRELEVANT_INFO','NS_ZERO_VALUE','NS_COUNTING_ERROR'],
     10, 'ADDITION', 1, 'SYMBOLIC', true, 'l1-whole_numbers-2'),

    -- SAM-L2-Q02 | l1-geometry-1 | geometry / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q02', 'geometry', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"How many triangles do you see in the picture?","options":["1","5","3","7"],"correct_index":1,"distractor_misconceptions":{"0":"NS_COUNTING_ERROR","2":"NS_COUNTING_ERROR","3":"NS_COUNTING_ERROR"},"image_alt":"A figure composed of overlapping or subdivided triangles; the student must count all triangles of any size visible in the picture.","image_required":true}',
     array['NS_COUNTING_ERROR','GE_SHAPE_PROPERTY'],
     9, 'COUNTING', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L2-Q03 | l1-geometry-1 | geometry / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q03', 'geometry', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"What are the two shapes that make up the figure below?","options":["half circle and square","half circle and triangle","quarter circle and square","quarter circle and triangle"],"correct_index":1,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"A composite figure made up of two 2D shapes joined together","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     11, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L2-Q04 | l1-whole_numbers-5 | number_sense / 1B | NUMERIC_ENTRY
    ('SAM-L2-Q04', 'number_sense', '1B', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Abel, Beth, Cary, Dave and Ethan are queueing at the bank. Abel is in front of Dave. Beth is behind Dave. Abel is behind Cary. Cary is not first in the queue. In the circles, write the names of the children to show their positions. Who is first in the queue?","correct_answer":"Ethan"}',
     array['WP_MULTI_STEP_SEQUENCE'],
     51, 'IDENTIFY', 3, 'WORD_PROBLEM_MULTI', true, 'l1-whole_numbers-5'),

    -- SAM-L2-Q05 | l1-data_representation-1 | data_statistics / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q05', 'data_statistics', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"The picture graph below shows the number of seashells collected by four boys. How many more seashells were collected by Mark than by Adam?","correct_answer":"9","image_alt":"A picture graph showing rows of seashell icons for four boys (Jimmy, Adam, Tom, Mark), where each icon represents 1 seashell; the exact counts per row are not described here.","image_required":true}',
     array['NS_COUNTING_ERROR','WP_KEYWORD_TRAP','MD_CHART_SCALE'],
     24, 'SUBTRACTION', 2, 'WORD_PROBLEM_SINGLE', false, 'l1-data_representation-1'),

    -- SAM-L2-Q06 | l1-whole_numbers-8 | number_sense / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q06', 'number_sense', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"Which picture shows 37?","options":["(1)","(2)","(3)","(4)"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_COUNTING_ERROR","3":"NS_PLACE_VALUE_CONFUSION"},"image_alt":"Four pictorial representations of groups of objects or base-ten blocks, each showing a different quantity; the student must identify which one represents 37.","image_required":true}',
     array['NS_PLACE_VALUE_CONFUSION','NS_COUNTING_ERROR'],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-whole_numbers-8'),

    -- SAM-L2-Q07 | l1-whole_numbers-8 | number_sense / 1A | MULTIPLE_CHOICE
    ('SAM-L2-Q07', 'number_sense', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"What is the missing number?\n76 = ___ tens 6 ones","options":["6","7","10","70"],"correct_index":1,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","2":"NS_PLACE_VALUE_CONFUSION","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['NS_PLACE_VALUE_CONFUSION'],
     11, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-8'),

    -- SAM-L2-Q08 | l1-whole_numbers-8 | number_sense / 1A | NUMERIC_ENTRY
    ('SAM-L2-Q08', 'number_sense', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Write 96 in words.","correct_answer":"Ninety-six"}',
     array['NS_PLACE_VALUE_CONFUSION'],
     4, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-8'),

    -- SAM-L2-Q09 | l1-whole_numbers-8 | operations_algorithms / 1A | MULTIPLE_CHOICE
    ('SAM-L2-Q09', 'operations_algorithms', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"What is 3 more than 54?","options":["51","57","84","543"],"correct_index":1,"distractor_misconceptions":{"0":"OP_SUBTRACTION_DIRECTION","2":"OP_NO_REGROUPING","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['OP_SUBTRACTION_DIRECTION','OP_NO_REGROUPING','NS_PLACE_VALUE_CONFUSION'],
     6, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-8'),

    -- SAM-L2-Q10 | l1-whole_numbers-8 | number_sense / 1A | DRAG_DROP
    ('SAM-L2-Q10', 'number_sense', '1A', -1.8, 'DRAG_DROP',
     '{"stem":"Arrange the following numbers. Begin with the smallest. 68  81  9","items":["68","81","9"],"correct_order":["9","68","81"]}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     11, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-8'),

    -- SAM-L2-Q11 | l1-whole_numbers-9 | operations_algorithms / 1B | NUMERIC_ENTRY
    ('SAM-L2-Q11', 'operations_algorithms', '1B', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Jo had 7 apples. Her brother gave her some more apples. She has 35 apples now. How many apples did her brother give her?","correct_answer":"28"}',
     array['WP_OPERATION_SELECTION','WP_KEYWORD_TRAP','OP_NO_REGROUPING'],
     24, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-9'),

    -- SAM-L2-Q12 | l1-measurement-1 | measurement / 1A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q12', 'measurement', '1A', -2, 'NUMERIC_ENTRY',
     '{"stem":"The picture below shows the length of a toy car. What is the length of the toy car?","correct_answer":"7","image_alt":"A toy car placed against a ruler showing centimetre markings, with the car''s length to be read off the scale.","image_required":true}',
     array['MD_RULER_ZERO_POINT','NS_COUNTING_ERROR'],
     18, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l1-measurement-1'),

    -- SAM-L2-Q13 | l1-whole_numbers-10 | number_sense / 1A | MULTIPLE_CHOICE
    ('SAM-L2-Q13', 'number_sense', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"3 × 4 is ___.","options":["3 + 3 + 3","4 + 4 + 4","3 + 3 + 3 + 3","4 + 4 + 4 + 4"],"correct_index":1,"distractor_misconceptions":{"0":"OP_MULT_AS_REPEATED_ADD","2":"OP_MULT_AS_REPEATED_ADD","3":"OP_MULT_AS_REPEATED_ADD"}}',
     array['OP_MULT_AS_REPEATED_ADD'],
     5, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l1-whole_numbers-10'),

    -- SAM-L2-Q14 | l1-whole_numbers-11 | operations_algorithms / 1A | MULTIPLE_CHOICE
    ('SAM-L2-Q14', 'operations_algorithms', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"Mrs Tan puts 12 birds into 3 cages. How many birds are there in each cage?","options":["6","2","3","4"],"correct_index":3,"distractor_misconceptions":{"0":"WP_OPERATION_SELECTION","1":"WP_IRRELEVANT_INFO","2":"WP_KEYWORD_TRAP"}}',
     array['WP_OPERATION_SELECTION','WP_IRRELEVANT_INFO','WP_KEYWORD_TRAP'],
     16, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-whole_numbers-11'),

    -- SAM-L2-Q15 | l1-measurement-2 | measurement / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q15', 'measurement', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"The clock shows the time Joe finished his lunch. At what time did he finish his lunch?","options":["2:45 am","2:55 am","2:45 pm","2:55 pm"],"correct_index":3,"distractor_misconceptions":{"0":"MD_TIME_READING","1":"MD_TIME_READING","2":"MD_TIME_READING"},"image_alt":"An analog clock face showing a time used to determine when Joe finished his lunch.","image_required":true}',
     array['MD_TIME_READING'],
     17, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l1-measurement-2'),

    -- SAM-L2-Q16 | l1-measurement-3 | measurement / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q16', 'measurement', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"How much money is there?","options":["50¢","70¢","85¢","95¢"],"correct_index":2,"distractor_misconceptions":{"0":"NS_COUNTING_ERROR","1":"NS_COUNTING_ERROR","3":"NS_COUNTING_ERROR"},"image_alt":"A collection of coins whose total value must be counted to find the amount in cents.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     5, 'COUNTING', 1, 'PICTORIAL', false, 'l1-measurement-3'),

    -- SAM-L2-Q17 | l1-measurement-3 | measurement / 1B | NUMERIC_ENTRY
    ('SAM-L2-Q17', 'measurement', '1B', -1.6, 'NUMERIC_ENTRY',
     '{"stem":"Larry has $45. He buys a school bag for $29. How much money does he have left?","correct_answer":"16"}',
     array['OP_NO_REGROUPING','WP_OPERATION_SELECTION'],
     17, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, 'l1-measurement-3'),

    -- SAM-L2-Q18 | l2-whole_numbers-1 | number_sense / 2A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L2-Q18', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"How many are there?","correct_answer":"204","image_alt":"A collection of coins showing 5¢, 10¢, 20¢, and 50¢ denominations that must be counted to reach a total.","image_required":true}',
     array['NS_COUNTING_ERROR','NS_ZERO_VALUE','NS_PLACE_VALUE_CONFUSION'],
     4, 'COUNTING', 1, 'PICTORIAL', false, 'l2-whole_numbers-1'),

    -- SAM-L2-Q19 | l2-whole_numbers-1 | number_sense / 2A | NUMERIC_ENTRY
    ('SAM-L2-Q19', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"What is the missing number? 600 + 40 + 8 = ________","correct_answer":"648"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     12, 'ADDITION', 2, 'SYMBOLIC', true, 'l2-whole_numbers-1'),

    -- SAM-L2-Q20 | l2-whole_numbers-1 | operations_algorithms / 2A | NUMERIC_ENTRY
    ('SAM-L2-Q20', 'operations_algorithms', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"What is 100 more than 504?","correct_answer":"604"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     6, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l2-whole_numbers-1'),

    -- SAM-L2-Q21 | l2-whole_numbers-1 | number_sense / 2B | DRAG_DROP
    ('SAM-L2-Q21', 'number_sense', '2B', -0.8, 'DRAG_DROP',
     '{"stem":"Arrange the following numbers in order. Begin with the greatest. 652   716   629   708","items":["652","716","629","708"],"correct_order":["716","708","652","629"]}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     14, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l2-whole_numbers-1'),

    -- SAM-L2-Q22 | l2-whole_numbers-1 | number_sense / 2A | NUMERIC_ENTRY
    ('SAM-L2-Q22', 'number_sense', '2A', -1, 'NUMERIC_ENTRY',
     '{"stem":"What comes next in the number pattern below?\n\n860   840   820   800   ?","correct_answer":"780"}',
     array['NS_COUNTING_ERROR','NS_PLACE_VALUE_CONFUSION'],
     13, 'PATTERN', 1, 'SYMBOLIC', true, 'l2-whole_numbers-1'),

    -- SAM-L3-Q01 | l2-whole_numbers-1 | number_sense / 1A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q01', 'number_sense', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"What number does the figure below show?","options":["120","201","210","1200"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_ZERO_VALUE","3":"NS_MAGNITUDE_MISJUDGE"},"image_alt":"A base-ten block figure representing a 3-digit number using hundreds, tens, and ones blocks.","image_required":true}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE','NS_MAGNITUDE_MISJUDGE'],
     7, 'IDENTIFY', 1, 'PICTORIAL', false, 'l2-whole_numbers-1'),

    -- SAM-L3-Q02 | l2-whole_numbers-1 | number_sense / 1A | NUMERIC_ENTRY
    ('SAM-L3-Q02', 'number_sense', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Write 508 in words.","correct_answer":"Five hundred and eight"}',
     array['NS_ZERO_VALUE','NS_PLACE_VALUE_CONFUSION'],
     4, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l2-whole_numbers-1'),

    -- SAM-L3-Q03 | l2-whole_numbers-1 | number_sense / 1A | MULTIPLE_CHOICE
    ('SAM-L3-Q03', 'number_sense', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"In the number 804, what does the digit ''8'' stand for?","options":["8","80","800","8000"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_PLACE_VALUE_CONFUSION","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['NS_PLACE_VALUE_CONFUSION'],
     11, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l2-whole_numbers-1'),

    -- SAM-L3-Q05 | l2-whole_numbers-2 | operations_algorithms / 2B | NUMERIC_ENTRY
    ('SAM-L3-Q05', 'operations_algorithms', '2B', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"An oven costs $645. It costs $297 more than a vacuum cleaner. How much do the oven and vacuum cleaner cost altogether?","correct_answer":"993"}',
     array['WP_MULTI_STEP_SEQUENCE','OP_NO_REGROUPING','WP_KEYWORD_TRAP'],
     22, 'ADDITION', 2, 'WORD_PROBLEM_MULTI', true, 'l2-whole_numbers-2'),

    -- SAM-L3-Q06 | l2-measurement-1 | measurement / 1B | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q06', 'measurement', '1B', -1.5, 'MULTIPLE_CHOICE',
     '{"stem":"How long is the thumb drive as shown below?","options":["7 cm","10 cm","3 cm","4 cm"],"correct_index":3,"distractor_misconceptions":{"0":"MD_RULER_ZERO_POINT","1":"MD_RULER_ZERO_POINT","2":"NS_COUNTING_ERROR"},"image_alt":"A thumb drive placed against a ruler, with the ruler''s scale visible, used to measure the object''s length in centimetres.","image_required":true}',
     array['MD_RULER_ZERO_POINT','NS_COUNTING_ERROR'],
     9, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l2-measurement-1'),

    -- SAM-L3-Q07 | l2-whole_numbers-3 | operations_algorithms / 2A | MULTIPLE_CHOICE
    ('SAM-L3-Q07', 'operations_algorithms', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"Mrs Li packs 30 cupcakes equally into 5 boxes. How many cupcakes are there in each box? Which of the following shows the correct answer?","options":["5 × 6 = 30","6 × 5 = 30","30 ÷ 5 = 6","30 ÷ 6 = 5"],"correct_index":2,"distractor_misconceptions":{"0":"WP_OPERATION_SELECTION","1":"WP_OPERATION_SELECTION","3":"WP_IRRELEVANT_INFO"}}',
     array['WP_OPERATION_SELECTION','WP_IRRELEVANT_INFO'],
     25, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE', true, 'l2-whole_numbers-3'),

    -- SAM-L3-Q08 | l2-measurement-2 | measurement / 1B | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q08', 'measurement', '1B', -1.5, 'NUMERIC_ENTRY',
     '{"stem":"What is the mass of the cylinder?","correct_answer":"250","image_alt":"A scale or balance showing a cylinder being weighed, with a reading that must be interpreted to determine the mass in grams.","image_required":true}',
     array['MD_UNIT_CONFUSION'],
     7, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l2-measurement-2'),

    -- SAM-L3-Q09 | l2-measurement-3 | measurement / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q09', 'measurement', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"Kelvin had dinner at the time shown below. What time did he have dinner?","options":["5:35 am","5:35 pm","7:25 am","7:25 pm"],"correct_index":3,"distractor_misconceptions":{"0":"MD_TIME_READING","1":"MD_TIME_READING","2":"MD_TIME_READING"},"image_alt":"An analog clock face showing a time in the evening that students must read correctly to identify the dinner time.","image_required":true}',
     array['MD_TIME_READING'],
     14, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l2-measurement-3'),

    -- SAM-L3-Q10 | l2-whole_numbers-4 | number_sense / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q10', 'number_sense', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"A gardener planted 75 orchids, 25 lilies and 50 roses. How many flowers did he plant in all? Which model is correct for this question?","options":["Model 1","Model 2","Model 3","Model 4"],"correct_index":0,"distractor_misconceptions":{"1":"WP_OPERATION_SELECTION","2":"WP_OPERATION_SELECTION","3":"WP_OPERATION_SELECTION"},"image_alt":"Four bar model diagrams representing different ways to model an addition word problem with three quantities.","image_required":true}',
     array['WP_OPERATION_SELECTION','WP_MULTI_STEP_SEQUENCE'],
     25, 'ADDITION', 2, 'BAR_MODEL_REQUIRED', false, 'l2-whole_numbers-4'),

    -- SAM-L3-Q11 | l2-whole_numbers-3 | number_sense / 2A | MULTIPLE_CHOICE
    ('SAM-L3-Q11', 'number_sense', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the following is equal to 18?","options":["9 × 2","9 × 3","9 ÷ 2","6 ÷ 3"],"correct_index":1,"distractor_misconceptions":{"0":"OP_MULT_AS_REPEATED_ADD","2":"WP_OPERATION_SELECTION","3":"WP_OPERATION_SELECTION"}}',
     array['OP_MULT_AS_REPEATED_ADD','WP_OPERATION_SELECTION'],
     8, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l2-whole_numbers-3'),

    -- SAM-L3-Q12 | l2-measurement-4 | measurement / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q12', 'measurement', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"How much money is there?","options":["$68.80","$70.85","$80.55","$83.95"],"correct_index":1,"distractor_misconceptions":{"0":"NS_COUNTING_ERROR","2":"MD_UNIT_CONFUSION","3":"NS_COUNTING_ERROR"},"image_alt":"A collection of currency notes and coins showing various denominations including $50, $10, $5, $2, $2, $1, 50¢, 20¢, 10¢, and 5¢.","image_required":true}',
     array['NS_COUNTING_ERROR','MD_UNIT_CONFUSION'],
     5, 'COUNTING', 1, 'PICTORIAL', false, 'l2-measurement-4'),

    -- SAM-L3-Q13 | l2-fractions-1 | fractions_decimals / 2A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q13', 'fractions_decimals', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"What fraction of the figure below is shaded?","correct_answer":"4/9","image_alt":"A figure divided into equal parts, some of which are shaded, used to identify the shaded fraction.","image_required":true}',
     array['NS_COUNTING_ERROR','FR_FRACTION_AS_TWO_NUMS'],
     8, 'IDENTIFY', 1, 'PICTORIAL', false, 'l2-fractions-1'),

    -- SAM-L3-Q14 | l2-fractions-1 | fractions_decimals / 2A | DRAG_DROP
    ('SAM-L3-Q14', 'fractions_decimals', '2A', -1.2, 'DRAG_DROP',
     '{"stem":"Arrange the fractions in order. Begin with the smallest. 10/11, 6/11, 9/11, 2/11","items":["10/11","6/11","9/11","2/11"],"correct_order":["2/11","6/11","9/11","10/11"]}',
     array['FR_FRACTION_AS_TWO_NUMS','NS_MAGNITUDE_MISJUDGE'],
     13, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l2-fractions-1'),

    -- SAM-L3-Q15 | l2-fractions-2 | fractions_decimals / 1B | MULTIPLE_CHOICE
    ('SAM-L3-Q15', 'fractions_decimals', '1B', -1.5, 'MULTIPLE_CHOICE',
     '{"stem":"What is 1/6 + 3/6?","options":["4/12","6/12","4/6","5/6"],"correct_index":2,"distractor_misconceptions":{"0":"FR_NUM_DENOM_INDEPENDENT","1":"FR_NUM_DENOM_INDEPENDENT"}}',
     array['FR_NUM_DENOM_INDEPENDENT'],
     5, 'FRACTION_OP', 1, 'SYMBOLIC', true, 'l2-fractions-2'),

    -- SAM-L3-Q17 | l2-data_representation-1 | data_statistics / 2A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q17', 'data_statistics', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"The picture graph below shows the favourite fruits of some Class 2 students in a school. How many more students like pears than oranges?","correct_answer":"3","image_alt":"A picture graph showing the favourite fruits of Class 2 students, with rows or columns for different fruits including pears and oranges, each symbol representing a fixed number of students.","image_required":true}',
     array['MD_CHART_SCALE','NS_COUNTING_ERROR','WP_KEYWORD_TRAP'],
     24, 'SUBTRACTION', 2, 'PICTORIAL', false, 'l2-data_representation-1'),

    -- SAM-L3-Q18 | l2-geometry-2 | geometry / 1A | NUMERIC_ENTRY
    ('SAM-L3-Q18', 'geometry', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Name a 3-dimensional shape that has 2 flat faces and a curved surface.","correct_answer":"cylinder"}',
     array['GE_SHAPE_PROPERTY'],
     13, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l2-geometry-2'),

    -- SAM-L3-Q19 | l2-geometry-1 | geometry / 1B | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q19', 'geometry', '1B', -1.5, 'MULTIPLE_CHOICE',
     '{"stem":"Continue the pattern.","options":["(1)","(2)","(3)","(4)"],"correct_index":1,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"A sequence of 2D shapes forming a repeating pattern, with the next shape in the pattern to be identified from four options.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     3, 'PATTERN', 1, 'PICTORIAL', false, 'l2-geometry-1'),

    -- SAM-L3-Q20 | l3-whole_numbers-1 | number_sense / 2B | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L3-Q20', 'number_sense', '2B', -0.8, 'MULTIPLE_CHOICE',
     '{"stem":"What number does the figure below show?","options":["342","243","2403","2430"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_PLACE_VALUE_CONFUSION","3":"NS_ZERO_VALUE"},"image_alt":"A place-value diagram or base-ten blocks figure representing a 4-digit number within 10 000.","image_required":true}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     7, 'IDENTIFY', 1, 'PICTORIAL', false, 'l3-whole_numbers-1'),

    -- SAM-L3-Q21 | l3-whole_numbers-1 | number_sense / 3A | NUMERIC_ENTRY
    ('SAM-L3-Q21', 'number_sense', '3A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"What is the missing number below? 7602 = ___ hundreds 2 ones","correct_answer":"76"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l3-whole_numbers-1'),

    -- SAM-L3-Q22 | l3-whole_numbers-1 | number_sense / 3B | NUMERIC_ENTRY
    ('SAM-L3-Q22', 'number_sense', '3B', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"What is the greatest 4-digit even number?","correct_answer":"9998"}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     7, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l3-whole_numbers-1'),

    -- SAM-L4-Q01 | l3-whole_numbers-1 | number_sense / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q01', 'number_sense', '2A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"What is 1 more than the number shown?","options":["37","100","9999","10 000"],"correct_index":3,"distractor_misconceptions":{"0":"NS_MAGNITUDE_MISJUDGE","1":"NS_PLACE_VALUE_CONFUSION","2":"NS_COUNTING_ERROR"},"image_alt":"A number shown on a place-value display or numeral card that the student must read and then add 1 to","image_required":true}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION','NS_COUNTING_ERROR'],
     8, 'ADDITION', 1, 'SYMBOLIC', false, 'l3-whole_numbers-1'),

    -- SAM-L4-Q02 | l3-whole_numbers-1 | number_sense / 2A | NUMERIC_ENTRY
    ('SAM-L4-Q02', 'number_sense', '2A', -2, 'NUMERIC_ENTRY',
     '{"stem":"In the greatest 4-digit whole number, which digit is in the ones place?","correct_answer":"9"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_MAGNITUDE_MISJUDGE'],
     13, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l3-whole_numbers-1'),

    -- SAM-L4-Q03 | l3-whole_numbers-1 | number_sense / 2A | MULTIPLE_CHOICE
    ('SAM-L4-Q03', 'number_sense', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the following shows numbers arranged in order beginning with the greatest?","options":["240, 2140, 4210, 4012","4260, 4240, 220, 200","4200, 4220, 4240, 4260","4210, 2240, 3265, 1789"],"correct_index":1,"distractor_misconceptions":{"0":"NS_MAGNITUDE_MISJUDGE","2":"NS_MAGNITUDE_MISJUDGE","3":"NS_MAGNITUDE_MISJUDGE"}}',
     array['NS_MAGNITUDE_MISJUDGE'],
     13, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l3-whole_numbers-1'),

    -- SAM-L4-Q04 | l3-whole_numbers-1 | number_sense / 2A | NUMERIC_ENTRY
    ('SAM-L4-Q04', 'number_sense', '2A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Continue the following number pattern. 2458   2238   2018","correct_answer":"1798"}',
     array['NS_COUNTING_ERROR','NS_PLACE_VALUE_CONFUSION'],
     8, 'PATTERN', 1, 'SYMBOLIC', true, 'l3-whole_numbers-1'),

    -- SAM-L4-Q05 | l3-whole_numbers-2 | number_sense / 2A | MULTIPLE_CHOICE
    ('SAM-L4-Q05', 'number_sense', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"The sum of 562 and 3379 is ___.","options":["2817","3362","3742","3941"],"correct_index":3,"distractor_misconceptions":{"0":"WP_OPERATION_SELECTION","1":"OP_NO_REGROUPING","2":"NS_PLACE_VALUE_CONFUSION"}}',
     array['WP_OPERATION_SELECTION','OP_NO_REGROUPING','NS_PLACE_VALUE_CONFUSION'],
     8, 'ADDITION', 1, 'SYMBOLIC', true, 'l3-whole_numbers-2'),

    -- SAM-L4-Q06 | l3-whole_numbers-2 | number_sense / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q06', 'number_sense', '3B', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"What is the missing digit (■) in the following subtraction?\n\n  ■ 8 5 2\n–   7 9 4\n———————\n7 7 1 8","correct_answer":"1"}',
     array['OP_NO_REGROUPING','NS_PLACE_VALUE_CONFUSION','OP_SUBTRACTION_DIRECTION'],
     23, 'SUBTRACTION', 1, 'SYMBOLIC', true, 'l3-whole_numbers-2'),

    -- SAM-L4-Q07 | l3-whole_numbers-6 | operations_algorithms / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q07', 'operations_algorithms', '3B', 0.3, 'NUMERIC_ENTRY',
     '{"stem":"A school library has 2540 fiction books. It has 1651 more fiction books than non-fiction books. What is the total number of books in the library?","correct_answer":"3429"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','WP_KEYWORD_TRAP','OP_NO_REGROUPING'],
     26, 'ADDITION', 2, 'WORD_PROBLEM_MULTI', true, 'l3-whole_numbers-6'),

    -- SAM-L4-Q08 | l3-money-2 | operations_algorithms / 3A | NUMERIC_ENTRY
    ('SAM-L4-Q08', 'operations_algorithms', '3A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"A box of grapes cost $5.60. Mrs Singh bought two such boxes of grapes and had $4.80 left. How much money did she have at first?","correct_answer":"16"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','OP_MULT_AS_REPEATED_ADD'],
     26, 'ADDITION', 3, 'WORD_PROBLEM_MULTI', true, 'l3-money-2'),

    -- SAM-L4-Q09 | l3-whole_numbers-4 | operations_algorithms / 3A | MULTIPLE_CHOICE
    ('SAM-L4-Q09', 'operations_algorithms', '3A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"Mr Lee has 60 mangoes. He puts as many mangoes as possible equally into 7 boxes. How many mangoes does he have left?","options":["5","2","3","4"],"correct_index":3,"distractor_misconceptions":{"0":"OP_DIV_REMAINDER","1":"OP_DIV_REMAINDER","2":"OP_DIV_REMAINDER"}}',
     array['OP_DIV_REMAINDER'],
     23, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE', true, 'l3-whole_numbers-4'),

    -- SAM-L4-Q10 | l3-whole_numbers-5 | number_sense / 3A | NUMERIC_ENTRY
    ('SAM-L4-Q10', 'number_sense', '3A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Multiply 324 by 5.","correct_answer":"1620"}',
     array['OP_MULT_AS_REPEATED_ADD','NS_PLACE_VALUE_CONFUSION'],
     4, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l3-whole_numbers-5'),

    -- SAM-L4-Q11 | l3-whole_numbers-5 | number_sense / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q11', 'number_sense', '3B', 0, 'NUMERIC_ENTRY',
     '{"stem":"What is the remainder of 406 ÷ 3?","correct_answer":"1"}',
     array['OP_DIV_REMAINDER','NS_ZERO_VALUE'],
     8, 'DIVISION', 1, 'SYMBOLIC', true, 'l3-whole_numbers-5'),

    -- SAM-L4-Q12 | l3-whole_numbers-6 | operations_algorithms / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q12', 'operations_algorithms', '3B', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"There were 1569 men at a concert. There were 4 times as many women as men at the concert. 278 people left the concert hall before the last song was performed. How many people were there when the last song was performed?","correct_answer":"7567"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','OP_MULT_AS_REPEATED_ADD'],
     42, 'MULTIPLICATION', 3, 'WORD_PROBLEM_MULTI', true, 'l3-whole_numbers-6'),

    -- SAM-L4-Q13 | l3-measurement-1 | measurement / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q13', 'measurement', '2A', -1, 'MULTIPLE_CHOICE',
     '{"stem":"What is the volume of liquid in the jug shown below?","options":["400 mL","600 mL","800 mL","900 mL"],"correct_index":2,"distractor_misconceptions":{"0":"MD_CHART_SCALE","1":"MD_CHART_SCALE","3":"NS_COUNTING_ERROR"},"image_alt":"A jug with a graduated scale in millilitres; the liquid level sits at one of the marked intervals between 0 and 1000 mL.","image_required":true}',
     array['MD_CHART_SCALE','NS_COUNTING_ERROR'],
     11, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l3-measurement-1'),

    -- SAM-L4-Q14 | l3-measurement-1 | measurement / 3A | MULTIPLE_CHOICE
    ('SAM-L4-Q14', 'measurement', '3A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"6 kg 27 g = ___ g","options":["627","6027","6270","6300"],"correct_index":1,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","2":"NS_ZERO_VALUE","3":"MD_UNIT_CONFUSION"}}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE','MD_UNIT_CONFUSION'],
     7, 'MEASUREMENT', 1, 'SYMBOLIC', true, 'l3-measurement-1'),

    -- SAM-L4-Q15 | l3-measurement-3 | measurement / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q15', 'measurement', '3B', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Aaron and Billy took part in a marathon. When Aaron had run 5 km 250 m, he had run 3 times the distance Billy had run. What was the distance Billy had run? Express your answer in kilometres and metres.","correct_answer":"1 km 750 m"}',
     array['WP_OPERATION_SELECTION','MD_UNIT_CONFUSION','WP_MULTI_STEP_SEQUENCE'],
     40, 'DIVISION', 2, 'WORD_PROBLEM_SINGLE', true, 'l3-measurement-3'),

    -- SAM-L4-Q16 | l3-geometry-1 | geometry / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q16', 'geometry', '2A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"Which one of the angles below is smaller than a right angle?","options":["∠a","∠b","∠c","∠d"],"correct_index":0,"distractor_misconceptions":{"1":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"Four angles labelled a, b, c, and d drawn for visual comparison; one is an acute angle, the others are right angles or obtuse angles.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     12, 'IDENTIFY', 1, 'PICTORIAL', false, 'l3-geometry-1'),

    -- SAM-L4-Q18 | l3-fractions-1 | fractions_decimals / 3A | MULTIPLE_CHOICE
    ('SAM-L4-Q18', 'fractions_decimals', '3A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the following fractions is the greatest?","options":["1/2","3/4","5/3","1/12"],"correct_index":2,"distractor_misconceptions":{"0":"FR_FRACTION_AS_TWO_NUMS","1":"NS_MAGNITUDE_MISJUDGE","3":"FR_FRACTION_AS_TWO_NUMS"}}',
     array['FR_FRACTION_AS_TWO_NUMS','NS_MAGNITUDE_MISJUDGE'],
     8, 'FRACTION_OP', 1, 'SYMBOLIC', true, 'l3-fractions-1'),

    -- SAM-L4-Q20 | l3-data_representation-1 | data_statistics / 3A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q20', 'data_statistics', '3A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"The bar graph below shows the scores of five basketball teams in a tournament. a) How many more points did Team B score than Team C? b) How many points did the five teams score altogether?","correct_answer":"a) 150 b) 900","image_alt":"A bar graph showing the scores of five basketball teams (Team A through Team E) in a tournament, with a vertical axis representing points scored.","image_required":true}',
     array['MD_CHART_SCALE','WP_OPERATION_SELECTION','WP_MULTI_STEP_SEQUENCE'],
     36, 'MEASUREMENT', 2, 'PICTORIAL', false, 'l3-data_representation-1'),

    -- SAM-L4-Q21 | l3-area_volume-3 | geometry / 2A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q21', 'geometry', '2A', -1, 'MULTIPLE_CHOICE',
     '{"stem":"What is the area of the rectangle below?","options":["75 m²","150 m²","1100 m²","1250 m²"],"correct_index":3,"distractor_misconceptions":{"0":"GE_PERIMETER_AREA","1":"GE_PERIMETER_AREA","2":"OP_NO_REGROUPING"},"image_alt":"A rectangle with labelled side lengths used to calculate area in square metres.","image_required":true}',
     array['GE_PERIMETER_AREA','OP_NO_REGROUPING'],
     8, 'GEOMETRY', 1, 'PICTORIAL', false, 'l3-area_volume-3'),

    -- SAM-L4-Q22 | l3-measurement-2 | measurement / 3B | NUMERIC_ENTRY
    ('SAM-L4-Q22', 'measurement', '3B', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Mr Davis took 6 h 50 min to complete a marathon. He crossed the finish line at 4:15 pm. At what time did he start running?","correct_answer":"9:25 am"}',
     array['MD_TIME_READING','WP_OPERATION_SELECTION','MD_UNIT_CONFUSION'],
     26, 'MEASUREMENT', 2, 'WORD_PROBLEM_SINGLE', true, 'l3-measurement-2'),

    -- SAM-L4-Q23 | l4-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L4-Q23', 'number_sense', '4A', 0.3, 'NUMERIC_ENTRY',
     '{"stem":"Write the number shown.","correct_answer":"32001","image_alt":"A place-value representation (e.g., base-ten blocks, number discs, or abacus) showing a 5-digit number within 100 000.","image_required":true}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, 'l4-whole_numbers-1'),

    -- SAM-L4-Q24 | l4-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L4-Q24', 'number_sense', '4A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"What is the value of the digit ''8'' in 82 149?","correct_answer":"80000"}',
     array['NS_PLACE_VALUE_CONFUSION'],
     11, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l4-whole_numbers-1'),

    -- SAM-L4-Q25 | l4-whole_numbers-1 | number_sense / 4A | DRAG_DROP
    ('SAM-L4-Q25', 'number_sense', '4A', 0.3, 'DRAG_DROP',
     '{"stem":"Arrange the numbers in ascending order. 9148   62 753   7265   62 009","items":["9148","62 753","7265","62 009"],"correct_order":["7265","9148","62 009","62 753"]}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l4-whole_numbers-1'),

    -- SAM-L4-Q26 | l4-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L4-Q26', 'number_sense', '4A', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"Round 42 750 to the nearest hundred.","correct_answer":"42 800"}',
     array['NS_PLACE_VALUE_CONFUSION'],
     7, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l4-whole_numbers-1'),

    -- SAM-L4-Q27 | l4-whole_numbers-2 | operations_algorithms / 4B | NUMERIC_ENTRY
    ('SAM-L4-Q27', 'operations_algorithms', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Name one number that can divide both 54 and 72.","correct_answer":"Accept 1, 2, 3, 6, 9 or 18"}',
     array['OP_DIV_REMAINDER'],
     10, 'DIVISION', 2, 'WORD_PROBLEM_SINGLE', true, 'l4-whole_numbers-2')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation,
         is_active, content_key)
on conflict (tenant_id, external_id) do nothing;
-- END stage4-generated-questions

-- ---------------------------------------------------------------------------
-- QA Bucket 2 — format reclassification (dev/CI mirror of
-- supabase/migrations/20260610170100_reclassify_format_misclassified_questions.sql;
-- see that file's header for the full before/after table).
--
-- Hand-written; lives AFTER the generated stage4 block on purpose: the
-- generated INSERT above still loads the pre-fix rows (the conversion
-- pipeline regenerates that block byte-identically), and these UPDATEs
-- re-apply the reclassification on every `supabase db reset`. Idempotent:
-- each UPDATE is guarded on the pre-change format/content. The TEXT_ENTRY
-- enum value itself is added by migration 20260610170000 (schema DDL runs
-- in both paths; no mirror needed).
-- ---------------------------------------------------------------------------

-- 1) Word/phrase answers -> TEXT_ENTRY (content unchanged).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'
from t
where q.tenant_id = t.id
  and q.format = 'NUMERIC_ENTRY'
  and q.external_id in (
    'SAM-L1-Q20', 'SAM-L1-Q25', 'SAM-L2-Q04', 'SAM-L2-Q08',
    'SAM-L3-Q02', 'SAM-L3-Q18', 'SAM-L4-Q15', 'SAM-L4-Q22'
  );

-- 2) SAM-L1-Q28 "Write the numbers in order" -> DRAG_DROP.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'DRAG_DROP',
    content = jsonb_build_object(
      'stem', q.content->>'stem',
      'items', jsonb_build_array('17', '20', '10'),
      'correct_order', jsonb_build_array('10', '17', '20')
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q28'
  and q.format = 'NUMERIC_ENTRY';

-- 3) SAM-L4-Q27 stays NUMERIC_ENTRY; the "Accept ..." instruction key
--    becomes a human-readable correct_answer + an any-of judging key.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = q.content || jsonb_build_object(
      'correct_answer', '1, 2, 3, 6, 9 or 18',
      'accepted_answers', jsonb_build_array('1', '2', '3', '6', '9', '18')
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L4-Q27'
  and q.content->>'correct_answer' = 'Accept 1, 2, 3, 6, 9 or 18';

-- BEGIN founder-confirmed-content-fixes (mirror of supabase/migrations/20260610180000_fix_sam_question_content.sql)
-- =============================================================================
-- Founder-confirmed S.A.M. question content fixes (remediation FIX 1)
-- =============================================================================
-- AGENTS.md §11: the migration above is the prod path and a no-op on dev
-- reset (it runs before this file creates the tenant); this block is the
-- dev/CI path, applied AFTER the stage4 generated insert block above so
-- the rows exist. Statements are identical to the migration; every
-- UPDATE carries an idempotent guard on the old value. Full before/after
-- table in the migration header.

-- 1) SAM-L3-Q11 — correct_index 1 -> 0; drop the distractor code that now
--    sits on the correct option. Guarded on the old index.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content #- '{distractor_misconceptions,0}',
      '{correct_index}',
      '0'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q11'
  and q.format = 'MULTIPLE_CHOICE'
  and (q.content ->> 'correct_index')::int = 1;

-- 2) SAM-L3-Q22 — restore to MULTIPLE_CHOICE with the verbatim page-14
--    options; key "3" (1-based) -> correct_index 2. Stem kept as loaded
--    (it matches the page). Guarded on the old format + stored answer.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = jsonb_build_object(
      'stem', q.content ->> 'stem',
      'options', '["1000","1001","9998","9999"]'::jsonb,
      'correct_index', 2)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q22'
  and q.format = 'NUMERIC_ENTRY'
  and q.content ->> 'correct_answer' = '9998';

-- 3) SAM-L3-Q03 — replace the model-reconstructed value-equivalent options
--    with the verbatim printed option text. correct_index 2 still points
--    at the key's option ("8 hundreds" = key "3"). Guarded on the old
--    options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["8 ones","8 tens","8 hundreds","8 thousands"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q03'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["8","80","800","8000"]'::jsonb;
-- END founder-confirmed-content-fixes

-- BEGIN founder-verified-mojibake-fixes (mirror of supabase/migrations/20260610190000_fix_mojibake_rows.sql)
-- =============================================================================
-- Founder-verified S.A.M. question content fixes, round 2 (mojibake rows)
-- =============================================================================
-- AGENTS.md §11: the migration above is the prod path and a no-op on dev
-- reset (it runs before this file creates the tenant); this block is the
-- dev/CI path, applied AFTER the stage4 generated insert block above so
-- the rows exist. Statements are identical to the migration; every
-- UPDATE carries an idempotent guard. Full before/after table in the
-- migration header.

-- 1) SAM-L3-Q15 — source task is not multiple-choice: convert to
--    NUMERIC_ENTRY with the founder-verified answer "4/6". Stem is kept
--    verbatim (clean, expression already matches the source); the
--    invented options/correct_index/distractor_misconceptions are
--    dropped. Deactivated: fraction answer needs TEXT_ENTRY (PR #29) or
--    keypad slash — reactivate after merge. Guarded on the old format +
--    invented options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'NUMERIC_ENTRY'::question_format,
    content = jsonb_build_object(
      'stem', q.content ->> 'stem',
      'correct_answer', '4/6'),
    is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q15'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["4/12","6/12","4/6","5/6"]'::jsonb;

-- 2) SAM-L4-Q18 — pin the founder-verified options + correct_index. The
--    stored row already matches, so the divergence guard makes this a
--    no-op on the current bank (zero rows); it only fires where the
--    stored content drifted from the verified source. Stem and
--    distractor_misconceptions are untouched.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      jsonb_set(q.content, '{options}', '["1/2","3/4","5/3","1/12"]'::jsonb),
      '{correct_index}',
      '2'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L4-Q18'
  and q.format = 'MULTIPLE_CHOICE'
  and (q.content -> 'options' is distinct from '["1/2","3/4","5/3","1/12"]'::jsonb
       or q.content -> 'correct_index' is distinct from '2'::jsonb);
-- END founder-verified-mojibake-fixes

-- BEGIN prerun-q4-q15-fixes (mirror of supabase/migrations/20260611014520_prerun_q4_q15.sql)
-- =============================================================================
-- Pre-run founder-directed fixes: SAM-L2-Q04 deactivation + SAM-L3-Q15
-- TEXT_ENTRY reactivation
-- =============================================================================
-- AGENTS.md §11: the migration above is the prod path and a no-op on dev
-- reset (it runs before this file creates the tenant); this block is the
-- dev/CI path, applied AFTER the mojibake-fixes block above so the
-- SAM-L3-Q15 row is already in its NUMERIC_ENTRY {stem, correct_answer}
-- shape. Statements are identical to the migration; every UPDATE carries
-- an idempotent guard. Full before/after table in the migration header.

-- 1) SAM-L2-Q04 — deactivate until a curated question image exists
--    (image_required came back true on the L2 prompt re-validation; same
--    missing-image policy as the Stage 4 loader). Format/content
--    untouched. Guarded on the active state.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L2-Q04'
  and q.is_active = true;

-- 2) SAM-L3-Q15 — NUMERIC_ENTRY -> TEXT_ENTRY (content shape identical)
--    and reactivate, per the 20260610190000 "reactivate after merge"
--    note. Guarded on the pre-change format + the founder-verified
--    answer.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'::question_format,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q15'
  and q.format = 'NUMERIC_ENTRY'
  and q.content ->> 'correct_answer' = '4/6';
-- END prerun-q4-q15-fixes


-- =====================================================================
-- FULL-LIBRARY NEW LEVELS (0A / 0B / 0C / 5 / 6) -- SEPARATE BLOCK
-- Added 2026-06-11 alongside the existing Level 1-4 stage4 block per the
-- founder's Option-1 decision (load new external_ids only; leave all
-- Level 1-4 rows byte-for-byte unchanged). This block is intentionally
-- OUTSIDE the stage4 BEGIN/END markers so the loader's marker-block
-- rewrite never touches Level 1-4. PENDING RECONCILIATION: a future full
-- cumulative re-load should fold these rows into the single stage4 marker
-- block once the Level 1-4 stage3 sources are made guard-clean.
-- Mirrors supabase/migrations/20260611134158_load_sam_questions.sql
-- (AGENTS.md 11 parity: identical INSERT on both paths; on conflict do nothing).
-- =====================================================================

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    -- SAM-L0A-Q04 | l0a-geometry-1 | geometry / KA | DRAG_DROP | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0A-Q04', 'geometry', 'KA', -2.5, 'DRAG_DROP',
     '{"stem":"Colour the [object] red. Colour the [object] blue. Colour the [object] green.","items":["red","blue","green"],"correct_order":["red","blue","green"],"image_alt":"Three objects shown; each must be coloured with a specified colour (red, blue, or green).","image_required":true}',
     array[]::text[],
     12, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0a-geometry-1'),

    -- SAM-L0A-Q08 | l0a-geometry-3 | geometry / KB | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0A-Q08', 'geometry', 'KB', -2.2, 'MULTIPLE_CHOICE',
     '{"stem":"Circle the object that is the same as the one in the box.","options":["Car","Object 2","Object 3","Object 4"],"correct_index":0,"image_alt":"A row of objects including a boxed reference item, with the student required to identify which other object matches it.","image_required":true}',
     array[]::text[],
     13, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0a-geometry-3'),

    -- SAM-L0A-Q11 | l0a-geometry-4 | geometry / KB | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0A-Q11', 'geometry', 'KB', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Look at the pattern below. Circle what comes next.","options":["Blue flower","Red flower","Yellow flower","Green flower"],"correct_index":0,"image_alt":"A repeating pattern of flowers in a sequence, with the final item replaced by a question mark.","image_required":true}',
     array[]::text[],
     9, 'PATTERN', 1, 'PICTORIAL', false, 'l0a-geometry-4'),

    -- SAM-L0A-Q17 | l0a-whole_numbers-1 | number_sense / KB | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0A-Q17', 'number_sense', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"Count the balloons. Say the number.","correct_answer":"five","image_alt":"A group of balloons for the student to count aloud.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     6, 'COUNTING', 1, 'PICTORIAL', false, 'l0a-whole_numbers-1'),

    -- SAM-L0B-Q02 | l0a-geometry-4 | geometry / KB | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0B-Q02', 'geometry', 'KB', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Circle the object that comes next in the pattern below.","options":["Magnet","Option B (unknown)","Option C (unknown)","Option D (unknown)"],"correct_index":0,"image_alt":"A repeating pattern of objects, one of which is a magnet, presented as a sequence with the next item to be identified.","image_required":true}',
     array[]::text[],
     10, 'PATTERN', 1, 'PICTORIAL', false, 'l0a-geometry-4'),

    -- SAM-L0B-Q05 | l0a-whole_numbers-1 | number_sense / KB | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0B-Q05', 'number_sense', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"Count back from 10. Write the missing numbers.","correct_answer":"9, 7, 6, 4, 3, 2, 1","image_alt":"A number track or sequence showing some numbers from 10 counting back to 1 with several blanks to be filled in.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     8, 'COUNTING', 1, 'SYMBOLIC', false, 'l0a-whole_numbers-1'),

    -- SAM-L0B-Q07 | l0a-geometry-3 | geometry / KB | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0B-Q07', 'geometry', 'KB', -2, 'MULTIPLE_CHOICE',
     '{"stem":"How are the shapes sorted?","options":["colour","size","colour and size","shape"],"correct_index":0,"distractor_misconceptions":{"1":"GE_SHAPE_PROPERTY"},"image_alt":"A set of basic plane shapes sorted into groups; the sorting criterion is visible from how the groups are arranged.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     5, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0a-geometry-3'),

    -- SAM-L0B-Q08 | l0a-whole_numbers-2 | number_sense / KB | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0B-Q08', 'number_sense', 'KB', -2.2, 'NUMERIC_ENTRY',
     '{"stem":"Read. Write the missing numbers. I have ___ toy cars. I have ___ big toy car and ___ small toy cars.","correct_answer":"5; 1; 4","image_alt":"An illustration showing a group of toy cars, some big and some small, to support counting and number bond reading.","image_required":true}',
     array['WP_OPERATION_SELECTION','NS_COUNTING_ERROR'],
     21, 'COUNTING', 2, 'WORD_PROBLEM_SINGLE', false, 'l0a-whole_numbers-2'),

    -- SAM-L0B-Q09 | l0a-whole_numbers-2 | operations_algorithms / KB | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0B-Q09', 'operations_algorithms', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"There are 8 sweets. Draw 5 sweets in the bag. Draw the rest in the jar. Count the sweets in the jar.","correct_answer":"3","image_alt":"A drawing area showing a bag and a jar, where the student draws 5 sweets in the bag and the remaining sweets in the jar.","image_required":true}',
     array['NS_COUNTING_ERROR','WP_OPERATION_SELECTION'],
     22, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', false, 'l0a-whole_numbers-2'),

    -- SAM-L0B-Q14 | l0b-whole_numbers-3 | operations_algorithms / KB | NUMERIC_ENTRY
    ('SAM-L0B-Q14', 'operations_algorithms', 'KB', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"There are 4 pieces of sushi on a tray. There are 6 pieces of sushi in a box. How many pieces of sushi are there altogether? Fill in the blanks. 4 + 6 = _______ There are __________ pieces of sushi altogether.","correct_answer":"10"}',
     array['WP_OPERATION_SELECTION','NS_COUNTING_ERROR'],
     42, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l0b-whole_numbers-3'),

    -- SAM-L0B-Q15 | l0b-whole_numbers-3 | operations_algorithms / KB | NUMERIC_ENTRY
    ('SAM-L0B-Q15', 'operations_algorithms', 'KB', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Diana baked 10 cookies. Paul ate 7 cookies. How many cookies are left? Fill in the blanks. 10 – 7 = _______ There are __________ cookies left.","correct_answer":"3"}',
     array['WP_OPERATION_SELECTION','WP_KEYWORD_TRAP'],
     27, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, 'l0b-whole_numbers-3'),

    -- SAM-L0C-Q03 | l0b-whole_numbers-2 | number_sense / KB | DRAG_DROP
    ('SAM-L0C-Q03', 'number_sense', 'KB', -2, 'DRAG_DROP',
     '{"stem":"Colour the boxes that make 10. 5 + 5 | 3 + 7 | 2 + 8 | 2 + 2 | 1 + 9 | 3 + 5 | 9 + 2 | 6 + 4","items":["5 + 5","3 + 7","2 + 8","1 + 9","6 + 4"],"correct_order":["5 + 5","3 + 7","2 + 8","1 + 9","6 + 4"]}',
     array['NS_COUNTING_ERROR'],
     37, 'ADDITION', 1, 'SYMBOLIC', true, 'l0b-whole_numbers-2'),

    -- SAM-L0C-Q05 | l0b-whole_numbers-1 | number_sense / KB | DRAG_DROP | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0C-Q05', 'number_sense', 'KB', -2, 'DRAG_DROP',
     '{"stem":"Write bigger and biggest in the correct blanks.","items":["bigger","biggest"],"correct_order":["bigger","biggest"],"image_alt":"Three objects or quantities of different sizes arranged for comparison, with three blank labels to be filled in using comparative and superlative language.","image_required":true}',
     array['NS_MAGNITUDE_MISJUDGE'],
     8, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0b-whole_numbers-1'),

    -- SAM-L0C-Q08 | l0b-whole_numbers-1 | number_sense / KB | NUMERIC_ENTRY
    ('SAM-L0C-Q08', 'number_sense', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"Skip count by 2s. Fill in the missing numbers. 2, ___, 6, ___, 10, 12, 14, ___, 18, ___","correct_answer":"4; 8; 16; 20"}',
     array['NS_COUNTING_ERROR'],
     19, 'PATTERN', 4, 'SYMBOLIC', true, 'l0b-whole_numbers-1'),

    -- SAM-L0C-Q09 | l0b-whole_numbers-3 | operations_algorithms / KB | NUMERIC_ENTRY
    ('SAM-L0C-Q09', 'operations_algorithms', 'KB', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"There are 14 blue beads and 5 green beads on Sally''s necklace. How many beads are there altogether? 14 + 5 = __________. There are __________ beads altogether.","correct_answer":"19"}',
     array['WP_OPERATION_SELECTION','NS_COUNTING_ERROR'],
     28, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, 'l0b-whole_numbers-3'),

    -- SAM-L0C-Q10 | l0b-whole_numbers-3 | operations_algorithms / KB | NUMERIC_ENTRY
    ('SAM-L0C-Q10', 'operations_algorithms', 'KB', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"There are 18 birds. 6 of the birds are blue. How many birds are yellow? Fill in the blanks. 18 – 6 = __________ There are __________ yellow birds.","correct_answer":"12"}',
     array['WP_OPERATION_SELECTION','OP_SUBTRACTION_DIRECTION'],
     29, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, 'l0b-whole_numbers-3'),

    -- SAM-L0C-Q11 | l0b-whole_numbers-1 | number_sense / KB | DRAG_DROP | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0C-Q11', 'number_sense', 'KB', -1.8, 'DRAG_DROP',
     '{"stem":"Look at the number line. Colour the answers.\n31 comes ___ 30. 31 is ___ than 30.\n33 comes ___ 36. 33 is ___ than 36.\n[Number line: 30, 32, 34, 36 | 31, 33, 35]\nWord bank: before / after | smaller / greater","items":["before","after","smaller","greater"],"correct_order":["after","greater","before","smaller"],"image_alt":"A number line showing two rows of numbers: 30, 32, 34, 36 on one row and 31, 33, 35 on another row, with word-card banks reading \"before/after\" and \"smaller/greater\".","image_required":true}',
     array['NS_MAGNITUDE_MISJUDGE'],
     45, 'IDENTIFY', 4, 'PICTORIAL', false, 'l0b-whole_numbers-1'),

    -- SAM-L0C-Q13 | l0b-measurement-1 | measurement / KB | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0C-Q13', 'measurement', 'KB', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Read aloud the days of the week from Monday. A part of the page is torn. What is the missing day?","options":["Friday","Fryday","Thursday","Saturday"],"correct_index":0,"distractor_misconceptions":{"1":"MD_TIME_READING"},"image_alt":"A list of days of the week with one day missing due to a torn page.","image_required":true}',
     array['MD_TIME_READING'],
     21, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0b-measurement-1'),

    -- SAM-L0C-Q14 | l0c-whole_numbers-1 | number_sense / KB | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0C-Q14', 'number_sense', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"How many pairs are there? Write the number.","correct_answer":"4","image_alt":"A set of objects arranged in groups of two (pairs) for students to count how many pairs there are.","image_required":true}',
     array['NS_COUNTING_ERROR'],
     8, 'COUNTING', 1, 'PICTORIAL', false, 'l0c-whole_numbers-1'),

    -- SAM-L0C-Q15 | l0c-whole_numbers-1 | number_sense / KB | DRAG_DROP | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L0C-Q15', 'number_sense', 'KB', -1.8, 'DRAG_DROP',
     '{"stem":"Colour the circles with odd numbers. 1  10  26  5  12  24  35  41  40","items":["1","5","35","41"],"correct_order":["1","5","35","41"],"image_alt":"Nine circles arranged on a page, each containing a number: 1, 10, 26, 5, 12, 24, 35, 41, and 40.","image_required":true}',
     array['NS_PLACE_VALUE_CONFUSION'],
     15, 'IDENTIFY', 1, 'PICTORIAL', false, 'l0c-whole_numbers-1'),

    -- SAM-L0C-Q16 | l0c-whole_numbers-2 | number_sense / KB | NUMERIC_ENTRY
    ('SAM-L0C-Q16', 'number_sense', 'KB', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Break apart 32. Fill in the boxes. 32 = ___ + ___","correct_answer":"30; 2"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l0c-whole_numbers-2'),

    -- SAM-L5-Q02 | l4-whole_numbers-1 | number_sense / 3A | NUMERIC_ENTRY
    ('SAM-L5-Q02', 'number_sense', '3A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Which is greater, 12 357 or 13 275?","correct_answer":"13275"}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     8, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l4-whole_numbers-1'),

    -- SAM-L5-Q03 | l4-whole_numbers-2 | number_sense / 3A | NUMERIC_ENTRY
    ('SAM-L5-Q03', 'number_sense', '3A', -1.5, 'NUMERIC_ENTRY',
     '{"stem":"Estimate the value of 119 + 172.","correct_answer":"290 or 300"}',
     array['NS_MAGNITUDE_MISJUDGE'],
     7, 'ADDITION', 2, 'SYMBOLIC', true, 'l4-whole_numbers-2'),

    -- SAM-L5-Q04 | l4-whole_numbers-2 | number_sense / 4B | NUMERIC_ENTRY
    ('SAM-L5-Q04', 'number_sense', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Michelle wrote a 2-digit number that is smaller than 50. The number is a common multiple of 3 and 5. 6 is a factor of the number. What number is it?","correct_answer":"30"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION'],
     31, 'COUNTING', 3, 'WORD_PROBLEM_SINGLE', true, 'l4-whole_numbers-2'),

    -- SAM-L5-Q05 | l4-whole_numbers-2 | number_sense / 4A | MULTIPLE_CHOICE
    ('SAM-L5-Q05', 'number_sense', '4A', 0.2, 'MULTIPLE_CHOICE',
     '{"stem":"What is the product of 3049 and 7?","options":["2443","21 083","21 343","22 043"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_ZERO_VALUE","3":"OP_NO_REGROUPING"}}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE','OP_NO_REGROUPING'],
     8, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l4-whole_numbers-2'),

    -- SAM-L5-Q06 | l4-whole_numbers-2 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q06', 'number_sense', '4A', 0.3, 'NUMERIC_ENTRY',
     '{"stem":"What is the product of 762 and 95?","correct_answer":"72390"}',
     array['NS_PLACE_VALUE_CONFUSION','OP_MULT_AS_REPEATED_ADD'],
     8, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l4-whole_numbers-2'),

    -- SAM-L5-Q07 | l4-whole_numbers-2 | number_sense / 4A | MULTIPLE_CHOICE
    ('SAM-L5-Q07', 'number_sense', '4A', 0.3, 'MULTIPLE_CHOICE',
     '{"stem":"4981 ÷ 6 =","options":["831","830 R1","830","83 R1"],"correct_index":1,"distractor_misconceptions":{"0":"OP_DIV_REMAINDER","2":"OP_DIV_REMAINDER","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['OP_DIV_REMAINDER','NS_PLACE_VALUE_CONFUSION'],
     4, 'DIVISION', 1, 'SYMBOLIC', true, 'l4-whole_numbers-2'),

    -- SAM-L5-Q08 | l4-data_representation-2 | data_statistics / 4A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q08', 'data_statistics', '4A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"The line graph below shows the number of books sold in a bookshop for 6 months. Use this information to answer the question below. How many books were sold from January to March altogether?","correct_answer":"400","image_alt":"A line graph titled \"Sales of books\" showing number of books sold (y-axis, 0–300 in intervals of 50) across six months January to June (x-axis).","image_required":true}',
     array['MD_CHART_SCALE','WP_MULTI_STEP_SEQUENCE'],
     34, 'ADDITION', 2, 'PICTORIAL', false, 'l4-data_representation-2'),

    -- SAM-L5-Q09 | l4-fractions-3 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q09', 'fractions_decimals', '4A', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"Patricia used 1¹⁄₂ kg of sugar, 1¹⁄₄ kg of flour and 1¹⁄₆ kg of butter to make a cake. What was the total mass of ingredients used?","correct_answer":"5 1/12"}',
     array['FR_COMMON_DENOMINATOR','FR_NUM_DENOM_INDEPENDENT','WP_MULTI_STEP_SEQUENCE'],
     27, 'FRACTION_OP', 3, 'WORD_PROBLEM_SINGLE', true, 'l4-fractions-3'),

    -- SAM-L5-Q11 | l4-fractions-3 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q11', 'fractions_decimals', '4A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"A baker had 200 eggs. He used 1/8 of the eggs to bake some cakes. How many eggs did he have left?","correct_answer":"175"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION'],
     22, 'FRACTION_OP', 2, 'WORD_PROBLEM_MULTI', true, 'l4-fractions-3'),

    -- SAM-L5-Q12 | l4-geometry-1 | geometry / 4B | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q12', 'geometry', '4B', 0.5, 'NUMERIC_ENTRY',
     '{"stem":"Draw an angle of 65° in the space below as accurately as possible. Label the diagram m. The first line is drawn for you.","correct_answer":"65° angle drawn and labeled m (accept within ±3°)","image_alt":"A single straight line is drawn as the first ray of the angle, providing the baseline from which the student must draw a 65° angle.","image_required":true}',
     array[]::text[],
     24, 'GEOMETRY', 1, 'PICTORIAL', false, 'l4-geometry-1'),

    -- SAM-L5-Q13 | l4-geometry-1 | geometry / 4B | MULTIPLE_CHOICE
    ('SAM-L5-Q13', 'geometry', '4B', 0.8, 'MULTIPLE_CHOICE',
     '{"stem":"Alan is facing north-east now. If he makes a 270° anti-clockwise turn, which direction will he be facing?","options":["north-west","south-west","south-east","north-east"],"correct_index":2,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY","1":"GE_SHAPE_PROPERTY","3":"WP_KEYWORD_TRAP"}}',
     array['GE_SHAPE_PROPERTY','WP_KEYWORD_TRAP'],
     18, 'GEOMETRY', 1, 'WORD_PROBLEM_SINGLE', true, 'l4-geometry-1'),

    -- SAM-L5-Q14 | l4-geometry-2 | geometry / 4B | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q14', 'geometry', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"The following figure is not drawn to scale. Find the angle measure of ∠a in the square.","correct_answer":"16°","image_alt":"A square with interior lines creating labelled angles; one unknown angle is marked as ∠a.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     17, 'GEOMETRY', 2, 'PICTORIAL', false, 'l4-geometry-2'),

    -- SAM-L5-Q15 | l4-decimals-1 | fractions_decimals / 3A | MULTIPLE_CHOICE
    ('SAM-L5-Q15', 'fractions_decimals', '3A', -1.2, 'MULTIPLE_CHOICE',
     '{"stem":"What is the missing number?\n8.035 = 8 + ___ + 0.005","options":["30","3","0.3","0.03"],"correct_index":3,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_PLACE_VALUE_CONFUSION","2":"NS_PLACE_VALUE_CONFUSION"}}',
     array['NS_PLACE_VALUE_CONFUSION'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l4-decimals-1'),

    -- SAM-L5-Q17 | l4-decimals-2 | fractions_decimals / 4B | MULTIPLE_CHOICE
    ('SAM-L5-Q17', 'fractions_decimals', '4B', 0.8, 'MULTIPLE_CHOICE',
     '{"stem":"What is the difference between 267.96 and 45.8? Round off your answer to 1 decimal place.","options":["222.1","222.16","222.17","222.2"],"correct_index":3,"distractor_misconceptions":{"0":"OP_NO_REGROUPING","1":"WP_MULTI_STEP_SEQUENCE","2":"WP_MULTI_STEP_SEQUENCE"}}',
     array['OP_NO_REGROUPING','WP_MULTI_STEP_SEQUENCE'],
     16, 'DECIMAL_OP', 2, 'SYMBOLIC', true, 'l4-decimals-2'),

    -- SAM-L5-Q19 | l4-decimals-2 | fractions_decimals / 4A | MULTIPLE_CHOICE
    ('SAM-L5-Q19', 'fractions_decimals', '4A', 0.2, 'MULTIPLE_CHOICE',
     '{"stem":"The best estimate for 89.5 ÷ 5 is ___.","options":["16","17","18","20"],"correct_index":2,"distractor_misconceptions":{"0":"NS_MAGNITUDE_MISJUDGE","1":"NS_MAGNITUDE_MISJUDGE","3":"WP_KEYWORD_TRAP"}}',
     array['NS_MAGNITUDE_MISJUDGE','WP_KEYWORD_TRAP'],
     9, 'DIVISION', 2, 'SYMBOLIC', true, 'l4-decimals-2'),

    -- SAM-L5-Q20 | l4-decimals-4 | fractions_decimals / 4B | NUMERIC_ENTRY
    ('SAM-L5-Q20', 'fractions_decimals', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Ivan bought 8 similar drawing pencils at $20. He also bought a paintbrush that cost $1.75 more than a drawing pencil. How much did Ivan spend on art supplies altogether?","correct_answer":"24.25"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','WP_KEYWORD_TRAP'],
     30, 'DECIMAL_OP', 3, 'WORD_PROBLEM_MULTI', true, 'l4-decimals-4'),

    -- SAM-L5-Q21 | l4-decimals-4 | fractions_decimals / 4B | NUMERIC_ENTRY
    ('SAM-L5-Q21', 'fractions_decimals', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Jacky bought a bag of rice at $14.65 and 6 oranges at $0.40 each. He paid for all the items with $50. About how much change did he receive? Round your answer to the nearest whole number.","correct_answer":"33"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','OP_NO_REGROUPING'],
     37, 'DECIMAL_OP', 3, 'WORD_PROBLEM_MULTI', true, 'l4-decimals-4'),

    -- SAM-L5-Q22 | l4-decimals-1 | fractions_decimals / 3A | NUMERIC_ENTRY
    ('SAM-L5-Q22', 'fractions_decimals', '3A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"________ seconds = 2 minutes","correct_answer":"120"}',
     array['MD_UNIT_CONFUSION'],
     5, 'MEASUREMENT', 1, 'SYMBOLIC', true, 'l4-decimals-1'),

    -- SAM-L5-Q23 | l4-decimals-4 | fractions_decimals / 4B | NUMERIC_ENTRY
    ('SAM-L5-Q23', 'fractions_decimals', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"A bus leaves Singapore at 19 30. It will take 6 hours and 15 minutes to reach Kuala Lumpur. At what time will the bus arrive at Kuala Lumpur? Write the time using a.m. or p.m.","correct_answer":"1.45 a.m."}',
     array['MD_TIME_READING','MD_UNIT_CONFUSION'],
     36, 'MEASUREMENT', 2, 'WORD_PROBLEM_SINGLE', true, 'l4-decimals-4'),

    -- SAM-L5-Q24 | l4-area_volume-1 | geometry / 4B | NUMERIC_ENTRY
    ('SAM-L5-Q24', 'geometry', '4B', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"A rectangular plot of farming land has a perimeter of 276 m. If its width is 46 m, what is its length?","correct_answer":"92"}',
     array['WP_MULTI_STEP_SEQUENCE','GE_PERIMETER_AREA','WP_OPERATION_SELECTION'],
     22, 'SUBTRACTION', 3, 'WORD_PROBLEM_SINGLE', true, 'l4-area_volume-1'),

    -- SAM-L5-Q25 | l4-area_volume-1 | geometry / 4B | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q25', 'geometry', '4B', 1, 'NUMERIC_ENTRY',
     '{"stem":"The figure below shows the floor plan of an apartment. What is the area of the apartment?","correct_answer":"108","image_alt":"A floor plan of an apartment showing a composite rectilinear figure with labelled dimensions in metres.","image_required":true}',
     array['GE_PERIMETER_AREA','WP_MULTI_STEP_SEQUENCE'],
     17, 'GEOMETRY', 3, 'WORD_PROBLEM_SINGLE', false, 'l4-area_volume-1'),

    -- SAM-L5-Q26 | l4-geometry-3 | geometry / 4A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q26', 'geometry', '4A', 0.2, 'MULTIPLE_CHOICE',
     '{"stem":"In which of the following figures is the dotted line a line of symmetry?","options":["A","B","C","D"],"correct_index":1,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY"},"image_alt":"Four geometric figures each with a dotted line drawn through them; students must identify which dotted line is a true line of symmetry.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     14, 'IDENTIFY', 1, 'PICTORIAL', false, 'l4-geometry-3'),

    -- SAM-L5-Q27 | l4-geometry-3 | geometry / 4A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L5-Q27', 'geometry', '4A', 0.2, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the shapes has the most lines of symmetry?","options":["(1)","(2)","(3)","(4)"],"correct_index":0,"distractor_misconceptions":{"1":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"Four geometric shapes labelled (1) to (4); students must count and compare the number of lines of symmetry in each shape.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     10, 'IDENTIFY', 1, 'PICTORIAL', false, 'l4-geometry-3'),

    -- SAM-L5-Q28 | l5-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q28', 'number_sense', '4A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Write the number 3 457 001 in words.","correct_answer":"three million, four hundred and fifty-seven thousand and one"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     8, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l5-whole_numbers-1'),

    -- SAM-L5-Q29 | l5-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q29', 'number_sense', '4A', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Which is greater, 200 009 or 2 000 000?","correct_answer":"2000000"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_MAGNITUDE_MISJUDGE','NS_ZERO_VALUE'],
     9, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l5-whole_numbers-1'),

    -- SAM-L5-Q30 | l5-whole_numbers-2 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L5-Q30', 'number_sense', '4A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Round off the 4-digit number to the nearest thousand then estimate the value of 6798 × 5.","correct_answer":"35000"}',
     array['NS_PLACE_VALUE_CONFUSION','OP_MULT_AS_REPEATED_ADD'],
     17, 'MULTIPLICATION', 2, 'SYMBOLIC', true, 'l5-whole_numbers-2'),

    -- SAM-L6-Q01 | l5-whole_numbers-1 | number_sense / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q01', 'number_sense', '4A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"What is the missing number? 4 085 650 = 4 000 000 + ___ + 600 + 50","correct_answer":"85000"}',
     array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
     18, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l5-whole_numbers-1'),

    -- SAM-L6-Q02 | l5-whole_numbers-1 | number_sense / 4A | MULTIPLE_CHOICE
    ('SAM-L6-Q02', 'number_sense', '4A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the following numbers is greater than 990 000?","options":["1 234 000","899 999","909 999","989 999"],"correct_index":0,"distractor_misconceptions":{"1":"NS_MAGNITUDE_MISJUDGE","2":"NS_MAGNITUDE_MISJUDGE","3":"NS_MAGNITUDE_MISJUDGE"}}',
     array['NS_MAGNITUDE_MISJUDGE'],
     10, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l5-whole_numbers-1'),

    -- SAM-L6-Q03 | l5-whole_numbers-1 | operations_algorithms / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q03', 'operations_algorithms', '4A', -1.5, 'NUMERIC_ENTRY',
     '{"stem":"Estimate the sum of 53 450 and 108 530. Round each number to the nearest thousand.","correct_answer":"162000"}',
     array['NS_PLACE_VALUE_CONFUSION','OP_NO_REGROUPING','WP_MULTI_STEP_SEQUENCE'],
     16, 'ADDITION', 3, 'WORD_PROBLEM_SINGLE', true, 'l5-whole_numbers-1'),

    -- SAM-L6-Q04 | l5-whole_numbers-2 | operations_algorithms / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q04', 'operations_algorithms', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Round 501 495 to the nearest thousand and divide the result by 500.","correct_answer":"1002"}',
     array['WP_MULTI_STEP_SEQUENCE','NS_PLACE_VALUE_CONFUSION','OP_DIV_REMAINDER'],
     13, 'DIVISION', 2, 'WORD_PROBLEM_SINGLE', true, 'l5-whole_numbers-2'),

    -- SAM-L6-Q05 | l5-whole_numbers-2 | number_sense / 4A | MULTIPLE_CHOICE
    ('SAM-L6-Q05', 'number_sense', '4A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"What is 11 + 7 × 5 – (8 ÷ 2)?","options":["18","41","42","86"],"correct_index":2,"distractor_misconceptions":{"0":"WP_MULTI_STEP_SEQUENCE","1":"WP_MULTI_STEP_SEQUENCE","3":"WP_MULTI_STEP_SEQUENCE"}}',
     array['WP_MULTI_STEP_SEQUENCE'],
     11, 'ALGEBRA', 4, 'SYMBOLIC', true, 'l5-whole_numbers-2'),

    -- SAM-L6-Q06 | l5-whole_numbers-3 | operations_algorithms / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q06', 'operations_algorithms', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Three tanks contain 3760 L of water. Tank A has 510 L more water than Tank B. Tank C has 3 times as much water as Tank B. All the water in Tank C is then poured into 15 identical empty barrels. How many litres of water are there in each barrel?","correct_answer":"130"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION','WP_IRRELEVANT_INFO'],
     52, 'DIVISION', 4, 'WORD_PROBLEM_MULTI', true, 'l5-whole_numbers-3'),

    -- SAM-L6-Q07 | l5-fractions-1 | fractions_decimals / 4A | MULTIPLE_CHOICE
    ('SAM-L6-Q07', 'fractions_decimals', '4A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"10 pizzas are shared equally among 4 children. What fraction of a pizza does each child get? Which of the following is NOT the correct answer?","options":["4 ÷ 10","10 ÷ 4","10/4","10 × 1/4"],"correct_index":0,"distractor_misconceptions":{"1":"WP_OPERATION_SELECTION","2":"FR_FRACTION_AS_TWO_NUMS"}}',
     array['WP_OPERATION_SELECTION','FR_FRACTION_AS_TWO_NUMS'],
     26, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE', true, 'l5-fractions-1'),

    -- SAM-L6-Q08 | l5-fractions-2 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q08', 'fractions_decimals', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Express 10 1/8 as a decimal.","correct_answer":"10.125"}',
     array['FR_FRACTION_AS_TWO_NUMS','OP_DIV_REMAINDER','WP_MULTI_STEP_SEQUENCE'],
     6, 'FRACTION_OP', 2, 'SYMBOLIC', true, 'l5-fractions-2'),

    -- SAM-L6-Q09 | l5-fractions-3 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q09', 'fractions_decimals', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Find the sum of 5 2/7 and 2 3/4.","correct_answer":"8 1/28"}',
     array['FR_COMMON_DENOMINATOR','FR_NUM_DENOM_INDEPENDENT','OP_NO_REGROUPING'],
     9, 'FRACTION_OP', 2, 'SYMBOLIC', true, 'l5-fractions-3'),

    -- SAM-L6-Q10 | l5-fractions-3 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q10', 'fractions_decimals', '4A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Mr Li has 3 5/6 m of rope. He cuts away 1 2/3 m of the rope. What length of rope is left? Express your answer as a decimal correct to two decimal places.","correct_answer":"2.17"}',
     array['FR_COMMON_DENOMINATOR','WP_MULTI_STEP_SEQUENCE','FR_NUM_DENOM_INDEPENDENT'],
     34, 'FRACTION_OP', 2, 'WORD_PROBLEM_SINGLE', true, 'l5-fractions-3'),

    -- SAM-L6-Q11 | l5-fractions-4 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q11', 'fractions_decimals', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"What is the product of 7 3/8 and 12? Express your answer as a mixed number in its simplest form.","correct_answer":"88 1/2"}',
     array['FR_FRACTION_AS_TWO_NUMS','OP_NO_REGROUPING','FR_NUM_DENOM_INDEPENDENT'],
     20, 'FRACTION_OP', 2, 'SYMBOLIC', true, 'l5-fractions-4'),

    -- SAM-L6-Q12 | l5-fractions-4 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q12', 'fractions_decimals', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Multiply 5/8 by 4/9. Express your answer as a fraction in its simplest form.","correct_answer":"5/18"}',
     array['FR_NUM_DENOM_INDEPENDENT'],
     14, 'FRACTION_OP', 2, 'SYMBOLIC', true, 'l5-fractions-4'),

    -- SAM-L6-Q13 | l5-fractions-5 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q13', 'fractions_decimals', '4A', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"Lynn had 4/5 kg of flour. She used 1/2 of the flour to bake 4 similar pies. How many grams of flour did she use to bake each pie?","correct_answer":"100"}',
     array['WP_MULTI_STEP_SEQUENCE','MD_UNIT_CONFUSION','WP_OPERATION_SELECTION'],
     29, 'FRACTION_OP', 3, 'WORD_PROBLEM_MULTI', true, 'l5-fractions-5'),

    -- SAM-L6-Q14 | l5-area_volume-1 | geometry / 4A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q14', 'geometry', '4A', -0.5, 'MULTIPLE_CHOICE',
     '{"stem":"What is the height of the triangle ABC if its base is BC?","options":["AF","DB","EB","FC"],"correct_index":0,"distractor_misconceptions":{"1":"GE_SHAPE_PROPERTY","2":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"A triangle ABC with labeled points A, B, C and additional labeled points D, E, F on or near the triangle, showing various line segments from which the perpendicular height from A to base BC must be identified.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     13, 'IDENTIFY', 1, 'PICTORIAL', false, 'l5-area_volume-1'),

    -- SAM-L6-Q15 | l5-area_volume-1 | geometry / 4A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q15', 'geometry', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"What is the area of the triangle below?","correct_answer":"54","image_alt":"A right triangle with base labelled 9 cm, height labelled 12 cm, and hypotenuse labelled 15 cm.","image_required":true}',
     array['GE_PERIMETER_AREA','WP_IRRELEVANT_INFO'],
     8, 'GEOMETRY', 2, 'PICTORIAL', false, 'l5-area_volume-1'),

    -- SAM-L6-Q16 | l5-area_volume-1 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q16', 'geometry', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"The figure below is made up of a rectangle, a square and a triangle. Find the area of the figure.","correct_answer":"267.5","image_alt":"A composite figure made up of a rectangle, a square, and a triangle, labelled with dimensions 10 cm, 18 cm, and 7 cm.","image_required":true}',
     array['GE_PERIMETER_AREA','WP_MULTI_STEP_SEQUENCE','GE_SHAPE_PROPERTY'],
     20, 'GEOMETRY', 4, 'PICTORIAL', false, 'l5-area_volume-1'),

    -- SAM-L6-Q18 | l5-area_volume-3 | geometry / 4A | MULTIPLE_CHOICE
    ('SAM-L6-Q18', 'geometry', '4A', -1, 'MULTIPLE_CHOICE',
     '{"stem":"What is the volume of a cube of edge 9 cm?","options":["27 cm³","81 cm³","567 cm³","729 cm³"],"correct_index":3,"distractor_misconceptions":{"0":"NS_MAGNITUDE_MISJUDGE","1":"GE_PERIMETER_AREA","2":"OP_MULT_AS_REPEATED_ADD"}}',
     array['NS_MAGNITUDE_MISJUDGE','GE_PERIMETER_AREA','OP_MULT_AS_REPEATED_ADD'],
     11, 'GEOMETRY', 1, 'SYMBOLIC', true, 'l5-area_volume-3'),

    -- SAM-L6-Q19 | l5-area_volume-4 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q19', 'geometry', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"320 L of water are poured into the empty rectangular tank below. How many more litres of water are needed to fill the tank to the brim?","correct_answer":"415","image_alt":"A rectangular tank with three labelled dimensions; no water level or fill markings are shown.","image_required":true}',
     array['WP_MULTI_STEP_SEQUENCE','MD_UNIT_CONFUSION','WP_OPERATION_SELECTION'],
     27, 'MEASUREMENT', 3, 'WORD_PROBLEM_MULTI', false, 'l5-area_volume-4'),

    -- SAM-L6-Q20 | l5-fractions-2 | fractions_decimals / 4B | MULTIPLE_CHOICE
    ('SAM-L6-Q20', 'fractions_decimals', '4B', 0.5, 'MULTIPLE_CHOICE',
     '{"stem":"What is 1.08 expressed as a fraction in its simplest form?","options":["1 2/25","1 4/50","1 8/100","1 2/25"],"correct_index":2,"distractor_misconceptions":{"0":"FR_NUM_DENOM_INDEPENDENT","1":"FR_FRACTION_AS_TWO_NUMS","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['FR_NUM_DENOM_INDEPENDENT','FR_FRACTION_AS_TWO_NUMS','NS_PLACE_VALUE_CONFUSION'],
     11, 'FRACTION_OP', 2, 'SYMBOLIC', true, 'l5-fractions-2'),

    -- SAM-L6-Q21 | l5-decimals-1 | fractions_decimals / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q21', 'fractions_decimals', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"Multiply 0.072 by 600.","correct_answer":"43.2"}',
     array['NS_PLACE_VALUE_CONFUSION'],
     4, 'MULTIPLICATION', 2, 'SYMBOLIC', true, 'l5-decimals-1'),

    -- SAM-L6-Q23 | l5-rate-2 | operations_algorithms / 4A | NUMERIC_ENTRY
    ('SAM-L6-Q23', 'operations_algorithms', '4A', -0.5, 'NUMERIC_ENTRY',
     '{"stem":"A machine assembles 36 toys in 4 min. At this rate, how many toys does it assemble in 6 min?","correct_answer":"54"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION'],
     20, 'DIVISION', 2, 'WORD_PROBLEM_SINGLE', true, 'l5-rate-2'),

    -- SAM-L6-Q24 | l5-rate-2 | operations_algorithms / 5B | NUMERIC_ENTRY
    ('SAM-L6-Q24', 'operations_algorithms', '5B', 1.2, 'NUMERIC_ENTRY',
     '{"stem":"Parking charges at a car park are shown below. Tom parked his car at the car park from 11 am to 1:15 pm. How much did he pay?\n\n| First hour | $3.40 |\n| For every additional ½ hour or part thereof | $1.50 |","correct_answer":"$7.90"}',
     array['MD_TIME_READING','WP_MULTI_STEP_SEQUENCE','NS_COUNTING_ERROR'],
     46, 'MEASUREMENT', 4, 'WORD_PROBLEM_MULTI', true, 'l5-rate-2'),

    -- SAM-L6-Q25 | l5-area_volume-4 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q25', 'geometry', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Some water from a full tank is drained into an empty barrel. The figure shows the amount of water left in the tank. a) How much water is in the barrel now? b) If the water is drained from the tank at a rate of 7.5 litres per half hour, how much time has passed till now? Express your answer as a decimal.","correct_answer":"6.6","image_alt":"A rectangular tank with labelled dimensions (length 50 cm, breadth 55 cm, total height 40 cm) showing water remaining at a height of 4 cm from the top (i.e., water level at 36 cm from the bottom).","image_required":true}',
     array['WP_MULTI_STEP_SEQUENCE','MD_UNIT_CONFUSION','WP_OPERATION_SELECTION'],
     63, 'MEASUREMENT', 4, 'WORD_PROBLEM_MULTI', false, 'l5-area_volume-4'),

    -- SAM-L6-Q26 | l6-percentage-1 | fractions_decimals / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q26', 'fractions_decimals', '5A', 0.5, 'NUMERIC_ENTRY',
     '{"stem":"The figure is made up of identical rectangles. What percentage of the figure is shaded?","correct_answer":"60","image_alt":"A figure composed of identical rectangles, some of which are shaded and some unshaded.","image_required":true}',
     array['NS_COUNTING_ERROR','FR_NUM_DENOM_INDEPENDENT'],
     15, 'PERCENT_OP', 2, 'PICTORIAL', false, 'l6-percentage-1'),

    -- SAM-L6-Q28 | l6-percentage-1 | fractions_decimals / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q28', 'fractions_decimals', '5A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"There are 165 vehicles in a car park. 40% of them are motorbikes. How many motorbikes are there?","correct_answer":"66"}',
     array['WP_OPERATION_SELECTION','MD_UNIT_CONFUSION'],
     18, 'PERCENT_OP', 2, 'WORD_PROBLEM_SINGLE', true, 'l6-percentage-1'),

    -- SAM-L6-Q29 | l6-percentage-3 | fractions_decimals / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q29', 'fractions_decimals', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"Johnny bought a sofa set that cost $2100. He had to pay an additional 7% tax. How much did he pay altogether?","correct_answer":"$2247"}',
     array['WP_MULTI_STEP_SEQUENCE','WP_OPERATION_SELECTION'],
     22, 'PERCENT_OP', 2, 'WORD_PROBLEM_SINGLE', true, 'l6-percentage-3'),

    -- SAM-L6-Q30 | l5-percentage-3 | fractions_decimals / 4A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q30', 'fractions_decimals', '4A', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"The pie chart below shows the number of stickers Ben has. a) What percentage of the stickers are green? b) If Ben has 80 stickers, how many of the stickers are green?","correct_answer":"36","image_alt":"A pie chart divided into four sectors labelled Red, Blue, Yellow, and Green showing fractional portions of Ben''s sticker collection; the Green sector percentage is not directly labelled.","image_required":true}',
     array['WP_MULTI_STEP_SEQUENCE','MD_CHART_SCALE','WP_OPERATION_SELECTION'],
     32, 'PERCENT_OP', 3, 'WORD_PROBLEM_MULTI', false, 'l5-percentage-3'),

    -- SAM-L6-Q31 | l6-geometry-1 | geometry / 5A | MULTIPLE_CHOICE | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q31', 'geometry', '5A', 0.8, 'MULTIPLE_CHOICE',
     '{"stem":"AB and CD are straight lines. Find ∠x.","options":["42°","84°","138°","180°"],"correct_index":2,"distractor_misconceptions":{"0":"GE_SHAPE_PROPERTY","1":"GE_SHAPE_PROPERTY","3":"GE_SHAPE_PROPERTY"},"image_alt":"Two intersecting straight lines AB and CD forming angles, with one angle labelled and angle x to be determined.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     8, 'GEOMETRY', 2, 'PICTORIAL', false, 'l6-geometry-1'),

    -- SAM-L6-Q32 | l6-geometry-1 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q32', 'geometry', '5A', 0.5, 'NUMERIC_ENTRY',
     '{"stem":"PQR is a right-angled triangle. Find ∠PRQ.","correct_answer":"59","image_alt":"A right-angled triangle PQR with a right angle at Q, an angle of 31° marked at one vertex, and an unknown angle x at another vertex; find ∠PRQ.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     7, 'GEOMETRY', 2, 'PICTORIAL', false, 'l6-geometry-1'),

    -- SAM-L6-Q33 | l6-geometry-1 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q33', 'geometry', '5A', 0.8, 'NUMERIC_ENTRY',
     '{"stem":"ABC is an isosceles triangle. Find ∠BAC.","correct_answer":"110","image_alt":"A triangle labelled ABC with given angle measurements that allow ∠BAC to be determined using isosceles triangle properties.","image_required":true}',
     array['GE_SHAPE_PROPERTY'],
     7, 'GEOMETRY', 2, 'PICTORIAL', false, 'l6-geometry-1'),

    -- SAM-L6-Q34 | l6-geometry-1 | geometry / 5A | NUMERIC_ENTRY | INACTIVE (image-essential; awaiting curated image)
    ('SAM-L6-Q34', 'geometry', '5A', 1, 'NUMERIC_ENTRY',
     '{"stem":"PQRS is a rhombus. Find ∠PQR.","correct_answer":"106°","image_alt":"A rhombus PQRS with a diagonal drawn, showing interior angles of 35° and 53° at triangle vertices A, B, and C inside the figure.","image_required":true}',
     array['GE_SHAPE_PROPERTY','WP_MULTI_STEP_SEQUENCE'],
     6, 'GEOMETRY', 3, 'PICTORIAL', false, 'l6-geometry-1'),

    -- SAM-L6-Q36 | l6-algebra-2 | operations_algorithms / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q36', 'operations_algorithms', '5A', 0.2, 'NUMERIC_ENTRY',
     '{"stem":"Simplify the algebraic expression 5p + 6 – 3p + 2.","correct_answer":"2p + 8"}',
     array[]::text[],
     11, 'ALGEBRA', 2, 'SYMBOLIC', true, 'l6-algebra-2'),

    -- SAM-L6-Q37 | l6-algebra-2 | operations_algorithms / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q37', 'operations_algorithms', '5A', 0.4, 'NUMERIC_ENTRY',
     '{"stem":"Find the value of 2b – 3 + 7b when b = 4.","correct_answer":"33"}',
     array['WP_MULTI_STEP_SEQUENCE'],
     13, 'ALGEBRA', 3, 'SYMBOLIC', true, 'l6-algebra-2'),

    -- SAM-L6-Q38 | l6-algebra-3 | operations_algorithms / 5A | NUMERIC_ENTRY
    ('SAM-L6-Q38', 'operations_algorithms', '5A', 0.5, 'NUMERIC_ENTRY',
     '{"stem":"Find the value of y if 6y – 17 = 31.","correct_answer":"8"}',
     array['WP_MULTI_STEP_SEQUENCE','OP_SUBTRACTION_DIRECTION'],
     11, 'ALGEBRA', 2, 'SYMBOLIC', true, 'l6-algebra-3')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation,
         is_active, content_key)
on conflict (tenant_id, external_id) do nothing;

-- Reclassify the vision-recovered Level 6 mixed-number / fraction answers
-- to TEXT_ENTRY (mirrors
-- 20260611140000_reclassify_l6_recovered_text_entry.sql). Runs after the
-- new-levels INSERT above on dev reset; idempotent on the NUMERIC_ENTRY guard.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'
from t
where q.tenant_id = t.id
  and q.format = 'NUMERIC_ENTRY'
  and q.external_id in ('SAM-L6-Q09', 'SAM-L6-Q11', 'SAM-L6-Q12');


-- BEGIN l1-overlay (lane/l1-reauthoring — do not hand-edit; pnpm convert:apply-overlay)
-- MIRRORS supabase/migrations/20260613120100_l1_overlay_load.sql (dev/CI path; runs after the
-- generated stage4 block and the reclassify mirrors). Idempotent.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    -- SAM-L1-Q01 | staged-inactive | blocker D
    ('SAM-L1-Q01', 'geometry', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Click on the things that are the same color.","_authoring":{"target_interaction":"select-multiple-MC","blocker_code":"D","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     8, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q02 | staged-inactive | blocker A
    ('SAM-L1-Q02', 'measurement', 'KA', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Click on the bigger animal.","options":["the elephant","the bear"],"correct_index":0,"_authoring":{"target_interaction":"single-MC","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     5, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l1-measurement-1'),

    -- SAM-L1-Q03 | staged-inactive | blocker A
    ('SAM-L1-Q03', 'measurement', 'KA', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Which is longer, the toy car or the toy plane?","options":["the toy car","the toy plane"],"correct_index":1,"_authoring":{"target_interaction":"single-MC","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     9, 'MEASUREMENT', 1, 'PICTORIAL', false, 'l1-measurement-1'),

    -- SAM-L1-Q06 | staged-inactive | blocker A
    ('SAM-L1-Q06', 'geometry', 'KA', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Click on the flower that comes next in the pattern.","options":["option 1","option 2","option 3"],"correct_index":0,"_authoring":{"target_interaction":"click-on-visual","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     9, 'PATTERN', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q07 | staged-inactive | blocker A
    ('SAM-L1-Q07', 'geometry', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Match the pieces to complete the picture.","_authoring":{"target_interaction":"ordering-matching","blocker_code":"A","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     7, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q08 | staged-inactive | blocker E
    ('SAM-L1-Q08', 'geometry', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Look at the picture. (a) The ball is on the ___ . (b) The box is on the ___ shelf. (c) The shoe is on the ___ .","_authoring":{"target_interaction":"multi-blank","blocker_code":"E","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     28, 'IDENTIFY', 3, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q09 | genuinely-inactive | blocker none-oral
    ('SAM-L1-Q09', 'number_sense', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Count aloud from 1 to 10.","_authoring":{"target_interaction":"open-production(inactive)","blocker_code":"none-oral","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     6, 'COUNTING', 1, 'SYMBOLIC', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q11 | staged-inactive | blocker C
    ('SAM-L1-Q11', 'number_sense', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Match each number to its number word.","_authoring":{"target_interaction":"ordering-matching","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE'],
     10, 'IDENTIFY', 1, 'SYMBOLIC', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q13 | staged-inactive | blocker A
    ('SAM-L1-Q13', 'geometry', 'KA', -2, 'NUMERIC_ENTRY',
     '{"stem":"Match each shape to its name: rectangle, circle, square, triangle.","_authoring":{"target_interaction":"ordering-matching","blocker_code":"A","held":true,"requires_format_swap":true}}'::jsonb,
     array['GE_SHAPE_PROPERTY'],
     10, 'GEOMETRY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q14 | staged-inactive | blocker E
    ('SAM-L1-Q14', 'operations_algorithms', 'KA', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"___ apples and ___ apples make 8 apples.","_authoring":{"target_interaction":"multi-blank","blocker_code":"E","held":true,"requires_format_swap":true}}'::jsonb,
     array['NS_COUNTING_ERROR'],
     7, 'ADDITION', 1, 'PICTORIAL', false, 'l1-whole_numbers-2'),

    -- SAM-L1-Q15 | parked | blocker F
    ('SAM-L1-Q15', 'geometry', 'KA', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Match each solid to its name: sphere, cylinder, cube, cone.","_authoring":{"target_interaction":"ordering-matching","blocker_code":"F","held":true,"requires_format_swap":true}}'::jsonb,
     array['GE_SHAPE_PROPERTY'],
     9, 'GEOMETRY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q16 | staged-inactive | blocker A
    ('SAM-L1-Q16', 'geometry', 'KB', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Who is in front of the tree, Louis or Andy?","options":["Louis","Andy"],"correct_index":1,"_authoring":{"target_interaction":"single-MC","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     9, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-geometry-1'),

    -- SAM-L1-Q17 | staged-inactive | blocker A
    ('SAM-L1-Q17', 'number_sense', 'KB', -2, 'DRAG_DROP',
     '{"stem":"The pictures show what Tom does in one day. Put them in order from first to last.","items":["Studying in class","Sleeping","Brushing teeth","Walking to school"],"correct_order":["Brushing teeth","Walking to school","Studying in class","Sleeping"],"_authoring":{"target_interaction":"ordering-matching","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
     array['WP_MULTI_STEP_SEQUENCE'],
     14, 'IDENTIFY', 1, 'WORD_PROBLEM_SINGLE', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q18 | genuinely-inactive | blocker none-oral
    ('SAM-L1-Q18', 'number_sense', 'KB', -2, 'NUMERIC_ENTRY',
     '{"stem":"Count aloud from 1 to 30. Then write the number 8. Which activity took a longer time to finish? Color the box.","_authoring":{"target_interaction":"open-production(inactive)","blocker_code":"none-oral","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     24, 'COUNTING', 1, 'SYMBOLIC', false, 'l1-whole_numbers-1'),

    -- SAM-L1-Q26 | staged-inactive | blocker C
    ('SAM-L1-Q26', 'number_sense', '1A', -1.8, 'NUMERIC_ENTRY',
     '{"stem":"Select 10 candies.","_authoring":{"target_interaction":"select-multiple-MC","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array['NS_COUNTING_ERROR', 'NS_PLACE_VALUE_CONFUSION'],
     6, 'COUNTING', 1, 'PICTORIAL', false, 'l1-whole_numbers-8'),

    -- SAM-L1-Q27 | staged-inactive | blocker C
    ('SAM-L1-Q27', 'number_sense', '1B', -1.2, 'NUMERIC_ENTRY',
     '{"stem":"Match each number to its number word.","_authoring":{"target_interaction":"ordering-matching","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE', 'NS_PLACE_VALUE_CONFUSION'],
     10, 'IDENTIFY', 1, 'SYMBOLIC', false, 'l1-whole_numbers-8')
  ) as v(external_id, strand, level, difficulty, format, content,
         misconception_tags, word_count, operation_type, num_operations,
         representation, is_active, content_key)
on conflict (tenant_id, external_id) do nothing;

-- SAM-L1-Q20: active (single-MC, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE',
    content = '{"stem":"Write greater than or smaller than.\n5 is ___ 7.","options":["greater than","smaller than"],"correct_index":1,"distractor_misconceptions":{"0":"NS_MAGNITUDE_MISJUDGE"}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q20'
  and q.format in ('NUMERIC_ENTRY', 'TEXT_ENTRY');

-- SAM-L1-Q22: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = true,
    content = '{"stem":"Look at the first number bond: 6 and 3 make 9. Now complete the second number bond: 2 and 6 make ___.","correct_answer":"8"}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q22'
  and q.is_active = false;

-- SAM-L1-Q25: deactivated (equation-set, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = false,
    content = q.content || '{"_authoring":{"target_interaction":"equation-set","answer_model":{"rule":"set-equality","allowCommutative":true,"canonical":[{"a":6,"op":"+","b":2,"result":8},{"a":2,"op":"+","b":6,"result":8},{"a":8,"op":"-","b":6,"result":2},{"a":8,"op":"-","b":2,"result":6}]},"blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q25'
  and q.is_active = true;

-- END l1-overlay

-- BEGIN l2-overlay (lane/l2-authoring — do not hand-edit; pnpm convert:apply-l2-overlay)
-- MIRRORS supabase/migrations/20260614130000_l2_overlay_load.sql (dev/CI path; runs after the
-- generated stage4 block, the reclassify mirrors and the l1-overlay block).
-- Idempotent (on conflict do nothing).

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    -- SAM-L2-Q02 | active | blocker none
    ('SAM-L2-Q02', 'geometry', '1A', -1.8, 'MULTIPLE_CHOICE',
     '{"stem":"How many triangles do you see in the picture?","options":["1","5","3","7"],"correct_index":1,"image_path":"q-sam-l2-q02-triangles.png","image_alt":"A figure made up of several triangles.","image_required":true}'::jsonb,
     array[]::text[],
     8, 'GEOMETRY', 1, 'PICTORIAL', true, 'l1-geometry-1'),

    -- SAM-L2-Q03 | active | blocker none
    ('SAM-L2-Q03', 'geometry', '1A', -1.7, 'MULTIPLE_CHOICE',
     '{"stem":"What are the two shapes that make up the figure below?","options":["half circle and square","half circle and triangle","quarter circle and square","quarter circle and triangle"],"correct_index":1,"image_path":"q-sam-l2-q03-composite-shape.png","image_alt":"A two-colour figure made of two simple shapes.","image_required":true}'::jsonb,
     array[]::text[],
     11, 'GEOMETRY', 1, 'PICTORIAL', true, 'l1-geometry-1'),

    -- SAM-L2-Q04 | active | blocker none
    ('SAM-L2-Q04', 'number_sense', '1A', -1.6, 'TEXT_ENTRY',
     '{"stem":"Abel, Beth, Cary, Dave and Ethan are queueing at the bank. Abel is in front of Dave. Beth is behind Dave. Abel is behind Cary. Cary is not first in the queue. Who is first in the queue?","correct_answer":"Ethan"}'::jsonb,
     array[]::text[],
     38, 'IDENTIFY', 1, 'WORD_PROBLEM_SINGLE', true, null),

    -- SAM-L2-Q05 | active | blocker none
    ('SAM-L2-Q05', 'data_statistics', '1A', -1.5, 'NUMERIC_ENTRY',
     '{"stem":"The picture graph below shows the number of seashells collected by four boys. How many more seashells were collected by Mark than by Adam?","correct_answer":"9","image_path":"q-sam-l2-q05-seashell-graph.png","image_alt":"A picture graph of seashells collected by Jimmy, Adam, Tom and Mark.","image_required":true}'::jsonb,
     array[]::text[],
     24, 'SUBTRACTION', 1, 'PICTORIAL', true, 'l1-data_representation-1'),

    -- SAM-L2-Q06 | held | blocker C
    ('SAM-L2-Q06', 'number_sense', '1A', -1.7, 'MULTIPLE_CHOICE',
     '{"stem":"Which picture shows 37?","options":["option 1","option 2","option 3","option 4"],"correct_index":2,"_authoring":{"target_interaction":"image-option-MC (click-on-image)","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array['NS_PLACE_VALUE_CONFUSION'],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, 'l1-whole_numbers-8'),

    -- SAM-L2-Q08 | active | blocker none
    ('SAM-L2-Q08', 'number_sense', '1A', -1.6, 'TEXT_ENTRY',
     '{"stem":"Type 96 in words.","correct_answer":"ninety-six"}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'SYMBOLIC', true, 'l1-whole_numbers-8'),

    -- SAM-L2-Q12 | active | blocker none
    ('SAM-L2-Q12', 'measurement', '1A', -1.4, 'NUMERIC_ENTRY',
     '{"stem":"The picture below shows the length of a toy car. What is the length of the toy car?","correct_answer":"7","image_path":"q-sam-l2-q12-toy-car-ruler.png","image_alt":"A toy car shown above a centimetre ruler.","image_required":true}'::jsonb,
     array[]::text[],
     18, 'MEASUREMENT', 1, 'PICTORIAL', true, 'l1-measurement-1'),

    -- SAM-L2-Q13 | active | blocker none
    ('SAM-L2-Q13', 'operations_algorithms', '1A', -1.3, 'MULTIPLE_CHOICE',
     '{"stem":"3 × 4 is ___.","options":["3 + 3 + 3","4 + 4 + 4","3 + 3 + 3 + 3","4 + 4 + 4 + 4"],"correct_index":1}'::jsonb,
     array[]::text[],
     4, 'MULTIPLICATION', 1, 'SYMBOLIC', true, 'l1-whole_numbers-10'),

    -- SAM-L2-Q15 | active | blocker none
    ('SAM-L2-Q15', 'measurement', '1A', -1.3, 'MULTIPLE_CHOICE',
     '{"stem":"The clock shows the time Joe finished his lunch. At what time did he finish his lunch?","options":["2:45 am","2:55 am","2:45 pm","2:55 pm"],"correct_index":3,"image_path":"q-sam-l2-q15-clock.png","image_alt":"A clock face.","image_required":true}'::jsonb,
     array[]::text[],
     17, 'MEASUREMENT', 1, 'PICTORIAL', true, 'l1-measurement-2'),

    -- SAM-L2-Q16 | active | blocker none
    ('SAM-L2-Q16', 'measurement', '1A', -1.3, 'MULTIPLE_CHOICE',
     '{"stem":"How much money is there?","options":["50¢","70¢","85¢","95¢"],"correct_index":2,"image_path":"q-sam-l2-q16-coins.png","image_alt":"A group of coins.","image_required":true}'::jsonb,
     array[]::text[],
     5, 'MEASUREMENT', 1, 'PICTORIAL', true, 'l1-measurement-3'),

    -- SAM-L2-Q18 | active | blocker none
    ('SAM-L2-Q18', 'number_sense', '2A', -1.3, 'NUMERIC_ENTRY',
     '{"stem":"How many are there?","correct_answer":"204","image_path":"q-sam-l2-q18-base-ten.png","image_alt":"Base-ten place-value blocks (hundreds and ones).","image_required":true}'::jsonb,
     array[]::text[],
     4, 'COUNTING', 1, 'PICTORIAL', true, 'l2-whole_numbers-1')
  ) as v(external_id, strand, level, difficulty, format, content,
         misconception_tags, word_count, operation_type, num_operations,
         representation, is_active, content_key)
on conflict (tenant_id, external_id) do nothing;

-- END l2-overlay

-- BEGIN l1-art-activation (mirror of supabase/migrations/20260614120001_l1_art_wire_activate.sql)
-- Wires curated per-question images onto the 5 image-essential L1 rows and
-- activates them; drops two dead stem placeholders ([object], [image]) now
-- that each row has its image. SAM-L1-Q22 intentionally untouched (already
-- activated as a text item by the l1-overlay block above). See the migration
-- header for the full no-silent-edits before/after table.

-- 1) Wire image_path + activate the 5 image-essential rows.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = true,
    content = q.content || jsonb_build_object('image_path', v.image_path)
from t,
  (values
    ('SAM-L1-Q04', 'l1/sam-l1-q04.png'),
    ('SAM-L1-Q05', 'l1/sam-l1-q05.png'),
    ('SAM-L1-Q10', 'l1/sam-l1-q10.png'),
    ('SAM-L1-Q12', 'l1/sam-l1-q12.png'),
    ('SAM-L1-Q19', 'l1/sam-l1-q19.png')
  ) as v(external_id, image_path)
where q.tenant_id = t.id
  and q.external_id = v.external_id
  and q.is_active = false;

-- 2) SAM-L1-Q05 — drop the dead "[object]" placeholder from the stem.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content, '{stem}',
      to_jsonb(('Group A    Group B' || E'\n' ||
               'In which group does it belong?' || E'\n' ||
               'Answer: Group ___')::text)
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q05'
  and q.content->>'stem' like '%[object]%';

-- 3) SAM-L1-Q12 — drop the dead "[image]" placeholders.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content, '{stem}',
      to_jsonb('Which set has more? Answer: Set ___'::text)
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q12'
  and q.content->>'stem' like '%[image]%';
-- END l1-art-activation

-- BEGIN l0-overlay (lane/l0-authoring — do not hand-edit; pnpm convert:apply-l0-overlay)
-- MIRRORS supabase/migrations/20260616120100_l0_overlay_load.sql (dev/CI path; runs after the
-- generated stage4 block, the reclassify mirrors, the full-library L0 inserts
-- (20260611134158) and the l1/l2-overlay blocks). Idempotent.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, short_test_eligible, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active, v.short_test_eligible,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    -- SAM-L0A-Q01 | inactive | blocker none-manual
    ('SAM-L0A-Q01', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Help the rabbit get to the carrots. Draw a line from the rabbit to the carrots.","_authoring":{"target_interaction":"click-image-single","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     14, 'IDENTIFY', 1, 'PICTORIAL', false, false, 'l0a-geometry-1'),

    -- SAM-L0A-Q02 | inactive | blocker none-manual
    ('SAM-L0A-Q02', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Help the bee get to the flower. Draw a line from the bee to the flower.","_authoring":{"target_interaction":"click-image-single","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     14, 'IDENTIFY', 1, 'PICTORIAL', false, false, 'l0a-geometry-1'),

    -- SAM-L0A-Q03 | held | blocker C
    ('SAM-L0A-Q03', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the big bowl.","image_alt":"Two bowls of different sizes shown side by side.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q05 | held | blocker C
    ('SAM-L0A-Q05', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the thick book.","image_alt":"Two books of different thicknesses shown side by side.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q06 | held | blocker C
    ('SAM-L0A-Q06', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the long branch.","image_alt":"Two tree branches of different lengths shown side by side.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q07 | held | blocker C
    ('SAM-L0A-Q07', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the tall animal.","image_alt":"Two animals of different heights shown side by side.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q09 | held | blocker C
    ('SAM-L0A-Q09', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Draw an X to where you should put the pencil.","image_alt":"Two boxes, one holding short pencils and one holding long pencils.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     10, 'IDENTIFY', 1, 'PICTORIAL', false, false, null),

    -- SAM-L0A-Q10 | held | blocker C
    ('SAM-L0A-Q10', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the taller door.","image_alt":"Two doors of different heights shown side by side.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q12 | held | blocker C
    ('SAM-L0A-Q12', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Match each tail to the correct animal.","image_alt":"A column of animals and a column of tails to be matched.","_authoring":{"target_interaction":"visual-matching","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     7, 'GEOMETRY', 1, 'PICTORIAL', false, false, 'l0a-geometry-2'),

    -- SAM-L0A-Q13 | held | blocker C
    ('SAM-L0A-Q13', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the bird facing left.","image_alt":"Two birds facing different directions.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     5, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q14 | held | blocker C
    ('SAM-L0A-Q14', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the bird that is flying up.","image_alt":"Two birds in flight in different directions.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     7, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q15 | held | blocker C
    ('SAM-L0A-Q15', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the bowl on the bottom shelf.","image_alt":"A set of shelves with a bowl on each shelf.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     7, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0A-Q16 | inactive | blocker none-manual
    ('SAM-L0A-Q16', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Draw a sweet outside the bowl.","image_alt":"A bowl with space around it.","_authoring":{"target_interaction":"click-image-single","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     6, 'IDENTIFY', 1, 'PICTORIAL', false, false, null),

    -- SAM-L0A-Q18 | inactive | blocker none-oral
    ('SAM-L0A-Q18', 'geometry', '0A', -2.5, 'MULTIPLE_CHOICE',
     '{"stem":"Say the name of each shape.","_authoring":{"target_interaction":"click-image-single","blocker_code":"none-oral","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     6, 'GEOMETRY', 1, 'SYMBOLIC', false, false, 'l0a-geometry-3'),

    -- SAM-L0B-Q01 | inactive_manual | blocker C
    ('SAM-L0B-Q01', 'number_sense', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Look at the two pictures below. Circle 3 objects in Picture B that are not the same as the ones in Picture A.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image-multi","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     21, 'IDENTIFY', 1, 'PICTORIAL', false, false, null),

    -- SAM-L0B-Q03 | held_C | blocker C
    ('SAM-L0B-Q03', 'number_sense', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the part that is missing from the cake.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     9, 'IDENTIFY', 1, 'PICTORIAL', false, true, 'l0a-geometry-2'),

    -- SAM-L0B-Q04 | held_C | blocker C
    ('SAM-L0B-Q04', 'number_sense', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Start at X. Go right, up, left and down. Where are you? Tap the correct box below.","options":["School","Bakery","Playground","Home"],"correct_index":1,"_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     18, 'IDENTIFY', 1, 'PICTORIAL', false, true, null),

    -- SAM-L0B-Q06 | held_C | blocker C
    ('SAM-L0B-Q06', 'number_sense', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the numbers greater than 6.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"select-multiple","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     6, 'PATTERN', 1, 'PICTORIAL', false, true, 'l0a-whole_numbers-1'),

    -- SAM-L0B-Q10 | active | blocker none
    ('SAM-L0B-Q10', 'operations_algorithms', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"There are 3 fish in a bowl and 5 fish in a tank. How many fish are there altogether? Tap your answer.","options":["3","6","8"],"correct_index":2}'::jsonb,
     array[]::text[],
     22, 'ADDITION', 1, 'WORD_PROBLEM_SINGLE', true, true, 'l0a-whole_numbers-3'),

    -- SAM-L0B-Q11 | active | blocker none
    ('SAM-L0B-Q11', 'operations_algorithms', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Mary put 7 items in a basket. She took out 3 items. How many items were left in the basket? Tap your answer.","options":["4","2","6"],"correct_index":0}'::jsonb,
     array[]::text[],
     24, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE', true, true, 'l0a-whole_numbers-3'),

    -- SAM-L0B-Q12 | held_C | blocker C
    ('SAM-L0B-Q12', 'number_sense', '0A', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Count on from 7. Help the bee find its way to its hive. Tap each number as you count.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image-multi","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     18, 'PATTERN', 1, 'PICTORIAL', false, false, 'l0a-whole_numbers-1'),

    -- SAM-L0B-Q13 | held_C | blocker C
    ('SAM-L0B-Q13', 'geometry', '0B', -2.1, 'MULTIPLE_CHOICE',
     '{"stem":"Color the animal in front of the mushrooms. Cross out the animal behind the mushrooms.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     14, 'IDENTIFY', 1, 'PICTORIAL', false, false, 'l0b-geometry-1'),

    -- SAM-L0C-Q01 | held | blocker C
    ('SAM-L0C-Q01', 'number_sense', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Match the birds to their positions.","options":["1st","2nd","3rd","4th","5th"],"correct_index":0,"_authoring":{"target_interaction":"visual-matching","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     5, 'IDENTIFY', 1, 'PICTORIAL', false, false, 'l0b-whole_numbers-4'),

    -- SAM-L0C-Q02 | held | blocker none-manual
    ('SAM-L0C-Q02', 'number_sense', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Show numbers that make 9. Color some leaves green. Color the rest red. Write the numbers in the number bond.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"manual","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     19, 'IDENTIFY', 1, 'PICTORIAL', false, false, 'l0b-whole_numbers-2'),

    -- SAM-L0C-Q04 | held | blocker C
    ('SAM-L0C-Q04', 'number_sense', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Complete the fact family.","options":["6","3","9"],"correct_index":2,"_authoring":{"target_interaction":"equation-set","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     4, 'ADDITION', 1, 'SYMBOLIC', false, true, 'l0b-whole_numbers-3'),

    -- SAM-L0C-Q06 | held | blocker C
    ('SAM-L0C-Q06', 'number_sense', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Look at the color pattern below. Color the squares to complete the pattern.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     12, 'PATTERN', 1, 'PICTORIAL', false, false, 'l0b-geometry-4'),

    -- SAM-L0C-Q07 | held | blocker none-manual
    ('SAM-L0C-Q07', 'geometry', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Draw a shape in each box. Shape with 4 sides / Shape with no sides / Shape with 3 sides.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"manual","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
     array[]::text[],
     18, 'GEOMETRY', 1, 'PICTORIAL', false, false, 'l0b-geometry-2'),

    -- SAM-L0C-Q12 | held | blocker C
    ('SAM-L0C-Q12', 'geometry', '0B', -2, 'MULTIPLE_CHOICE',
     '{"stem":"Tap the objects that look like a cube in the picture below.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image-multi","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
     array[]::text[],
     11, 'GEOMETRY', 1, 'PICTORIAL', false, false, 'l0b-geometry-3')
  ) as v(external_id, strand, level, difficulty, format, content,
         misconception_tags, word_count, operation_type, num_operations,
         representation, is_active, short_test_eligible, content_key)
on conflict (tenant_id, external_id) do nothing;

-- SAM-L0A-Q04: inactive (click-image-single, blocker none-manual)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Color the shapes red. Color the shapes blue. Color the shapes green.","_authoring":{"target_interaction":"click-image-single","blocker_code":"none-manual","held":true,"requires_format_swap":false}}'::jsonb,
    short_test_eligible = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q04';

-- SAM-L0A-Q08: held (click-image-single, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Tap the object that is the same as the one in the box.","image_alt":"An object shown inside a box, with several objects to choose from below.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q08';

-- SAM-L0A-Q11: held (click-image-single, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Look at the pattern below. Tap what comes next.","image_alt":"A repeating pattern of flowers with the last item missing, and flower choices to tap.","_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q11';

-- SAM-L0A-Q17: held (single-MC, blocker A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Count the balloons. Tap the number.","options":["6","5","2"],"correct_index":1,"image_alt":"A group of balloons.","_authoring":{"target_interaction":"single-MC","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q17';

-- SAM-L0B-Q02: held_C (click-image-single, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Tap the object that comes next in the pattern below.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"click-image-single","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q02';

-- SAM-L0B-Q05: held_C (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Count back from 10. Write the missing numbers.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q05';

-- SAM-L0B-Q07: held_A (single-MC, blocker A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"How are the shapes sorted?","options":["color","size"],"correct_index":0,"image_alt":"Two boxes, each holding a group of shapes.","_authoring":{"target_interaction":"single-MC","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q07';

-- SAM-L0B-Q08: held_C (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Read. Write the missing numbers. I have ___ toy cars. I have ___ big toy car and ___ small toy cars.","options":["option 1","option 2","option 3","option 4"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q08';

-- SAM-L0B-Q09: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0A'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = true,
    content = '{"stem":"There are 8 candy. There are 5 candy in the bag. How many candy go in the jar?","correct_answer":"3"}'::jsonb,
    short_test_eligible = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q09';

-- SAM-L0B-Q14: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = true,
    content = '{"stem":"There are 4 pieces of sushi on a tray. There are 6 pieces of sushi in a box. How many pieces of sushi are there altogether? Fill in the blanks. 4 + 6 = ___ There are ___ pieces of sushi altogether.","correct_answer":"10"}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q14';

-- SAM-L0B-Q15: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = true,
    content = '{"stem":"Diana baked 10 cookies. Paul ate 7 cookies. How many cookies are left? Fill in the blanks. 10 - 7 = ___ There are ___ cookies left.","correct_answer":"3"}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q15';

-- SAM-L0C-Q03: held (select-multiple, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Tap the boxes that make 10.","options":["5 + 5","3 + 7","2 + 8","2 + 2","1 + 9","3 + 5","9 + 2","6 + 4"],"correct_index":0,"_authoring":{"target_interaction":"select-multiple","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q03';

-- SAM-L0C-Q05: held (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Write numbers: 1 = smallest, 2 = bigger, 3 = biggest in the correct blanks.","options":["smallest","bigger","biggest"],"correct_index":1,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q05';

-- SAM-L0C-Q08: held (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Skip count by 2s. Fill in the missing numbers.","options":["4","8","16","20"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q08';

-- SAM-L0C-Q09: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = true,
    content = '{"stem":"There are 14 blue beads and 5 green beads on Sally''s necklace. How many beads are there altogether? 14 + 5 = ___. There are ___ beads altogether.","correct_answer":"19"}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q09';

-- SAM-L0C-Q10: active (numeric-single, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = true,
    content = '{"stem":"There are 18 birds. 6 of the birds are blue. How many birds are yellow? Fill in the blanks. 18 - 6 = ___ There are ___ yellow birds.","correct_answer":"12"}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q10';

-- SAM-L0C-Q11: held (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Look at the number line. Tap on the answers. 31 comes ___ 30. 31 is ___ than 30. 33 comes ___ 36. 33 is ___ than 36.","options":["after","greater","before","smaller"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q11';

-- SAM-L0C-Q13: active (single-MC, blocker none)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0B'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = true,
    content = '{"stem":"Read aloud the days of the week from Monday. A part of the page is torn. What is the missing day? Tap your answer.","options":["Friday","Fryday","Thursday","Saturday"],"correct_index":0}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q13';

-- SAM-L0C-Q14: held (numeric-single, blocker A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0C'::half_grade_level,
    format = 'NUMERIC_ENTRY'::question_format,
    is_active = false,
    content = '{"stem":"How many pairs of the same bikes are there? Write the number.","correct_answer":"4","image_alt":"A picture showing several motorcycles in different colors.","_authoring":{"target_interaction":"numeric-single","blocker_code":"A","held":true,"requires_format_swap":false}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q14';

-- SAM-L0C-Q15: held (select-multiple, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0C'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Tap the circles with odd numbers.","options":["1","10","26","5","12","24","35","41","40"],"correct_index":0,"_authoring":{"target_interaction":"select-multiple","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q15';

-- SAM-L0C-Q16: held (multi-blank, blocker C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '0C'::half_grade_level,
    format = 'MULTIPLE_CHOICE'::question_format,
    is_active = false,
    content = '{"stem":"Break apart 32. Fill in the boxes.","options":["30","2"],"correct_index":0,"_authoring":{"target_interaction":"multi-blank","blocker_code":"C","held":true,"requires_format_swap":true}}'::jsonb,
    short_test_eligible = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q16';

-- END l0-overlay

-- BEGIN l0-l2-activation (lane/l0-l2-activation — do not hand-edit; pnpm convert:apply-activation)
-- MIRRORS supabase/migrations/20260617120000_l0_l2_activation.sql (dev/CI path). Idempotent.

-- SAM-L0A-Q08 → CLICK_IMAGE_SINGLE (level 0A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the object that is the same as the one in the box.","image_path":"l0/sam-l0a-q08-stimulus.png","image_alt":"The object shown inside the box.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q08-t1.png","image_alt":"First object choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q08-t2.png","image_alt":"Second object choice."},{"id":"t3","label":"Picture 3","image_path":"l0/sam-l0a-q08-t3.png","image_alt":"Third object choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t3"}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q08'
  and q.is_active = false;

-- SAM-L0A-Q11 → CLICK_IMAGE_SINGLE (level 0A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Look at the pattern below. Tap what comes next.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0a-q11-t1.png","image_alt":"First flower choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0a-q11-t2.png","image_alt":"Second flower choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0A-Q11'
  and q.is_active = false;

-- SAM-L0B-Q02 → CLICK_IMAGE_SINGLE (level 0B)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Tap the object that comes next in the pattern below.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l0/sam-l0b-q02-t1.png","image_alt":"First object choice."},{"id":"t2","label":"Picture 2","image_path":"l0/sam-l0b-q02-t2.png","image_alt":"Second object choice."},{"id":"t3","label":"Picture 3","image_path":"l0/sam-l0b-q02-t3.png","image_alt":"Third object choice."},{"id":"t4","label":"Picture 4","image_path":"l0/sam-l0b-q02-t4.png","image_alt":"Fourth object choice."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t4"}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q02'
  and q.is_active = false;

-- SAM-L0B-Q07 → MULTIPLE_CHOICE (level 0A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = '{"stem":"How are the shapes sorted?","options":["color","size"],"correct_index":0,"image_path":"l0/sam-l0b-q07.png","image_alt":"Two boxes, each holding a group of shapes."}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q07'
  and q.is_active = false;

-- SAM-L0C-Q03 → SELECT_MULTIPLE (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'SELECT_MULTIPLE'::question_format,
    content = '{"stem":"Tap the boxes that make 10.","select_rule":"all","options":[{"id":"o1","label":"5 + 5"},{"id":"o2","label":"3 + 7"},{"id":"o3","label":"2 + 8"},{"id":"o4","label":"2 + 2"},{"id":"o5","label":"1 + 9"},{"id":"o6","label":"3 + 5"},{"id":"o7","label":"9 + 2"},{"id":"o8","label":"6 + 4"}],"correct":["o1","o2","o3","o5","o8"]}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q03'
  and q.is_active = false;

-- SAM-L0C-Q04 → EQUATION_SET (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'EQUATION_SET'::question_format,
    content = '{"stem":"Complete the fact family.","rows":4,"answer_rule":"set-equality","canonical":[{"a":6,"op":"+","b":3,"result":9},{"a":3,"op":"+","b":6,"result":9},{"a":9,"op":"-","b":3,"result":6},{"a":9,"op":"-","b":6,"result":3}],"allowCommutative":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q04'
  and q.is_active = false;

-- SAM-L0C-Q08 → MULTI_BLANK (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"Skip count by 2s. Fill in the missing numbers.","tokens":[{"t":"text","value":"2,"},{"t":"blank","id":"b1"},{"t":"text","value":", 6,"},{"t":"blank","id":"b2"},{"t":"text","value":", 10, 12, 14,"},{"t":"blank","id":"b3"},{"t":"text","value":", 18,"},{"t":"blank","id":"b4"}],"blanks":{"b1":{"value":"4","numeric":true},"b2":{"value":"8","numeric":true},"b3":{"value":"16","numeric":true},"b4":{"value":"20","numeric":true}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q08'
  and q.is_active = false;

-- SAM-L0C-Q11 → MULTI_BLANK (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"Look at the number line. Tap on the answers.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","tokens":[{"t":"text","value":"31 comes"},{"t":"blank","id":"b1"},{"t":"text","value":"30. 31 is"},{"t":"blank","id":"b2"},{"t":"text","value":"than 30. 33 comes"},{"t":"blank","id":"b3"},{"t":"text","value":"36. 33 is"},{"t":"blank","id":"b4"},{"t":"text","value":"than 36."}],"blanks":{"b1":{"value":"after","numeric":false},"b2":{"value":"greater","numeric":false},"b3":{"value":"before","numeric":false},"b4":{"value":"smaller","numeric":false}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q11'
  and q.is_active = false;

-- SAM-L0C-Q14 → NUMERIC_ENTRY (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'NUMERIC_ENTRY'::question_format,
    content = '{"stem":"How many pairs of the same bikes are there? Write the number.","correct_answer":"4","image_path":"l0/sam-l0c-q14.png","image_alt":"A picture showing several motorcycles in different colors.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q14'
  and q.is_active = false;

-- SAM-L0C-Q16 → MULTI_BLANK (level 0C)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"Break apart 32. Fill in the boxes.","tokens":[{"t":"text","value":"32 ="},{"t":"blank","id":"b1"},{"t":"text","value":"+"},{"t":"blank","id":"b2"}],"blanks":{"b1":{"value":"30","numeric":true},"b2":{"value":"2","numeric":true}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q16'
  and q.is_active = false;

-- SAM-L1-Q02 → MULTIPLE_CHOICE (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = '{"stem":"Click on the bigger animal.","options":["the elephant","the bear"],"correct_index":0,"image_path":"l1/sam-l1-q02.png","image_alt":"Two animals shown side by side for a size comparison.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q02'
  and q.is_active = false;

-- SAM-L1-Q03 → MULTIPLE_CHOICE (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = '{"stem":"Which is longer, the toy car or the toy plane?","options":["the toy car","the toy plane"],"correct_index":1,"image_path":"l1/sam-l1-q03.png","image_alt":"A toy and another toy shown for a length comparison.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q03'
  and q.is_active = false;

-- SAM-L1-Q11 → VISUAL_MATCHING (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'VISUAL_MATCHING'::question_format,
    content = '{"stem":"Match each number to its number word.","left":[{"id":"n1","label":"1"},{"id":"n2","label":"2"},{"id":"n3","label":"3"},{"id":"n4","label":"4"},{"id":"n5","label":"5"},{"id":"n6","label":"6"},{"id":"n7","label":"7"},{"id":"n8","label":"8"},{"id":"n9","label":"9"},{"id":"n10","label":"10"}],"right":[{"id":"w1","label":"one"},{"id":"w2","label":"two"},{"id":"w3","label":"three"},{"id":"w4","label":"four"},{"id":"w5","label":"five"},{"id":"w6","label":"six"},{"id":"w7","label":"seven"},{"id":"w8","label":"eight"},{"id":"w9","label":"nine"},{"id":"w10","label":"ten"}],"pairs":{"n1":"w1","n2":"w2","n3":"w3","n4":"w4","n5":"w5","n6":"w6","n7":"w7","n8":"w8","n9":"w9","n10":"w10"}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q11'
  and q.is_active = false;

-- SAM-L1-Q13 → VISUAL_MATCHING (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'VISUAL_MATCHING'::question_format,
    content = '{"stem":"Match each shape to its name: rectangle, circle, square, triangle.","left":[{"id":"sl1","label":"Shape 1","image_path":"l1/sam-l1-q13-circle.png","image_alt":"A coloured 2D shape."},{"id":"sl2","label":"Shape 2","image_path":"l1/sam-l1-q13-rectangle.png","image_alt":"A coloured 2D shape."},{"id":"sl3","label":"Shape 3","image_path":"l1/sam-l1-q13-square.png","image_alt":"A coloured 2D shape."},{"id":"sl4","label":"Shape 4","image_path":"l1/sam-l1-q13-triangle.png","image_alt":"A coloured 2D shape."}],"right":[{"id":"nr1","label":"circle"},{"id":"nr2","label":"rectangle"},{"id":"nr3","label":"square"},{"id":"nr4","label":"triangle"}],"pairs":{"sl1":"nr1","sl2":"nr2","sl3":"nr3","sl4":"nr4"}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q13'
  and q.is_active = false;

-- SAM-L1-Q14 → MULTI_BLANK (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"___ apples and ___ apples make 8 apples.","tokens":[{"t":"blank","id":"b1"},{"t":"text","value":" apples and "},{"t":"blank","id":"b2"},{"t":"text","value":" apples make 8 apples."}],"blanks":{"b1":{"value":"5","numeric":true},"b2":{"value":"3","numeric":true}},"image_path":"l1/sam-l1-q14.png","image_alt":"Two boxes, each holding some apples.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q14'
  and q.is_active = false;

-- SAM-L1-Q15 → VISUAL_MATCHING (level KA)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'VISUAL_MATCHING'::question_format,
    content = '{"stem":"Match each solid to its name: sphere, cylinder, cube, cone.","left":[{"id":"sl1","label":"Solid 1","image_path":"l1/sam-l1-q15-sphere.png","image_alt":"A coloured 3D solid."},{"id":"sl2","label":"Solid 2","image_path":"l1/sam-l1-q15-cylinder.png","image_alt":"A coloured 3D solid."},{"id":"sl3","label":"Solid 3","image_path":"l1/sam-l1-q15-cube.png","image_alt":"A coloured 3D solid."},{"id":"sl4","label":"Solid 4","image_path":"l1/sam-l1-q15-cone.png","image_alt":"A coloured 3D solid."}],"right":[{"id":"nr1","label":"sphere"},{"id":"nr2","label":"cylinder"},{"id":"nr3","label":"cube"},{"id":"nr4","label":"cone"}],"pairs":{"sl1":"nr1","sl2":"nr2","sl3":"nr3","sl4":"nr4"}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q15'
  and q.is_active = false;

-- SAM-L1-Q16 → MULTIPLE_CHOICE (level KB)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTIPLE_CHOICE'::question_format,
    content = '{"stem":"Who is in front of the tree, Louis or Andy?","options":["Louis","Andy"],"correct_index":1,"image_path":"l1/sam-l1-q16.png","image_alt":"A scene with a tree and two children standing in it.","image_required":true}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q16'
  and q.is_active = false;

-- SAM-L1-Q17 → IMAGE_ORDERING (level KB)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'IMAGE_ORDERING'::question_format,
    content = '{"stem":"The pictures show what Tom does in one day. Put them in order from first to last.","tiles":[{"id":"t1","label":"Picture 1","image_path":"l1/sam-l1-q17-brushing-teeth.png","image_alt":"A picture of part of a child''s day."},{"id":"t2","label":"Picture 2","image_path":"l1/sam-l1-q17-walking-to-school.png","image_alt":"A picture of part of a child''s day."},{"id":"t3","label":"Picture 3","image_path":"l1/sam-l1-q17-studying.png","image_alt":"A picture of part of a child''s day."},{"id":"t4","label":"Picture 4","image_path":"l1/sam-l1-q17-sleeping.png","image_alt":"A picture of part of a child''s day."}],"_authoring":{"answer_model":{"rule":"order-equality","order":["t1","t2","t3","t4"]}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q17'
  and q.is_active = false;

-- SAM-L1-Q27 → VISUAL_MATCHING (level 1B)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'VISUAL_MATCHING'::question_format,
    content = '{"stem":"Match each number to its number word.","left":[{"id":"n11","label":"11"},{"id":"n12","label":"12"},{"id":"n13","label":"13"},{"id":"n20","label":"20"}],"right":[{"id":"w11","label":"eleven"},{"id":"w12","label":"twelve"},{"id":"w13","label":"thirteen"},{"id":"w20","label":"twenty"}],"pairs":{"n11":"w11","n12":"w12","n13":"w13","n20":"w20"}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q27'
  and q.is_active = false;

-- SAM-L2-Q06 → CLICK_IMAGE_SINGLE (level 1A)
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Which picture shows 37?","tiles":[{"id":"t1","label":"Picture 1","image_path":"l2/sam-l2-q06-opt1.png","image_alt":"Base-ten blocks: loose ones only."},{"id":"t2","label":"Picture 2","image_path":"l2/sam-l2-q06-opt2.png","image_alt":"Base-ten blocks: several ten-rods."},{"id":"t3","label":"Picture 3","image_path":"l2/sam-l2-q06-opt3.png","image_alt":"Base-ten blocks: some ten-rods and some loose ones."},{"id":"t4","label":"Picture 4","image_path":"l2/sam-l2-q06-opt4.png","image_alt":"Base-ten blocks: some ten-rods and some loose ones."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t3"}}}'::jsonb,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L2-Q06'
  and q.is_active = false;

-- END l0-l2-activation

-- =============================================================================
-- Young-band content fix B (Item 1) — SAM-L0B-Q14 sushi -> NUMERIC_ENTRY + stimulus image
-- MIRRORS supabase/migrations/20260618130000_fix_l0b_q14_sushi_numeric_image.sql.
-- Source-verified (0B-14.png = composite tray-of-4 + box-of-6); single blank = 10.
-- Non-destructive: targets external_id = 'SAM-L0B-Q14' only. Idempotent.
-- =============================================================================
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'NUMERIC_ENTRY'::question_format,
    content = '{"stem":"There are 4 pieces of sushi on a tray. There are 6 pieces of sushi in a box. How many pieces of sushi are there altogether? 4 + 6 = ___","correct_answer":"10","image_path":"l0/sam-l0b-q14.png","image_alt":"A tray of sushi and a box of sushi.","image_required":true}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0B-Q14';

-- =============================================================================
-- Young-band content fix C — SAM-L0C-Q13 days-of-week -> CLICK_IMAGE_SINGLE
-- MIRRORS supabase/migrations/20260618130200_fix_l0c_q13_days_clickimage.sql.
-- Non-destructive: targets external_id = 'SAM-L0C-Q13' only. Idempotent.
-- =============================================================================
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'CLICK_IMAGE_SINGLE'::question_format,
    content = '{"stem":"Read the days of the week from Monday. One day is torn off: Monday, Tuesday, Wednesday, Thursday, ___, Saturday, Sunday. Tap the correctly spelled missing day.","tiles":[{"id":"t1","label":"Thursday","image_path":"l0/sam-l0c-q13-t1.png","image_alt":"The word Thursday."},{"id":"t2","label":"Friday","image_path":"l0/sam-l0c-q13-t2.png","image_alt":"The word Friday."},{"id":"t3","label":"Saturday","image_path":"l0/sam-l0c-q13-t3.png","image_alt":"The word Saturday."},{"id":"t4","label":"Fryday","image_path":"l0/sam-l0c-q13-t4.png","image_alt":"The word Fryday."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"t2"}}}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q13';

-- =============================================================================
-- Young-band content fix — SAM-L0C-Q11: retire original row, replaced by Q11A..D
-- MIRRORS migrations 20260618130300 (retire) + 20260618130400 (insert Q11A..D).
-- ATLAS-confirmed path: 4 wired CLICK_IMAGE_SINGLE single-selects share the
-- number-line stimulus. Non-destructive: touches only SAM-L0C-Q11 lineage rows.
-- =============================================================================
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q11';

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags,
   word_count, operation_type, num_operations, representation,
   is_active, short_test_eligible, content_id)
select t.id, v.external_id, v.strand::strand, v.level::half_grade_level,
       v.difficulty, v.format::question_format,
       v.content::jsonb, v.misconception_tags,
       v.word_count, v.operation_type::operation_type, v.num_operations,
       v.representation::representation_kind,
       v.is_active, v.short_test_eligible,
       (select tc.id from tax_content tc
          where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    ('SAM-L0C-Q11A', 'number_sense', '0B', -1.8, 'CLICK_IMAGE_SINGLE',
     '{"stem":"Look at the number line. 31 comes ___ 30.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","tiles":[{"id":"after","label":"After","image_path":"l0/sam-l0c-q11-after.png","image_alt":"The word After."},{"id":"before","label":"Before","image_path":"l0/sam-l0c-q11-before.png","image_alt":"The word Before."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"after"}}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE']::text[],
     9, 'IDENTIFY', 1, 'PICTORIAL', true, true, 'l0b-whole_numbers-1'),
    ('SAM-L0C-Q11B', 'number_sense', '0B', -1.8, 'CLICK_IMAGE_SINGLE',
     '{"stem":"Look at the number line. 31 is ___ than 30.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","tiles":[{"id":"greater","label":"Greater","image_path":"l0/sam-l0c-q11-greater.png","image_alt":"The word Greater."},{"id":"smaller","label":"Smaller","image_path":"l0/sam-l0c-q11-smaller.png","image_alt":"The word Smaller."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"greater"}}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE']::text[],
     10, 'IDENTIFY', 1, 'PICTORIAL', true, true, 'l0b-whole_numbers-1'),
    ('SAM-L0C-Q11C', 'number_sense', '0B', -1.8, 'CLICK_IMAGE_SINGLE',
     '{"stem":"Look at the number line. 33 comes ___ 36.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","tiles":[{"id":"before","label":"Before","image_path":"l0/sam-l0c-q11-before.png","image_alt":"The word Before."},{"id":"after","label":"After","image_path":"l0/sam-l0c-q11-after.png","image_alt":"The word After."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"before"}}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE']::text[],
     9, 'IDENTIFY', 1, 'PICTORIAL', true, true, 'l0b-whole_numbers-1'),
    ('SAM-L0C-Q11D', 'number_sense', '0B', -1.8, 'CLICK_IMAGE_SINGLE',
     '{"stem":"Look at the number line. 33 is ___ than 36.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","tiles":[{"id":"smaller","label":"Smaller","image_path":"l0/sam-l0c-q11-smaller.png","image_alt":"The word Smaller."},{"id":"greater","label":"Greater","image_path":"l0/sam-l0c-q11-greater.png","image_alt":"The word Greater."}],"_authoring":{"answer_model":{"rule":"select-one","correct":"smaller"}}}'::jsonb,
     array['NS_MAGNITUDE_MISJUDGE']::text[],
     10, 'IDENTIFY', 1, 'PICTORIAL', true, true, 'l0b-whole_numbers-1')
  ) as v(external_id, strand, level, difficulty, format, content,
         misconception_tags, word_count, operation_type, num_operations,
         representation, is_active, short_test_eligible, content_key)
on conflict (tenant_id, external_id) do nothing;

-- =============================================================================
-- L3+ source-vs-authored audit fixes (2026-06-19, lane/audit-L3plus)
-- MIRRORS supabase/migrations/20260619060000_audit_L3plus_fixes.sql.
-- Source-verified against the Stage-1 page renders (Level 5/6 worksheet +
-- answer-key page-*.png). Only CLEAR-CUT discrepancies are fixed; every UPDATE
-- carries an idempotent guard on the old (buggy) value. BLOCKED (founder-
-- verified rows that contradict the now-available source, flagged for review,
-- NOT touched here): SAM-L3-Q15, SAM-L4-Q18. Full table in
-- scripts/conversion/audit/L3plus-audit.md.
-- =============================================================================

-- 1) SAM-L5-Q09 — stem fractions disagree with source page 6 (stored
--    "1 1/4 ... 1 1/6"; source "1 3/4 ... 1 5/6"). Stored answer "5 1/12"
--    already matches the source key and is only correct for the source
--    fractions, so fix the stem and keep the answer. Guarded on the old stem.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{stem}',
      to_jsonb('Patricia used 1¹⁄₂ kg of sugar, 1³⁄₄ kg of flour and 1⁵⁄₆ kg of butter to make a cake. What was the total mass of ingredients used?'::text))
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L5-Q09'
  and q.content ->> 'stem' = 'Patricia used 1¹⁄₂ kg of sugar, 1¹⁄₄ kg of flour and 1¹⁄₆ kg of butter to make a cake. What was the total mass of ingredients used?';

-- 2) SAM-L6-Q07 — restore verbatim source option text (page 6): option[0]
--    "4 ÷ 10" had a flipped operator (source "4 × 10"); option[2] "10/4" was
--    reworded (source "1/4 of 10"). correct_index 0 unchanged. Guarded on the
--    old options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["4 × 10","10 ÷ 4","1/4 of 10","10 × 1/4"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L6-Q07'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["4 ÷ 10","10 ÷ 4","10/4","10 × 1/4"]'::jsonb;

-- 3) SAM-L6-Q20 — stored options ["1 2/25","1 4/50","1 8/100","1 2/25"] were
--    garbled/duplicated and correct_index 2 pointed at the WRONG unsimplified
--    "1 8/100". Restore verbatim source options (page 14): ["108/100","1 4/50",
--    "1 2/25","1 4/5"]; correct_index 2 now correctly selects "1 2/25" (key (3)).
--    Guarded on the old options array.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content,
      '{options}',
      '["108/100","1 4/50","1 2/25","1 4/5"]'::jsonb)
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L6-Q20'
  and q.format = 'MULTIPLE_CHOICE'
  and q.content -> 'options' = '["1 2/25","1 4/50","1 8/100","1 2/25"]'::jsonb;

-- BEGIN l2-q17-metadata-fix (lane/l2-q17-metadata-fix)
-- MIRRORS supabase/migrations/20260619090000_fix_l2_q17_metadata.sql (dev/CI path).
-- Corrects the single live SAM-L2-Q17 row to the source key: level 1B (Level-1
-- band, opens the L2 booklet — membership unchanged), strand measurement,
-- content_id l1-measurement-3 ("Money / Subtracting amounts of money in dollars").
-- The hand-seed (2A/operations, seed.sql:441) won the ON CONFLICT; this trailing
-- UPDATE runs after all inserts + the content-id backfill, so a reset always lands
-- on the correct values (no re-collapse). Stem/format/answer(16)/is_active/
-- short_test_eligible UNCHANGED; only this row, only these three columns. Idempotent.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '1B'::half_grade_level,
    strand = 'measurement'::strand,
    content_id = (
      select tc.id from tax_content tc
       where tc.tenant_id = t.id and tc.code = 'l1-measurement-3'
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L2-Q17';
-- END l2-q17-metadata-fix

-- =============================================================================
-- LOCAL-DEV QA SEED — DO NOT SHIP
-- =============================================================================
-- One QA test parent + five children (one per S.A.M. booklet level: 0C, 1, 2,
-- 3, 4), each with an unrevoked per-child consent record, so every child is
-- immediately assessable after a `supabase db reset` — eliminating the manual
-- signup -> add-child -> /coppa cycle on each QA pass.
--
-- LOCAL-DEV ONLY, NEVER PROD. Two layers of protection:
--   (1) STRUCTURAL: this lives ONLY in supabase/seed.sql. `supabase db reset`
--       runs seed.sql (local/CI); production applies migrations/ and NEVER runs
--       seed.sql. This block is intentionally NOT in any migration.
--   (2) RUNTIME GUARD: the DO block below no-ops unless the local-dev marker
--       user (dev@atlas.local, created earlier in THIS seed) is present, so even
--       if seed.sql were pointed at a non-local DB the QA family is not written.
--
-- Mirrors the production write path exactly (src/app/(auth)/add-child/actions.ts
-- + src/lib/consent/text.ts): children(name, birth_year, grade_level) +
-- consent_records(consent_type, consent_text[_version], disclosure_version,
-- disclosure_content_sha256, data_uses, sharing_permissions, revoked=false). The
-- COPPA gate (src/lib/consent/verify.ts) checks only for an unrevoked row per
-- child — pre-satisfied here; fail-closed semantics unchanged.
--
-- Login (LOCAL DEV ONLY):  qa-parent@local.test  /  qa-dev-password
--
-- grade_level drives the picker's +/-1 booklet anchor (src/lib/questionPicker/
-- levelBand.ts via parseGradeNumber): Pre-K -> 0 (0C booklet), Grade N -> N.
-- birth_year is the parse fallback, set consistent with each grade
-- (gradeFromBirthYear, CURRENT_ACADEMIC_YEAR_START = 2025).
--
-- UUIDs are obvious-fake (fae*/fac*) but keep the v4 nibbles (4 @ pos 13,
-- 8 @ pos 17) so they pass the route Zod .uuid() checks (see LANDMINE 2 at the
-- top of this file). Idempotent: every insert no-ops on conflict.
do $$
declare
  v_tenant uuid;
  v_center uuid;
begin
  -- RUNTIME GUARD (layer 2): only seed the QA family on the local dev stack,
  -- detected via the dev marker user this same seed creates near the top.
  if not exists (select 1 from auth.users where email = 'dev@atlas.local') then
    raise notice '[qa-seed] skipped: local-dev marker (dev@atlas.local) absent — not the local stack.';
    return;
  end if;

  select id into v_tenant from tenants where slug = 'inspirea_singapore_math';
  if v_tenant is null then
    raise notice '[qa-seed] skipped: tenant inspirea_singapore_math not found.';
    return;
  end if;
  -- Single day-1 ACTIVE center (nullable on the rows; powers the instructor roster).
  select id into v_center from centers
    where tenant_id = v_tenant and status = 'ACTIVE'
    order by created_at limit 1;

  -- 1) QA test parent — GoTrue user + identity (empty-string token traps per
  --    LANDMINE 1 above; password 'qa-dev-password').
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    'fae00000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'qa-parent@local.test',
    crypt('qa-dev-password', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"QA Parent"}'::jsonb,
    now(), now(), false, false,
    '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    'fae00000-0000-4000-8000-000000000001',
    'fae00000-0000-4000-8000-000000000001',
    'email',
    '{"sub":"fae00000-0000-4000-8000-000000000001","email":"qa-parent@local.test","email_verified":true,"phone_verified":false}'::jsonb,
    now(), now(), now()
  ) on conflict (provider_id, provider) do nothing;

  -- 2) ParentProfile (public.parents).
  insert into parents (id, auth_user_id, tenant_id, home_center_id, email, name)
  values (
    'fae00000-0000-4000-8000-000000000002',
    'fae00000-0000-4000-8000-000000000001',
    v_tenant, v_center,
    'qa-parent@local.test', 'QA Parent'
  ) on conflict (id) do nothing;

  -- 3) Five ChildProfiles — one per booklet level. grade_level sets the picker
  --    anchor; name makes the level obvious in the UI.
  insert into children (id, parent_id, tenant_id, home_center_id, name, birth_year, grade_level)
  values
    ('fac00000-0000-4000-8000-00000000000c', 'fae00000-0000-4000-8000-000000000002', v_tenant, v_center, 'QA Zero-C',  2020, 'Pre-K'),
    ('fac00000-0000-4000-8000-000000000001', 'fae00000-0000-4000-8000-000000000002', v_tenant, v_center, 'QA Level 1', 2019, 'Grade 1'),
    ('fac00000-0000-4000-8000-000000000002', 'fae00000-0000-4000-8000-000000000002', v_tenant, v_center, 'QA Level 2', 2018, 'Grade 2'),
    ('fac00000-0000-4000-8000-000000000003', 'fae00000-0000-4000-8000-000000000002', v_tenant, v_center, 'QA Level 3', 2017, 'Grade 3'),
    ('fac00000-0000-4000-8000-000000000004', 'fae00000-0000-4000-8000-000000000002', v_tenant, v_center, 'QA Level 4', 2016, 'Grade 4')
  on conflict (id) do nothing;

  -- 4) One unrevoked per-child consent each (mirrors add-child + consent/text.ts;
  --    real CONSENT_TYPE / text / disclosure / data_uses / sharing values).
  insert into consent_records (
    id, tenant_id, parent_id, child_id, consent_type,
    consent_text_version, consent_text, disclosure_version,
    disclosure_content_sha256, data_uses, sharing_permissions, revoked
  ) values
    ('fac50000-0000-4000-8000-00000000000c', v_tenant, 'fae00000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-00000000000c', 'coppa_vpc', '2026-06-18.v2', 'I am the parent or legal guardian and I consent to the collection and use of my child''s information as described in this Parent Notice and Consent.', 'coppa-disclosure-v1', 'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea', '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb, '{"third_party":false,"marketing":false,"beyond_assessment":false}'::jsonb, false),
    ('fac50000-0000-4000-8000-000000000001', v_tenant, 'fae00000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-000000000001', 'coppa_vpc', '2026-06-18.v2', 'I am the parent or legal guardian and I consent to the collection and use of my child''s information as described in this Parent Notice and Consent.', 'coppa-disclosure-v1', 'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea', '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb, '{"third_party":false,"marketing":false,"beyond_assessment":false}'::jsonb, false),
    ('fac50000-0000-4000-8000-000000000002', v_tenant, 'fae00000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-000000000002', 'coppa_vpc', '2026-06-18.v2', 'I am the parent or legal guardian and I consent to the collection and use of my child''s information as described in this Parent Notice and Consent.', 'coppa-disclosure-v1', 'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea', '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb, '{"third_party":false,"marketing":false,"beyond_assessment":false}'::jsonb, false),
    ('fac50000-0000-4000-8000-000000000003', v_tenant, 'fae00000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-000000000003', 'coppa_vpc', '2026-06-18.v2', 'I am the parent or legal guardian and I consent to the collection and use of my child''s information as described in this Parent Notice and Consent.', 'coppa-disclosure-v1', 'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea', '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb, '{"third_party":false,"marketing":false,"beyond_assessment":false}'::jsonb, false),
    ('fac50000-0000-4000-8000-000000000004', v_tenant, 'fae00000-0000-4000-8000-000000000002', 'fac00000-0000-4000-8000-000000000004', 'coppa_vpc', '2026-06-18.v2', 'I am the parent or legal guardian and I consent to the collection and use of my child''s information as described in this Parent Notice and Consent.', 'coppa-disclosure-v1', 'a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea', '["diagnostic_assessment","progress_reporting_to_parent","progress_reporting_to_instructor","ai_misconception_classification"]'::jsonb, '{"third_party":false,"marketing":false,"beyond_assessment":false}'::jsonb, false)
  on conflict (id) do nothing;

  raise notice '[qa-seed] QA family ready: qa-parent@local.test / qa-dev-password — 5 children (0C, 1, 2, 3, 4), each consented.';
end $$;
-- END LOCAL-DEV QA SEED — DO NOT SHIP
