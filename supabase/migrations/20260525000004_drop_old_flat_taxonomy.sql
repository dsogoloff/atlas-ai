-- Atlas Assessment — drop the old flat taxonomy (Item #12 Phase 9 Part A).
--
-- Phase 8 (3a6def9) completed the report's move off the old flat taxonomy
-- (3 MOE strands + 6 band sub-strands in the `strands` table) onto the
-- V2026 two-level taxonomy (tax_strands / tax_sub_strands / tax_levels /
-- tax_content). The old structures created in 20260519 + backfilled in
-- 20260520 are dead application-side — Phase 9 audit confirmed zero
-- references in src/ outside the auto-generated database.types.ts.
--
-- This migration drops:
--   * questions.strand_id_new                     — text FK column (20260519)
--   * curriculum_recommendations.strand_id_new    — same
--   * misconception_strands                       — join table
--   * strand_cohorts                              — M:N strand × cohort
--   * strands                                     — old MOE+band hierarchy
--
-- NOT touched (engine surface, separate concern):
--   * questions.strand / misconceptions.strand /
--     curriculum_recommendations.strand           — engine 6-value enum columns
--   * `strand` enum                               — engine sum type (EngineStrand)
--
-- Order: drop FK columns first, then the dependent join tables, then
-- the strands table itself. Each step is explicit (no CASCADE) so the
-- dependency chain stays visible in review.

-- 1. Drop strand_id_new columns (each FKs into strands.id).
alter table questions drop column strand_id_new;
alter table curriculum_recommendations drop column strand_id_new;

-- 2. Drop the dependent tables (both FK into strands.id).
drop table misconception_strands;
drop table strand_cohorts;

-- 3. Drop the strands table.
drop table strands;
