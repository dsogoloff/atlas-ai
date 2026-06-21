-- Atlas Assessment — SAM-L4-Q06 missing-digit layout fix (TASK D) (lane/qa-fixes-l1-l4).
--
-- QA flagged this item (served as "L4-Q12") as "a dash run where source has =". That
-- is a misdiagnosis: the "———" is the correct subtraction rule line, not an operator.
-- The ACTUAL defect is the missing-digit box position. The row reads:
--     ■ 8 5 2  −  7 9 4  =  7 7 1 8   with correct_answer "1"
-- but ■852 with ■=1 is 1852, and 1852 − 794 = 1058 ≠ 7718. The result 7718 + 794 = 8512
-- is the unique minuend, whose hidden digit (showing 8,5,2) is the TENS digit 1. So the
-- faithful, arithmetically-determined layout is "8 5 ■ 2" (answer 1 unchanged): the
-- subtrahend 794 then aligns correctly under 5 ■ 2 (hundreds/tens/ones), and
-- 8512 − 794 = 7718. ✓
--
-- Non-destructive: single targeted UPDATE WHERE external_id = 'SAM-L4-Q06' (+ tenant);
-- only content.stem changes (correct_answer stays "1"). Idempotent. Mirrored verbatim
-- into supabase/seed.sql. AGENTS.md Section 11 parity: no-ops on dev `supabase db reset`
-- (tenant created later by seed.sql); the seed.sql mirror applies it on the dev path.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = '{"stem":"What is the missing digit (■) in the following subtraction?\n\n  8 5 ■ 2\n–   7 9 4\n———————\n7 7 1 8","correct_answer":"1"}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L4-Q06';
