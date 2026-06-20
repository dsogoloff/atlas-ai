# Atlas Assessment — deferred follow-ups

Items that are not v1 scope but should be revisited at the named
trigger. New entries append at the bottom with a one-line context
reference (commit, item number, or section anchor).

## v2 schema

- **Promote `cohort_id` CHECK constraint to FK against a `cohorts`
  table** if v2 multi-tenancy requires per-tenant cohort definitions.
  Current: `strand_cohorts.cohort_id` is `text` with a CHECK constraint
  hardcoding the 4 Atlas product cohorts (`prek_1`, `g2_4`, `g5_6`,
  `g7_plus`). v1 has no use case for per-tenant cohort lists.
  Introduced: Item #12 Phase 2 (commit pending), migration
  `20260519000000_strand_relational_taxonomy.sql`.

## Conversion — held question rows (founder to address)

- **SAM-L3-Q19 — rotating-semicircle "continue the pattern".** Held inactive;
  excluded from QA for now (founder will address later). To be modelled as a
  typed `_____` blank per founder direction, but it has no auto-gradeable answer
  string yet — needs the expected answer before it can be activated. Crops:
  `source/3/L3-19_1.png` (pattern) + `L3-19_2..5.png` (options). Context:
  lane/l3-image-activation (PR #100), held list.
- **SAM-L4-Q17 — "name a pair of perpendicular lines".** Held inactive. Reformat
  as MULTIPLE_CHOICE (free-text line-naming is not reliably auto-gradeable, and
  the perpendicular pair must be confirmed from the figure). Needs the MC option
  set + correct index from the founder. Crop: `source/4/L4-17.png`. Context:
  lane/l4-image-activation (PR #101), held list.
