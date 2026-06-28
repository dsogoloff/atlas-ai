-- Atlas Assessment — load the 6 gradeable L5/L6 rows the prior conversion run skipped.
--
-- These six were skipped by the auto-loader (DRAG-ordering mappability + MC fraction-option
-- unicode divergence + TEXT_ENTRY rejection), not for lack of source. Authored + source-
-- verified 2026-06-25 against the worksheet page, the answer-key PDF, and the Question
-- Summary (Level + Short Test columns):
--   * SAM-L5-Q01  MULTIPLE_CHOICE   "25 608 = 20 000 + 5000 + ___ + 8"     ans (3) = 600
--   * SAM-L5-Q10  DRAG_DROP         arrange 9/2,10/3,3,14/4 increasing     ans 3,10/3,14/4,9/2
--   * SAM-L5-Q16  DRAG_DROP         arrange 3.671,3,3.617,3.716 decreasing ans 3.716,3.671,3.617,3
--   * SAM-L5-Q18  MULTIPLE_CHOICE   express 8.35 as a fraction (simplest)  ans (3) = 8 7/20
--   * SAM-L6-Q22  NUMERIC_ENTRY     express 0.052 kg in grams              ans 52 (g)
--   * SAM-L6-Q27  MULTIPLE_CHOICE   which fraction is greater than 50%     ans (4) = 3/5
--
-- Banded to the BOOKLET level (L5 -> 5A, L6 -> 6A; see 20260625120000). content_id = the
-- source SKILL sub-strand node (Level 4/5). short_test_eligible = true for all six — the
-- Short Test column is Y for each and none is a manual-draw task (key-driven, not padded).
-- The two ordering items are authored as DRAG_DROP (id-keyed order grading) rather than a
-- brittle free-text list; the order is exactly the answer key. Idempotent (on conflict).
-- Tenant-scoped (no-op during `supabase db reset`; dev/CI path is the seed.sql mirror).

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
       (select tc.id from tax_content tc where tc.tenant_id = t.id and tc.code = v.content_key)
from t,
  (values
    ('SAM-L5-Q01', 'number_sense', '5A', 0.0, 'MULTIPLE_CHOICE',
     '{"stem":"What is the missing number?\n25 608 = 20 000 + 5000 + ___ + 8","options":["6","60","600","6000"],"correct_index":2,"distractor_misconceptions":{"0":"NS_PLACE_VALUE_CONFUSION","1":"NS_PLACE_VALUE_CONFUSION","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['NS_PLACE_VALUE_CONFUSION'],
     12, 'IDENTIFY', 1, 'SYMBOLIC', true, true, 'l4-whole_numbers-1'),

    ('SAM-L5-Q10', 'fractions_decimals', '5A', 0.5, 'DRAG_DROP',
     '{"stem":"Arrange the following in increasing order.","items":["9/2","10/3","3","14/4"],"correct_order":["3","10/3","14/4","9/2"]}',
     array['FR_NUM_DENOM_INDEPENDENT','NS_MAGNITUDE_MISJUDGE'],
     6, 'IDENTIFY', 1, 'SYMBOLIC', true, true, 'l4-fractions-1'),

    ('SAM-L5-Q16', 'fractions_decimals', '5A', 0.4, 'DRAG_DROP',
     '{"stem":"Arrange the decimals in decreasing order.","items":["3.671","3","3.617","3.716"],"correct_order":["3.716","3.671","3.617","3"]}',
     array['NS_MAGNITUDE_MISJUDGE','NS_PLACE_VALUE_CONFUSION'],
     6, 'IDENTIFY', 1, 'SYMBOLIC', true, true, 'l4-decimals-1'),

    ('SAM-L5-Q18', 'fractions_decimals', '5A', 0.6, 'MULTIPLE_CHOICE',
     '{"stem":"Express 8.35 as a fraction in its simplest form.","options":["835/100","8 35/10","8 7/20","8 3/4"],"correct_index":2,"distractor_misconceptions":{"0":"FR_FRACTION_AS_TWO_NUMS","1":"NS_PLACE_VALUE_CONFUSION","3":"NS_PLACE_VALUE_CONFUSION"}}',
     array['FR_FRACTION_AS_TWO_NUMS','NS_PLACE_VALUE_CONFUSION'],
     8, 'DECIMAL_OP', 1, 'SYMBOLIC', true, true, 'l4-decimals-3'),

    ('SAM-L6-Q22', 'fractions_decimals', '6A', 0.3, 'NUMERIC_ENTRY',
     '{"stem":"Express 0.052 kg in grams.","correct_answer":"52","accepted_answers":["52 g"]}',
     array['MD_UNIT_CONFUSION','NS_PLACE_VALUE_CONFUSION'],
     5, 'DECIMAL_OP', 1, 'SYMBOLIC', true, true, 'l5-decimals-2'),

    ('SAM-L6-Q27', 'fractions_decimals', '6A', 0.4, 'MULTIPLE_CHOICE',
     '{"stem":"Which of the following fractions is greater than 50%?","options":["1/2","2/5","3/8","3/5"],"correct_index":3,"distractor_misconceptions":{"0":"FR_NUM_DENOM_INDEPENDENT","1":"FR_NUM_DENOM_INDEPENDENT","2":"FR_NUM_DENOM_INDEPENDENT"}}',
     array['FR_NUM_DENOM_INDEPENDENT'],
     8, 'PERCENT_OP', 1, 'SYMBOLIC', true, true, 'l5-percentage-2')
  ) as v(external_id, strand, level, difficulty, format, content,
         misconception_tags, word_count, operation_type, num_operations,
         representation, is_active, short_test_eligible, content_key)
on conflict (tenant_id, external_id) do nothing;
