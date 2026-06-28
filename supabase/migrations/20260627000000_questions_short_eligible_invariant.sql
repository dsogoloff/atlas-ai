-- Atlas Assessment — short-test eligibility invariant (lane/bank-source-invariant-fix).
--
-- Hard bank rule: a non-servable (is_active=false) item can NEVER be short-test
-- eligible. The picker already requires is_active AND short_test_eligible, so this
-- is defence-in-depth at the data layer: it makes a half-flagged held row
-- (is_active=false, short_test_eligible=true) INVALID by construction, so a future
-- prod catch-up or seed bulk-update cannot silently re-introduce the drift that the
-- bank flag-level parity check (scripts/conversion/prod-bringup/10-verify-prod-bank.ts)
-- surfaced. Additive; picked up on the next prod catch-up.
--
-- check (is_active or not short_test_eligible) ≡ NOT (is_active=false AND short=true).
-- Idempotent: drop-if-exists then add.

alter table questions drop constraint if exists questions_inactive_not_short_eligible;

alter table questions add constraint questions_inactive_not_short_eligible
  check (is_active or not short_test_eligible);
