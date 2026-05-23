-- Atlas Assessment — Item #12 Phase 2: relational strand taxonomy.
--
-- Source-of-truth references:
--   docs/taxonomy.md — 2-layer taxonomy: 3 MOE strands, 6 Atlas bands,
--     each band parented to exactly one MOE strand.
--   architecture.md guardrail #1 — tenant_id on every table (v1 =
--     inspirea_singapore_math always). The Phase 2 design KEEPS this
--     guardrail: strands / strand_cohorts / misconception_strands all
--     carry a tenant_id column. v2 evolution path: shared taxonomy via
--     default-tenant pattern (single text PK preserved) OR future
--     per-tenant taxonomy via a follow-up composite-PK migration.
--   AGENTS.md §11 — tenant-scoped row inserts in this migration are
--     no-ops in dev (`supabase db reset` runs migrations before
--     seed.sql creates the inspirea_singapore_math tenant). The same
--     inserts are mirrored verbatim into supabase/seed.sql for the
--     dev/CI write path. Migration is the production-update path.
--
-- What this migration does (narrow additive, Option B):
--   1. Creates `strands` (text PK, kind=moe|band, self-FK parent).
--   2. Creates `strand_cohorts` junction (strand × Atlas product cohort).
--   3. Creates `misconception_strands` junction (misconception × strand).
--   4. Adds nullable FK columns `strand_id_new` to `questions` and
--      `curriculum_recommendations`. Existing `strand` enum columns are
--      NOT touched. Phases 3-7 will backfill, switch reads, then drop
--      the enum columns.
--   5. Seeds the 3 MOE strands + 6 Atlas bands + cross-join of all 6
--      bands × all 4 product cohorts.
--
-- COHORT SEEDING NOTE — flag for founder review:
--   strand_cohorts is seeded as a full cross-join (6 bands × 4 cohorts
--   = 24 rows). The handoff context said "different band membership per
--   cohort," but neither taxonomy.md nor docs/level-subdivision-rubric.md
--   asserts which bands apply to which cohorts. The cross-join is the
--   non-lossy default: every band is currently considered relevant at
--   every cohort. Refinement (e.g., excluding `fractions_decimals` from
--   `prek_1` because P2-only per MOE) is content data and belongs in
--   Phase 3+, not in this structural-migration phase. If founder wants
--   a different default, override the strand_cohorts INSERT below
--   before applying.
--
-- v1 simplification — single-column text PK on strands:
--   strands.id is a plain text PK. tenant_id is a regular column with
--   FK to tenants, satisfying guardrail #1 ("tenant_id on every table"),
--   but is NOT part of the PK. This means in v1 the strand "number_sense"
--   is one row globally, "owned" by inspirea_singapore_math. v2
--   multi-tenant requires either:
--     (a) keep single-row-per-id with a "default tenant" pattern, OR
--     (b) migrate to composite PK (tenant_id, id) so each tenant can
--         have its own taxonomy rows.
--   (b) is a schema-altering follow-up migration; (a) is no schema
--   change. Both paths remain open. v1 doesn't need to decide.
--
-- v2 follow-up tracked: see todo.md — "promote cohort_id CHECK
-- constraint to FK against cohorts table if multi-tenant requires
-- per-tenant cohort definitions."

-- =============================================================================
-- 1. strands (3 MOE strands + 6 Atlas bands; self-referential parenting)
-- =============================================================================

create table strands (
  id               text primary key,
    -- slug; for bands this MUST match the existing `strand` enum value
    -- verbatim so Phase 5+ enum→FK migration is rename-safe.
  tenant_id        uuid not null references tenants(id) on delete cascade,
  kind             text not null check (kind in ('moe', 'band')),
  parent_strand_id text references strands(id) on delete restrict,
    -- self-FK: bands point at their MOE parent. RESTRICT so deleting a
    -- MOE strand with active band children is rejected at the DB layer.
  display_name     text not null,
  sort_order       integer not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint strands_parent_kind_chk check (
    (kind = 'moe'  and parent_strand_id is null) or
    (kind = 'band' and parent_strand_id is not null)
  )
);

create index strands_tenant_idx on strands(tenant_id);
create index strands_kind_idx on strands(kind);
create index strands_parent_idx on strands(parent_strand_id)
  where parent_strand_id is not null;

-- =============================================================================
-- 2. strand_cohorts (strand × Atlas product cohort)
-- =============================================================================
-- cohort_id values are the 4 Atlas product cohorts (founder-locked):
--   prek_1  = Pre-K through Grade 1
--   g2_4    = Grades 2-4
--   g5_6    = Grades 5-6
--   g7_plus = Grade 7 and up
-- No separate `cohorts` table for v1; CHECK constraint enforces the set.
-- v2 promotion to a real `cohorts` table tracked in todo.md.

create table strand_cohorts (
  strand_id  text not null references strands(id) on delete cascade,
  cohort_id  text not null check (cohort_id in (
    'prek_1', 'g2_4', 'g5_6', 'g7_plus'
  )),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  primary key (strand_id, cohort_id)
);

create index strand_cohorts_tenant_idx on strand_cohorts(tenant_id);
create index strand_cohorts_cohort_idx on strand_cohorts(cohort_id);

-- =============================================================================
-- 3. misconception_strands (misconception × strand junction)
-- =============================================================================
-- Replaces the single-strand `misconceptions.strand` enum column in a
-- future phase. v1 misconceptions are all band-scoped, but the junction
-- table allows a misconception to span multiple bands (e.g., a
-- cross-cutting place-value misconception could map to both
-- `number_sense` and `operations_algorithms`). NOT backfilled in Phase 2.

