-- =============================================================================
-- Atlas Assessment — DEV-ONLY instructor-roster link seed
-- =============================================================================
-- Founder QA aid. Creates ONE instructor login and links its roster to an
-- EXISTING parent account's children, BY EMAIL, so the instructor portal shows
-- that parent's kids. Use after you have signed up as a parent and added
-- children in the running dev app.
--
-- How it links: the instructor roster is RLS-scoped to children whose
-- `home_center_id` equals the instructor's `center_id` (see
-- src/app/(instructor)/instructor/lib/roster.ts). So this script (a) finds the
-- center your children are at, (b) attaches the QA instructor to that same
-- center, and (c) — dev-only — normalises ALL of that parent's children onto
-- that one center, so every child shows on the roster even if you picked
-- different centers at signup.
--
-- NOT a migration. Idempotent: re-run any time (safe `on conflict` / no-op
-- updates). Re-running after the kids move centers re-aligns the instructor.
-- Does NOT touch the dev-seed-instructor-pilot.sql data (different UUID prefix).
--
-- Credentials created:
--   instructor  qa-instructor@atlas.test  /  Atlas-Pilot-2026
--
-- Studio-paste-ready: no psql backslash meta-commands. Paste the whole file
-- into Supabase Studio's SQL editor and Run. The final SELECT is the result
-- grid; every count should be >= 1 (see the self-check note at the bottom).
--
-- UUIDs keep the v4 nibbles (4 at pos 13, 8 at pos 17) so they pass the Zod
-- uuid checks on the assessment routes, per the note in seed.sql.
-- =============================================================================

begin;

-- crypt()/gen_salt() are schema-qualified to `extensions` so this works in the
-- Studio SQL editor regardless of the session search_path (the raw editor does
-- NOT put `extensions` on the path; an unqualified crypt() would throw and roll
-- back the whole transaction, leaving no login — the "invalid credentials"
-- symptom).

-- -----------------------------------------------------------------------------
-- 0. CONTEXT — resolve parent, tenant, and target center.
--    >>> EDIT THE EMAIL ON THE NEXT LINE to your parent account, then Run. <<<
-- -----------------------------------------------------------------------------
create temporary table _qa_ctx on commit drop as
with input as (
  select 'parent@example.com'::text as parent_email   -- <<< EDIT ME
),
p as (
  select id as parent_id, tenant_id
  from parents
  where email = (select parent_email from input)
)
select
  p.parent_id,
  p.tenant_id,
  coalesce(
    -- the center most of this parent's children are already at
    (select c.home_center_id
       from children c
      where c.parent_id = p.parent_id
        and c.home_center_id is not null
      group by c.home_center_id
      order by count(*) desc
      limit 1),
    -- else the dev "Singapore HQ" placeholder center in this tenant
    (select id from centers
      where tenant_id = p.tenant_id and name like '%Singapore HQ' limit 1),
    -- else any center in this tenant
    (select id from centers where tenant_id = p.tenant_id order by created_at limit 1)
  ) as center_id
from p;

-- Fail loudly if the parent email is wrong or the tenant has no center, instead
-- of silently creating an orphan instructor with an empty roster.
do $$
declare ctx record;
begin
  select * into ctx from _qa_ctx;
  if ctx.parent_id is null then
    raise exception '[qa-roster seed] no parent found for that email — sign up / add children first, and check the EDIT ME line.';
  end if;
  if ctx.center_id is null then
    raise exception '[qa-roster seed] no center found for the parent''s tenant — run supabase db reset first (the base seed creates the dev centers).';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. QA instructor — GoTrue user + identity.
-- -----------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  'a7200000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'qa-instructor@atlas.test',
  extensions.crypt('Atlas-Pilot-2026', extensions.gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"QA Instructor"}'::jsonb,
  now(), now(), false, false,
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'a7200000-0000-4000-8000-000000000001',
  'a7200000-0000-4000-8000-000000000001',
  'email',
  '{"sub":"a7200000-0000-4000-8000-000000000001","email":"qa-instructor@atlas.test","email_verified":true,"phone_verified":false}'::jsonb,
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

-- -----------------------------------------------------------------------------
-- 2. instructors profile — attached to the parent's children's center.
--    on-conflict UPDATE so a re-run re-aligns the center if the kids moved.
-- -----------------------------------------------------------------------------
insert into instructors (id, auth_user_id, tenant_id, center_id, email, name, status)
select
  'a7200000-0000-4000-8000-000000000002',
  'a7200000-0000-4000-8000-000000000001',
  ctx.tenant_id,
  ctx.center_id,
  'qa-instructor@atlas.test',
  'QA Instructor',
  'ACTIVE'::instructor_status
from _qa_ctx ctx
on conflict (id) do update
  set center_id = excluded.center_id,
      tenant_id = excluded.tenant_id,
      status    = 'ACTIVE'::instructor_status;

-- -----------------------------------------------------------------------------
-- 3. DEV-ONLY roster normalisation — put every one of this parent's children
--    on the instructor's center so the whole family shows on the roster.
--    No-op on re-run (only updates rows whose center differs).
-- -----------------------------------------------------------------------------
update children c
   set home_center_id = ctx.center_id
  from _qa_ctx ctx
 where c.parent_id = ctx.parent_id
   and c.home_center_id is distinct from ctx.center_id;

commit;

-- -----------------------------------------------------------------------------
-- Self-check (result grid). Expect: instructor_row = 1, password_ok = 1,
-- children_on_roster = the number of children you added for that parent
-- (e.g. 4). If children_on_roster = 0, the parent has no children yet — add
-- them in the app, then re-run this script.
-- -----------------------------------------------------------------------------
select
  (select count(*) from instructors
     where email = 'qa-instructor@atlas.test' and status = 'ACTIVE')        as instructor_row,
  (select count(*) from auth.users
     where email = 'qa-instructor@atlas.test'
       and encrypted_password = extensions.crypt('Atlas-Pilot-2026', encrypted_password))
                                                                            as password_ok,
  (select count(*)
     from children ch
     join instructors i on i.email = 'qa-instructor@atlas.test'
    where ch.home_center_id = i.center_id)                                 as children_on_roster;
