# CURRENT STATE — Live Technical State

> Volatile. Update at the end of every lane/run (via the `repo-memory-maintainer` agent).
> Replaces the technical `*_handover.md` files (ATLAS / CONVERSION / AGENTS). State-focused;
> durable rationale goes to `DECISIONS.md`, debt to `TECHNICAL_DEBT.md`.

**As of:** 2026-05-30 (workflow model updated: lane/PR/CI-gated; Dimitri merges attended).
**Branch:** `ATLAS-ASSESSMENT`. **Repo:** `dsogoloff/atlas-ai` → local
`C:\Users\Acer\PROJECTS\atlas-ai`.
**Origin head:** `97b8646` — base commit for `lane/workflow-pr-ci`. ATLAS-ASSESSMENT is
now a PROTECTED branch on origin; direct pushes are rejected. All work goes via `lane/*`
branches opened as PRs; Dimitri merges attended after Vercel preview review. All three M2
lanes (consent, instructor, analytics) are merged; report bugs 1 & 2 fixed; both report
analytics events wired; brand-dot scrub applied; 11 §12 rollout flags added (default-off);
ops runbook shipped.
**Verify baseline:** 554 tests / 0 type errors; 1 known font lint warning.
## Lanes
| Lane | State | Notes |
|------|-------|-------|
| Report reskin (layout) | MERGED, BUGS OPEN | `204166b`. Editorial format in; bugs 1 & 2 fixed (`a74c613`, `fbe8c5b`); both analytics events wired. Bugs 1 & 3 (placement bar / radar / sub-strand pills on the `unreliable` degraded branch) PARKED — see NEXT_ACTIONS. |
| Consent (per-child + gate + classifier-live) | MERGED | `4dc9dc1`+`0a99f76`. Gate server-side, per `child_id`, fails closed. Classifier live in code; needs Vercel env. |
| Instructor portal | MERGED | `48c7378` (merge `a8a988c`). Roster, diagnostic view, notes, response-derived item review. Raw question content gated. |
| Analytics + satisfaction | MERGED + PUSHED | `a16fd15` (merge `71205e5`). Event store, funnel, parent satisfaction island. 2 report-resident events unwired. |
| Comprehensive-test assembly | NOT STARTED | Config (engine reparameterization); gated on G1 (question bank). |
| Admin/support tooling | DONE | Ops runbook shipped (`5709c13`); admin UI deferred by decision 2026-05-30. OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs it). |
| Feature flags | MERGED | 11 §12 rollout flags, all default-off, env-var mechanism; `ROLLOUT_FLAGS` registry; new test pins invariant. Fix `efccf4f`, merge `a9d45ba`. |
| Workflow → lane/PR + CI | IN PR (lane/workflow-pr-ci) | `.github/workflows/verify.yml` (verify-bar job), `.github/pull_request_template.md`, CLAUDE.md step 6 reconciled, settings.local.json perms; awaiting CI green + Dimitri merge. |
| Relay / run loop | NOT STARTED | Build per RUNBOOK.md; treat as a normal lane. |

## Sibling topics (now repo-tracked, not chat handovers)
- **CONVERSION** — 5-stage CLI in `scripts/conversion/`; Stages 1–3 built/verified;
  Stage 4 (DB load, ~130-item L1–4 cut) single-gated on G1 (S.A.M. license ~2026-06-02).
- **AGENTS / fleet** — `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
  `repo-memory-maintainer` in `.claude/agents/`. ROI test gates any further growth.

## Immediate next actions
See `NEXT_ACTIONS.md`. PARKED: placement-bar / radar / sub-strand-pills on degraded branch (needs Dimitri on-screen confirmation). M2 build: feature flags DONE, ops runbook DONE. Next ungated lane: relay (2). Open §2.4 question: "Diagnostic" wording on marketing `page.tsx:74` — not yet resolved.

## External gates (business — not build)
G1 S.A.M. license (~2026-06-02) · G2 franchisor pilot approval (separate; routing
unconfirmed) · G3 consent legal review before real families · G4 Anthropic minors (RESOLVED).

## Environment notes
Dimitri runs `pnpm dev` + local Supabase. After checkout into the short path:
`pnpm install`; if local DB needs the latest schema, `pnpm supabase db reset`. Ensure no
stray `package-lock.json` exists in or above the repo.

## Migration housekeeping (this session)
- Repo moved to short path `C:\Users\Acer\PROJECTS\atlas-ai` via fresh checkout.
- `AGENTS.md` reconciled (deduped garbled autonomy stub; promoted full autonomy rules;
  added worktree/verify-bar/taxonomy conventions; aligned project context).
- `CLAUDE.md` is now a DISTINCT orchestration file (not a symlink to AGENTS.md).
  `GEMINI.md` symlink to AGENTS.md is optional (Gemini not in active workflow).
- Old worktrees (`atlas-consent`/`atlas-instructor`/`atlas-analytics`) removed.
