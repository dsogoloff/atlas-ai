-- Atlas Assessment — Defect A fix: SAM-L0C-Q11 number-line comparison.
-- (lane/young-band-content-fixes)
--
-- Authored as free-entry MULTI_BLANK: a 0B child had to TYPE
-- after/greater/before/smaller into "?" boxes on a numeric keypad
-- (EquationFill is free text; BlankKey has no constrained-choice option). That
-- is neither the source's tap interaction nor usable for word answers, and no
-- constrained per-blank-choice renderer exists. MVP using the EXISTING
-- SELECT_MULTIPLE renderer: "tap the sentences that are true" — eight statement
-- tiles encoding the same four comparisons (31 vs 30: after/greater; 33 vs 36:
-- before/smaller), with the four true ones correct. The number line stays as
-- the stimulus image (l0/sam-l0c-q11.png, already in the uploader manifest).
--
-- TRADE-OFF (flagged for founder): the faithful tappable-number-line +
-- per-blank toggle interaction would require new ATLAS player work; this MVP
-- approximates the same skill with a shipped renderer and no player change.
--
-- Non-destructive: a single targeted UPDATE WHERE external_id = 'SAM-L0C-Q11'
-- (+ tenant). is_active / level / short_test_eligible left untouched.
-- Idempotent. Mirrored verbatim into supabase/seed.sql. AGENTS.md Section 11
-- parity: no-ops on dev `supabase db reset` (tenant created later by seed.sql);
-- the seed.sql mirror applies it on the dev path; on prod the tenant exists.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'SELECT_MULTIPLE'::question_format,
    content = '{"stem":"Look at the number line. Tap the sentences that are true.","image_path":"l0/sam-l0c-q11.png","image_alt":"A number line with evenly spaced tick marks.","select_rule":"all","options":[{"id":"o1","label":"31 comes after 30"},{"id":"o2","label":"31 comes before 30"},{"id":"o3","label":"31 is greater than 30"},{"id":"o4","label":"31 is smaller than 30"},{"id":"o5","label":"33 comes before 36"},{"id":"o6","label":"33 comes after 36"},{"id":"o7","label":"33 is smaller than 36"},{"id":"o8","label":"33 is greater than 36"}],"correct":["o1","o3","o5","o7"]}'::jsonb
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L0C-Q11';
