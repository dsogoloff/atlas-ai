-- ATLAS-004 (light) — durable counters for the AI spend ceiling and auth rate limits.
--
-- WHY POSTGRES AND NOT MEMORY
-- ---------------------------
-- This app runs on Vercel serverless. An in-process limiter is per-INSTANCE:
-- concurrent lambdas each keep their own count, and every deploy resets them.
-- Against a scripted attacker — who will happily be spread across instances —
-- that is close to no limit at all, and for a SPEND ceiling it is worse than
-- useless because the failure mode is silent money. There is no Redis in this
-- stack, so Postgres is the durable store we already have.
--
-- ONE PRIMITIVE, TWO JOBS. consume_quota() is a fixed-window counter:
--
--   AI per-session   bucket 'ai:session:<uuid>'  window 0     (cumulative)
--   AI global daily  bucket 'ai:global'          window 86400
--   auth per-IP      bucket 'auth:login:ip:<ip>' window 900
--   auth per-email   bucket 'auth:login:em:<h>'  window 900
--
-- A fixed window (rather than a sliding log) is the right trade at pilot scale:
-- one row per bucket per window, one statement to consume, no cleanup pressure
-- in the hot path. Its known weakness is a burst straddling a window boundary
-- allowing up to 2x the limit briefly — acceptable here, and Bar 2 owns the
-- fuller controls.
--
-- CLOCK AUTHORITY IS THE DATABASE. The window is computed from now() inside the
-- function, never passed in, so serverless clock skew cannot widen a window and
-- a caller cannot choose a favourable one.
--
-- PRIVACY. Bucket keys are opaque strings written by the app. The app hashes
-- any email before it appears in a key (see src/lib/quota/keys.ts) — this table
-- must never hold an address, a child id, or anything identifying.
--
-- ACCESS. No client write path at all: the function is SECURITY DEFINER and
-- EXECUTE is granted to service_role ONLY. Rate limiting that a client can
-- influence is not rate limiting. RLS is enabled with no policy, so even a
-- direct PostgREST read returns nothing.
--
-- UPGRADE PATH (current prod schema -> this)
-- -----------------------------------------
-- Purely additive: one table, one function. Nothing existing is altered and no
-- data is read or written. Re-runnable (IF NOT EXISTS / CREATE OR REPLACE).
--
-- HOUSEKEEPING (not in this migration). Expired rows accumulate — at pilot
-- volume that is a few thousand rows a year, which is nothing, and the index
-- below makes a future sweep trivial:
--   delete from rate_limit_counters where window_start < now() - interval '7 days';
-- Deliberately NOT a pg_cron job here: scheduling belongs with the Bar 2
-- observability work, not smuggled into a rate-limit migration.
--
-- ROLLBACK
-- --------
--   drop function if exists consume_quota(text, integer, integer);
--   drop table if exists rate_limit_counters;
-- Dropping these disables both protections; the app fails OPEN for auth limits
-- (a limiter that cannot reach its store must not lock everyone out) and fails
-- CLOSED for the AI ceiling (see src/lib/quota/store.ts for why they differ).

create table if not exists rate_limit_counters (
  bucket       text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (bucket, window_start)
);

create index if not exists rate_limit_counters_window_idx
  on rate_limit_counters (window_start);

comment on table rate_limit_counters is
  'ATLAS-004: fixed-window counters for the AI spend ceiling and auth rate limits. Opaque bucket keys only — never an email, child id or other identifier.';

alter table rate_limit_counters enable row level security;
-- Intentionally NO policy: nothing reaches this table except the SECURITY
-- DEFINER function below, called with the service role.

revoke all on table rate_limit_counters from anon, authenticated;

-- =============================================================================
-- consume_quota — atomically count one use and report whether it was allowed
-- =============================================================================
-- Returns the post-increment count so a caller can log how far over a ceiling
-- it went. The increment happens even when over the limit: that keeps the
-- statement single-shot, and an inflated counter changes no decision.
--
-- p_window_seconds <= 0 means a CUMULATIVE bucket with no expiry — used for the
-- per-session AI cap, where "this one assessment" is the window.

create or replace function consume_quota(
  p_bucket         text,
  p_window_seconds integer,
  p_limit          integer
)
returns table (allowed boolean, used integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  if p_bucket is null or btrim(p_bucket) = '' then
    raise exception 'consume_quota: bucket is required'
      using errcode = 'check_violation';
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 then
    v_window_start := 'epoch'::timestamptz;
  else
    v_window_start := to_timestamp(
      floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
    );
  end if;

  insert into rate_limit_counters (bucket, window_start, count, updated_at)
  values (p_bucket, v_window_start, 1, now())
  on conflict (bucket, window_start) do update
    set count = rate_limit_counters.count + 1,
        updated_at = now()
  returning rate_limit_counters.count into v_count;

  allowed  := v_count <= p_limit;
  used     := v_count;
  reset_at := case
                when p_window_seconds is null or p_window_seconds <= 0
                  then null
                else v_window_start + make_interval(secs => p_window_seconds)
              end;
  return next;
end;
$$;

-- Service role ONLY. A limit a client can call is a limit a client can exhaust
-- on someone else's behalf, so anon/authenticated get nothing —
-- 20260613000000_restore_standard_role_grants.sql grants EXECUTE on all
-- routines to them by default, which makes this REVOKE load-bearing.
revoke all on function consume_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function consume_quota(text, integer, integer) to service_role;

comment on function consume_quota(text, integer, integer) is
  'ATLAS-004: fixed-window quota consumption. Service-role only; window computed from now() inside the function so callers cannot choose it.';
