-- Atlas Assessment — V2026 taxonomy schema (Item #12 Phase 5).
--
-- Source-of-truth references:
--   docs/sam-v2026-taxonomy.md §7 (machine-readable seed payload — the
--     authoritative shape this migration must match)
--
-- Four EMPTY tables for the new two-level taxonomy hierarchy. Phase 5
-- creates the schema only; Phase 6 seeds the rows.
--
-- Naming: `tax_` prefix avoids collision with the existing flat-taxonomy
-- `strands` table (from 20260519). The old flat tables (20260519 +
-- 20260520) remain in place, untouched, until Phase 7 wires the new
-- taxonomy onto `questions`.
--
-- Hierarchy:
--   tax_strands       (3 top-level: Number/Algebra, Measurement/Geometry, Statistics)
--   tax_sub_strands   (12, each FK → tax_strands)
--   tax_levels        (9: 0A, 0B, 0C, 1–6)
--   tax_content       (145 items when seeded, each FK → BOTH tax_sub_strands
--                     AND tax_levels)
--
-- The level_id axis on tax_content is DISTINCT from questions.level (the
-- engine's grade-half enum KA…8B). Phase 7 will wire tax_content onto
-- `questions`; do not conflate the two axes.
--
-- RLS: tenant-scoped SELECT policy on every table; writes service-role
-- only, mirroring the pattern in 20260519 (strands, strand_cohorts).
--
-- Fixed columns per the Phase 5 brief: tenant_id, id, created_at,
-- updated_at, code, name, display_order, unique (tenant_id, code).
-- Spec-derived additions:
--   * mvp boolean — on tax_levels and tax_content (mirrors §7 JSON).
--   * applies_to_level_codes text[] — on tax_sub_strands (denormalised
--     from §7 JSON's "applies" array of level keys). Kept as text[] not
--     a join table because reads are always per-(strand,level) and the
--     list is small and stable. Lookup against tax_levels.code.

-- =============================================================================
-- tax_strands — top-level math strands (3 rows when seeded)
-- =============================================================================

create table tax_strands (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_strands_code_unique unique (tenant_id, code)
);

create index tax_strands_tenant_idx on tax_strands(tenant_id);

-- =============================================================================
-- tax_sub_strands — second-level groupings under tax_strands (12 rows)
-- =============================================================================

create table tax_sub_strands (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  strand_id              uuid not null references tax_strands(id) on delete cascade,
  code                   text not null,
  name                   text not null,
  display_order          int  not null,
  applies_to_level_codes text[] not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint tax_sub_strands_code_unique unique (tenant_id, code)
);

create index tax_sub_strands_tenant_idx on tax_sub_strands(tenant_id);
create index tax_sub_strands_strand_idx on tax_sub_strands(strand_id);

-- =============================================================================
-- tax_levels — S.A.M. levels (9 rows: 0A, 0B, 0C, 1, 2, 3, 4, 5, 6)
-- =============================================================================

create table tax_levels (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  mvp           boolean not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_levels_code_unique unique (tenant_id, code)
);

create index tax_levels_tenant_idx on tax_levels(tenant_id);

-- =============================================================================
-- tax_content — content items, each at (sub_strand, level) (145 rows when seeded)
-- =============================================================================

create table tax_content (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  sub_strand_id uuid not null references tax_sub_strands(id) on delete cascade,
  level_id      uuid not null references tax_levels(id) on delete cascade,
  code          text not null,
  name          text not null,
  display_order int  not null,
  mvp           boolean not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint tax_content_code_unique unique (tenant_id, code)
);

create index tax_content_tenant_idx     on tax_content(tenant_id);
create index tax_content_sub_strand_idx on tax_content(sub_strand_id);
create index tax_content_level_idx      on tax_content(level_id);

-- =============================================================================
-- RLS — tenant-scoped SELECT only; writes service-role only.
-- Mirrors strands / strand_cohorts pattern (20260519000000).
-- =============================================================================

alter table tax_strands enable row level security;
create policy "tax_strands_tenant_select" on tax_strands
  for select using (tenant_id = app_current_tenant_id());

alter table tax_sub_strands enable row level security;
create policy "tax_sub_strands_tenant_select" on tax_sub_strands
  for select using (tenant_id = app_current_tenant_id());

alter table tax_levels enable row level security;
create policy "tax_levels_tenant_select" on tax_levels
  for select using (tenant_id = app_current_tenant_id());

alter table tax_content enable row level security;
create policy "tax_content_tenant_select" on tax_content
  for select using (tenant_id = app_current_tenant_id());
