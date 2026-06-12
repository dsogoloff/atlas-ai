# CURRENT STATE — Live Technical State

> Volatile. Update at the end of every lane/run (via the `repo-memory-maintainer` agent).
> Replaces the technical `*_handover.md` files (ATLAS / CONVERSION / AGENTS). State-focused;
> durable rationale goes to `DECISIONS.md`, debt to `TECHNICAL_DEBT.md`.

**As of:** 2026-06-12 session (PRs #50/#51/#52/#53 opened, awaiting attended merge;
ATLAS-ASSESSMENT head b9b0662 confirmed 900 tests / 55 files all-green after re-landing
stranded PRs #42/#46 via PR #49 merge).
**Session split:** CONVERSION Stage 4 / question-bank work runs in a SEPARATE session. This
session must NOT touch `scripts/conversion/` or taxonomy migrations; coordinate via repo
memory only.
**Branch:** `ATLAS-ASSESSMENT`. **Repo:** `dsogoloff/atlas-ai` → local
`C:\Users\Acer\PROJECTS\atlas-ai`.
**Origin head:** `b9b0662` (PR #49 cherry-pick re-land of #42/#46).
ATLAS-ASSESSMENT is protected by the "Branch Protection" GitHub ruleset (scope
`~DEFAULT_BRANCH`; requires PR + the `verify-bar` status check; no direct pushes). All work
goes via `lane/*` branches opened as PRs; Dimitri merges attended after Vercel preview
review. All three M2 lanes (consent, instructor, analytics) are merged; report bugs 1 & 2
fixed; both report analytics events wired; brand-dot scrub applied; 11 §12 rollout flags
added (default-off); ops runbook shipped; parent Sign-Out wired; dev-seed completed report
added; three-section report layout shipped. G1 LIFTED 2026-06-10 (S.A.M. founder granted
permission to digitize entire test library). CONVERSION Stage 4 built (PR #23, worktree
atlas-stage4). Content-id backfill built (PR #22, worktree atlas-backfill).
Comprehensive-test instrumentation + consent regression test (PRs #41/#42) and comprehensive
engine (PR #46) are ALL on ATLAS-ASSESSMENT via PR #49 cherry-pick re-land.
**Verify baseline:** 900 tests / 55 files (ATLAS-ASSESSMENT head b9b0662, confirmed 2026-06-12);
0 type errors; 2 known lint warnings (no-img-element in profile-menu.tsx,
no-page-custom-font in layout.tsx). (Earlier snapshots: 864/52 was pre-#49; 554 was pre-merge era.)
## Lanes
| Lane | State | Notes |
|------|-------|-------|
| Report reskin (layout) | MERGED, BUGS OPEN | `204166b`. Editorial format in; bugs 1 & 2 fixed (`a74c613`, `fbe8c5b`); both analytics events wired. Bugs 1 & 3 (placement bar / radar / sub-strand pills on the `unreliable` degraded branch) PARKED — see NEXT_ACTIONS. |
| Consent (per-child + gate + classifier-live) | MERGED | `4dc9dc1`+`0a99f76`. Gate server-side, per `child_id`, fails closed. Classifier live in code; needs Vercel env. |
| Instructor portal | MERGED | `48c7378` (merge `a8a988c`). Roster, diagnostic view, notes, response-derived item review. Raw question content gated. |
| Analytics + satisfaction | MERGED + PUSHED | `a16fd15` (merge `71205e5`). Event store, funnel, parent satisfaction island. 2 report-resident events unwired. |
| Comprehensive-test instrumentation + engine (M2 KPI) | MERGED to ATLAS via PR #49 | Originally PRs #41/#42/#46. #41 (instrumentation) and #46 (engine) had merged into their stacked parent lane branch and were stranded off ATLAS. Re-landed 2026-06-12 via cherry-pick PR #49 (commits 7e7c37e + 2dad26c). Includes: test_type discriminator, 6 analytics enum values, assessment_test_type enum, instructor_usefulness table + RLS, all comprehensive_*/short_*/instructor_* events, per-strand coverage summary. Conflict resolved: instructor student page import union (#47 strand labels + #46 coverage summary coexist). ATLAS head b9b0662. Verify 900/55. Migration 20260611090000 still requires `supabase db reset`. |
| Consent gate regression — comprehensive | MERGED to ATLAS via PR #49 | Originally PR #42. Cherry-picked in PR #49. Asserts dual server-side consent gate fails closed for comprehensive session. |
| Ops runbook gaps | OPEN PR #43 | lane/ops-runbook-gaps. Docs only (docs/ops-runbook.md). §3 rewritten: stuck/abandoned sessions + Option A reset-by-delete / Option B force-close; §4 consent revoke + vpc_audit_log insert + revoke-all-children variant; §7 new scenario. Narration-regen KNOWN GAP documented as optional follow-on. Awaiting attended merge (no supabase db reset needed). |
| Served-question gate (security) | OPEN PR #50 | lane/served-question-gate, base ATLAS. responseSubmit requires question_access_log row for (tenant,session,question) + no existing response before scoring; else 403 question_not_served. Removes silent idempotent-retry; already_answered hard-rejected (409). Verify 901/55. Codex skipped. |
| Duplicate-response constraint (security) | OPEN PR #51 (STACKED on #50 — MERGE #50 FIRST) | lane/duplicate-response-constraint. Migration 20260612090000_responses_unique_session_question.sql: unique(session_id,question_id) on responses; insert conflict-safe (23505 → idempotent return). Seed clean (no violations). Verify 902/55. |
| AI data minimization (security) | OPEN PR #52 | lane/ai-data-minimization, base ATLAS, independent. TEXT_ENTRY math-safe sanitizer (allowlist, max 40 — PII never reaches Haiku, fail-soft method:'none'); narration sends firstName only; .env.example MISCONCEPTION_CLASSIFIER_LIVE default → false. Voice-locked Step-4 SYSTEM prompt TEXT unchanged. Verify 913/56. |
| Next.js upgrade + CI build step (security) | OPEN PR #53 | lane/next-upgrade-ci, base ATLAS, independent. next + eslint-config-next 16.2.4→16.2.9 (exact pins; lockfile regenerated); 'pnpm build' step added to verify.yml. 3 MODERATE transitive advisories (no high/critical). Verify 900/55 + build GREEN. |
| Comprehensive-test assembly | NOT STARTED | Config (engine reparameterization — item cap / confidence stop / routing depth); deferred to SEPARATE comprehensive-assembly session by decision 2026-06-11. Gated on question bank. |
| Admin/support tooling | DONE | Ops runbook shipped (`5709c13`); admin UI deferred by decision 2026-05-30. Stuck-session operator gap now closed in PR #43. OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs it; documented in ops-runbook §3). |
| Feature flags | MERGED | 11 §12 rollout flags, all default-off, env-var mechanism; `ROLLOUT_FLAGS` registry; new test pins invariant. Fix `efccf4f`, merge `a9d45ba`. |
| Workflow → lane/PR + CI | MERGED `016e4ea` | PR #7. `.github/workflows/verify.yml` (verify-bar job), `.github/pull_request_template.md`, CLAUDE.md step 6 + RUNBOOK step 8 reconciled. CI GREEN: 554 tests / 41 files, no ANTHROPIC_API_KEY (mocked). verify-bar is the required status check via "Branch Protection" ruleset. Ruleset rescoped `~ALL` → `~DEFAULT_BRANCH` 2026-05-31 (the `~ALL` scope blocked pushing/deleting lane branches and broke the flow; see DECISIONS). Stale `lane/workflow-pr-ci` remote ref deleted. |
| Relay / run loop | MERGED `164a1b2` (manual mode) | PR #9. `tools/relay/manual_codex_review.ps1` + `tools/schemas/codex_review.schema.json` + `tools/relay/README.md`. Automated transport (`.mcp.json`) parked pending Codex CLI auth (credential blocker confirmed — see PR #17). CI GREEN: 554 tests / 41 files. |
| Report three sections | MERGED (PR #13) | lane/report-three-sections. Strengths / Areas to confirm / Placement recommendation, two-tier layout. |
| Dev-seed + parent logout | MERGED (PR #14) | lane/dev-seed-completed-report + lane/parent-logout. Dev demo completed report seeded; instructor login added; Sign Out wired in parent profile menu. |
| Marketing §2.4 line-74 wording | MERGED PR #16 | lane/marketing-assessment-wording. `(marketing)/page.tsx:74` hero pill "Diagnostic Suite" → "Assessment Suite". Merged in origin head `d4743c7`. |
| Codex reachability docs | OPEN PR #17 — not merged | lane/codex-reachability-finding. `tools/relay/README.md` updated with 2026-06-05 reachability check results (NOT reachable — credential blocker). CI GREEN. |
| Memory update | MERGED PR #18 | lane/memory-session-2026-06-05. Run-state memory update for 2026-06-05 session. Merged in origin head `d4743c7`. |
| Marketing §2.4 diagnostic scrub | MERGED PR #20 | lane/marketing-diagnostic-scrub. Remaining rendered "diagnostic" claims → "assessment" (commit `e6d9515`). Merged in origin head `d4743c7`. |
| Marketing §2.4 precision claim | MERGED PR #21 (`a3d7d46`) | lane/marketing-precision-claim. Removes unbacked "98% accuracy" claim; card heading "Diagnostic Precision" → "Misconception Mapping" (commits `e52258c`+`32f35d6`). §2.4 scrub now complete across PRs #16/#20/#21. |
| Content-id backfill | MERGED PR #22 (`016357e`) | lane/questions-content-id-backfill. Worktree `atlas-backfill` (commits `5b249f5`+`c6e1485`). Migration `20260610000000_backfill_question_content_ids.sql` + seed.sql mirror maps all 11 SAM-L2 questions to `content_id`. New drift test. |
| CONVERSION Stage 4 — DB load + L1–4 run | MERGED PR #23 (`1ebb01e`) | lane/conversion-stage4-load. Worktree `atlas-stage4`. Loader built (`40d32b3`+guards `903650a`) AND the full L1–4 run executed: 79 rows loaded (L1 12 / L2 22 / L3 20 / L4 25; 49 active, 30 inactive image-essential), all with content_id, in migration `20260610151306` + seed.sql marker block. Follow-on conversion work continues in a SEPARATE session. |
| Memory session 2026-06-10 | MERGED PR #24 (`cb57a84`) | lane/memory-session-2026-06-10. Run-state snapshot. |
| Assessment mascot | MERGED PR #34 (`58e4659`, 2026-06-10) | lane/assessment-mascot. Dachshund mascot (3 poses, `stitch/mascot/mascot1-3.png`, stable swap paths) wired into loading (waving) / K-4 question footer (thinking, in-flow) / completion (celebrating, both tiers). Motion policy in `lib/mascot.ts` (tested): K_4 lively, G5_8 still, reduced-motion still. No streak celebrations possible (correctness never reaches the child client by design). Verify GREEN 644/47 + CI. NOTE: remote lane branch holds 2 post-merge stragglers (AGENTS.md learning — re-landed via lane/agents-ci-typecheck-learning — and an empty retrigger commit); safe for founder to delete after the follow-up micro-PR merges. |

## Sibling topics (now repo-tracked, not chat handovers)
- **CONVERSION** — 5-stage CLI in `scripts/conversion/`. **L1–4 MVP run COMPLETE
  2026-06-10 (PR #23):** 100 questions tagged (0 failed), **79 loaded** (49 active,
  30 inactive image-essential), all with content_id; 21 skipped (drag-drop answers
  unmappable / missing key entries / malformed MC). Cumulative migration
  `20260610151306_load_sam_questions.sql` + seed.sql marker block. Session fixes en
  route: numbered-list answer-key parser (`5c13070`), stage3 429-retry (`506936d`),
  stage2/3 skip-existing guards (`a1685d6`). Images: 0 uploaded (local storage down
  during runs) — per-worksheet upload manifests in output folders; 30 inactive
  questions need curated per-question images before activation. Founder PDFs for ALL
  levels (0A–7) now live in main-checkout `input/`. Full-library digitization
  (0A–0C, 5–7) is a separate planned follow-up.
- **AGENTS / fleet** — `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
  `repo-memory-maintainer` in `.claude/agents/`. ROI test gates any further growth.
- **Active worktrees** — `atlas-stage4` (PR #23), `atlas-backfill` (PR #22),
  `atlas-memory` (this lane). Remove each after its PR merges.

## Immediate next actions
See `NEXT_ACTIONS.md`. Four security PRs opened 2026-06-12 await attended merge.

Founder actions (2026-06-12):
1. Merge PR #50 (lane/served-question-gate) after Vercel preview review.
2. Merge PR #51 (lane/duplicate-response-constraint — STACKED on #50, merge AFTER #50).
   After both merge: run `supabase db reset` to apply migration 20260612090000_responses_unique_session_question.
3. Merge PR #52 (lane/ai-data-minimization) — independent, any order.
4. Merge PR #53 (lane/next-upgrade-ci) — independent, any order.
5. After ALL four security PRs merge: run full verify + report final test count.
6. Merge PR #43 (lane/ops-runbook-gaps — docs only; no DB; no supabase db reset needed).
7. Run `supabase db reset` (also applies migration 20260611090000 from comprehensive-instrumentation,
   now on ATLAS via PR #49) and confirm instructor usefulness card + analytics events.
8. Curate per-question images for the 30+ inactive image-essential questions (upload manifests
   in each worksheet's output folder); full-page renders must never ship.

- **RESOLVED (was parked):** the 5 marketing "diagnostic" occurrences — merged PR #20 scrubbed the remaining rendered "diagnostic" strings; open PR #21 renames the "Diagnostic Precision" card (line 170) and removes the 98% claim.
- **PARKED — needs Dimitri action:** Codex CLI auth (`codex login` or set `OPENAI_API_KEY` on this box) to unblock automated relay + `.mcp.json`.
- **PARKED — needs Dimitri on-screen:** placement-bar / radar / sub-strand pills on the degraded/"unreliable" report branch (visual check against a real completed assessment).
- **OPTIONAL (no gate; only if pilot needs it):** service-role report-narration regen script (`docs/ops-runbook.md` §3 KNOWN GAP — now documented as such in PR #43; the operator stuck-session gap is closed; the narration-regen follow-on remains open).

Housekeeping notes (non-blocking):
- Stale fully-merged lane branches safe to delete on origin: `lane/comprehensive-instructor-analytics`,
  `lane/consent-gate-comprehensive`, `lane/comprehensive-engine` (all content is on ATLAS via PR #49).
  Also: the closed PR #48 reland branch. Dangling memory commit 8efad71 on
  `lane/memory-session-2026-06-11` (PR #44 closed before it merged) is superseded by this session's
  record — that branch can be deleted.
- Main checkout's uncommitted `CLAUDE.md` modification (older garbled copy with `\\_` artifacts) has been moved to a git stash ("premove CLAUDE.md working-copy edit") so lane branches can be switched; recover with `git stash list` / `git stash pop`, or drop the stash to discard. Founder call.
- `stitch/mascot/` assets committed on lane/assessment-mascot (3 pose PNGs + 3 Stitch screen mockups).
- `conversion.log` in PR #23 carries two committed `stage4 | synthetic-smoke.pdf` audit lines from smoke runs (harmless; flagged in PR).
- Orchestration incident logged in `AGENTS.md` §11: background subagent Bash gating caused a Lane A "blocked" report; both lanes re-dispatched foreground; no work lost.

## External gates (business — not build)
G1 S.A.M. license — LIFTED 2026-06-10 (founder granted permission to digitize entire
library; see DECISIONS.md) · G2 franchisor pilot approval (separate; routing unconfirmed) ·
G3 consent legal review — CLEARED 2026-06-10 (counsel approved the consent flow) ·
G4 Anthropic minors (RESOLVED).

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
