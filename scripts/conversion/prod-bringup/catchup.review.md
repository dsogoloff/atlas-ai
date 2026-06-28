# Prod schema catch-up — REVIEW (human decision required)

_Generated: 2026-06-28T02:40:34.281Z. Source = LOCAL (canonical). Target = PROD (read-only, direct Postgres)._

Everything below is **NOT** auto-fixed by `catchup.generated.sql` because it is
non-additive or lossy. Decide each manually. (Attribute drift — type/nullable/default —
is covered by 07/09, not here; this file is presence/additive only.)

## Column TYPE divergence (exists in both, differing type)

_None._

## Column NULLABILITY divergence (exists in both)

- `responses.expected_time_sec`: local NOT NULL, prod NULLABLE (prod looser)
- `responses.time_ratio`: local NOT NULL, prod NULLABLE (prod looser)
- `responses.time_flag_config_version`: local NOT NULL, prod NULLABLE (prod looser)
- `responses.used_fallback`: local NOT NULL, prod NULLABLE (prod looser)

## NOT NULL columns added as NULLABLE (no default — backfill then tighten manually)

_None._

## PROD-only TABLES (exist in prod, absent in local — NOT dropped)

_None._

## PROD-only COLUMNS (exist in prod, absent in local — NOT dropped)

- `questions.time_expected_seconds`
- `report_narrations.misconceptions_lede`

## PROD-only enum VALUES (present in prod, absent in local — INFO)

_None._

## Scope notes

- **RLS policies:** prod's `pg_policies` IS read (direct Postgres); Section 5 emits only
  the policies/RLS-enables prod is actually missing (still guarded, safe to re-run).
- **Constraints / indexes:** only NEW-table constraints/indexes are emitted (Section 6);
  existing-table constraint/index drift is not reconciled here.
- **Attribute drift** (type / nullability / default on shared columns) is handled by
  07 (verify) + 09 (remediation), not this additive catch-up.
