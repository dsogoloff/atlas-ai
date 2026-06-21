-- Atlas Assessment — Picker Calibration PR3: floor-find manual-placement flag.
--
-- When the comprehensive floor-find walks all the way down without finding a
-- level the child is solid at (fails past the bottom of the loaded library),
-- there is no trustworthy auto-placement: the session sets
-- manual_placement_needed = true and the instructor sets the starting point by
-- hand (with the full floor-find data). Otherwise false (a floor was found).
--
-- Nullable: only comprehensive sessions evaluate it; short / in-progress / legacy
-- sessions leave it null. General schema column (NOT tenant-scoped); written at
-- runtime on comprehensive completion, never seeded — no seed.sql mirror. Runs on
-- both the prod path and the dev `supabase db reset` path (before seed.sql).

alter table assessment_sessions
  add column if not exists manual_placement_needed boolean;
