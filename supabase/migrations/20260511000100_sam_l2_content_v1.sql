-- Atlas Assessment — Item #11 Phase 2: load S.A.M. Level 2 v1 content (11 items).
--
-- Source-of-truth references:
--   features.md §1, §5 — adaptive question engine + content pool.
--   architecture.md #5, guardrail #1 — real S.A.M. content loads via a gated
--     migration, scoped to single v1 tenant inspirea_singapore_math.
--   compliance.md §8 — answer keys, distractor maps, and external_id stay
--     server-side; serializer at src/lib/questionPicker/serialize.ts strips
--     them before payloads cross to the client.
--   tmp/sam_l2_placement_questions.json — source data (22 items). The 11
--     loaded here are the founder-approved v1 import (Q01, Q07, Q09, Q10,
--     Q11, Q14, Q17, Q19, Q20, Q21, Q22). The other 11 are deferred per
--     the content-followups roadmap (image-asset infrastructure, TEXT_ENTRY
--     format, curriculum-convention disputes).
--   supabase/migrations/20260511000000_sam_l2_misconception_taxonomy.sql —
--     Phase 1; adds NS_ZERO_VALUE and WP_KEYWORD_TRAP misconception codes
--     that several of these 11 reference.
--
-- JSON cleanups applied during import (per Phase 1 approval):
--   * Rename: NS_PLACE_VALUE_MISREAD -> NS_PLACE_VALUE_CONFUSION,
--             WP_OPERATION_CHOICE   -> WP_OPERATION_SELECTION.
--             (OP_MULTIPLICATION_AS_ADDITION -> OP_MULT_AS_REPEATED_ADD;
--             none of the 11 reference it.)
--   * Strip: All NEW_* codes from tags and distractor_misconceptions maps;
--            no substitution. Founder-accepted v1 cost.
--   * Reassign Q17 strand: MEASUREMENT_DATA -> WORD_PROBLEMS (money framing
--     is incidental; diagnostic is subtraction-with-regrouping).
--   * DRAG_DROP wire-format: synthesize items[] + correct_order[] from the
--     JSON's correct_answer string; matches the convention judged by
--     src/lib/responseSubmit/correctness.ts:60-63 and rendered by
--     src/app/(child)/assessment/components/DragDropInput.tsx.
--   * NUMERIC_ENTRY correct_answer: coerced to string per
--     src/lib/responseSubmit/correctness.ts:50-58 readString contract.
--
-- Two operations:
--   1. UPDATE: deactivate any prior PLACEHOLDER-Q-* rows (is_active=false).
--      No-op in dev once seed.sql no longer creates them; load-bearing in
--      prod where they may exist from earlier sessions, in which case the
--      WHERE clause matches and the picker stops serving them.
--   2. INSERT: 11 SAM-L2-Q* rows. Idempotent via unique(tenant_id, external_id)
--      at 20260426000000_initial_schema.sql:221.

-- =============================================================================
-- 1. Deactivate any prior PLACEHOLDER-Q-* questions.
-- =============================================================================

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions
   set is_active = false
 where tenant_id = (select id from t)
   and external_id like 'PLACEHOLDER-Q-%';

