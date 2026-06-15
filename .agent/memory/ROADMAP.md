# ROADMAP — Technical Build

> This is the \*\*technical\*\* build roadmap. Milestone \*definitions\* (M0–M6, exit criteria,
> business gates) live in `atlas\_assessment\_strategy.md` — the canonical source. This file
> only orders the engineering work and maps it to those milestones. Do not redefine
> milestones here.

## Active milestone: M2 — UES comprehensive pilot

Build the comprehensive assessment + instructor + funnel so a real S.A.M. center can use
Atlas with real families. M1.5 (validity) runs alongside under conservative report
language; it does not block a controlled pilot.

## Now (immediate technical work)

1. **Report fix pass** — close the open report bugs (see CURRENT\_STATE.md / NEXT\_ACTIONS.md):
title-metadata scrub, placement-bar styling, narration no-fabrication-without-data,
diagnose missing radar/sub-strand list on the degraded branch. Then wire the two
report-resident analytics events (`center\_followup\_opted\_in`, `parent\_report\_generated`).
2. Confirm `ATLAS-ASSESSMENT` head on origin; record in CURRENT\_STATE.md.

## Next (not gated on G1)

* Admin/support tooling to pilot grade.
* Feature flags incl. `enable\_comprehensive\_pilot` (default-off); flesh out the §12 flag set.
* Stand up the Code↔Codex relay + run loop (see RUNBOOK.md) for unattended technical runs.

## Gated on G1 (S.A.M license, \~2026-06-02)

* CONVERSION Stage 4 (DB load, \~130-item L1–4 MVP cut) → real question bank.
* Comprehensive-test assembly — config (longer parameterization of the engine), needs the
bank. Curriculum-recommendation table population.

## Deferred (do not build now)

* 4-beat findings depth + narration voice re-tune (re-opens the voice-locked Step 4 prompt;
hold until after the SAM call).
* Offline assessment (v2). Multi-tenant scale-out (M5). Atlas v2 subject-agnostic platform.
* Convert remaining S.A.M levels (0A–0C, 5, 6) + public Singapore Math items (post-MVP).
* **v1.5 — L1 number-bond visual (SAM-L1-Q22):** render the bond via the Atlas parametric
primitive instead of a cropped image. Q22 ships text-only for MVP (stem states the numbers;
auto-grades), so this is a presentation enhancement, not a blocker. The extracted
`sam-l1-q22.png` is already in `question-images/l1/` if a raster fallback is ever wanted.
(Founder decision 2026-06-14.)

## Done (this run of work, on ATLAS-ASSESSMENT)

* Editorial report reskin (layout) — merged, bugs open.
* Per-child consent + server-side gate + classifier-live (code).
* Instructor portal to pilot grade.
* Analytics event store + funnel instrumentation + parent satisfaction.
* Placement logic, tenant scoping (already built earlier).

## Milestone map reference (definitions in strategy doc)

M0 foundations (done) · M1 licensed content + franchisor approval (in flight, hard gate) ·
M1.5 calibration/validity (alongside) · **M2 UWS comprehensive pilot (active)** ·
M2.5 first commercial unit · M3a short-test beta · M3b franchisor-approved outreach ·
M4 recurring instructional loop · M5 multi-tenant platform · M6 Atlas v2.

