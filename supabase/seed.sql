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
-- Relational strand taxonomy (Item #12 Phase 2)
-- =============================================================================
-- MIRRORED FROM: supabase/migrations/20260519000000_strand_relational_taxonomy.sql
--
-- Per AGENTS.md §11: the migration's tenant-scoped strands +
-- strand_cohorts INSERTs are no-ops in dev because `supabase db reset`
-- runs migrations BEFORE seed.sql creates the inspirea_singapore_math
-- tenant. The VALUES below are duplicated VERBATIM from the migration.
-- Both must stay in sync. Both use ON CONFLICT DO NOTHING so neither
-- duplicates rows if both ever effectively run against the same DB.
--
-- See migration file header for the cohort cross-join rationale and
-- the v2 evolution notes.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into strands (id, tenant_id, kind, parent_strand_id, display_name, sort_order)
select v.id, t.id, v.kind, v.parent_strand_id, v.display_name, v.sort_order
from t,
  (values
    ('number_algebra',         'moe',  null::text,             'Number and Algebra',       10),
    ('measurement_geometry',   'moe',  null::text,             'Measurement and Geometry', 20),
    ('statistics',             'moe',  null::text,             'Statistics',               30),
    ('number_sense',           'band', 'number_algebra',       'Number Sense',             11),
    ('operations_algorithms',  'band', 'number_algebra',       'Operations & Algorithms',  12),
    ('fractions_decimals',     'band', 'number_algebra',       'Fractions & Decimals',     13),
    ('measurement',            'band', 'measurement_geometry', 'Measurement',              21),
    ('geometry',               'band', 'measurement_geometry', 'Geometry',                 22),
    ('data_statistics',        'band', 'statistics',           'Data & Statistics',        31)
  ) as v(id, kind, parent_strand_id, display_name, sort_order)
on conflict (id) do nothing;

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into strand_cohorts (strand_id, cohort_id, tenant_id)
select v.strand_id, v.cohort_id, t.id
from t,
  (values
    ('number_sense',           'prek_1'),
    ('number_sense',           'g2_4'),
    ('number_sense',           'g5_6'),
    ('number_sense',           'g7_plus'),
    ('operations_algorithms',  'prek_1'),
    ('operations_algorithms',  'g2_4'),
    ('operations_algorithms',  'g5_6'),
    ('operations_algorithms',  'g7_plus'),
    ('fractions_decimals',     'prek_1'),
    ('fractions_decimals',     'g2_4'),
    ('fractions_decimals',     'g5_6'),
    ('fractions_decimals',     'g7_plus'),
    ('measurement',            'prek_1'),
    ('measurement',            'g2_4'),
    ('measurement',            'g5_6'),
    ('measurement',            'g7_plus'),
    ('geometry',               'prek_1'),
    ('geometry',               'g2_4'),
    ('geometry',               'g5_6'),
    ('geometry',               'g7_plus'),
    ('data_statistics',        'prek_1'),
    ('data_statistics',        'g2_4'),
    ('data_statistics',        'g5_6'),
    ('data_statistics',        'g7_plus')
  ) as v(strand_id, cohort_id)
on conflict (strand_id, cohort_id) do nothing;

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
