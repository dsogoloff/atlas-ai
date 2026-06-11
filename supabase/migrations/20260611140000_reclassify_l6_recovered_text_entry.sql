-- Atlas Assessment — reclassify the vision-recovered Level 6 mixed-number /
-- fraction answers to TEXT_ENTRY.
--
-- SAM-L6-Q09 ("8 1/28"), SAM-L6-Q11 ("88 1/2") and SAM-L6-Q12 ("5/18") were
-- vision-recovered from the Level 6 answer key (symbol-font fractions the PDF
-- text layer could not extract) and loaded by
-- 20260611134158_load_sam_questions.sql as NUMERIC_ENTRY. Their answers are
-- mixed numbers / fractions that cannot be typed on the child's decimal
-- keypad, so they move to TEXT_ENTRY (the grading normalizer handles
-- mixed-number / slash-spacing / unit variants at compare time). Content
-- (stem, correct_answer) is unchanged — only the format column moves. Same
-- remediation pattern as 20260610170100 for the L1-4 bank.
--
-- The sibling decimal/integer recoveries stay NUMERIC_ENTRY (keypad-typeable):
-- SAM-L6-Q10 "2.17", SAM-L6-Q13 "100", and the image-essential inactive rows
-- SAM-L6-Q15 "54" / SAM-L6-Q16 "267.5".
--
-- AGENTS.md §11: production path. On a dev `supabase db reset` this is a no-op
-- (migrations run before seed.sql creates the tenant); the identical UPDATE is
-- mirrored into supabase/seed.sql after the full-library new-levels INSERT.
-- Idempotent: guarded on the current NUMERIC_ENTRY format, so a re-run matches
-- zero rows.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'
from t
where q.tenant_id = t.id
  and q.format = 'NUMERIC_ENTRY'
  and q.external_id in ('SAM-L6-Q09', 'SAM-L6-Q11', 'SAM-L6-Q12');
