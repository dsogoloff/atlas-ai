# TECHNICAL DEBT & HOUSEKEEPING

Known debt and recurring environment hazards. None are release blockers unless noted.
Resolve opportunistically; don't let them sweep into unrelated commits.

## Report (open bugs)
- Placement bar renders as muted gray text, no navy fill (should be navy bar + white
  text). `placement-card.tsx` styling not applied on the degraded branch. **PARKED —
  degraded/unreliable branch; see NEXT_ACTIONS (needs founder confirmation + on-screen
  check on a real assessment).**
- No radar / no sub-strand pill list on the degraded ("Read with a caveat") branch —
  diagnose data-path vs. render regression; confirm on screen with a real completed
  assessment, not a 2-min speed-run or a print export. **PARKED — degraded/unreliable
  branch; see NEXT_ACTIONS (needs founder confirmation + on-screen check on a real
  assessment).**

## Migrations / types
- `database.types.ts` was hand-edited across lanes (most recently PR #170 added admins
  table types, admin_status enum, and app_current_admin_tenant_id function); it
  auto-merged clean and passes typecheck. Optional: regenerate against local DB
  (`pnpm supabase gen types typescript --local > src/lib/database.types.ts`) — the CLI
  (2.98.2) emits non-TS junk lines top/bottom that must be hand-trimmed, then
  `pnpm typecheck`.
- `timeFlagging` has a `DEFAULT_FALLBACK_TAGS` hatch (grep `REMOVE-WHEN-TAGS-LAND`) masking
  missing item tags; remove once the bank ships fully-tagged items and the schema
  constraint is trusted.

## Repo hygiene
- Stray `package-lock.json` was one level ABOVE the old repo, confusing Next's workspace
  root. Ensure the new short-path repo has NO stray npm lockfile (repo is pnpm).
- `AGENTS.md` + `scripts/conversion/conversion.log` carried modified-unstaged across many
  sessions in the old repo — commit or discard intentionally; don't sweep them in.
- `docs/m2-readiness.md` was uncommitted in the old repo — it's the factual M2 inventory;
  preserve it if still wanted (a fresh clone won't include uncommitted files).
- `.claude/agents/` (subagent defs) vs. `AGENTS.md` (conventions) — two different things
  with similar names; don't conflate.

## Windows / worktree quirks
- New worktrees show `CLAUDE.md` / `GEMINI.md` as `typechange` (repo symlinks to
  `AGENTS.md` materialize as empty files). Fix per worktree:
  `git restore --source=HEAD --staged --worktree CLAUDE.md GEMINI.md`.
  NOTE: revisit whether `CLAUDE.md` should remain a symlink to `AGENTS.md` now that
  `CLAUDE.md` has a distinct orchestration role — they are now different documents.
- Worktrees need their own `pnpm install`; do NOT junction `node_modules`.
- Local Docker/Supabase stack can wedge after a long-lived instance (containers go
  unhealthy). Clear by force-removing `supabase_*` containers (`docker rm -f`) + full
  Docker Desktop restart, then `pnpm supabase start`.

## Verify-bar known noise (the `verify` agent must distinguish from real failures)
- `database.types.ts` regen junk lines (above).
- Stale `tsconfig.tsbuildinfo` cache masking an already-fixed compile error.

## Tooling versions (post-MVP, don't update mid-build)
- Supabase CLI update nag (v2.102 available; 2.98.2 installed).

## No automated duplicate-migration-version guard (recurring — 3rd incident, 2026-06-26)

Parallel `lane/*` branches independently pick timestamp-style version prefixes and can
collide when two lanes pick the same minute and both merge to trunk. The
`schema_migrations` primary key is on `version`, so a duplicate breaks `supabase db reset`
only AFTER both PRs merge — each lane's isolated reset passes cleanly. CI's `verify-bar`
does not run `supabase db reset`, so it does not catch duplicate versions.

**Mitigation (manual, no tooling yet):** when opening a conversion or DDL lane, check
existing migration version prefixes AND the version numbers in other open lane branches
before assigning a new one. If two same-day lanes are open, stagger by at least 100 (e.g.
120000 vs 120400 or pick a higher offset).

**Tooling gap:** there is no CI step that validates uniqueness of migration version prefixes
across the full `supabase/migrations/` directory. A lightweight script (e.g. check for
duplicate `YYYYMMDDHHMMSS` prefixes via glob + sort) would catch this class of defect
before merge. This is a low-effort, high-value addition to the verify bar or as a
pre-commit hook — not yet built. Prior incidents: version 20260620120000 (noted in earlier
CURRENT_STATE history) and an earlier dup-migration incident; this session was the third.

## Deploy-time (later)
- Set `MISCONCEPTION_CLASSIFIER_LIVE=true` and confirm `ANTHROPIC_API_KEY` in Vercel — the
  classifier is live in code but stub in production until these are set.

## content_id backfill sparseness limits sub-strand report fidelity (2026-06-24)
- The bridge backfill migration (20260525000003) only tagged l1–l6 + 3 of 6 engine strands;
  L0 rows are out of range; seeded SAM-L2 items are deliberately unmapped. As a result, the
  engine-strand fallback introduced in PR #160 fires for any session at young-band/L1/L2 and
  sub-strand breadth coverage in PR #161 is limited to items that actually carry `content_id`.
  A fuller content_id backfill onto the V2026 taxonomy (covering L0 + all SAM-L2 rows) is a
  separate future lane; it would improve radar fidelity and sub-strand coverage for these
  cohorts without any behavior regression (both changes gate cleanly on `content_id` being
  populated).

## Ops gap — no report-narration regen mechanism
- There is no operator path to regenerate a report narration without having the child
  re-take the assessment. `docs/ops-runbook.md` §3 documents this as a KNOWN GAP. A small
  optional follow-on: a service-role script calling `attemptNarration` directly. Build only
  if the pilot surfaces a real need. See NEXT_ACTIONS.md §3 optional item.
