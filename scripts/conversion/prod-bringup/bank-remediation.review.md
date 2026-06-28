# Prod bank remediation — REVIEW (human decision required)

_Generated: 2026-06-28T03:05:16.758Z. Source = LOCAL (canonical, invariant-normalized). Target = PROD (direct Postgres)._

These are NOT in `bank-remediation.generated.sql` (lossy, ambiguous, or content-bearing).

## Missing from prod (needs full-row INSERT via loader 05)

_None._

## Held items absent from BOTH sides (not a bank item)

- held `SAM-L4-Q17` is absent from BOTH local and prod — not a bank item, so it cannot be inserted from local. If it must exist, add it to the audited local bank first (CONVERSION lane).

## Prod-only rows (EXTRA — never auto-deleted)

_None._

## Ambiguous: local active but prod inactive (not auto-activated)

_None._

## image_path drift (content, not a flag)

_None._

## content_id not remappable in prod taxonomy

_None._

## Non-flag drift on inactive rows (left as-is)

_None._

## LOCAL canonical invariant violations (fix local seed too)

- LOCAL (canonical) violates is_active=false⟹short=false for: SAM-L0C-Q11, SAM-L1-Q06, SAM-L1-Q08, SAM-L1-Q18, SAM-L2-Q04, SAM-L3-Q19, SAM-L5-Q08, SAM-L6-Q26. Canonical is invariant-normalized for prod remediation, but the local seed should also set short_test_eligible=false on these.
