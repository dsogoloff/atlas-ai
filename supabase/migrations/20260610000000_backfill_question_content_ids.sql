-- Atlas Assessment — per-question content_id backfill for the v1 SAM-L2 bank.
--
-- 20260525000003 added questions.content_id and back-filled it only where
-- the (strand, level) pair mapped unambiguously into the V2026 taxonomy.
-- All 11 SAM-L2 questions are number_sense / operations_algorithms — both
-- deliberately unmapped strands — so every seeded question still has
-- content_id NULL, and the parent-report sub-strand mastery (the radar)
-- drops every response (src/lib/report/assemble.ts skips NULL content_id).
--
-- This migration resolves those NULLs the way the bridge migration's
-- philosophy demands: NOT by rule, but per-question, by what each stem
-- actually assesses. The SAM-L2 items come from the S.A.M. Level 2
-- Placement Worksheet — a placement test probes L1 prerequisites too, so
-- several items are tagged with L1 content, not L2.
--
-- Dual-axis reminder (unchanged from 20260525000003): questions.level is
-- the engine's half-grade placement axis; content_id is the S.A.M. V2026
-- taxonomy axis. Tagging Q11 with L1 content does not move its 2A level.
--
-- ── Mapping (external_id → tax_content.code) ──────────────────────────
--   SAM-L2-Q01 → l1-whole_numbers-2 "Number Bonds"
--       missing part of a "1 and ___ make 10" bond — the L1 number-bond
--       skill itself.
--   SAM-L2-Q07 → l1-whole_numbers-8 "Numbers to 100"
--       tens/ones decomposition of 76 — two-digit place value.
--   SAM-L2-Q09 → l1-whole_numbers-9 "Addition and Subtraction Within 100"
--       "3 more than 54" — mental addition within 100, no regrouping.
--   SAM-L2-Q10 → l1-whole_numbers-8 "Numbers to 100"
--       order 9 / 68 / 81 ascending — two-digit number magnitude.
--   SAM-L2-Q11 → l2-whole_numbers-4 "Word Problems Involving the Four
--       Operations"
--       change-unknown 7 + ? = 35. The diagnostic is operation selection
--       in a word-problem frame (its tags: WP_OPERATION_SELECTION,
--       WP_KEYWORD_TRAP — "gave her some more" baits addition where
--       35 − 7 is required), not sub-100 computation; L1 has no
--       word-problem topic, so the L2 word-problems row is the match.
--   SAM-L2-Q14 → l2-whole_numbers-3 "Multiplication and Division Within
--       Tables of 2, 3, 4, 5 and 10"
--       partitive 12 ÷ 3 — a table-of-3 division fact; the single-step
--       word frame is the carrier, the fact is the skill.
--   SAM-L2-Q17 → l1-whole_numbers-9 "Addition and Subtraction Within 100"
--       45 − 29 with regrouping; money framing already judged incidental
--       when the strand was reassigned off MEASUREMENT_DATA (see the Q17
--       comment in 20260511000100 / seed.sql) — so NOT l2-measurement-4.
--   SAM-L2-Q19 → l2-whole_numbers-1 "Numbers to 1000"
--       expanded form 600 + 40 + 8 — three-digit place value, not
--       addition fluency.
--   SAM-L2-Q20 → l2-whole_numbers-1 "Numbers to 1000"
--       "100 more than 504" — hundreds-place increment with a zero
--       placeholder; place value to 1000.
--   SAM-L2-Q21 → l2-whole_numbers-1 "Numbers to 1000"
--       order four 3-digit numbers descending — comparing within 1000.
--   SAM-L2-Q22 → l2-whole_numbers-1 "Numbers to 1000"
--       skip-count backwards by 20 across a hundreds boundary — number
--       patterns within 1000.
-- ── Skipped (content_id stays NULL) ───────────────────────────────────
--   PLACEHOLDER-Q-IMG-GRID-001 — dev-only visual-gate fixture
--       (is_active=false, placeholder stem, seed.sql-only row slated for
--       removal at Item #13a Phase 5 close). Not real assessment content;
--       tagging it would put fake data on the sub-strand grid.
--
-- Idempotency / safety: keyed by (tenant slug, external_id); guarded by
-- `q.content_id is null` so re-runs are no-ops AND later manual
-- corrections are never clobbered by a replay of this migration.
--
-- AGENTS.md §11: during `supabase db reset` this UPDATE matches zero rows
-- (the tenant and questions only exist after seed.sql runs), so the same
-- UPDATE is mirrored into seed.sql after the taxonomy + questions blocks.
-- This migration is the production path. The sentinel comments below mark
-- the shared block; src/lib/taxonomy/content-id-backfill.test.ts asserts
-- it stays byte-identical between this file and seed.sql.

-- BEGIN sam-l2-content-id-backfill
update questions q
set content_id = tc.id
from tenants t,
     tax_content tc,
     (values
       ('SAM-L2-Q01', 'l1-whole_numbers-2'),
       ('SAM-L2-Q07', 'l1-whole_numbers-8'),
       ('SAM-L2-Q09', 'l1-whole_numbers-9'),
       ('SAM-L2-Q10', 'l1-whole_numbers-8'),
       ('SAM-L2-Q11', 'l2-whole_numbers-4'),
       ('SAM-L2-Q14', 'l2-whole_numbers-3'),
       ('SAM-L2-Q17', 'l1-whole_numbers-9'),
       ('SAM-L2-Q19', 'l2-whole_numbers-1'),
       ('SAM-L2-Q20', 'l2-whole_numbers-1'),
       ('SAM-L2-Q21', 'l2-whole_numbers-1'),
       ('SAM-L2-Q22', 'l2-whole_numbers-1')
     ) as m(external_id, content_code)
where t.slug = 'inspirea_singapore_math'
  and q.tenant_id = t.id
  and q.external_id = m.external_id
  and q.content_id is null
  and tc.tenant_id = t.id
  and tc.code = m.content_code;

-- Summary notice — visible at production apply time and during
-- `supabase db reset` (where the migration pass reports 0/0/0; the
-- seed.sql mirror pass reports the real counts).
do $$
declare
  sam_total     int;
  sam_mapped    int;
  sam_unmapped  int;
begin
  select count(*),
         count(*) filter (where q.content_id is not null),
         count(*) filter (where q.content_id is null)
    into sam_total, sam_mapped, sam_unmapped
    from questions q
    join tenants t on t.id = q.tenant_id
   where t.slug = 'inspirea_singapore_math'
     and q.external_id like 'SAM-L2-%';

  raise notice '[per-question content_id backfill] sam-l2 total=% mapped=% unmapped=%',
    sam_total, sam_mapped, sam_unmapped;
end
$$;
-- END sam-l2-content-id-backfill
