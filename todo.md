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
