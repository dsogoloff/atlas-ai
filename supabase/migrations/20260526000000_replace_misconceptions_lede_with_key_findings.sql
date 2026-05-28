-- Atlas Assessment — narration schema swap (Block 2 / "What We Noticed"
-- restructure).
--
-- Replaces the single-string `misconceptions_lede` prose field with two
-- text[] arrays (`findings_strengths`, `findings_growth_areas`) that back
-- the new numbered "What We Noticed" key findings list on the parent
-- report.
--
-- Source of truth:
--   src/lib/report/types.ts ReportNarration.key_findings shape
--   src/lib/report/narration/validate.ts narrationProseSchema
--   src/lib/report/narration/prompt.ts output contract
--
-- Data-loss note: misconceptions_lede stored generated prose only — a
-- cache of LLM output that regenerates from strand_mastery +
-- misconceptions on the next assessment completion (trigger.ts). Dropping
-- the column is safe; lost rows re-populate on the next completion. No
-- backfill path: the new shape (arrays of pattern + description items) is
-- structurally different from the old single sentence and cannot be
-- derived from it.
--
-- Empty arrays are valid (thin-bank case): a child with no measured
-- strand data can have empty findings_strengths, and a child whose
-- classifier surfaced no misconceptions and has no measured strand
-- mastery can have empty findings_growth_areas. validate.ts allows 0-3
-- items per array.
--
-- Schema-only migration; no tenant-scoped row inserts, so no seed.sql
-- mirror required (AGENTS.md §11 parity rule applies to row-inserting
-- migrations).

alter table report_narrations drop column misconceptions_lede;

alter table report_narrations add column findings_strengths    text[];
alter table report_narrations add column findings_growth_areas text[];
