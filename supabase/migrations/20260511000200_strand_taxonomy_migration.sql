-- Atlas Assessment — Item #12 Phase 2: strand enum migration.
--
-- Source-of-truth references:
--   docs/taxonomy.md — authoritative on the 6 new band names and the
--     old -> new mapping (commit 2c97313, Item #12 Phase 1).
--   AGENTS.md §11 — tenant-scoped row migrations must be mirrored in
--     seed.sql (this migration is mirrored by the seed.sql update in the
--     same Phase 2 commit).
--
-- What this migration does:
--   Replaces the `strand` enum's 6 values with new lowercase names per the
--   Item #12 Phase 1 taxonomy. Three columns are migrated structurally
--   (questions.strand, misconceptions.strand, curriculum_recommendations.strand)
--   via a USING-clause CASE expression that maps each old value to its
--   new-band default per the founder-locked rule:
--
--     NUMBER_SENSE       -> number_sense
--     OPERATIONS         -> operations_algorithms
--     WORD_PROBLEMS      -> operations_algorithms   (Phase 5 audit: Q11, Q17)
--     FRACTIONS_DECIMALS -> fractions_decimals
--     GEOMETRY           -> geometry
--     MEASUREMENT_DATA   -> measurement             (Phase 5 audit: MD_CHART_SCALE)
--
-- Historical migrations are NOT retconned:
--   20260509000000_misconception_classifier_audit.sql (MD_* misconception rows)
--   20260511000000_sam_l2_misconception_taxonomy.sql  (NS_ZERO_VALUE, WP_KEYWORD_TRAP)
--   20260511000100_sam_l2_content_v1.sql              (11 SAM-L2 question rows)
--   These files contain literal old-enum strand strings as historical record
--   of how rows were inserted at that point in time. This Phase 2 cast handles
--   their inserted rows on replay (supabase db reset re-runs the entire
--   migration history, including this one). Editing the historical SQL would
--   destroy the audit trail; the cast is the right primitive.
--
-- Structural-only: row-level correctness audit happens in Phase 5 for the 5
-- ambiguous rows (Q09, Q11, Q17, MD_CHART_SCALE, all curriculum_recommendations
-- placeholders).
--
-- Reverse migration is schema-only restore (recreate old enum, snapshot
-- columns); not bijective. Accepted pre-launch.

-- =============================================================================
-- 1. Create the new strand enum.
-- =============================================================================

create type strand_new as enum (
  'number_sense',
  'operations_algorithms',
  'fractions_decimals',
  'measurement',
  'geometry',
  'data_statistics'
);

-- =============================================================================
-- 2. Cast questions.strand.
-- =============================================================================
-- The partial index questions_tenant_strand_level_idx is rebuilt automatically
-- by Postgres as part of the ALTER TYPE. No manual index drop/recreate needed.

alter table questions
  alter column strand type strand_new using (
    case strand::text
      when 'NUMBER_SENSE'       then 'number_sense'
      when 'OPERATIONS'         then 'operations_algorithms'
      when 'WORD_PROBLEMS'      then 'operations_algorithms'
      when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
      when 'GEOMETRY'           then 'geometry'
      when 'MEASUREMENT_DATA'   then 'measurement'
    end::strand_new
  );

-- =============================================================================
-- 3. Cast misconceptions.strand.
-- =============================================================================

alter table misconceptions
  alter column strand type strand_new using (
    case strand::text
      when 'NUMBER_SENSE'       then 'number_sense'
      when 'OPERATIONS'         then 'operations_algorithms'
      when 'WORD_PROBLEMS'      then 'operations_algorithms'
      when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
      when 'GEOMETRY'           then 'geometry'
      when 'MEASUREMENT_DATA'   then 'measurement'
    end::strand_new
  );

-- =============================================================================
-- 4. Cast curriculum_recommendations.strand.
-- =============================================================================
-- The unique(tenant_id, strand, level) constraint is rebuilt automatically.
-- In the dev path (`supabase db reset`) this table is empty at migration time
-- (seed.sql runs after migrations), so the cast operates on zero rows. In
-- prod, this table has zero rows pre-Item-#12 (no historical migration
-- inserts curriculum_recommendations; seed.sql doesn't run in prod). The
-- cast is therefore a structural no-op on data in both paths — but the
-- column type still gets updated to the new enum.

alter table curriculum_recommendations
  alter column strand type strand_new using (
    case strand::text
      when 'NUMBER_SENSE'       then 'number_sense'
      when 'OPERATIONS'         then 'operations_algorithms'
      when 'WORD_PROBLEMS'      then 'operations_algorithms'
      when 'FRACTIONS_DECIMALS' then 'fractions_decimals'
      when 'GEOMETRY'           then 'geometry'
      when 'MEASUREMENT_DATA'   then 'measurement'
    end::strand_new
  );

-- =============================================================================
-- 5. Drop the old enum and rename the new one to `strand`.
-- =============================================================================

drop type strand;
alter type strand_new rename to strand;
