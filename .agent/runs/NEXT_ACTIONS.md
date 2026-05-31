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
- [ ] Scrub page `<title>` metadata — remove "Diagnostic Excellence"; report is
      "Assessment Report" everywhere (§2.4).
- [ ] Fix placement bar — navy fill + white text (the reference styling), incl. the
      degraded/"unreliable" branch.
- [ ] Narration: when strand-level data is absent, do NOT assert specific strand
      strengths/weaknesses (kill the fabrication). §2.4 / credibility.
- [ ] Diagnose missing radar + sub-strand pill list on the degraded branch
      (data-path vs. render regression); confirm on SCREEN with a real completed
      assessment, not a speed-run/print.
- [ ] Wire the two report-resident analytics events: `center_followup_opted_in`,
      `parent_report_generated`.
- [ ] **PARKED — needs Dimitri:** report CTA wording — "Schedule a free class"
      (commercial) vs. "Schedule a conversation with a S.A.M. center director"
      (consultative). Href stays placeholder until real scheduling is wired.

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
- Report CTA wording (item 1).
- Codex reachability / relay mode (item 2).
- Franchisor pilot-approval routing — G2 (business gate).
- G1 license scope specifics; pricing model (business gates).
