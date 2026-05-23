-- Atlas Assessment — Item #12 Phase 3: backfill relational strand columns.
--
-- Phase 2 (20260519000000) added nullable `strand_id_new` FK columns to
-- `questions` and `curriculum_recommendations`, plus the
-- `misconception_strands` junction table. This phase backfills those
-- columns/rows from the existing `strand` enum columns. Enum columns
-- stay in place. No reads switch yet — that is Phase 5.
--
-- Per AGENTS.md §11: in dev (`supabase db reset`) the migration runs
-- before seed.sql populates the source tables, so the UPDATEs and
-- INSERT below are no-ops during reset. The same three statements are
-- mirrored verbatim at the end of supabase/seed.sql so the dev/CI
-- write path produces the same backfilled state. The migration is the
-- production-update path.
--
-- Cast safety: the strand enum values (number_sense, operations_algorithms,
-- fractions_decimals, measurement, geometry, data_statistics) are the
-- 6 band slugs from Phase 2 verbatim, so `strand::text` resolves to a
-- valid `strands.id` FK target for every row.
--
-- Idempotency: WHERE strand_id_new IS NULL on the UPDATEs and ON
-- CONFLICT DO NOTHING on the INSERT make this migration safe to re-run
-- and safe to run after Phase 5 has begun overwriting strand_id_new.

-- 1. Backfill questions.strand_id_new from the strand enum.
update questions
set strand_id_new = strand::text
where strand_id_new is null;

-- 2. Backfill curriculum_recommendations.strand_id_new likewise.
update curriculum_recommendations
set strand_id_new = strand::text
where strand_id_new is null;

-- 3. Backfill misconception_strands (1:1 from misconceptions.strand).
--    v1 misconceptions all have exactly one strand. The junction table
--    allows multi-strand misconceptions in the future without schema
--    change.
insert into misconception_strands (misconception_id, strand_id, tenant_id)
select id, strand::text, tenant_id
from misconceptions
on conflict (misconception_id, strand_id) do nothing;
