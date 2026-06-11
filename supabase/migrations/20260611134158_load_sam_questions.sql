-- Atlas Assessment — Stage 4 generated S.A.M. question load.
-- stage4-load:generated-migration
--
-- GENERATED FILE — written by scripts/conversion/stage4-load.ts
-- (pnpm convert:load). Do not hand-edit. Once written, this file is
-- IMMUTABLE HISTORY: applied migrations never change on the prod
-- path, so the loader never rewrites it. A re-run with new stage3
-- output writes a NEW timestamped migration containing only the
-- delta rows (external_ids not present in any existing generated
-- load migration); the seed.sql marker block stays the cumulative
-- mirror of all stage3 outputs.
--
-- DELTA LOAD: this file contains ONLY the external_ids not already
-- present in the prior generated load migrations (their rows are
-- NOT repeated here):
--   * 20260610151306_load_sam_questions.sql
--
-- Generated at: 2026-06-11T13:41:58.362Z
--
-- AGENTS.md §11 parity: this migration is the PRODUCTION path. On a
-- dev `supabase db reset` it is a no-op (migrations run before
-- seed.sql creates the inspirea_singapore_math tenant, so the CTE
-- cross-join yields zero rows). The rows are mirrored into
-- supabase/seed.sql between the stage4 BEGIN/END markers — that
-- mirror is the dev/CI path and carries the CUMULATIVE insert across
-- all generated load migrations. Both use
-- `on conflict (tenant_id, external_id) do nothing`, so either path
-- (or both) produces the same final state.
--
-- content_id is resolved at insert time by tax_content.code lookup
-- (codes equal taxonomy keys, e.g. 'l2-whole_numbers-1' — see
-- 20260525000002_seed_v2026_taxonomy.sql). image-essential rows load
-- with is_active=false and NO image_path: Stage 1 renders whole pages
-- and a full page would leak neighboring questions/answers, so a
-- curated per-question image must land before activation.

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
