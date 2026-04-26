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
    ('NS_COUNTING_ERROR',         'NUMBER_SENSE',
       'Counting error',
       'Skips, double-counts, or miscounts items in a set.'),
    ('NS_PLACE_VALUE_CONFUSION',  'NUMBER_SENSE',
       'Place value confusion',
       'Treats digits as independent values without regard to place.'),
    ('NS_MAGNITUDE_MISJUDGE',     'NUMBER_SENSE',
       'Number magnitude misjudgement',
       'Misjudges relative size of multi-digit numbers.'),

    -- Operations
    ('OP_NO_REGROUPING',          'OPERATIONS',
       'No regrouping (subtraction)',
       'In subtraction, takes the smaller from the larger digit in each '
       'column instead of borrowing.'),
    ('OP_SUBTRACTION_DIRECTION',  'OPERATIONS',
       'Subtraction direction error',
       'Subtracts in the wrong direction (smaller minus larger).'),
    ('OP_MULT_AS_REPEATED_ADD',   'OPERATIONS',
       'Multiplication as repeated addition fails',
       'Treats multiplication as repeated addition but loses count or '
       'uses the wrong addend.'),
    ('OP_DIV_REMAINDER',          'OPERATIONS',
       'Division remainder errors',
       'Drops or misinterprets the remainder in long division.'),

    -- Word Problems
    ('WP_OPERATION_SELECTION',    'WORD_PROBLEMS',
       'Operation selection error',
       'Picks the wrong operation (e.g., adds when the problem requires '
       'subtraction).'),
    ('WP_IRRELEVANT_INFO',        'WORD_PROBLEMS',
       'Irrelevant information distraction',
       'Uses an irrelevant number from the problem in the calculation.'),
    ('WP_MULTI_STEP_SEQUENCE',    'WORD_PROBLEMS',
       'Multi-step sequencing error',
       'In a multi-step problem, performs steps in the wrong order or '
       'omits a step.'),

    -- Fractions / Decimals
    ('FR_NUM_DENOM_INDEPENDENT',  'FRACTIONS_DECIMALS',
       'Numerator/denominator treated independently',
       'Adds or subtracts numerators and denominators separately as if '
       'they were unrelated whole numbers.'),
    ('FR_FRACTION_AS_TWO_NUMS',   'FRACTIONS_DECIMALS',
       'Fraction-as-two-numbers misconception',
       'Reads a fraction as two separate whole numbers rather than a '
       'single value.'),
    ('FR_COMMON_DENOMINATOR',     'FRACTIONS_DECIMALS',
       'Common denominator errors',
       'Adds fractions without finding a common denominator.'),

    -- Geometry
    ('GE_PERIMETER_AREA',         'GEOMETRY',
       'Perimeter / area confusion',
       'Computes perimeter when asked for area, or vice versa.'),
    ('GE_SHAPE_PROPERTY',         'GEOMETRY',
       'Shape property error',
       'Misidentifies defining properties of a shape (e.g., counts a '
       'rectangle with non-equal sides as a square).')
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
    ('NUMBER_SENSE',       'PLACEHOLDER — Number Sense Pack 2B',
       array['PLACEHOLDER — Extra Practice 2A'],
       'Placeholder. Replace with S.A.M. mapping once licensing lands.'),
    ('OPERATIONS',         'PLACEHOLDER — Dimensions Math 2B',
       array['PLACEHOLDER — Extra Practice 2A Chapter 5'],
       'Placeholder.'),
    ('WORD_PROBLEMS',      'PLACEHOLDER — Challenging Word Problems 2',
       array[]::text[],
       'Placeholder.'),
    ('FRACTIONS_DECIMALS', 'PLACEHOLDER — Fractions Pack 2B',
       array[]::text[],
       'Placeholder.'),
    ('GEOMETRY',           'PLACEHOLDER — Geometry Pack 2B',
       array[]::text[],
       'Placeholder.'),
    ('MEASUREMENT_DATA',   'PLACEHOLDER — Measurement Pack 2B',
       array[]::text[],
       'Placeholder.')
  ) as v(strand, primary_rec, supplementary, notes);

-- =============================================================================
-- Placeholder questions
-- =============================================================================
-- Architecture.md #5: "clearly fake placeholder content". These are NOT
-- valid Singapore Math items and must be replaced before any real
-- assessment runs.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into questions
  (tenant_id, external_id, strand, level, difficulty, format,
   content, misconception_tags, time_expected_seconds, is_active)
select t.id, external_id, strand::strand, level::half_grade_level,
       difficulty, format::question_format,
       content::jsonb, misconception_tags, expected, true
from t,
  (values
    -- KA / Number Sense / Multiple Choice
    ('PLACEHOLDER-Q-001', 'NUMBER_SENSE', 'KA', -2.0, 'MULTIPLE_CHOICE',
       '{"stem":"PLACEHOLDER — 1 + 1 = ?","options":["1","2","3"],'
       '"correct_index":1,'
       '"distractor_misconceptions":{"0":"NS_COUNTING_ERROR",'
                                    '"2":"NS_COUNTING_ERROR"}}',
       array['NS_COUNTING_ERROR'], 20),
    -- 2B / Operations / Multiple Choice (with classic regrouping distractor)
    ('PLACEHOLDER-Q-002', 'OPERATIONS', '2B', 0.0, 'MULTIPLE_CHOICE',
       '{"stem":"PLACEHOLDER — 47 - 19 = ?","options":["28","38","26","32"],'
       '"correct_index":0,'
       '"distractor_misconceptions":{"1":"OP_NO_REGROUPING",'
                                    '"2":"OP_SUBTRACTION_DIRECTION",'
                                    '"3":"OP_NO_REGROUPING"}}',
       array['OP_NO_REGROUPING','OP_SUBTRACTION_DIRECTION'], 30),
    -- 3A / Word Problems / Numeric Entry
    ('PLACEHOLDER-Q-003', 'WORD_PROBLEMS', '3A', 0.4, 'NUMERIC_ENTRY',
       '{"stem":"PLACEHOLDER — Maya has 24 stickers. She gives 8 to her '
       'brother. How many does she have left?","correct_answer":"16"}',
       array['WP_OPERATION_SELECTION'], 60),
    -- 4A / Fractions / Drag & Drop (visual stub)
    ('PLACEHOLDER-Q-004', 'FRACTIONS_DECIMALS', '4A', 1.0, 'DRAG_DROP',
       '{"stem":"PLACEHOLDER — Drag the fractions in order from smallest '
       'to largest.","items":["1/2","1/4","3/4","1/3"],'
       '"correct_order":["1/4","1/3","1/2","3/4"]}',
       array['FR_FRACTION_AS_TWO_NUMS'], 90),
    -- 6A / Geometry / Multiple Choice (extends past MVP-spec K-5B
    -- to exercise the K-8 enum)
    ('PLACEHOLDER-Q-005', 'GEOMETRY', '6A', 1.5, 'MULTIPLE_CHOICE',
       '{"stem":"PLACEHOLDER — A 5x3 rectangle. What is its perimeter?",'
       '"options":["8","15","16","30"],"correct_index":2,'
       '"distractor_misconceptions":{"1":"GE_PERIMETER_AREA"}}',
       array['GE_PERIMETER_AREA'], 45)
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags, expected);
