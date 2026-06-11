-- Atlas Assessment — QA Bucket 2: reclassify format-misclassified questions.
--
-- The QA audit (scripts/conversion/output/QA-audit-L1-4.csv) flagged 11
-- ACTIVE questions stored as NUMERIC_ENTRY whose stored answers are not
-- plain-numeric, making them unanswerable on the child's decimal keypad.
-- Resolution per question (full before/after — founder review surface):
--
--   external_id | format change            | stored answer / content change
--   ------------+--------------------------+--------------------------------------------------
--   SAM-L1-Q20  | NUMERIC_ENTRY→TEXT_ENTRY | none ("smaller than")
--   SAM-L1-Q25  | NUMERIC_ENTRY→TEXT_ENTRY | none ("6 + 2 = 8, 2 + 6 = 8, 8 – 2 = 6, 8 – 6 = 2";
--               |                          | the judge canonicalizes the en-dash to the child's hyphen)
--   SAM-L1-Q28  | NUMERIC_ENTRY→DRAG_DROP  | content rebuilt: correct_answer "10, 17, 20" becomes
--               |                          | items ["17","20","10"] (worksheet presentation order)
--               |                          | + correct_order ["10","17","20"] (parsed answer key);
--               |                          | same ordering-task shape as SAM-L2-Q10/L2-Q21/L4-Q25
--   SAM-L2-Q04  | NUMERIC_ENTRY→TEXT_ENTRY | none ("Ethan")
--   SAM-L2-Q08  | NUMERIC_ENTRY→TEXT_ENTRY | none ("Ninety-six")
--   SAM-L3-Q02  | NUMERIC_ENTRY→TEXT_ENTRY | none ("Five hundred and eight")
--   SAM-L3-Q18  | NUMERIC_ENTRY→TEXT_ENTRY | none ("cylinder")
--   SAM-L4-Q15  | NUMERIC_ENTRY→TEXT_ENTRY | none ("1 km 750 m") — NOTE: value contradicts the
--               |                          | parsed key trace and is pending founder PDF check
--               |                          | (Bucket 3); this migration changes FORMAT only
--   SAM-L4-Q22  | NUMERIC_ENTRY→TEXT_ENTRY | none ("9:25 am")
--   SAM-L4-Q26  | (none — stays NUMERIC_ENTRY) | none ("42 800") — excluded: a pure thousands-
--               |                          | grouped number; the P1 single-number normalizer
--               |                          | already grades the keypad answer "42800" correct
--   SAM-L4-Q27  | (none — stays NUMERIC_ENTRY) | correct_answer "Accept 1, 2, 3, 6, 9 or 18" →
--               |                          | "1, 2, 3, 6, 9 or 18" (human-readable key for the
--               |                          | report + classifier) + accepted_answers
--               |                          | ["1","2","3","6","9","18"] (any-of judging key);
--               |                          | the answer IS one keypad number, the stored key
--               |                          | was an answer-key instruction, not a value
--
-- AGENTS.md §11 parity: this migration is the PRODUCTION path. On a dev
-- `supabase db reset` it is a no-op (migrations run before seed.sql
-- creates the tenant + questions), so the identical statements are
-- mirrored into supabase/seed.sql AFTER the generated stage4 block
-- (outside the BEGIN/END markers — the generated block stays
-- byte-identical). All statements are idempotent: each UPDATE is guarded
-- on the pre-change format/content, so re-runs match zero rows.

-- 1) Word/phrase answers → TEXT_ENTRY (content {stem, correct_answer}
--    unchanged; only the format column moves).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'
from t
where q.tenant_id = t.id
  and q.format = 'NUMERIC_ENTRY'
  and q.external_id in (
    'SAM-L1-Q20', 'SAM-L1-Q25', 'SAM-L2-Q04', 'SAM-L2-Q08',
    'SAM-L3-Q02', 'SAM-L3-Q18', 'SAM-L4-Q15', 'SAM-L4-Q22'
  );

-- 2) SAM-L1-Q28 "Write the numbers in order" → DRAG_DROP. items[] is the
--    worksheet presentation order (17 20 10, from the stem); correct_order
--    is the parsed answer key (10, 17, 20).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'DRAG_DROP',
    content = jsonb_build_object(
      'stem', q.content->>'stem',
      'items', jsonb_build_array('17', '20', '10'),
      'correct_order', jsonb_build_array('10', '17', '20')
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q28'
  and q.format = 'NUMERIC_ENTRY';

-- 3) SAM-L4-Q27 stays NUMERIC_ENTRY (the child types one number on the
--    keypad) but the stored key was the answer-key instruction "Accept 1,
--    2, 3, 6, 9 or 18", which can never equal a typed number. Store the
--    accepted values as an any-of judging key and keep correct_answer as
--    the human-readable form for the parent report and the classifier.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = q.content || jsonb_build_object(
      'correct_answer', '1, 2, 3, 6, 9 or 18',
      'accepted_answers', jsonb_build_array('1', '2', '3', '6', '9', '18')
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L4-Q27'
  and q.content->>'correct_answer' = 'Accept 1, 2, 3, 6, 9 or 18';
