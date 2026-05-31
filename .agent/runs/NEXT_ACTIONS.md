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
- [ ] Fix placement bar — navy fill + white text (the reference styling), incl. the
      degraded/"unreliable" branch.
- [ ] Narration: when strand-level data is absent, do NOT assert specific strand
      strengths/weaknesses (kill the fabrication). §2.4 / credibility.
- [ ] Diagnose missing radar + sub-strand pill list on the degraded branch
      (data-path vs. render regression); confirm on SCREEN with a real completed
      assessment, not a speed-run/print.
- [ ] Wire the two report-resident analytics events: `center_followup_opted_in`,
      `parent_report_generated`.
- [ ] Wire report CTA: label is **"Schedule a conversation with a S.A.M center director"**
      (decided 2026-05-30; commercial "Schedule a free class" rejected). Href stays
      placeholder until real scheduling is wired; apply label when CTA is wired.

## 1b. Brand-dot scrub — client-facing copy (queued 2026-05-30; not gated)
- [ ] Fix the official "S.A.M" brand token (two dots, NO trailing dot) wherever
      client-facing copy renders it mid-sentence as "S.A.M." — per BUSINESS_RULES §
      "Claims & language". Scope is COPY-ONLY (rendered strings); leave code comments,
      logs, type docs, tests, and genuine sentence-final "S.A.M." (e.g. footer
      "by S.A.M. All rights reserved." is correct). Already-correct: the placement-label
      path (`src/lib/report/assemble.ts:79-82`) and the voice-locked narration prompt.
      12 strings across 7 files:
      `src/app/(parent)/report/page.tsx:57,60,63`;
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
- **Parent-report pricing ($49 on the parent report) — PARKED, and CONFLICTS with a hard
  rule.** Requested 2026-05-30; not actioned. Adding a consumer price to the parent report
  violates BUSINESS_RULES "No consumer paywall — families never pay Atlas directly," and
  pricing models are Dimitri-owned/unconfirmed regardless. Needs Dimitri before any build;
  as written it is contrary to the locked B2B2C model.
- Codex reachability / relay mode (item 2).
- Franchisor pilot-approval routing — G2 (business gate).
- G1 license scope specifics; pricing model (business gates).
