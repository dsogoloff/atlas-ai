-- Atlas Assessment — follow-up lead form: explicit opt-in + zip/location.
--
-- The short-test "find an assessment near us" capture form now collects an
-- EXPLICIT, required opt-in (the parent must consent to a local S.A.M center
-- contacting them) and a required zip/location. Both are added here as new
-- columns on follow_up_leads. The previously-collected "best time to reach"
-- field is being retired from the form; its column (best_time_to_reach) is
-- LEFT IN PLACE (no destructive drop) — the server simply stops writing it, so
-- old rows keep their value and the column NULLs on new inserts.
--
--   opted_in : explicit parent consent to be contacted. NOT NULL. Added with a
--              `default false` backstop so the ALTER is safe on the forward
--              (production) path even if a pre-existing lead row exists; the
--              server only ever inserts `true` (it rejects an unchecked/false
--              opt-in before persisting), so the default is never the real
--              value of a genuine lead.
--   zip      : parent-entered zip/location (free text — pilot triage is manual,
--              no geocoding). Required at the form + server layer; kept nullable
--              at the DB to keep this forward ALTER safe, mirroring how
--              school_name is app-gated rather than DB-NOT-NULL.
--
-- No seed.sql mirror: follow_up_leads carries NO tenant-scoped seed ROW data
-- (seed.sql never inserts into it — all writes are service-role at runtime), so
-- there is nothing to mirror. This DDL runs on both the production-update path
-- and the dev `supabase db reset` path (migrations run before seed.sql).

alter table follow_up_leads
  add column opted_in boolean not null default false,
  add column zip      text;
