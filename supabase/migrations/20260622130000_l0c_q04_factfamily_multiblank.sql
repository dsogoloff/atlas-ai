-- Atlas Assessment — L0C-Q04 fact-family: show the given operands (2026-06-22).
--
-- Founder QA follow-up. SAM-L0C-Q04 ("Complete the fact family.") was authored as
-- EQUATION_SET, which renders FULLY-BLANK number sentences (a/op/b/result all empty) —
-- so the worksheet's GIVEN operands never appeared and the item rendered blank. The
-- operands were captured only in content.canonical (for set-equality grading).
--
-- Source-verified (0C worksheet page 6 "Complete the fact family." + Question Summary
-- key Task 4 + the Q4 image): four rows with the operands PRINTED and only the result
-- blank —
--   3 + 6 = ___   (9)
--   6 + 3 = ___   (9)
--   9 - 3 = ___   (6)
--   9 - 6 = ___   (3)
--
-- Fix (NO new prefill concept): re-author to MULTI_BLANK, which renders an inline
-- template of text + blank slots. The operands are visible `text` tokens; each result
-- is its own `blank` slot. Grading is per-blank numeric, reusing the same answers the
-- EQUATION_SET canonical held (9, 9, 6, 3). serialize.ts serves stem+tokens only and
-- never leaks `blanks`.
--
-- Tenant-scoped: no-ops during `supabase db reset` (tenant created later by seed.sql);
-- the dev/CI path is the mirrored block in supabase/seed.sql. Idempotent.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'MULTI_BLANK'::question_format,
    content = '{"stem":"Complete the fact family.","tokens":[{"t":"text","value":"3 + 6 ="},{"t":"blank","id":"b1"},{"t":"text","value":"6 + 3 ="},{"t":"blank","id":"b2"},{"t":"text","value":"9 - 3 ="},{"t":"blank","id":"b3"},{"t":"text","value":"9 - 6 ="},{"t":"blank","id":"b4"}],"blanks":{"b1":{"value":"9","numeric":true},"b2":{"value":"9","numeric":true},"b3":{"value":"6","numeric":true},"b4":{"value":"3","numeric":true}}}'::jsonb
from t where q.tenant_id = t.id and q.external_id = 'SAM-L0C-Q04';
