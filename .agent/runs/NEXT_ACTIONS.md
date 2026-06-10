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
- [x] **DONE-pending-merge (PR #16) — `(marketing)/page.tsx:74` hero pill "Diagnostic Suite" →
  "Assessment Suite".** lane/marketing-assessment-wording. CI GREEN, Vercel preview pass.
  Dimitri merges attended. NOTE: 5 further visible "diagnostic" occurrences remain on the
  marketing page (lines 84, 135, 170, 298, 313) — parked pending §2.4 call with Dimitri.
  See Parked-for-Dimitri below.

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

## 4. Gated on G1 (S.A.M. license, ~2026-06-02)
- [ ] CONVERSION Stage 4 — DB load, ~130-item L1–4 MVP cut (real question bank).
- [ ] Comprehensive-test assembly — engine reparameterization (config); needs the bank.
- [ ] Curriculum-recommendation table population.

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
- **§2.4 marketing page — 5 remaining visible "diagnostic" occurrences — PARKED (new,
  2026-06-05).** PR #16 fixed only `(marketing)/page.tsx:74` (hero pill). Five further
  parent/educator-facing strings were left untouched by design (lane scoped to line 74):
  line 84 "rigorous diagnostic journey", line 135 "Diagnostic Strands" heading, line 170
  "Diagnostic Precision" card, line 298 "world-class diagnostic tools", line 313
  "Diagnostic Suites". (Line 131 is a non-rendered code comment — not a concern.)
  Question for Dimitri: (a) should these 5 be scrubbed to "assessment" in a follow-up
  lane? (b) if yes, what is the preferred replacement wording for each?
- **Codex CLI auth — PARKED (updated 2026-06-05).** Reachability now confirmed as a
  credential blocker (not transport). Automated relay + `.mcp.json` unblocked once Dimitri
  runs `codex login` or supplies `OPENAI_API_KEY` on this box (see item 2 above).
- Franchisor pilot-approval routing — G2 (business gate).
- G1 license scope specifics; pricing model (business gates).
