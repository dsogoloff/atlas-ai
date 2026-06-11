# NEXT ACTIONS — Ordered Queue

> Volatile. The orchestrator works top-down. PARKED items need Dimitri (don't auto-resolve;
> skip to the next ungated item). Tick/move items as they complete; record outcomes in
> CURRENT_STATE.md and durable decisions in DECISIONS.md.

## 0. Setup (migration — DONE 2026-05-29)
- [x] New repo is a real git checkout with code present; origin head `71205e5`
      (analytics merge) recorded in CURRENT_STATE.md.
- [x] Analytics merge confirmed on origin (it's the head).
- [x] `AGENTS.md` reconciled (deduped; full autonomy rules; conventions added).
- [x] `CLAUDE.md` is a distinct orchestration file; `GEMINI.md` symlink optional.
- [ ] Confirm no stray `package-lock.json` in or above the repo; `pnpm install` in the
      new path (Dimitri to verify after first `pnpm dev`).

## 0b. Workflow / infra
- [x] **DONE 2026-05-31 — Dimitri selected `verify-bar` as the required status check.**
  Implemented via the "Branch Protection" GitHub ruleset (requires PR + verify-bar check;
  no direct pushes). PR #7 (lane/workflow-pr-ci) merged as `016e4ea`; CI ran GREEN
  (554 tests / 41 files). Required check is live.
- [x] **DONE 2026-05-31 — Rescoped ruleset `~ALL` → `~DEFAULT_BRANCH`.** The initial `~ALL`
  scope blocked pushing/deleting `lane/*` branches (required-check + deletion rules applied
  to every ref), which broke the lane→PR flow. Rescoped to the default branch
  (ATLAS-ASSESSMENT) via `gh api`, attended-authorized by Dimitri. Lane branches are now
  pushable/deletable; ATLAS-ASSESSMENT stays fully protected. See DECISIONS 2026-05-31.

## 1. Report fix pass (immediate)
- [x] Scrub page `<title>` metadata — remove "Diagnostic Excellence"; report is
      "Assessment Report" everywhere (§2.4). DONE 2026-05-30 (`c487f1c`, merged `a74c613`).
- [x] Narration anti-fabrication guard: when every sub-strand band is `no_data` / total 0,
      `strand_lede` suppressed and `key_findings.strengths` cleared deterministically
      post-validation; placement_line, recommendations_lede, and misconception-derived
      growth_areas kept. Data-path guard only — voice-locked Step-4 prompt untouched.
      New test added. DONE 2026-05-30 (fix `43b24c8`, merge `fbe8c5b`).
- [x] Wire `parent_report_generated` (emitted after report_narrations upsert; fail-soft,
      PII-free, service client) and `center_followup_opted_in` (new server action
      `recordCenterFollowupOptIn` in `feedback-actions.ts` + client wrapper
      `center-followup-cta.tsx` firing on CTA click). New tests added.
      DONE 2026-05-30 (fix `43b24c8`, merge `fbe8c5b`).
- [x] Wire report CTA: label **"Schedule a conversation with a S.A.M center director"**
      applied in `page.tsx`. Href stays placeholder. DONE 2026-05-30 (`43b24c8`/`fbe8c5b`).
- **PARKED — needs Dimitri:** Placement bar (navy fill + white text) and radar / sub-strand
  pill list are missing on the degraded/"unreliable" assessment branch. Plain-English
  context: on a speed-run with too few clean responses the report intentionally shows only
  a red "Score not reliable" banner — no placement bar, no radar, no sub-strand pills —
  because the score is not trustworthy (this matches the rule against asserting strand
  findings when data is absent). On a REAL completed assessment the full report DOES show
  the navy placement bar + radar + pills. Question for Dimitri: (a) leave the unreliable
  branch as-is (recommended) and just confirm the full report looks right on a real
  completed assessment on screen; or (b) you want some styled placement/summary shown even
  on the unreliable branch — which would need a product/credibility call. Needs on-screen
  confirmation against a real assessment (Dimitri runs the dev server).

## 1b. Brand-dot scrub — client-facing copy — DONE 2026-05-30 (fix `ffa77e5`, merge `47f9e59`)
- [x] Scrubbed trailing dot from "S.A.M" in 9 client-facing rendered strings across 7
      files: parent report footer disclaimer + next-steps body; parent-report-feedback;
      instructor portal empty-state + item-review note; signup center-selector labels
      (x3 in signup-form.tsx); assessment QuestionShell top bar; marketing hero pill.
      Left untouched: code comments/logs/type docs/tests; marketing footer sentence-final
      "S.A.M." (correct); layout.tsx description metadata. Verify GREEN (550 tests, 0
      type errors, 1 known font lint warning). Codex skipped (relay not wired).
- [x] **MERGED PR #16 — `(marketing)/page.tsx:74` hero pill "Diagnostic Suite" →
  "Assessment Suite".** lane/marketing-assessment-wording. Merged in origin head `d4743c7`.
  NOTE: 5 further visible "diagnostic" occurrences remain on the marketing page (lines 84,
  135, 170, 298, 313) — parked pending §2.4 call with Dimitri. See Parked-for-Dimitri below.
- [x] **MERGED PR #20 — remaining rendered "diagnostic" claims scrubbed to "assessment"
  (§2.4).** lane/marketing-diagnostic-scrub (commit `e6d9515`). Merged in origin head
  `d4743c7`.
- [x] **MERGED PR #21 — lane/marketing-precision-claim** (merge `a3d7d46`) — removes the
  unbacked "98% accuracy" precision claim (`e52258c`) and renames the "Diagnostic
  Precision" card heading to "Misconception Mapping" (`32f35d6`). §2.4 scrub complete
  across PRs #16/#20/#21.

## 2. Relay / unattended run loop (not gated)
- [x] **DONE 2026-05-31 — Manual-mode relay built & merged (PR #9, `164a1b2`).**
      `tools/relay/manual_codex_review.ps1` bundles a lane diff (with local-only secret
      scrub) into a Codex review request; `-FindingsFile` validates the JSON reply against
      `tools/schemas/codex_review.schema.json`; `codex-finding-resolver` then applies
      accepted findings. ASCII-only script (PS 5.1 compatibility). Local-only; `.gitignore`
      excludes `tools/relay/.reviews/`. CI GREEN: 554 tests / 41 files.
- [x] **ANSWERED 2026-06-05 (PR #17) — Codex is NOT programmatically reachable on this box.**
      Evidence: codex-cli 0.130.0 installed; api.openai.com reachable (cf-ray returned);
      but no `~/.codex/auth.json` (`codex login status` → "Not logged in") and no
      `OPENAI_API_KEY`; `codex exec` returns `401 Unauthorized: Missing bearer or basic
      authentication`. Credential blocker, not transport. Documented in
      `tools/relay/README.md` ("Reachability check — 2026-06-05" section). Manual-mode
      relay (`manual_codex_review.ps1`) remains the fallback.
- [ ] **PARKED — needs Dimitri action:** run `codex login` (or provide `OPENAI_API_KEY` on
      this box) to unblock the automated-relay upgrade and `.mcp.json` finalization.
      Plain-English: open a terminal, run `codex login`, follow the browser prompt, then
      tell the agent "Codex auth done." The agent will then wire the automated relay.
- [ ] Finalize `.mcp.json` once Codex CLI is authenticated (blocked on item above).

## 3. M2 build (not gated on G1)
- [x] Feature flags — DONE 2026-05-30 (fix `efccf4f`, merge `a9d45ba`). 11 §12 rollout
      flags added to `src/lib/env.ts`, all default-off (only `'true'` enables); `ROLLOUT_FLAGS`
      registry; new `src/lib/env.test.ts` pins the default-off invariant; `.env.example`
      documents all 11 + `REPORT_NARRATION_LIVE`. Verify GREEN: 554 tests.
- [x] Admin/support tooling — ops runbook DONE 2026-05-30 (merge `5709c13`).
      `docs/ops-runbook.md` covers family/child lookup, sessions/reports, consent
      (per-child; revoke = boolean flip; G3 for anything broader), audit/analytics tables,
      env flags, common support scenarios, hard don'ts. Admin UI deferred by decision
      2026-05-30 (no admin role in schema; privacy-sensitive; pilot operable via
      Supabase/Vercel dashboards).
- [ ] OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs
      it — no operator mechanism exists today to regenerate a narration without a re-take;
      see `docs/ops-runbook.md` §3 KNOWN GAP).

## 4. G1 LIFTED (2026-06-10) — CONVERSION L1–4 run COMPLETE; merge + radar check remain

**G1 status:** S.A.M. founder granted permission to digitize the entire test library
(session brief 2026-06-10). Stage 4 fully unblocked.

- [x] CONVERSION Stage 4 — DB load script built (PR #23, lane/conversion-stage4-load,
  `40d32b3` + supplement guards `903650a`: 21-code misconception validation fails loudly,
  per-run load report in conversion.log; image_required rows load `is_active=false`;
  staging-prefix uploads to private `question-images` bucket). DONE-pending-merge.
- [x] Content-id backfill built (PR #22, lane/questions-content-id-backfill, commits
  `5b249f5`+`c6e1485`, worktree `atlas-backfill`). Maps all 11 SAM-L2 questions to
  `content_id`. Seed.sql mirror placed AFTER the tax_content seed block (ordering matters;
  new test pins this). DONE-pending-merge.
- [x] **L1–4 conversion run COMPLETE 2026-06-10** (founder provided all 0A–7 PDFs;
  run sequential L1→L4 in worktree `atlas-stage4`, all on PR #23): 100 tagged / 0 failed;
  **79 loaded** (L1 12, L2 22, L3 20, L4 25 — 49 active, 30 inactive image-essential),
  all rows with content_id; 21 skipped (drag-drop answers unmappable to items/order,
  missing answer-key entries, 2 malformed MC). Migration `20260610151306` + seed.sql
  marker block; commits `97bcf49`/`23da354`/`9b2db6c`/`8e71b08`. En-route fixes:
  numbered-list answer-key parser (`5c13070` — L3/L4 keys), stage3 429-retry
  (`506936d`), stage2/3 skip-existing guards (`a1685d6`). Verify GREEN 630 tests /
  45 files; CI verify-bar pass. The 11 hand-seeded SAM-L2 rows win over generated
  duplicates via `on conflict do nothing` (by design).
- [x] **MERGED PR #22 (`016357e`) + PR #23 (`1ebb01e`)** — attended 2026-06-10.
- **SESSION SPLIT (2026-06-10):** all further CONVERSION / question-bank work (image
  curation reruns, QA pass, full-library digitization) runs in a SEPARATE session.
  Other sessions must not touch `scripts/conversion/` or taxonomy migrations;
  coordinate via repo memory only.
- [ ] **Radar acceptance check** (after merges + `supabase db reset`): reset output
  shows the backfill notice (`sam-l2 total=11 mapped=11 unmapped=0`) and the 79-row
  load. Demo report radar will still read "not assessed" (seed has zero responses rows
  by design). Real acceptance: complete one fresh dev assessment, open its report,
  confirm radar populates with strand data. Could not be verified in-session: local
  Supabase stack was down (assistant never starts it).
- [ ] **Image curation** — 30 inactive image-essential questions need curated
  per-question images (full-page renders leak neighboring questions; never ship them).
  Upload manifests sit in each `output/<worksheet>/stage4-upload-manifest.json`;
  re-run `pnpm convert:load` with the local stack up to push staging uploads.
- [ ] Question-bank QA pass — review stage3-review.md sheets (founder gate from the
  original pipeline design): 0A/0B→L1 mapping convention on the L1 worksheet, 21
  skipped questions (recoverable via human-authored equivalents), per-question flags.
- [ ] Comprehensive-test assembly — engine reparameterization (config); needs the bank.
- [ ] Curriculum-recommendation table population.
- [ ] Full-library digitization (0A–0C, 5–7; PDFs already in input/) — separate planned
  follow-up; no timeline set.

## 4b. Assessment mascot (DONE-pending-merge 2026-06-10 — PR #34, lane/assessment-mascot)
- [x] Dachshund mascot integrated into the child flow (3 poses at stable paths:
      `stitch/mascot/mascot1.png` waving / `mascot2.png` thinking / `mascot3.png`
      celebrating; future art swap = file replacement, no code change). Loading screen
      waves; K-4 question footer hosts a small in-flow thinking mascot (cannot overlap
      answer UI); completion celebrates on both tiers (replaces the placeholder icon —
      gate decision #8 asset landed). Motion: K_4 transform-only pop+bounce, G5_8 still,
      reduced-motion still (policy tested in `lib/mascot.test.ts`). No branding added in
      code/copy. Verify GREEN 644 tests / 47 files. G3 cleared 2026-06-10 (counsel
      approved consent flow).
- [x] **MERGED PR #34** (`58e4659`, attended 2026-06-10). On-screen K-4 phone-width
      check (footer mascot vs. answers) still worth a glance during normal dev use.
- [ ] **Dimitri: merge the docs-only micro-PR** from lane/agents-ci-typecheck-learning
      (AGENTS.md learning that missed the #34 merge window), then delete the stale
      `lane/assessment-mascot` remote branch (2 post-merge straggler commits, both
      superseded).
- [ ] Later (founder): swap `stitch/mascot/mascot1-3.png` for the updated untagged art
      (same filenames), then rebuild/redeploy.
- NOTE: "celebrate on correct streaks" is NOT possible client-side — per-question
      correctness deliberately never reaches the child client. Would need an API change;
      product call, not picked up autonomously.

## 5. Deferred (do not build now)
- [ ] 4-beat findings depth + narration voice re-tune (re-opens voice-locked Step 4
      prompt; hold until after the SAM deck).
- [ ] Offline (v2); multi-tenant scale-out (M5); remaining S.A.M. levels + public items.

## Parked-for-Dimitri (rollup)
- **Placement bar / radar / sub-strand pills on the degraded branch (item 1, report fix
  pass) — PARKED.** See the PARKED entry under section 1 above for the plain-English
  question. Needs on-screen check on a real completed assessment.
- **Parent-report pricing ($49 on the parent report) — PARKED, and CONFLICTS with a hard
  rule.** Requested 2026-05-30; not actioned. Adding a consumer price to the parent report
  violates BUSINESS_RULES "No consumer paywall — families never pay Atlas directly," and
  pricing models are Dimitri-owned/unconfirmed regardless. Needs Dimitri before any build;
  as written it is contrary to the locked B2B2C model.
- **§2.4 marketing page wording — RESOLVED (PR #21 merged `a3d7d46`, 2026-06-10).**
  Scrub complete across PRs #16/#20/#21 (hero pill, rendered "diagnostic" strings,
  98%-accuracy claim removal + "Misconception Mapping" card rename).
- **Codex CLI auth — PARKED (updated 2026-06-05).** Reachability confirmed as a
  credential blocker (not transport). Automated relay + `.mcp.json` unblocked once Dimitri
  runs `codex login` or supplies `OPENAI_API_KEY` on this box (see item 2 above).
- **Founder actions for conversion run — PARKED (new, 2026-06-10).** (1) Merge PRs #21,
  #22, #23. (2) Copy `.claude/settings.local.json` into `atlas-stage4/` and
  `atlas-backfill/` worktree roots. (3) Drop worksheet + answer-key PDFs into
  `scripts/conversion/input/` for each level, then re-run pipeline. See section 4 above.
- **Main checkout `CLAUDE.md` regression — PARKED (new, 2026-06-10).** Main checkout has
  an uncommitted `CLAUDE.md` with older garbled content (`\\_` artifacts). Founder to run
  `git checkout -- CLAUDE.md` to discard, or explain if intentional.
- Franchisor pilot-approval routing — G2 (business gate).
- Pricing model (business gate); G1 license scope specifics (now LIFTED for digitization
  permission; geography/duration/derivative rights remain open).
