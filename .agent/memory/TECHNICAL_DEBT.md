# TECHNICAL DEBT & HOUSEKEEPING

Known debt and recurring environment hazards. None are release blockers unless noted.
Resolve opportunistically; don't let them sweep into unrelated commits.

## Report (open bugs — being addressed in the report fix pass)
- Placement bar renders as muted gray text, no navy fill (should be navy bar + white
  text). `placement-card.tsx` styling not applied on the degraded branch.
- Narration fabricates strand findings when strand-level data is absent (names specific
  strengths/weaknesses while stating "no strand-level data"). Self-contradictory; §2.4 /
  credibility risk. Fix in the narration generation path.
- No radar / no sub-strand pill list on the degraded ("Read with a caveat") branch —
  diagnose data-path vs. render regression; confirm on screen with a real completed
  assessment, not a 2-min speed-run or a print export.

## Analytics (deferred wiring)
- `center_followup_opted_in` and `parent_report_generated` not yet emitted — both require
  touching the protected report component, so they belong in the report fix pass.

## Migrations / types
- `database.types.ts` was hand-edited across lanes; it auto-merged clean and passes
  typecheck. Optional: regenerate against local DB
  (`pnpm supabase gen types typescript --local > src/lib/database.types.ts`) — the CLI
  (2.98.2) emits non-TS junk lines top/bottom that must be hand-trimmed, then `pnpm typecheck`.
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

## Deploy-time (later)
- Set `MISCONCEPTION_CLASSIFIER_LIVE=true` and confirm `ANTHROPIC_API_KEY` in Vercel — the
  classifier is live in code but stub in production until these are set.