-- =============================================================================
-- 2. Insert 11 approved S.A.M. Level 2 questions.
-- =============================================================================
-- Strand coverage (v1 partial): NUMBER_SENSE x 8, WORD_PROBLEMS x 2,
-- OPERATIONS x 1. MEASUREMENT_DATA / GEOMETRY / FRACTIONS_DECIMALS not yet
-- covered; the picker returns strand-exhausted if the engine asks for one
-- of those bands.

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
    ('SAM-L2-Q01', 'NUMBER_SENSE', '1A', -1.9, 'MULTIPLE_CHOICE',
       '{"stem":"What is the missing number? 1 and ___ make 10.",'
       '"options":["1","0","9","11"],"correct_index":2,'
       '"distractor_misconceptions":{"1":"NS_ZERO_VALUE",'
                                    '"3":"OP_SUBTRACTION_DIRECTION"}}',
       array['NS_PLACE_VALUE_CONFUSION','OP_SUBTRACTION_DIRECTION'],
       9, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q07 / 1B / Number Sense / Place-value decomposition (76 = ? tens 6 ones).
    ('SAM-L2-Q07', 'NUMBER_SENSE', '1B', -1.6, 'MULTIPLE_CHOICE',
       '{"stem":"What is the missing number? 76 = ___ tens 6 ones",'
       '"options":["6","7","10","70"],"correct_index":1,'
       '"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION",'
                                    '"2":"NS_PLACE_VALUE_CONFUSION",'
                                    '"3":"NS_PLACE_VALUE_CONFUSION"}}',
       array['NS_PLACE_VALUE_CONFUSION'],
       9, 'IDENTIFY', 1, 'SYMBOLIC'),

    -- Q09 / 1A / Number Sense / Symbolic addition "3 more than 54".
    ('SAM-L2-Q09', 'NUMBER_SENSE', '1A', -1.7, 'MULTIPLE_CHOICE',
       '{"stem":"What is 3 more than 54?",'
       '"options":["51","57","84","543"],"correct_index":1,'
       '"distractor_misconceptions":{"0":"OP_SUBTRACTION_DIRECTION",'
                                    '"2":"NS_PLACE_VALUE_CONFUSION"}}',
       array['OP_SUBTRACTION_DIRECTION','NS_PLACE_VALUE_CONFUSION'],
       6, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q10 / 1B / Number Sense / Order 3 numbers ascending.
    ('SAM-L2-Q10', 'NUMBER_SENSE', '1B', -1.5, 'DRAG_DROP',
       '{"stem":"Arrange the following numbers. Begin with the smallest. 68, 81, 9",'
       '"items":["68","81","9"],"correct_order":["9","68","81"]}',
       array['NS_PLACE_VALUE_CONFUSION'],
       11, 'COUNTING', 1, 'SYMBOLIC'),

    -- Q11 / 2A / Word Problems / Change-unknown apples (35 - 7).
    ('SAM-L2-Q11', 'WORD_PROBLEMS', '2A', -1.1, 'NUMERIC_ENTRY',
       '{"stem":"Jo had 7 apples. Her brother gave her some more apples. '
       'She has 35 apples now. How many apples did her brother give her?",'
       '"correct_answer":"28"}',
       array['WP_OPERATION_SELECTION','WP_KEYWORD_TRAP','OP_NO_REGROUPING'],
       24, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q14 / 2A / Operations / Partitive division (12 birds, 3 cages).
    ('SAM-L2-Q14', 'OPERATIONS', '2A', -1.1, 'MULTIPLE_CHOICE',
       '{"stem":"Mrs Tan puts 12 birds into 3 cages. How many birds are '
       'there in each cage?","options":["6","2","3","4"],"correct_index":3,'
       '"distractor_misconceptions":{"0":"OP_DIV_REMAINDER",'
                                    '"1":"OP_DIV_REMAINDER"}}',
       array['WP_OPERATION_SELECTION','OP_DIV_REMAINDER'],
       16, 'DIVISION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q17 / 2A / Word Problems / Money subtraction with regrouping (45 - 29).
    -- Strand reassigned from MEASUREMENT_DATA: money framing is incidental;
    -- diagnostic is subtraction with regrouping in a word-problem frame.
    ('SAM-L2-Q17', 'WORD_PROBLEMS', '2A', -1.0, 'NUMERIC_ENTRY',
       '{"stem":"Larry has $45. He buys a school bag for $29. '
       'How much money does he have left?","correct_answer":"16"}',
       array['OP_NO_REGROUPING','WP_OPERATION_SELECTION'],
       17, 'SUBTRACTION', 1, 'WORD_PROBLEM_SINGLE'),

    -- Q19 / 2A / Number Sense / Expanded form to standard form (600+40+8).
    ('SAM-L2-Q19', 'NUMBER_SENSE', '2A', -1.3, 'NUMERIC_ENTRY',
       '{"stem":"What is the missing number? 600 + 40 + 8 = ___",'
       '"correct_answer":"648"}',
       array['NS_PLACE_VALUE_CONFUSION'],
       8, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q20 / 2A / Number Sense / Hundreds-place increment with zero placeholder.
    ('SAM-L2-Q20', 'NUMBER_SENSE', '2A', -1.2, 'NUMERIC_ENTRY',
       '{"stem":"What is 100 more than 504?","correct_answer":"604"}',
       array['NS_PLACE_VALUE_CONFUSION','NS_ZERO_VALUE'],
       6, 'ADDITION', 1, 'SYMBOLIC'),

    -- Q21 / 2B / Number Sense / Order 4 three-digit numbers descending.
    ('SAM-L2-Q21', 'NUMBER_SENSE', '2B', -0.9, 'DRAG_DROP',
       '{"stem":"Arrange the following numbers in order. Begin with the '
       'greatest. 652, 716, 629, 708",'
       '"items":["652","716","629","708"],'
       '"correct_order":["716","708","652","629"]}',
       array['NS_PLACE_VALUE_CONFUSION'],
       14, 'COUNTING', 1, 'SYMBOLIC'),

    -- Q22 / 2B / Number Sense / Skip-counting backward across hundreds boundary.
    ('SAM-L2-Q22', 'NUMBER_SENSE', '2B', -0.7, 'NUMERIC_ENTRY',
       '{"stem":"What comes next in the number pattern below? '
       '860, 840, 820, 800, ?","correct_answer":"780"}',
       array['NS_PLACE_VALUE_CONFUSION'],
       12, 'PATTERN', 1, 'SYMBOLIC')
  ) as v(external_id, strand, level, difficulty, format,
         content, misconception_tags,
         word_count, operation_type, num_operations, representation)
on conflict (tenant_id, external_id) do nothing;
