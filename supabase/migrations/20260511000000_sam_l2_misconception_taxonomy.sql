-- Atlas Assessment — Item #11 Phase 1: misconception taxonomy expansion.
--
-- Source-of-truth references:
--   features.md §2 — misconception starter taxonomy (lives in data, not code).
--   architecture.md guardrail #3 — misconception data is tenant-scoped rows on
--     the misconceptions table, not hardcoded enums.
--   supabase/seed.sql §"Misconception taxonomy" — the canonical starter set;
--     this migration extends it with two codes the L2 content references that
--     the seed lacks.
--   tmp/sam_l2_placement_questions.json — Q01 distractor "1" maps to
--     NS_ZERO_VALUE; Q20 tag list includes NS_ZERO_VALUE; Q11 tag list includes
--     WP_KEYWORD_TRAP. Both codes need to exist before the Phase 2 content
--     load so the misconception classifier's distractor-map lookups resolve.
--
-- Codes added (both tenant-scoped to inspirea_singapore_math per guardrail #1):
--   * NS_ZERO_VALUE    (NUMBER_SENSE)  — zero placeholder digit dropped or
--                                        misread as absence-of-quantity.
--   * WP_KEYWORD_TRAP  (WORD_PROBLEMS) — operation picked from a surface
--                                        keyword instead of relational
--                                        structure of the problem.
--
-- Idempotent: misconceptions has unique(tenant_id, code) per
-- 20260426000000_initial_schema.sql:181, so the `on conflict do nothing`
-- guard makes re-running this migration a no-op.

-- =============================================================================
-- Insert NS_ZERO_VALUE and WP_KEYWORD_TRAP.
-- =============================================================================

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into misconceptions (tenant_id, code, strand, label, description)
select t.id, code, strand::strand, label, description
from t,
  (values
    ('NS_ZERO_VALUE',     'NUMBER_SENSE',
       'Zero placeholder error',
       'Treats zero as absence-of-quantity rather than a placeholder digit. '
       'Drops zero-tens or zero-hundreds positions when reading or writing '
       'multi-digit numerals (e.g., reads 204 as 24, or writes 648 as 6048).'),
    ('WP_KEYWORD_TRAP',   'WORD_PROBLEMS',
       'Surface keyword operation trap',
       'Picks an operation from a surface keyword in the problem text '
       '(e.g., "gave" suggesting addition, "more" suggesting addition) rather '
       'than from the relational structure of the problem.')
  ) as v(code, strand, label, description)
on conflict (tenant_id, code) do nothing;
