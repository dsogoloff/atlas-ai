-- Atlas Assessment — add response and session time-flag columns.
--
-- Source-of-truth references:
--   features.md §1, §2 — Response and session-level shapes
--   src/lib/timeFlagging/{flagger,serialization}.ts — TS code that
--     populates these columns and the time_flag_summary jsonb shape
--   compliance.md §3, §7 — collected data + config-version audit
--
-- Type widening on responses.time_taken_seconds from INTEGER to
-- NUMERIC(10,3) is required for sub-second precision so the 1.0s
-- INVALID floor is enforceable. Brings the column into alignment with
-- features.md §1, which specified `numeric` from the start.

-- =============================================================================
-- Enums (mirror src/lib/timeFlagging/types.ts exactly)
-- =============================================================================

create type time_flag as enum ('INVALID', 'TOO_FAST', 'TOO_SLOW', 'NORMAL');

create type session_time_flag as enum (
  'unreliable',
  'rushed',
  'struggling',
  'mixed',
  'normal'
);

-- =============================================================================
-- responses — type-widen time_taken_seconds + add four time-flag columns.
-- =============================================================================

-- Sub-second precision: required for the 1.0s INVALID floor.
-- The inline CHECK (time_taken_seconds >= 0) from the initial schema
-- carries through the type change automatically: Postgres preserves
-- CHECK constraints across ALTER COLUMN TYPE when the expression is
-- type-agnostic (`>= 0` is valid against integer and numeric alike).
alter table responses
  alter column time_taken_seconds type numeric(10,3)
    using time_taken_seconds::numeric(10,3);

-- Transient defaults during ALTER so any existing rows satisfy NOT NULL,
-- then dropped so future INSERTs must supply values from the flagger.
-- used_fallback enables session-level fallback_count / fallback_ratio
-- telemetry on assessment_sessions.time_flag_summary; without persisting
-- it per response, those counters would always read 0 from the DB.
alter table responses
  add column expected_time_sec        numeric(10,3) not null default 0,
  add column time_ratio               numeric(8,4)  not null default 0,
  add column time_flag                time_flag     not null default 'NORMAL',
  add column time_flag_config_version text          not null default '',
  add column used_fallback            boolean       not null default false;

alter table responses
  alter column expected_time_sec        drop default,
  alter column time_ratio               drop default,
  alter column time_flag                drop default,
  alter column time_flag_config_version drop default,
  alter column used_fallback            drop default;

-- Partial index: only non-NORMAL flags drive diagnostic / aggregation
-- queries. Mirrors the pattern on questions_tenant_strand_level_idx
-- (...) where is_active.
create index responses_time_flag_idx
  on responses(time_flag) where time_flag <> 'NORMAL';

-- =============================================================================
-- assessment_sessions — session-level rollup (nullable; populated at close).
-- =============================================================================
--
-- shape of time_flag_summary: SessionSummaryJson per
-- src/lib/timeFlagging/types.ts (snake_case keys per Decision 6).
-- Translate to/from in-memory SessionFlagResult via
-- src/lib/timeFlagging/serialization.ts; never rename by hand.

alter table assessment_sessions
  add column session_time_flag  session_time_flag,
  add column time_flag_summary  jsonb;
