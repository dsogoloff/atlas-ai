-- Atlas Assessment — L1 art wire + activate (lane/l1-art-curation).
--
-- Wires the curated per-question images (uploaded to the private
-- `question-images` bucket under l1/) onto the 5 image-essential L1 rows
-- and activates them. These rows already carry image_alt + image_required
-- =true and were held ONLY for lack of art; they have NO content._authoring,
-- so the questions_held_rows_inactive guardrail
-- (20260613120000_l1_activation_guardrail.sql) permits activation.
--
-- SCOPE: this lane only wires art-ready single-image items. The per-tile
-- matching items (Q13/Q15/Q07) and the image-ordering item (Q17) stay HELD
-- (their Track B input-wiring lands separately). SAM-L1-Q22 is intentionally
-- NOT touched here: the l1-reauthoring overlay (20260613120100) already
-- activated it as a text item whose stem states the numbers ("6 and 3 make
-- 9. ... 2 and 6 make ___"); re-imaging it would reverse that decision —
-- parked for founder review.
--
-- NO silent edits — two stems carried dead authoring placeholders that
-- rendered literally (no substitution exists in the player). Now that each
-- has its image, the placeholder is removed:
--   | id          | field | old                                                              | new                                         |
--   |-------------|-------|------------------------------------------------------------------|---------------------------------------------|
--   | SAM-L1-Q05  | stem  | "...In which group does [object] belong? ..."                    | "...In which group does it belong? ..."     |
--   | SAM-L1-Q12  | stem  | "Which set has more? Set A: [image] Set B: [image] Answer: Set ___" | "Which set has more? Answer: Set ___"     |
-- (correct_answer / image_alt / image_required unchanged.)
--
-- AGENTS.md §11 parity: prod path. On a dev `supabase db reset` this is a
-- no-op (migrations run before seed.sql creates the inspirea_singapore_math
-- tenant); the identical statements are mirrored into supabase/seed.sql in
-- the l1-art-activation block. Every statement carries an idempotent guard,
-- so either path (or both) yields the same final state.
--
-- IN-PLACE FIX (2026-06-14): statements 2 & 3 originally called
-- to_jsonb() on an UNTYPED string literal, which Postgres rejects with
-- "could not determine polymorphic type ... input has type unknown"
-- (SQLSTATE 42804) — statement 3 (Q12, a bare literal) aborted every
-- `supabase db reset` before seed.sql could run. Fixed by casting the
-- literal to ::text. This migration is edited IN PLACE (not superseded by
-- a corrective) because it failed deterministically and therefore applied
-- to completion in NO environment (each run rolled back, so it was never
-- recorded in schema_migrations) — there is no successful state to drift
-- from, and a later corrective migration could never run anyway (reset
-- halts at this file). The seed.sql mirror is corrected identically.

-- 1) Wire image_path + activate the 5 image-essential rows.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = true,
    content = q.content || jsonb_build_object('image_path', v.image_path)
from t,
  (values
    ('SAM-L1-Q04', 'l1/sam-l1-q04.png'),
    ('SAM-L1-Q05', 'l1/sam-l1-q05.png'),
    ('SAM-L1-Q10', 'l1/sam-l1-q10.png'),
    ('SAM-L1-Q12', 'l1/sam-l1-q12.png'),
    ('SAM-L1-Q19', 'l1/sam-l1-q19.png')
  ) as v(external_id, image_path)
where q.tenant_id = t.id
  and q.external_id = v.external_id
  and q.is_active = false;

-- 2) SAM-L1-Q05 — drop the dead "[object]" placeholder from the stem.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content, '{stem}',
      to_jsonb(('Group A    Group B' || E'\n' ||
               'In which group does it belong?' || E'\n' ||
               'Answer: Group ___')::text)
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q05'
  and q.content->>'stem' like '%[object]%';

-- 3) SAM-L1-Q12 — drop the dead "[image]" placeholders (the sets are in the
--    curated image, with their Set A:/Set B: labels).
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set content = jsonb_set(
      q.content, '{stem}',
      to_jsonb('Which set has more? Answer: Set ___'::text)
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L1-Q12'
  and q.content->>'stem' like '%[image]%';
