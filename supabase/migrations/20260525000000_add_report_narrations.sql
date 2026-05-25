-- Atlas Assessment — report_narrations table.
--
-- Source-of-truth references:
--   docs/atlas-report-system-spec.md §7 (Stage 3 Narrative Generator — planned;
--     status note on §7.1 flags this as report roadmap Step 4 scope)
--   src/lib/report/types.ts ReportNarration interface (sibling to ReportContent;
--     deliberately separate — engine data vs generated prose)
--   src/lib/report/golden/aiden-grade-3-narration.ts (golden fixture)
--
-- ReportNarration is the LLM-generated parent-facing prose layer. One row per
-- session, joined by session_id. Each prose field is independently optional;
-- a missing row or partial prose degrades gracefully — the renderer falls
-- back to data-only display per surface. 'failed' rows may be written for
-- audit purposes; readers treat their prose as absent.
--
-- RLS pattern mirrors the `responses` table (per-session, scoped via
-- assessment_sessions → children → parent_id for parents; via center
-- matching for instructors). Writes are service-role only — narration jobs
-- run server-side using the service-role key, never from the browser.
-- Schema-only migration; no tenant-scoped row inserts, so no seed.sql mirror
-- required (AGENTS.md §11 parity rule applies to row-inserting migrations).

create table report_narrations (
  session_id            uuid primary key references assessment_sessions(id) on delete cascade,
  tenant_id             uuid not null references tenants(id) on delete cascade,
  generated_at          timestamptz not null default now(),
  model                 text not null,
  status                text not null,
  placement_line        text,
  strand_lede           text,
  misconceptions_lede   text,
  recommendations_lede  text,
  constraint report_narrations_status_chk check (status in ('ok', 'failed'))
);

create index report_narrations_tenant_idx on report_narrations(tenant_id);

-- =============================================================================
-- RLS — parents see narrations for their own children's sessions; instructors
-- see via center matching (active + 30-day grace). Writes service-role only.
-- Mirrors the responses table's policy shape exactly.
-- =============================================================================

alter table report_narrations enable row level security;

create policy "report_narrations_parent_select" on report_narrations
  for select using (
    session_id in (
      select s.id
      from assessment_sessions s
      join children c on c.id = s.child_id
      where c.parent_id = app_current_parent_id()
    )
  );

create policy "report_narrations_instructor_select" on report_narrations
  for select using (
    exists (
      select 1
      from assessment_sessions s
      join children c on c.id = s.child_id
      where s.id = report_narrations.session_id
        and app_instructor_can_access_child(
          c.home_center_id, c.prior_center_id, c.center_changed_at, c.tenant_id
        )
    )
  );
