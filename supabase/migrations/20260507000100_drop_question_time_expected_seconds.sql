-- Atlas Assessment — drop unused questions.time_expected_seconds.
--
-- T_expected depends on the grade a question is SERVED at, not just the
-- question's authored level — it cannot be cached as a per-question
-- column. The flagger computes T_expected at flag-time and persists it
-- per response in Migration B's responses.expected_time_sec column.
-- Verified unused via grep across src/ at 2026-05-07.
--
-- Isolated in its own migration (separate from A1's additive changes)
-- so this destructive drop can be rolled back independently if needed.

alter table questions drop column time_expected_seconds;
