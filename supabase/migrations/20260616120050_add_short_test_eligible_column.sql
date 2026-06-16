-- Atlas Assessment — add the item-level short-test eligibility flag to
-- questions (lane/l0-authoring; field name is authoritative, from ATLAS).
--
-- Source of truth: each S.A.M. worksheet's last-page Question Summary "Short"
-- column (Yes/No), the same authority used for level mapping. The ATLAS short
-- picker reads this column LITERALLY as `short_test_eligible` — the name must
-- not change or alias, or short-test filtering silently breaks.
--
-- General schema column (NOT tenant-scoped): boolean, default false. Existing
-- rows get false; the L0 overlay load (next migration) sets it true for items
-- the Summary marks Short = Y. Runs on BOTH the prod path and the dev
-- `supabase db reset` path (before seed.sql), so the column DDL needs NO
-- seed.sql mirror; the per-row VALUES are mirrored in the l0-overlay seed block.

alter table questions
  add column if not exists short_test_eligible boolean not null default false;
