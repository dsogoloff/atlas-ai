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

## 1b. Brand-dot scrub — client-facing copy (queued 2026-05-30; not gated)
- [ ] Fix the official "S.A.M" brand token (two dots, NO trailing dot) wherever
      client-facing copy renders it mid-sentence as "S.A.M." — per BUSINESS_RULES §
      "Claims & language". Scope is COPY-ONLY (rendered strings); leave code comments,
      logs, type docs, tests, and genuine sentence-final "S.A.M." (e.g. footer
      "by S.A.M. All rights reserved." is correct). Already-correct: the placement-label
      path (`src/lib/report/assemble.ts:79-82`) and the voice-locked narration prompt.
      12 strings across 7 files:
      `src/app/(parent)/report/page.tsx:57,60` (`:63` CTA label fixed in `43b24c8`);
      `src/app/(parent)/report/parent-report-feedback.tsx:114`;
      `src/app/(instructor)/instructor/page.tsx:37`;
      `src/app/(instructor)/instructor/student/[childId]/page.tsx:405`;
      `src/app/(auth)/signup/signup-form.tsx:214,235,291`;
      `src/app/(child)/assessment/components/QuestionShell.tsx:66`;
      `src/app/(marketing)/page.tsx:74`; `src/app/layout.tsx:42` (description metadata).
      NOTE: `(marketing)/page.tsx:74` also says "Diagnostic" — a separate §2.4 question,
      do NOT fold it into the brand-dot fix.

## 2. Relay / unattended run loop (not gated)
- [ ] Build the Code↔Codex relay + run loop per RUNBOOK.md (treat as a normal lane:
      verify bar, security rules — local-only, no secrets/child data/licensed content).
- [ ] **PARKED — needs Dimitri:** is Codex reachable programmatically (automated relay)
      or is review a manual PS1 hop for now? Determines whether step 6 runs unattended.
- [ ] Finalize `.mcp.json` once transport is confirmed.

## 3. M2 build (not gated on G1)
- [ ] Admin/support tooling to pilot grade.
- [ ] Feature flags incl. `enable_comprehensive_pilot` (default-off); flesh out §12 set.

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
- Codex reachability / relay mode (item 2).
- Franchisor pilot-approval routing — G2 (business gate).
- G1 license scope specifics; pricing model (business gates).
