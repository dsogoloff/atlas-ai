# Prod schema catch-up — REVIEW (human decision required)

_Generated: 2026-06-27T21:19:22.819Z. Source = LOCAL (canonical). Target = PROD (read-only via PostgREST)._

Everything below is **NOT** auto-fixed by `catchup.generated.sql` because it is either
non-additive, lossy, or unverifiable from prod. Decide each manually.

## Column TYPE divergence (exists in both, differing type)

- `responses.time_taken_seconds`: local `numeric(10,3)` vs prod `integer`

## Column NULLABILITY divergence (exists in both)

_None._

## NOT NULL columns added as NULLABLE (no default — backfill then tighten manually)

- `responses.expected_time_sec` is **NOT NULL with no default** in local. Added to prod as **nullable** (a NOT NULL add would fail on any existing row). Founder must backfill then `ALTER COLUMN ... SET NOT NULL` manually.
- `responses.time_ratio` is **NOT NULL with no default** in local. Added to prod as **nullable** (a NOT NULL add would fail on any existing row). Founder must backfill then `ALTER COLUMN ... SET NOT NULL` manually.
- `responses.time_flag_config_version` is **NOT NULL with no default** in local. Added to prod as **nullable** (a NOT NULL add would fail on any existing row). Founder must backfill then `ALTER COLUMN ... SET NOT NULL` manually.
- `responses.used_fallback` is **NOT NULL with no default** in local. Added to prod as **nullable** (a NOT NULL add would fail on any existing row). Founder must backfill then `ALTER COLUMN ... SET NOT NULL` manually.

## PROD-only TABLES (exist in prod, absent in local — NOT dropped)

_None._

## PROD-only COLUMNS (exist in prod, absent in local — NOT dropped)

- `questions.time_expected_seconds`
- `report_narrations.misconceptions_lede`

## PROD-only enum VALUES (present in prod, absent in local — INFO)

_None._

## Channel limitations (read before trusting the diff)

- **RLS policies:** prod's `pg_policies` is **not readable** via PostgREST. Section 5 of
  the generated SQL emits *all* local policies guarded by an apply-time `pg_policies`
  check, so already-present policies are skipped — but this report **cannot** list which
  policies prod is actually missing. Verify in Studio after applying.
- **Constraints / indexes:** not readable from prod via PostgREST. Only NEW-table
  constraints/indexes are emitted (Section 6). Existing-table constraint/index drift is
  **not** detected here.
- **Enum completeness:** prod enum values are read only from enum-typed *exposed columns*
  (PostgREST OpenAPI). An enum type used by no column would read as "missing" and be
  emitted as a guarded `CREATE TYPE` (safe — skipped at apply time if it already exists).
