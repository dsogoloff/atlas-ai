-- =====================================================================
-- PROD BRING-UP — DATA-SAFETY GATE: READ-ONLY USER-DATA INSPECTION
-- =====================================================================
-- Target: PROD = atlas-assessment (ntfaqzueppqymfkefadm), the LIVE DB.
--         NOT atlas-assessment-2 (dead).
--
-- PURPOSE: Option B (rebuild prod schema to repo, then audited bank load)
-- contains DESTRUCTIVE steps (strand enum recast + clearing placeholder
-- question rows). Before ANY destructive step runs, this block PROVES prod
-- holds zero real families — or surfaces any real account so we STOP.
--
-- 100% READ-ONLY: every statement is a SELECT / count / catalog read /
-- RAISE NOTICE. ZERO writes, ZERO DDL, ZERO data changes. Safe on the live DB.
--
-- Run this in the prod Studio SQL editor; copy EVERY result set + the
-- RAISE NOTICE lines back for review. Each numbered section is independent —
-- a missing table in one never aborts the others (all reads are guarded or
-- target tables guaranteed to exist on the live DB).
--
-- DECISION RULE (founder + ATLAS):
--   * All user-data tables empty (0 rows)            -> prod is pure scaffolding; Option B may proceed.
--   * Only obvious test/seed rows (see §2 buckets)   -> review the sample; proceed only after sign-off.
--   * ANY row that looks like a real family          -> STOP. Do not run the rebuild's destructive tail.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ROW COUNTS for every user-data table (the headline numbers).
--    Each guarded by to_regclass so an absent table reports 0 / "absent"
--    rather than erroring and aborting the rest of the block.
-- ---------------------------------------------------------------------
do $$
declare
  t   text;
  n   bigint;
  tbls text[] := array[
    'parents','children','assessment_sessions','responses',
    'question_access_log','consent_records'
  ];
begin
  raise notice '=== USER-DATA ROW COUNTS ===';
  foreach t in array tbls loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      raise notice '  %-22s % rows', t, n;
    else
      raise notice '  %-22s TABLE ABSENT', t;
    end if;
  end loop;
end $$;

-- Same counts as a copyable RESULT SET (only for tables that exist; absent
-- tables simply contribute no row here, never an error).
select t.tbl,
       (select count(*) from parents)             as n_rows
from (values ('parents')) t(tbl)            where to_regclass('public.parents') is not null
union all select 'children',            (select count(*) from children)            where to_regclass('public.children') is not null
union all select 'assessment_sessions', (select count(*) from assessment_sessions) where to_regclass('public.assessment_sessions') is not null
union all select 'responses',           (select count(*) from responses)           where to_regclass('public.responses') is not null
union all select 'question_access_log',  (select count(*) from question_access_log)  where to_regclass('public.question_access_log') is not null
union all select 'consent_records',     (select count(*) from consent_records)     where to_regclass('public.consent_records') is not null
order by tbl;


-- ---------------------------------------------------------------------
-- 2. PARENTS — created_at range + real-vs-test/seed email classification.
--    Heuristic test/seed patterns: @local.test, example.com/.org, @test,
--    qa- prefix, +test plus-tag, @inspirea (internal). Anything NOT matching
--    is treated as POTENTIALLY REAL and must be eyeballed in §2b.
--    Guarded: if parents is absent this whole block is a NOTICE, not an error.
-- ---------------------------------------------------------------------
do $$
declare
  n_total int; n_real int; lo timestamptz; hi timestamptz;
begin
  if to_regclass('public.parents') is null then
    raise notice 'parents: TABLE ABSENT — nothing to classify.';
    return;
  end if;
  execute $q$
    select count(*),
           count(*) filter (where not (
             lower(email) like '%@local.test'
             or lower(email) like '%@example.com'  or lower(email) like '%@example.org'
             or lower(email) like '%@test%'        or lower(email) like 'qa-%'
             or lower(email) like '%+test%'        or lower(email) like '%@inspirea%'
           )),
           min(created_at), max(created_at)
    from parents
  $q$ into n_total, n_real, lo, hi;
  raise notice '=== PARENTS ===';
  raise notice '  total: %   created_at: % .. %', n_total, lo, hi;
  raise notice '  emails NOT matching a test/seed pattern (POTENTIALLY REAL): %', n_real;
  if n_real > 0 then
    raise notice '  >>> POTENTIALLY REAL PARENTS PRESENT — review §2b sample, do NOT run destructive tail until cleared.';
  end if;
end $$;

