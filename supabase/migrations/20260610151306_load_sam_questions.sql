-- Atlas Assessment — Stage 4 generated S.A.M. question load.
-- stage4-load:generated-migration
--
-- GENERATED FILE — written by scripts/conversion/stage4-load.ts
-- (pnpm convert:load). Do not hand-edit. Re-running the script finds
-- this file by the marker comment above and rewrites it in place
-- rather than creating a second migration.
--
-- Generated at: 2026-06-10T16:34:53.437Z
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
