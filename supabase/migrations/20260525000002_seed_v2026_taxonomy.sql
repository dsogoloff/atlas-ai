-- Atlas Assessment — V2026 taxonomy production seed (Item #12 Phase 7 Part A).
--
-- Source-of-truth references:
--   docs/sam-v2026-taxonomy.md §7 (machine-readable JSON)
--   supabase/migrations/20260525000001_add_v2026_taxonomy_schema.sql (schema)
--   supabase/seed.sql (dev/CI mirror — same VALUES, must stay in sync)
--
-- Phase 6 (3a60857) put these rows into seed.sql; that path runs on
-- `supabase db reset` for dev/CI. This migration is the production-rollout
-- path — when this migration applies to prod, the tax_* tables get
-- populated.
--
-- AGENTS.md §11 parity: the VALUES blocks below are byte-identical to the
-- ones in supabase/seed.sql. The test at src/lib/taxonomy/seed.test.ts
-- asserts that — drift between the two files fails the test loudly.
--
-- `on conflict (tenant_id, code) do nothing` makes this migration idempotent.
-- On `supabase db reset` the migrations run BEFORE seed.sql; this migration
-- INSERTs the rows; then seed.sql re-runs the same INSERTs which conflict
-- and no-op. Both files produce the same final state.

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