-- 2b. PARENTS sample (only if the table exists) — eyeball the actual emails
--     and the created_at spread. Masked local-part so the raw address isn't
--     splattered in logs, but the pattern (real name vs qa-/test) stays visible.
select
  left(email, 3) || '***@' || split_part(email, '@', 2) as email_masked,
  case
    when lower(email) like '%@local.test' or lower(email) like '%@example.com'
      or lower(email) like '%@example.org' or lower(email) like '%@test%'
      or lower(email) like 'qa-%' or lower(email) like '%+test%'
      or lower(email) like '%@inspirea%'
    then 'test/seed' else 'POTENTIALLY REAL'
  end as classification,
  name,
  created_at
from parents
order by created_at
limit 50;

-- 2c. Email DOMAIN breakdown (a fast tell — all @local.test/@example.com = scaffolding).
select split_part(lower(email), '@', 2) as domain, count(*) as n
from parents
group by 1
order by n desc;


-- ---------------------------------------------------------------------
-- 3. CHILDREN — count, created_at range, birth_year spread + tiny sample.
--    Real families show varied real names + plausible birth years; seed data
--    is usually a handful of "Test Child" / sequential names.
-- ---------------------------------------------------------------------
do $$
declare n int; lo timestamptz; hi timestamptz;
begin
  if to_regclass('public.children') is null then
    raise notice 'children: TABLE ABSENT.'; return;
  end if;
  execute 'select count(*), min(created_at), max(created_at) from children'
    into n, lo, hi;
  raise notice '=== CHILDREN === total: %  created_at: % .. %', n, lo, hi;
end $$;

select left(name, 1) || '***' as name_masked, birth_year, grade_level, created_at
from children
order by created_at
limit 50;


-- ---------------------------------------------------------------------
-- 4. ASSESSMENT_SESSIONS — count by status + created_at range + sample.
--    Any COMPLETED session = a child actually took an assessment = real-data signal.
-- ---------------------------------------------------------------------
select status, count(*) as n,
       min(created_at) as first_created, max(created_at) as last_created
from assessment_sessions
group by status
order by status;

select id, child_id, status, started_at, completed_at
from assessment_sessions
order by created_at
limit 25;


-- ---------------------------------------------------------------------
-- 5. RESPONSES — count + range (each row is a child's actual answer).
--    Non-zero responses is the strongest "real usage" signal. No answer
--    payloads sampled — count + timing is enough to detect real activity.
-- ---------------------------------------------------------------------
do $$
declare n bigint; lo timestamptz; hi timestamptz; has_created boolean;
begin
  if to_regclass('public.responses') is null then
    raise notice 'responses: TABLE ABSENT.'; return;
  end if;
  has_created := exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='responses' and column_name='created_at');
  if has_created then
    execute 'select count(*), min(created_at), max(created_at) from responses' into n, lo, hi;
    raise notice '=== RESPONSES === total: %  created_at: % .. %', n, lo, hi;
  else
    execute 'select count(*) from responses' into n;
    raise notice '=== RESPONSES === total: %  (no created_at column)', n;
  end if;
end $$;


-- ---------------------------------------------------------------------
-- 6. QUESTION_ACCESS_LOG — count only (per-child question exposure log).
-- ---------------------------------------------------------------------
do $$
declare n bigint;
begin
  if to_regclass('public.question_access_log') is null then
    raise notice 'question_access_log: TABLE ABSENT.'; return;
  end if;
  execute 'select count(*) from question_access_log' into n;
  raise notice '=== QUESTION_ACCESS_LOG === total: %', n;
end $$;


-- ---------------------------------------------------------------------
-- 7. AUTH.USERS — count if reachable (Studio runs as a privileged role, so
--    auth.users is normally selectable). Guarded so a permission/visibility
--    issue reports a NOTICE instead of aborting the block.
-- ---------------------------------------------------------------------
do $$
declare n bigint;
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth.users: NOT REACHABLE from this role.'; return;
  end if;
  begin
    execute 'select count(*) from auth.users' into n;
    raise notice '=== AUTH.USERS === total: %  (includes any admin logins; cross-check vs parents+admins)', n;
  exception when insufficient_privilege then
    raise notice 'auth.users: present but not selectable by this role (insufficient_privilege).';
  end;
end $$;


-- =====================================================================
-- END USER-DATA INSPECTION.
-- Copy every RESULT SET + every RAISE NOTICE line back for review.
--   * All zeros / only test-seed patterns -> Option B destructive tail is clear to run.
--   * Any POTENTIALLY REAL parent, any real child, or any COMPLETED session /
--     non-zero responses -> STOP and escalate before touching prod.
-- =====================================================================
