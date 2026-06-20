-- Atlas Assessment — SAM-L2-Q17 metadata correction (lane/l2-q17-metadata-fix).
--
-- SAM-L2-Q17 has ONE live row (unique (tenant_id, external_id)), but two
-- conflicting INSERT definitions seeded it and the WRONG one won via
-- ON CONFLICT DO NOTHING:
--   * hand-seeded SAM-L2 block (seed.sql:441) — level 2A, strand
--     operations_algorithms — inserts FIRST, so it wins; the sam-l2-content-id
--     backfill (seed.sql:893) then maps it to l1-whole_numbers-9.
--   * stage4 block (seed.sql:1263) — level 1B, strand measurement,
--     content_id l1-measurement-3 — no-ops against the existing row.
--
-- The source key (Level 2 doc, task 17) says: "Subtracting amounts of money in
-- dollars", Level 1 — i.e. a Level-1-difficulty (band 1B) MONEY item that opens
-- the L2 booklet (the standard ramp). The key matches the stage4 definition, not
-- the live one. This corrects the live row to the key.
--
-- BANDING NOTE: level=1B is the CONTENT/DIFFICULTY band, NOT test membership.
-- The item stays in the L2 booklet — membership is governed by external_id
-- SAM-L2-Q17 + the picker, never the level column.
--
-- Metadata-only: level, strand, content_id (skill/topic "Money/Subtracting
-- amounts of money in dollars" is carried by content_id = l1-measurement-3).
-- Stem, format (NUMERIC_ENTRY), correct answer (16), is_active, difficulty,
-- operation_type, and short_test_eligible are UNCHANGED. Only this one row,
-- only these three columns, change. Idempotent.
--
-- RECONCILIATION: this UPDATE runs after every insert + the content-id backfill,
-- so on `supabase db reset` the row always lands at 1B/measurement/l1-measurement-3
-- — the stale 2A/operations definition cannot re-collapse (last write wins). The
-- historical insert/backfill blocks are left intact (append-only migration history,
-- mirrored byte-for-byte and asserted by content-id-backfill.test.ts); the trailing
-- authoritative UPDATE is the repo's established correction mechanism.
--
-- AGENTS.md §11 parity: mirrored into supabase/seed.sql before the LOCAL-DEV QA SEED marker.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
update questions q
set level = '1B'::half_grade_level,
    strand = 'measurement'::strand,
    content_id = (
      select tc.id from tax_content tc
       where tc.tenant_id = t.id and tc.code = 'l1-measurement-3'
    )
from t
where q.tenant_id = t.id
  and q.external_id = 'SAM-L2-Q17';
