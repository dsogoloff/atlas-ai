# CURRENT STATE — Live Technical State

> Volatile. Update at the end of every lane/run (via the `repo-memory-maintainer` agent).
> Replaces the technical `*_handover.md` files (ATLAS / CONVERSION / AGENTS). State-focused;
> durable rationale goes to `DECISIONS.md`, debt to `TECHNICAL_DEBT.md`.

**As of:** 2026-06-14 answer-input-wiring session — PR #63 `lane/answer-input-wiring`
MERGED (commit d347c88, merge fe5e7f9, 2026-06-14 18:10 UTC). Wired 4 held L1 answer-input
types (SELECT_MULTIPLE, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET) into the live player +
server grading. Q11, Q25, Q26, Q27 are now cleanly activatable by CONVERSION. Verify bar
GREEN pre-merge: **1020 tests / 72 files**, tsc 0 errors, lint 0 errors (2 known warnings:
no-img-element profile-menu.tsx:48, no-page-custom-font layout.tsx:56), pnpm build GREEN.

**Origin head:** `fe5e7f9` (post-PR #63 merge). New verify baseline = **1020 tests / 72 files**.

**Branch:** `lane/memory-2026-06-14-input-wiring` (this memory update lane, off fe5e7f9).
**Repo:** `dsogoloff/atlas-ai` → local `C:\Users\Acer\PROJECTS\atlas-ai`.

ATLAS-ASSESSMENT is protected by the "Branch Protection" GitHub ruleset (scope
`~DEFAULT_BRANCH`; requires PR + the `verify-bar` status check; no direct pushes). All work
goes via `lane/*` branches opened as PRs; Dimitri merges attended after Vercel preview
review.

**Previously merged (confirmed on origin/ATLAS-ASSESSMENT log 2026-06-14):**
- PR #58 `lane/served-gate-multirow-fix` — MERGED (1382fd5)
- PR #59 `lane/visual-primitives-g1-3` — MERGED (13179cf)
- PR #60 `lane/memory-audit-2026-06-13` — MERGED (eadd0c0)
- PR #61 `lane/l1-reauthoring` — MERGED (ea5a4f7): L1 overlay re-author, 6 active, art/format items held, Q11/Q17/Q27 corrected
- PR #63 `lane/answer-input-wiring` — MERGED (fe5e7f9)

**Earlier merges (confirmed):** all four security lanes (PRs #50/#52/#53/#55); PR #51
CLOSED (superseded by #55); PR #54 memory lane merged; PR #22/#23 (content-id backfill /
CONVERSION Stage 4); PR #34 assessment-mascot; PR #49 comprehensive cherry-pick re-land;
M2 consent/instructor/analytics lanes; feature flags; report reskin; marketing §2.4 scrubs.

## What PR #63 (answer-input-wiring) delivered

- **Migration** `20260614120000_add_l1_input_formats.sql` — additive enum DDL only
  (SELECT_MULTIPLE, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET added to question_format).
  No data rows changed; no seed.sql mirror (enum DDL only).
- **Grading rules** in `src/lib/grading/grade.ts`: select-all, select-count, match-pairs
  (+ AnswerValue id-set/pairs, GradeResult.perPair). Per-blank / set-equality /
  equation-validity rules reused.
- **`src/lib/responseSubmit/correctness.ts`** now imports grade() and grades the 4 new
  formats by reading REAL top-level content fields (NOT content._authoring) and delegating
  to grade(). New live inputs: SelectMultipleInput, MatchingInput, MultiBlankInput,
  EquationSetInput + QuestionTimer dispatch.
- **Serializer** (`serialize.ts`) strips all answer fields key-by-key.
- **Contract doc** committed: `docs/l1-input-wiring-spec.md`.
- **NO row activated** — `questions_held_rows_inactive` guardrail untouched; still forbids
  bare is_active=true on a requires_format_swap row.

## Held L1 rows — activation status

| Item | Blocker before #63 | Blocker after #63 | Cleanly activatable now? |
|------|-------------------|-------------------|--------------------------|
| Q11 | format not wired | — | YES — CONVERSION can activate |
| Q25 | format not wired | — | YES — CONVERSION can activate |
| Q26 | format not wired | — | YES — CONVERSION can activate |
| Q27 | format not wired | — | YES — CONVERSION can activate |
| Q01, Q07, Q08, Q13, Q14, Q15, Q19 | art (blocker A/B/F) | art (still) | NO — need curated images in Supabase Storage |
| Q02,03,04,05,06,12,16 | art (MULTIPLE_CHOICE, requires_format_swap=false) | art (still) | NO — single-select click-on-image, no format wiring needed but art blocked |
| Q17 | art + multi-image plumbing | art + multi-image plumbing | NO — own lane (docs/image-ordering-spec.md), also art-blocked |

## Lanes

| Lane | State | Notes |
|------|-------|-------|
| Answer-input wiring (L1 held formats) | MERGED PR #63 | lane/answer-input-wiring, d347c88→fe5e7f9, 2026-06-14. 4 new question_format enum values + grading + correctness wiring + serializer. Q11/Q25/Q26/Q27 now activatable. |
| L1 overlay re-author | MERGED PR #61 (reported) | lane/l1-reauthoring — 6 active, art/format items held, Q11/Q17/Q27 corrected. |
| Visual-primitive + answer-input library (G1-3) | MERGED PR #59 (reported) | lane/visual-primitives-g1-3. 11 stem SVG primitives, 3 answer-input components, grading module, 2 spec docs, dev gallery. |
| Served-gate multirow fix (Issue-1) | MERGED PR #58 (reported) | lane/served-gate-multirow-fix. `.maybeSingle()` → `.limit(1)` in responseSubmit/handler.ts. |
| Session memory + audit Appendix A (2026-06-13) | MERGED PR #60 (reported) | lane/memory-audit-2026-06-13. Memory/run-state files + sam-content-authenticity-audit.md Appendix A. |
| Report reskin (layout) | MERGED, BUGS OPEN | `204166b`. Editorial format in; bugs 1 & 2 fixed; both analytics events wired. Bugs 1 & 3 (placement bar / radar / sub-strand pills on the `unreliable` degraded branch) PARKED — see NEXT_ACTIONS. |
| Consent (per-child + gate + classifier-live) | MERGED | `4dc9dc1`+`0a99f76`. Gate server-side, per `child_id`, fails closed. Classifier live in code; needs Vercel env. |
| Instructor portal | MERGED | `48c7378` (merge `a8a988c`). Roster, diagnostic view, notes, response-derived item review. Raw question content gated. |
| Analytics + satisfaction | MERGED + PUSHED | `a16fd15` (merge `71205e5`). Event store, funnel, parent satisfaction island. 2 report-resident events unwired. |
| Comprehensive-test instrumentation + engine (M2 KPI) | MERGED to ATLAS via PR #49 | Originally PRs #41/#42/#46. Re-landed 2026-06-12 via cherry-pick PR #49. Includes: test_type discriminator, 6 analytics enum values, assessment_test_type enum, instructor_usefulness table + RLS, all comprehensive_*/short_*/instructor_* events, per-strand coverage summary. |
| Ops runbook gaps | OPEN PR #43 | lane/ops-runbook-gaps. Docs only (docs/ops-runbook.md). Awaiting attended merge (no supabase db reset needed). |
| Served-question gate (security) | MERGED PR #50 (ea53da5) | lane/served-question-gate. |
| Duplicate-response constraint (security) | MERGED PR #55 (4b31baa) — PR #51 CLOSED | PR #51 superseded by #55. Migration 20260612090000. |
| AI data minimization (security) | MERGED PR #52 (57e5f93) | lane/ai-data-minimization. |
| Next.js upgrade + CI build step (security) | MERGED PR #53 (1997b3d) | lane/next-upgrade-ci. |
| QA-prep | PR OPEN (lane/qa-prep-2026-06-12) | dev-seed-instructor-roster.sql + docs/qa-prep-e2e-run.md. Awaiting attended merge. |
| Comprehensive-test assembly | NOT STARTED | Deferred to SEPARATE comprehensive-assembly session. |
| Admin/support tooling | DONE | Ops runbook shipped; admin UI deferred 2026-05-30. |
| Feature flags | MERGED | 11 §12 rollout flags, all default-off. |
| Workflow → lane/PR + CI | MERGED `016e4ea` | PR #7. |
| Relay / run loop | MERGED `164a1b2` (manual mode) | PR #9. Automated transport parked pending Codex CLI auth. |
| Report three sections | MERGED (PR #13) | |
| Dev-seed + parent logout | MERGED (PR #14) | |
| Marketing §2.4 scrubs | MERGED PRs #16/#20/#21 | §2.4 scrub complete. |
| Codex reachability docs | OPEN PR #17 | Credential blocker documented. Not yet merged. |
| Content-id backfill | MERGED PR #22 (`016357e`) | |
| CONVERSION Stage 4 — DB load + L1–4 run | MERGED PR #23 (`1ebb01e`) | 79 rows loaded. |
| Assessment mascot | MERGED PR #34 (`58e4659`) | |
| Image-ordering (Q17) | NOT STARTED | Spec at docs/image-ordering-spec.md. Q17 art-blocked; own lane when ready. |

## Sibling topics (now repo-tracked, not chat handovers)
- **CONVERSION** — 5-stage CLI in `scripts/conversion/`. L1–4 MVP run COMPLETE
  2026-06-10 (PR #23): 79 loaded (49 active, 30 inactive image-essential). Full-library
  phase 1 done 2026-06-11 (81 rows, 0A/0B/0C/5/6). Further conversion + question-bank
  work runs in a SEPARATE session. Q11/Q25/Q26/Q27 now unblocked for CONVERSION activation.
- **AGENTS / fleet** — `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
  `repo-memory-maintainer` in `.claude/agents/`. ROI test gates any further growth.
- **Constructive git (2026-06-14 standing rule):** Claude may run add/commit/push/PR,
  worktree add, checkout existing, fetch, pull --ff-only, stash. Merges to protected
  branches, destructive/history-rewriting ops, and supabase/prod/vercel remain founder-only.

## Immediate next actions
See `NEXT_ACTIONS.md`.

Founder actions (current):
1. [DONE] Merged PRs #50/#52/#53/#55 (security lanes).
2. [DONE] `supabase db reset` run (applies 20260612090000 + 20260611090000).
3. [DONE] Merged PRs #58/#59/#60/#61/#63 (served-gate fix, visual-primitives, memory, L1-reauthor, answer-input-wiring) — confirmed on origin log 2026-06-14.
4. `supabase db reset` to apply migration 20260614120000_add_l1_input_formats.sql (new enum values).
5. Merge PR #43 (ops-runbook-gaps — docs only; no DB; no supabase db reset needed).
6. Merge PR (lane/qa-prep-2026-06-12) after Vercel preview review.
7. CONVERSION session: activate Q11, Q25, Q26, Q27 (set real format + content, clear requires_format_swap, is_active=true). Their input types are now wired.
8. Curate + upload day-scene/art images for Q01/Q07/Q08/Q13/Q14/Q15/Q19 + single-select-image set into Supabase Storage bucket (upload manifests in each worksheet output folder).

- **PARKED — needs Dimitri action:** Codex CLI auth (`codex login` or set `OPENAI_API_KEY`)
  to unblock automated relay + `.mcp.json`.
- **PARKED — needs Dimitri on-screen:** placement-bar / radar / sub-strand pills on the
  degraded/"unreliable" report branch (visual check against a real completed assessment).
- **OPTIONAL:** service-role report-narration regen script (`docs/ops-runbook.md` §3 KNOWN GAP).

## External gates (business — not build)
G1 S.A.M. license — LIFTED 2026-06-10 (founder granted permission to digitize entire
library; see DECISIONS.md) · G2 franchisor pilot approval (separate; routing unconfirmed) ·
G3 consent legal review — CLEARED 2026-06-10 (counsel approved the consent flow) ·
G4 Anthropic minors (RESOLVED).

## Verify baseline history
| Head | Tests | Files | Notes |
|------|-------|-------|-------|
| fe5e7f9 | 1020 | 72 | post-PR #63 answer-input-wiring (new baseline) |
| (post-#59) | 979 | 72 | visual-primitives pre-merge snapshot |
| 970698e | 915 | 56 | post-security PRs 2026-06-12 |
| b9b0662 | 900 | 55 | post-cherry-pick PR #49 |
| (864/52) | 864 | 52 | ATLAS-ASSESSMENT head 2026-06-11 |
| (554) | 554 | 41 | pre-merge era |
