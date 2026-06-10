-- Atlas Assessment — Stage 4 generated S.A.M. question load.
-- stage4-load:generated-migration
--
-- GENERATED FILE — written by scripts/conversion/stage4-load.ts
-- (pnpm convert:load). Do not hand-edit. Re-running the script finds
-- this file by the marker comment above and rewrites it in place
-- rather than creating a second migration.
--
-- Generated at: 2026-06-10T15:26:39.458Z
--
-- AGENTS.md §11 parity: this migration is the PRODUCTION path. On a
-- dev `supabase db reset` it is a no-op (migrations run before
-- seed.sql creates the inspirea_singapore_math tenant, so the CTE
-- cross-join yields zero rows). The identical statement is mirrored
-- into supabase/seed.sql between the stage4 BEGIN/END markers — that
-- mirror is the dev/CI path. Both use
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
     13, 'PATTERN', 1, 'SYMBOLIC', true, 'l2-whole_numbers-1')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation,
         is_active, content_key)
on conflict (tenant_id, external_id) do nothing;
