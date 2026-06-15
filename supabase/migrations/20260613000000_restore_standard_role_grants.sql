-- Restore the standard Supabase role grants on the public schema.
--
-- Why this exists
-- ---------------
-- The local dev database drifted into a state where `anon`,
-- `authenticated`, and `service_role` held only REFERENCES/TRIGGER/TRUNCATE
-- on the public tables — they were missing SELECT/INSERT/UPDATE/DELETE.
-- Because RLS is enabled on every table, the row policies were in place but
-- meaningless without the underlying table grants: every read/write through
-- PostgREST and the service-role client failed with "permission denied for
-- table ...". The visible symptoms were a blank center dropdown on parent
-- signup (the service-role read in loadCenters() errored and returned []),
-- a broken signup insert, and "[dashboard] parent lookup failed".
--
-- Hosted Supabase manages these grants for us, so production was unaffected;
-- this migration makes a fresh local `supabase db reset` reproduce the
-- correct, working grants instead of the drifted state. It is idempotent and
-- matches Supabase's own default grant posture, so re-running (or running on
-- an already-correct DB) is a harmless no-op.
--
-- Safety: granting table privileges to anon/authenticated does NOT expose
-- data — RLS (enabled + policied on all public tables) still gates which
-- rows each role can see. `service_role` bypasses RLS by design and is only
-- used by trusted server-side admin code.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public
  to anon, authenticated, service_role;
grant all on all sequences in schema public
  to anon, authenticated, service_role;
grant all on all routines in schema public
  to anon, authenticated, service_role;

-- Cover tables/sequences/routines created by future migrations too.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
