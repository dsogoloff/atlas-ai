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
- [x] **DONE 2026-05-31 — Rescoped ruleset `~ALL` → `~DEFAULT_BRANCH`.** Lane branches
  are now pushable/deletable; ATLAS-ASSESSMENT stays fully protected. See DECISIONS 2026-05-31.

## 1. Report fix pass (immediate)
- [x] Scrub page `<title>` metadata — DONE 2026-05-30.
- [x] Narration anti-fabrication guard — DONE 2026-05-30.
- [x] Wire `parent_report_generated` + `center_followup_opted_in` — DONE 2026-05-30.
- [x] Wire report CTA label — DONE 2026-05-30.
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

## 1b. Brand-dot scrub — client-facing copy — DONE 2026-05-30
- [x] §2.4 marketing scrub complete across PRs #16/#20/#21.

## 2. Relay / unattended run loop (not gated)
- [x] **DONE 2026-05-31 — Manual-mode relay built & merged (PR #9, `164a1b2`).**
- [x] **ANSWERED 2026-06-05 (PR #17) — Codex is NOT programmatically reachable on this box.**
      Credential blocker documented. Manual-mode relay remains the fallback.
- [ ] **PARKED — needs Dimitri action:** run `codex login` (or provide `OPENAI_API_KEY` on
      this box) to unblock the automated-relay upgrade and `.mcp.json` finalization.
      Plain-English: open a terminal, run `codex login`, follow the browser prompt, then
      tell the agent "Codex auth done."
- [ ] Finalize `.mcp.json` once Codex CLI is authenticated (blocked on item above).

## 3. M2 build (not gated on G1)
- [x] Feature flags — DONE 2026-05-30.
- [x] Admin/support tooling — ops runbook DONE 2026-05-30. Admin UI deferred 2026-05-30.
- [ ] OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs
      it — see `docs/ops-runbook.md` §3 KNOWN GAP).

## 3b. Comprehensive-test instrumentation (M2 KPI coverage) — COMPLETE on ATLAS
- [x] **MERGED to ATLAS via PR #49 (2026-06-12).** Verify 900/55. ATLAS head b9b0662.
      Migration 20260611090000 present — `supabase db reset` required.
- [x] **MERGED to ATLAS via PR #49 — consent gate regression test (was PR #42).**
- [ ] **Comprehensive-engine reparameterization** — item cap / confidence stop / routing
      depth. DEFERRED to the SEPARATE comprehensive-assembly session.
- [ ] **OPEN PR #43 — lane/ops-runbook-gaps (docs only). Dimitri: merge in any order;
      no supabase db reset needed.**

## 3c. Security remediation lanes — 2026-06-12 — ALL MERGED
- [x] PR #50, #55, #52, #53 all merged. `supabase db reset` run. Baseline 915/56 GREEN.

## 3d. Pre-scale security mediums (NOT in scope — pre-pilot-hardening)
- [ ] **PARKED (pre-scale):** Rate limiting on assessment/submit endpoints.
- [ ] **PARKED (pre-scale):** Trusted-IP extraction for question_access_log / audit.
- [ ] **PARKED (pre-scale):** RLS integration tests.

## 3e. QA-prep for founder's end-to-end run — DELIVERED 2026-06-12
- [x] `supabase/dev-seed-instructor-roster.sql` + `docs/qa-prep-e2e-run.md` built.
- [x] Key QA findings surfaced (COMPREHENSIVE not UI-reachable; data_statistics 0 active;
      geometry thin coverage).
- [ ] **OPEN PR (lane/qa-prep-2026-06-12) — Dimitri: merge after Vercel preview review.**
- [ ] **PARKED — needs Dimitri decision:** COMPREHENSIVE test UI reachability. Options:
      (a) leave as manual-POST only for pilot (no UI change; document for pilot testers);
      (b) add a dev-mode toggle in the assessment start flow. Needs product call before
      building.

## 3f. Visual-primitive + answer-input library (G1-3) — MERGED PR #59 (reported 2026-06-14)
- [x] **MERGED PR #59 (reported)** — lane/visual-primitives-g1-3. 11 stem SVG primitives,
      3 answer-input components, standalone grading module, 2 spec docs, dev gallery.

## 3g. L1 overlay re-author — MERGED PR #61 (reported 2026-06-14)
- [x] **MERGED PR #61 (reported)** — lane/l1-reauthoring. 6 items active, art/format items
      held, Q11/Q17/Q27 corrected.

## 3h. Answer-input wiring (held L1 formats) — MERGED PR #63 (confirmed 2026-06-14)

- [x] **MERGED PR #63 (confirmed, fe5e7f9, 2026-06-14 18:10 UTC)** — lane/answer-input-wiring.
      Migration 20260614120000_add_l1_input_formats.sql (enum DDL only, no seed mirror).
      Grading rules (select-all, select-count, match-pairs) + correctness.ts wiring for
      4 new formats + serializer allowlist + contract doc (docs/l1-input-wiring-spec.md).
      Verify bar GREEN pre-merge: 1020 tests / 72 files, tsc 0, lint 0 (2 known warnings),
      build GREEN. New verify baseline = 1020/72.

- [ ] **Founder: `supabase db reset`** to apply migration 20260614120000_add_l1_input_formats.sql
      (adds SELECT_MULTIPLE, VISUAL_MATCHING, MULTI_BLANK, EQUATION_SET to question_format enum).

- [ ] **CONVERSION session — activate Q11, Q25, Q26, Q27.**
      Their input types are now wired. Atomic step per item: set real format + content fields
      (matching the wired input type), clear requires_format_swap, set is_active=true.
      The questions_held_rows_inactive guardrail remains; do NOT set is_active=true without
      also providing real content and clearing requires_format_swap.

- [ ] **CONVERSION session — re-author SAM-L1-Q25** ("write a fact family 6,8,2") as an
      equation-set item with set-equality grading (per `docs/answer-model-spec.md` worked
      6/8/2 example) before activating it. The grading model is now wired.

- [ ] **CONVERSION/content — content-integrity gate (bank-owned).** ~5 ACTIVE
      model-reconstructed rows need PDF-faithful re-authoring: SAM-L3-Q15, SAM-L3-Q03,
      SAM-L6-Q09/Q11/Q12, SAM-L4-Q15. See `docs/sam-content-authenticity-audit.md`.

- [ ] **CONVERSION/content — 24 inactive image-essential L1-L3 rows** need curated
      per-question images OR re-authoring against parametric primitives before activation.

- [ ] **Picker level-band widening — decided-in-principle: ±3 half-grades, graceful widening**
      (`docs/picker-level-band-proposal.md`). IMPLEMENT AFTER the CONVERSION re-authoring above.

## 3i. Image-ordering (Q17) — PARKED, own lane
- [ ] **PARKED — own lane, pick up when art is ready.** Spec: `docs/image-ordering-spec.md`.
      Image-tile variant of DRAG_DROP (no new enum, no new grade rule; needs multi-image-per-tile
      signed-URL plumbing). Q17 is also art-blocked (requires curated images in Supabase Storage).
      Ready to build the lane whenever art blocker is cleared.

## 3j. Art / image curation (founder action — unblocks art-blocked held items)
- [ ] **FOUNDER ACTION — Curate + upload day-scene/art images for held items:**
      Q01, Q07, Q08, Q13, Q14, Q15, Q19 (art blocker A/B/F — format wiring NOT needed;
      image upload to Supabase Storage bucket unblocks activation).
      Also: single-select click-on-image set Q02/Q03/Q04/Q05/Q06/Q12/Q16 (MULTIPLE_CHOICE,
      requires_format_swap=false — no format wiring needed; art-blocked only).
      Also: Q17 (art-blocked; own lane for multi-image plumbing above).
      Upload manifests in each worksheet's output folder.

## 4. G1 LIFTED (2026-06-10) — CONVERSION L1–4 run COMPLETE; ongoing
- [x] CONVERSION Stage 4 — DB load built (PR #23), L1–4 run COMPLETE.
- [x] Content-id backfill built (PR #22).
- [x] Full-library phase 1 DONE 2026-06-11 (81 rows, 0A/0B/0C/5/6; L7 parked).
- [ ] **Radar acceptance check** — complete one fresh dev assessment, open its report,
      confirm radar populates with strand data (Dimitri runs dev server).
- [ ] **Image curation** — 30 inactive image-essential questions (L1–4 run) + new inactive
      rows from full-library run. Upload manifests in output folders.
- [ ] Question-bank QA pass — stage3-review.md sheets review.
- [ ] Comprehensive-test assembly — engine reparameterization (config); needs the bank.
- [ ] Curriculum-recommendation table population.
- [~] Full-library digitization: L7 parked. Phase 1 done. Phase 3 not started.
- [ ] Remaining: L7; image curation for new inactive rows; recover L5/L6 symbol-font MC
      options skipped by the guard.

## 4b. Assessment mascot (MERGED PR #34 — 2026-06-10)
- [x] Dachshund mascot merged. K-4 phone-width check worth a glance during normal dev use.
- [ ] **Dimitri: merge the docs-only micro-PR** from lane/agents-ci-typecheck-learning
      (AGENTS.md learning), then delete the stale `lane/assessment-mascot` remote branch.
- [ ] Later (founder): swap `stitch/mascot/mascot1-3.png` for updated untagged art.

## 5. Deferred (do not build now)
- [ ] 4-beat findings depth + narration voice re-tune (re-opens voice-locked Step 4 prompt;
      hold until after the SAM deck).
- [ ] Offline (v2); multi-tenant scale-out (M5); remaining S.A.M. levels + public items.

## Parked-for-Dimitri (rollup)
- **Placement bar / radar / sub-strand pills on the degraded branch — PARKED.** See section
  1 above. Needs on-screen check on a real completed assessment.
- **Parent-report pricing ($49 on the parent report) — PARKED, CONFLICTS with hard rule.**
  Adding a consumer price violates BUSINESS_RULES "No consumer paywall." Needs Dimitri
  before any build.
- **Codex CLI auth — PARKED (2026-06-05).** Credential blocker. Run `codex login` or
  supply `OPENAI_API_KEY` on this box.
- **Attend-merge PR #43 (ops-runbook-gaps) — PARKED awaiting Dimitri.** Docs only; no DB.
- **Founder actions for conversion run — PARKED.** Image curation for inactive
  image-essential questions. Radar acceptance check.
- **COMPREHENSIVE test UI reachability — PARKED (2026-06-12).** See 3e above.
- **Art/image curation for art-blocked held items (Q01/Q07/Q08/Q13/Q14/Q15/Q19 + single-select
  image set + Q17) — PARKED awaiting founder upload to Supabase Storage bucket.**
- **Image-ordering lane (Q17) — PARKED until art is ready.** Spec at docs/image-ordering-spec.md.
- Franchisor pilot-approval routing — G2 (business gate).
- Pricing model (business gate); G1 license scope specifics (geography/duration/derivative
  rights remain open).