create table misconception_strands (
  misconception_id  uuid not null references misconceptions(id) on delete cascade,
  strand_id         text not null references strands(id) on delete restrict,
  tenant_id         uuid not null references tenants(id) on delete cascade,
  primary key (misconception_id, strand_id)
);

create index misconception_strands_tenant_idx on misconception_strands(tenant_id);
create index misconception_strands_strand_idx on misconception_strands(strand_id);

-- =============================================================================
-- 4. Nullable FK columns ALONGSIDE existing enum columns
-- =============================================================================
-- The existing `strand` enum columns on questions and
-- curriculum_recommendations are deliberately left in place. Phase 3+
-- backfills strand_id_new, Phase 5+ switches reads, Phase 7 drops the
-- enum and renames strand_id_new -> strand. All deferred.

alter table questions
  add column strand_id_new text references strands(id) on delete restrict;

alter table curriculum_recommendations
  add column strand_id_new text references strands(id) on delete restrict;

create index questions_strand_id_new_idx
  on questions(strand_id_new) where strand_id_new is not null;
create index curriculum_recommendations_strand_id_new_idx
  on curriculum_recommendations(strand_id_new) where strand_id_new is not null;

-- =============================================================================
-- 5. RLS — same pattern as misconceptions / curriculum_recommendations
-- =============================================================================
-- All three new tables are reference data: any authenticated user in
-- the same tenant can SELECT; writes are service-role only (no INSERT/
-- UPDATE/DELETE policy).

alter table strands enable row level security;

create policy "strands_tenant_select" on strands
  for select using (tenant_id = app_current_tenant_id());

alter table strand_cohorts enable row level security;

create policy "strand_cohorts_tenant_select" on strand_cohorts
  for select using (tenant_id = app_current_tenant_id());

alter table misconception_strands enable row level security;

create policy "misconception_strands_tenant_select" on misconception_strands
  for select using (tenant_id = app_current_tenant_id());

-- =============================================================================
-- 6. Seed strands + strand_cohorts (production-update path)
-- =============================================================================
-- Per AGENTS.md §11: these tenant-scoped INSERTs are a no-op in dev
-- (`supabase db reset` runs migrations before seed.sql creates the
-- inspirea_singapore_math tenant). The same INSERTs are mirrored
-- verbatim into supabase/seed.sql for the dev/CI write path.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into strands (id, tenant_id, kind, parent_strand_id, display_name, sort_order)
select v.id, t.id, v.kind, v.parent_strand_id, v.display_name, v.sort_order
from t,
  (values
    -- MOE strands (kind='moe', no parent). Slugs are new (Phase 2
    -- introduces the MOE layer). sort_order leaves gaps so band rows
    -- can interleave under their parents in display order.
    ('number_algebra',         'moe',  null::text,             'Number and Algebra',       10),
    ('measurement_geometry',   'moe',  null::text,             'Measurement and Geometry', 20),
    ('statistics',             'moe',  null::text,             'Statistics',               30),
    -- Atlas bands (kind='band'). Slugs match the strand enum verbatim
    -- so the Phase 7 enum→FK rename is a rename, not a re-key.
    -- Band-to-MOE-parent mapping per docs/taxonomy.md.
    ('number_sense',           'band', 'number_algebra',       'Number Sense',             11),
    ('operations_algorithms',  'band', 'number_algebra',       'Operations & Algorithms',  12),
    ('fractions_decimals',     'band', 'number_algebra',       'Fractions & Decimals',     13),
    ('measurement',            'band', 'measurement_geometry', 'Measurement',              21),
    ('geometry',               'band', 'measurement_geometry', 'Geometry',                 22),
    ('data_statistics',        'band', 'statistics',           'Data & Statistics',        31)
  ) as v(id, kind, parent_strand_id, display_name, sort_order)
on conflict (id) do nothing;

-- strand_cohorts: cross-join default (every band in every cohort). See
-- top-of-file "COHORT SEEDING NOTE" — refinement deferred to Phase 3+.

with t as (select id from tenants where slug = 'inspirea_singapore_math')
insert into strand_cohorts (strand_id, cohort_id, tenant_id)
select v.strand_id, v.cohort_id, t.id
from t,
  (values
    ('number_sense',           'prek_1'),
    ('number_sense',           'g2_4'),
    ('number_sense',           'g5_6'),
    ('number_sense',           'g7_plus'),
    ('operations_algorithms',  'prek_1'),
    ('operations_algorithms',  'g2_4'),
    ('operations_algorithms',  'g5_6'),
    ('operations_algorithms',  'g7_plus'),
    ('fractions_decimals',     'prek_1'),
    ('fractions_decimals',     'g2_4'),
    ('fractions_decimals',     'g5_6'),
    ('fractions_decimals',     'g7_plus'),
    ('measurement',            'prek_1'),
    ('measurement',            'g2_4'),
    ('measurement',            'g5_6'),
    ('measurement',            'g7_plus'),
    ('geometry',               'prek_1'),
    ('geometry',               'g2_4'),
    ('geometry',               'g5_6'),
    ('geometry',               'g7_plus'),
    ('data_statistics',        'prek_1'),
    ('data_statistics',        'g2_4'),
    ('data_statistics',        'g5_6'),
    ('data_statistics',        'g7_plus')
  ) as v(strand_id, cohort_id)
on conflict (strand_id, cohort_id) do nothing;

-- misconception_strands: NOT seeded in Phase 2. Backfill deferred to
-- the misconception migration phase (currently Phase 7 in the locked
-- plan). The existing misconceptions.strand enum column remains the
-- source of truth for v1 reads.
