-- Atlas Assessment — pre-run founder-directed data fixes before the
-- full-library conversion: SAM-L2-Q04 deactivation + SAM-L3-Q15
-- TEXT_ENTRY reactivation.
--
-- Context:
--   * SAM-L2-Q04 — the L2 prompt re-validation flipped image_required to
--     true: the queue word problem needs its picture (the circles the
--     child writes the names into). Same missing-image policy as the
--     Stage 4 loader (image-essential rows stay inactive until a curated
--     per-question crop exists — a full page render would leak
--     neighboring questions/answers): deactivate until the curated crop
--     lands. Format (TEXT_ENTRY since 20260610170100) and content are
--     untouched.
--   * SAM-L3-Q15 — 20260610190000 converted the founder-verified row to
--     NUMERIC_ENTRY {stem, correct_answer "4/6"} and deactivated it
--     because the child NUMERIC_ENTRY input (inputMode="decimal") has no
--     "/" key on touch keyboards, with the note "reactivate after merge"
--     once TEXT_ENTRY (PR #29) was available. TEXT_ENTRY is now in this
--     branch's history (20260610170000 enum + runtime): flip the format
--     to TEXT_ENTRY (full-keyboard input renders "/") and reactivate.
--     Content shape {stem, correct_answer} is identical for both formats
--     — no content change.
--
-- NO silent edits — full before/after table (also in the PR body):
--
-- | external_id | field     | old           | new        | reason |
-- |-------------|-----------|---------------|------------|--------|
-- | SAM-L2-Q04  | is_active | true          | false      | L2 prompt re-validation flipped image_required to true — the question needs its picture; missing-image policy = inactive until a curated crop exists. |
-- | SAM-L3-Q15  | format    | NUMERIC_ENTRY | TEXT_ENTRY | "4/6" needs the "/" key; TEXT_ENTRY renders the full keyboard. Content {stem:"What is 1/6 + 3/6?", correct_answer:"4/6"} unchanged (same shape for both formats). |
-- | SAM-L3-Q15  | is_active | false         | true       | the 20260610190000 deactivation reason ("fraction answer needs TEXT_ENTRY — reactivate after merge") is resolved by the format flip above. |
--
-- AGENTS.md §11: tenant-scoped UPDATEs in the established tenant-CTE
-- pattern. On a dev `supabase db reset` this migration is a no-op
-- (migrations run before seed.sql creates the tenant); the identical
-- statements are mirrored into supabase/seed.sql AFTER the
-- founder-verified-mojibake-fixes block. Every UPDATE carries an
-- idempotent guard, so either path (or both) produces the same final
-- state.

-- 1) SAM-L2-Q04 — deactivate until a curated question image exists
--    (image_required came back true on the L2 prompt re-validation).
--    Format/content untouched. Guarded on the active state.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set is_active = false
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L2-Q04'
  and q.is_active = true;

-- 2) SAM-L3-Q15 — NUMERIC_ENTRY -> TEXT_ENTRY (content shape identical)
--    and reactivate, per the 20260610190000 "reactivate after merge"
--    note. Guarded on the pre-change format + the founder-verified
--    answer, so re-runs (or a bank where the row never went through
--    20260610190000) match zero rows.
with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set format = 'TEXT_ENTRY'::question_format,
    is_active = true
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L3-Q15'
  and q.format = 'NUMERIC_ENTRY'
  and q.content ->> 'correct_answer' = '4/6';
