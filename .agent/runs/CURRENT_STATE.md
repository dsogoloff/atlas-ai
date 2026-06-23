# CURRENT STATE — Live Technical State

> Volatile. Update at the end of every lane/run (via the `repo-memory-maintainer` agent).
> Replaces the technical `*_handover.md` files (ATLAS / CONVERSION / AGENTS). State-focused;
> durable rationale goes to `DECISIONS.md`, debt to `TECHNICAL_DEBT.md`.

**As of:** 2026-06-22 (short-test sampling band fix) — trunk head is **`96e34f6`** (PRs #139,
#140, #141 merged). Picker fix + crosswalk regen landed after the UI session below; no
migration — **no `supabase db reset` needed.**

- **PR #139 — lane/young-band-sampling-band — MERGED (`17fa2bf`).** Short-test sampling band
  changed from PREVIOUS-booklet-only to **{previous, current}** at every level above the floor,
  and **{0A} only at the 0A floor**: 0B → {0A,0B}, 0C → {0B,0C}, grade 1 → {0C,1A,1B}, grade 5
  → {4A,4B,5A,5B}, … up the ladder. Fixes a 0B child being served an all-0A test identical to a
  0A child's. Renamed `previousBookletHalfGrades` → `shortTestLevelBand` in `levelBand.ts`;
  updated all three short-path call sites (pickForSession pick band, responseSubmit availability
  discovery, sessionStart `max_questions` ceiling) so band / eligible-count / progress
  denominator stay consistent. The floor collapses naturally (previous==current==0 → {0A});
  KA/KB still fold into the 0C booklet ordinal. **SCOPE: changes the served band for EVERY
  non-floor level — the prior behavior was uniformly previous-only, NOT a 0B one-off.**
  Comprehensive picker UNAFFECTED (anchors on measured level via `levelLockHalfGrades` /
  per-pick plan, never this function). No content/bank change. Verify GREEN 1232/91.
  **Supersedes the earlier Task C(c) verdict** — the picker band, not bank content, caused the
  L0A==L0B "identical" symptom.
- **PR #138 — lane/l0ab-content-identity-20260622 — MERGED (`d1dcc31`, CONVERSION lane).**
  Independently confirmed the L0A/L0B bank content is NOT duplicated (audit
  `scripts/conversion/audit/l0ab-content-identity-2026-06-22.md`); the identical-rendering cause
  was the short-test band, fixed in #139.

- **PR #140 — lane/crosswalk-regen-band-20260622 — MERGED (`872f044`, CONVERSION lane).**
  Regenerated the served-order crosswalk artifacts
  `scripts/conversion/audit/served-crosswalk.{md,json}` against the new {previous,current}
  band (re-ran `build-served-crosswalk.ts` over `seed.sql`; also refreshed the generator's
  stale cross-check annotations — `PRIOR_ESTIMATE` → `PRIOR_BAND_ELIGIBLE` + per-child
  "prev-band → now" delta + footer). Docs/artifacts only; no migration, no seed change, no
  supabase db reset. Verify GREEN 1232/91. Closes the #139 crosswalk follow-up.
  - Served-count change per QA-seed child (old previous-only → new {previous,current} band;
    eligible old→new): QA Zero-A {0A}→{0A,0B} 17→30; QA Zero-C {0B}→{0B,0C,KA,KB} 13→21;
    QA Level 1 {0C,KA,KB}→{0C,KA,KB,1A,1B} 8→35; QA Level 2 {1A,1B}→{1A,1B,2A,2B} 27→52;
    QA Level 3 {2A,2B}→{2A,2B,3A,3B} 25→38; QA Level 4 {3A,3B}→{3A,3B,4A,4B} 13→18. Every
    non-floor cohort widens (adds the child's own booklet level); bank unchanged.
- **PR #143 — lane/memory-crosswalk-band-20260622 — OPEN.** This memory record
  (CURRENT_STATE / NEXT_ACTIONS / DECISIONS) for the #140 regeneration + Task C(c) closure.
  Docs/memory only; no DB change.

---

**As of:** 2026-06-22 (ATLAS UI / onboarding session) — trunk head is **`1f0196a`** (PR #136
merged). Three ATLAS-lane PRs landed this session; PR #134 (young-band/L3 QA) also merged
(`bc637ea`). No migration in any of the three — **no `supabase db reset` needed.**

- **PR #133 — lane/landing-page-cleanup — MERGED (`55d5b8d`).** Public marketing (`/`) + auth
  (`/login`, `/signup`) cleanup (Task A): hero badge recolored navy (was red-on-pink); removed
  dead CTAs (View Sample Reports / Explore Dashboard / Book a Demo), public nav
  (Journey|Reports|Students), Number-Sense double-width, Success-Story card, all footer dead
  links; approved CTA by-line ("Join over 30,000 students…"); © 2024→2026 + branding unified to
  "Atlas Assessment Suite by S.A.M New York"; placeholder mascots → real `/mascot/*.png`. Verify
  GREEN 1225/91.
- **PR #135 — lane/assessment-flow-fixes — MERGED (`2e388bd`).** Assessment/onboarding flow
  (Task B): beta-welcome moved out of the per-assessment gate into a once-only onboarding
  interstitial on `/add-child` (localStorage `atlas_beta_welcome_seen`, `useSyncExternalStore`;
  larger font); parent-instructions screen restored (`ENABLE_PARENT_INTRO` flipped default-ON);
  removed the duplicate post-Welcome mascot screen (now spinner-only); short-test progress bar
  now shows a per-session ceiling `max_questions` from /start (short = min(short cap 15,
  eligible-pool size); comprehensive = engine cap) instead of a fixed 25 — plumbed
  handler→types→api→reducer→progress; "Current grade" on add-child now REQUIRED (UI-only; DB
  column still nullable); remaining placeholder mascots (coppa/add-child/dashboard) → real
  assets. Verify GREEN 1230/91 (+5 tests).
- **PR #136 — lane/parent-intro-final-copy — MERGED (`1f0196a`).** Replaced DRAFT parent-intro
  copy (`src/lib/proctoring/copy.ts`) with FINAL founder-approved wording (both age variants +
  shared block) and confirmed `ENABLE_PARENT_INTRO` default-ON. Read-aloud dropped the italic
  note (boxed summary only); no-assistance gained the concept-help point (parent may explain a
  unit conversion, then let the child do the math); button "Start the assessment". The env.ts
  conflict vs trunk (shared flag flip already in #135) was resolved keeping the
  default-off-invariant note + adding the founder-approved copy reference.

**Task C — picker investigations (report-only, NO code change; verdicts):**
- (a) **Short test L1 = 8 is GENUINE bank exhaustion, not a stop-short bug.** L1's
  previous-booklet eligible pool holds exactly 8 active `short_test_eligible` items; the loop
  serves all 8 then closes `bank-exhausted`. Stop policy (softFloor 10 / hardCap 15, per-strand
  floor clamps to availability) cannot stop before the pool empties. (PR #135's progress fix now
  shows "of up to 8" here instead of 25.)
- (b) **Short test: sampling level band is FIXED for the session** (anchored on grade, never
  widened on interim results); **question order is RE-DERIVED adaptively on each pick**
  (difficulty targets the running posterior within the fixed band). Actual == intended.
- (c) **L0A==L0B is NOT a picker bug.** 0A/0B are distinct booklet ordinals with disjoint level
  filters — no L0A→L0B mis-map is possible. If they render identically it is a CONTENT-BANK
  identity issue (same content authored under both external_ids) — **flagged for the CONVERSION
  lane**; the ATLAS lane did not touch bank content.

---

**As of:** 2026-06-22 — trunk head is **`f95920c`** (PR #134 open off this head;
PR #123 merged at `c4a67e8`; PR #119 `lane/picker-short-outcome` merged at `c3ad839`;
advanced from `ce9a676`/#115). Session 2026-06-22: duplicate-migration collision
(version 20260620120000) verified already resolved on trunk — no new work. New open PR
#134 (young-band + L3 founder-QA defect batch).

**PR #134 — lane/young-l3-qa-defects-20260622 — OPEN (CI GREEN, Vercel GREEN).** Young-band
+ L3 founder-QA defect batch, off trunk head `f95920c`. Verify: 1225 tests / 91 files GREEN,
tsc 0, lint 0 errors (2 known warnings), build OK, seed-migration parity PASS (71 migrations).
Codex manual/skipped (relay unauth). Migration `20260622120000_young_qa_image_stem_fixes.sql` +
seed mirror (3 UPDATEs on already-active rows):
- SAM-L0A-Q11 (band-{0A} pattern): wired missing pattern-strip stimulus
  `l0/sam-l0a-q11-stimulus.png` (red,blue,red,blue,red,?).
- SAM-L0B-Q02 (band-{0A} pattern): wired missing pattern-strip stimulus
  `l0/sam-l0b-q02-stimulus.png` (magnet,baseball x3).
- SAM-L0C-Q13 (band-{0B} days-of-week): re-authored stem VERBATIM from worksheet, wired
  torn-calendar stimulus `l0/sam-l0c-q13-stimulus.png`, reduced choices to two
  (Friday/Fryday, reusing q13-t2/q13-t4).
- SAM-L0B-Q03 (band-{0A} cake): NO DB change — SOURCE_MAP key `l0/sam-l0b-q03-stimulus.png`
  re-pointed from 0B-03_1.png (whole cake) to doc-faithful cake-with-wedge crop.
New stimulus crops cut from rendered worksheet pages via committed reproducible generator
`scripts/conversion/gen_young_qa_stimuli.py` (Word→PDF→PNG→crop). Source PNGs gitignored;
founder uploads to private question-images bucket. SOURCE_MAP (`activation-image-set.ts`)
updated: 3 new keys + 1 re-point. Served-order crosswalk (`build-served-crosswalk.ts`)
extended with a band-{0A} child "QA Zero-A" (Pre-K age 5); `served-crosswalk.md/json`
regenerated. `scripts/conversion/_extract_docx.py` now tracked (was untracked). Findings
doc: `scripts/conversion/audit/young-l3-qa-defects-2026-06-22.md`.
ALSO FIXED (2026-06-22 follow-up, same lane):
- SAM-L0C-Q04 (fact-family): was EQUATION_SET → rendered blank (all-blank number sentences;
  operands only in canonical). Re-authored to **MULTI_BLANK** — operands shown as `text`
  tokens (3+6 / 6+3 / 9-3 / 9-6), each result its own `blank`; per-blank numeric grading
  reuses canonical answers (9,9,6,3). Migration `20260622130000` + seed mirror. The earlier
  "EQUATION_SET prefill lane" backlog is RESOLVED (the flag was over-scoped — MULTI_BLANK
  already gives per-blank slots with operands as text). serialize serves stem+tokens only.

ONE ITEM PARKED (founder-supplied art):
- SAM-L4-Q21 (L3-session rectangle area, served Q5): source
  `scripts/conversion/source/4/L4-21.png` is a blank blue rectangle with no dimension
  labels. Founder to re-upload a corrected PNG (dimensions NOT fabricated). No DB change.
Founder actions after merge: (a) `pnpm convert:upload-activation-images` (3 new keys +
re-pointed cake); (b) re-upload corrected `source/4/L4-21.png` then re-run image upload;
(c) `supabase db reset` (applies `20260622120000` + `20260622130000`).

**PR #123 — lane/short-eligible-overset-audit — MERGED (`c4a67e8`)** (docs/helpers only — no
migration, no seed, no flag change; commit `a084d0e`). Verify GREEN pnpm test 1196/89, tsc
clean, lint 2 known warnings, seed↔migration parity PASS. Deliverables:
`short-eligible-overset-audit.md`; `overset-state.mts` (computes FINAL DB state from `seed.sql`
— inserts first-wins + all 213 updates in single-`=`, `IN(...)`, JOIN forms);
`_extract_short_keys.py`; `build-overset-matrix.mjs`; `bank-final-state.json` (ids+flags only;
licensed source tree gitignored). Findings: Task 2 (key parity) ZERO gaps / ZERO over-flags —
every active source-Short=Y row already `short_test_eligible=true` (`l1-l4-short-eligible-backfill`
migration `20260619080000` + young-band L0 authoring honor the key; no UPDATE applied). Task 3
(over-set ceiling) SOURCE-KEY CAPPED, not under-flagged — no strand×booklet cell reaches the
~15–18 target (max booklet-2 number_sense = 13); per-booklet active&STE pools 0A=18 / 0B=13 /
0C=8 / booklet-1=27 / booklet-2=25 / booklet-3=13 / booklet-4=5 (critically under); each
worksheet bands across MULTIPLE booklets (L1→0C+1, L2→1+2, L3→1+2+3, L4→2+3+4). Source Short=Y
docx counts match backfill IN-lists (L1 17/L2 21/L3 20/L4 25). Three Short=Y rows have NO DB row
(converter-skipped): `SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17` — recoverable only by
re-authoring. Two items PARKED for Dimitri (see NEXT_ACTIONS). Independent lane; no change to
young-band exclusions or prior PRs.

**Picker Calibration — 3 stacked PRs (2026-06-21).** All verify-bar GREEN; Codex
manual/skipped (relay unauth). **PR #119 (PR1) MERGED (`c3ad839`).** Remaining stacked and
open, in order: **#121 → #122** (Dimitri merges attended after Vercel preview; stacked-PR
retarget note: when a parent PR merges GitHub may not auto-retarget the child — manually
re-point #121's base to ATLAS-ASSESSMENT if needed, same for #122 after #121).

**OPEN PR #120 — lane/young-band-image-activation-audit** (docs/memory only, off trunk
`ce9a676`). **Finding: the young-band (0A/0B/0C) SHORT-TEST beta has NO remaining content
gate.** The short-test-eligible young-band image set is fully active on trunk (PR #78 + the
2026-06-20 wave: l0a/l0b/l0c-taxonomy-activation, l0b-position, l0a-q15, l0a-q17,
l0b-q03-q06, l0-qa-content-fixes; named defect patterns fixed). Triple-verified against
`seed.sql`: **53 young-band rows = 36 active / 17 inactive**, 26 active IMAGE rows (0A=11,
0B=6, 0C=9). **The 9 inactive image rows (SAM-L0A-Q09/Q12, L0B-Q01/Q08/Q12/Q13,
L0C-Q01/Q06/Q12) are FOUNDER-ADJUDICATED EXCLUDED FROM THE SHORT TEST — not a content gap,
not a beta gate.** Exclusion is durably encoded (`short_test_eligible=false` AND
`is_active=false`) and picker-enforced (`shortTestPicker.ts:50-51` selects only
`is_active=true AND short_test_eligible=true`; test `shortTestPicker.test.ts:88`) — they are
inert to the short test regardless of art. No new flag needed; only the exclusion REASON was
prose (now relabelled in the doc). Any per-row art note is COMPREHENSIVE-only/future, NOT a
short-test blocker. Other 8 inactive: manual/oral/drawing/text-ambiguous or retired L0C-Q11
(replaced by active Q11A–D). Named defect patterns verified clean (L0C-Q05 shuffled
IMAGE_ORDERING + id-keyed grading; L0A-Q08 box-reference is a separate stimulus).
Seed↔migration parity **PASS** (69 migrations). Verify GREEN 1196/89, tsc 0, lint 2 known
warnings. No migration/seed/image change. Findings doc:
`scripts/conversion/audit/young-band-image-activation-status.md`. PR is docs/memory only;
merge at leisure to land the record.

---

**History (pre-#119 trunk).** Trunk reached **`7f2a737`** via six merges since the
2026-06-18 snapshot below: PR #109 (fix-dup-migration-version, `e489312`), #110
(restore-seed-mirrors, `8d3d09c`), #111 (seed↔migration activation **parity guard** +
generated mirror region, `20127b0`), #112 (L0C young-band QA fix batch #2, `3c5dfc0`),
#113 (L1 QA batch — Q1/Q2/Q4/Q8 + L4-Q06 missing-digit, `f5fdbc9`), #114 (short-test
follow-up form, `7f2a737`); then #115 (`ce9a676`), #119 (`c3ad839`), #123 (`c4a67e8`). PRs
#82/#83/#84 below are now superseded/older — verify their GitHub status before acting; the
2026-06-18 block is retained for history.

**Picker Calibration PRs (3 stacked, 2026-06-21) — #119 MERGED (`c3ad839`); #121/#122 open:**

- **PR #119 — lane/picker-short-outcome** (base ATLAS-ASSESSMENT, off `ce9a676`):
  New `src/lib/shortTest/outcome.ts` — `ShortTestOutcome` type with `measured_level`,
  `intake_level`, `pass_band` (clean/mixed/weak/insufficient, 8-graded-item floor;
  clean ≥0.8 / mixed 0.5–0.8 / weak <0.5 / insufficient <8 graded), `clean_pass_ratio`,
  `strand_map{correct,seen,ratio}`, `seen_item_ids`. Persisted to new nullable jsonb column
  `assessment_sessions.short_test_outcome` (migration `20260621130000`, column DDL, NO seed
  mirror) on session close via `persistShortTestOutcome` in `responseSubmit/handler.ts`
  `closeSession` (gated to short). Readiness floor: needs ≥8 graded AND clean ratio;
  0A current level suppressed. New `src/lib/engine/shortTest.ts` — stratified short draw:
  coverage-first router (~2/strand, fewest-served then max-variance fill) + coverage+count
  stop (10–15, no SE gate). In-scope = strands with ≥1 active short_test_eligible item in
  previous-booklet band (new `picker.discoverShortEligibleCounts`); floor clamps to
  availability. Wired into `responseSubmit` decideTermination/buildRouter for short.
  Verify: **1220 tests / 91 files GREEN**, tsc 0, lint 0 err (2 known warnings), build OK.
  Post-merge: `supabase db reset` (adds nullable `short_test_outcome` column).

- **PR #121 — lane/picker-comprehensive** (base lane/picker-short-outcome):
  Comprehensive anchors on MEASURED level (reads child's latest completed short session's
  `ShortTestOutcome` → booklet band; neutral grade when no outcome). Global split by
  `pass_band` (`src/lib/engine/comprehensiveSplit.ts`): clean 30/50/20 over M-1/M/M+1;
  mixed 50/30/20 over M-1/M/M-2; weak below-weighted (floor-find seed); insufficient/none
  neutral 50/30/20. `planNextOffset` steers each pick to the largest-deficit offset.
  Per-strand override `strandAdjustedSplit` redistributes by `strand_map` ratio.
  Per-pick plan (`src/lib/questionPicker/comprehensiveLevelPlan.ts`): chosen offset →
  target±1 booklet band + difficulty centred on planned booklet (thin pool falls through to
  neighbour). `replay.replayStrandOffsetCounts` attributes actual served level back to an
  offset so the split self-corrects. ALWAYS subtracts `seen_item_ids`
  (`PickContext.extraExcludedIds`, merged in both handlers). Length 20–30, cap 30:
  G5_8 `hardCap` 36→30; K_4 stays target 20 / cap 26. `NextQuestionRequest`/`PickerRequest`
  gain optional per-pick `levelBand`; `pickForSession` honours it for comprehensive.
  Verify: **1250 / 94 GREEN**, tsc 0, lint 0 err (2 known), build OK. No new migration.

- **PR #122 — lane/picker-floor-ceiling** (base lane/picker-comprehensive):
  Bank-aware offsets (`picker.discoverAvailableBooklets` → `availableOrdinals`): split only
  targets booklets the active bank serves. CEILING = no reach above highest available.
  FLOOR = walk-down stops at lowest loaded booklet. Floor-find (`weak` pass_band): hands
  level to adaptive engine over `floorFindBand` (at-and-below) so it walks down until solid.
  Wired in `responseSubmit` router + sessionStart first pick. `manual_placement_needed`:
  `evaluateFloorFind` sets it true when engine settled at/below lowest loaded booklet AND
  child still not solid (< `FLOOR_FIND_SOLID_RATIO` 0.5). New nullable column
  `assessment_sessions.manual_placement_needed` (migration `20260621140000`, column DDL,
  NO seed mirror), persisted on comprehensive completion (`persistComprehensivePlacement`,
  no-op for short). Copy `src/lib/report/manualPlacement.ts`: manual line founder-locked
  verbatim; `floorFoundLine` + `ceilingLine` are §2.4 DRAFTS pending Dimitri.
  Verify: **1260 / 94 GREEN**, tsc 0, lint 0 err (2 known), build OK.
  Post-merge: `supabase db reset` (adds nullable `manual_placement_needed` column).
  BATCHED GATE ITEMS for Dimitri (in PR #122 body):
  (1) Confirm §2.4 draft parent copy (`floorFoundLine`, `ceilingLine`) in `manualPlacement.ts`.
  (2) Render floor-found/manual/ceiling copy in parent report + surface `manual_placement_needed`
      to instructor view — HELD pending copy decision (not built).
  (3) Thin-pool structural fix = parametric item generation — out of scope; readiness min-N
      floor (PR #119) + comprehensive confidence already cover under-N.

**Previous session open PR — lane/qa-crosswalk-l1l2** (off trunk `f5fdbc9` / #113 head; #114
is a sibling not in this branch's history — re-pin touches only bank content so no
conflict). Short-test served-order→external_id crosswalk + three QA re-pins:
- **Crosswalk** (`scripts/conversion/audit/build-served-crosswalk.ts` + `served-crosswalk.{md,json}`):
  replays the real adaptive engine over `seed.sql` per QA-seed child. The prior "MISMATCH"
  banner was a **stale hardcoded estimate**, not a served≠eligible gap — reframed as a
  non-blocking cross-check. Per-child served-vs-eligible: 0B 13/13, L1 8/8, L4 13/13 (all
  genuine bank-exhaustion); L2 25/27, L3 25/25 (both the 25-question MAX cap). **No
  picker-stops-short defect.**
- **L2-Q1 = SAM-L1-Q28** (served pos 1; NOT external SAM-L2-Q01) — FIXED. Stem reworded to
  "Arrange the numbers in order, from smallest to largest." (was carrying the original
  NUMERIC_ENTRY stem with the literal 17/20/10 that duplicated the tiles). Stays DRAG_DROP;
  items [17,20,10] (≠ answer order → served shuffled); correct_order [10,17,20]; grading
  unchanged. Migration `20260621120000_l1_q28_stem_rework.sql` + seed mirror (parity guard PASS).
- **L2-Q2 = SAM-L1-Q23** (ribbon word problem; NOT triangle-counting SAM-L2-Q02) — REPORTED,
  no fix. Text-complete (7+3=10), no serve-time image defect; source ribbon figures are
  illustrative/redundant. Decision-queued (add art vs keep text-only).
- **L1-Q3 = SAM-L1-Q01** (same-color) — REPORTED, already source-correct. Reds interleaved at
  tiles 1/3/5 matching the worksheet crops; serializer preserves authored order; id-keyed
  select-all grading (shuffle-safe). No change.
- Findings doc: `scripts/conversion/audit/repin-findings.md`. Verify GREEN **1181 tests /
  87 files**, tsc 0, lint 0 errors (2 known warnings). Codex manual/skipped (relay unauth).
  After merge: `supabase db reset` (applies `20260621120000`). No image upload.

---

**As of:** 2026-06-18 session — trunk advanced to **`ae281dd`** (PR #81, lane/short-test-readiness-report, merged). Three new open PRs (all off trunk `ae281dd`, NOT stacked, Dimitri merges attended after Vercel preview review):

- **PR #82 (lane/lead-notify-test)** — test-only: `src/lib/followUp/notify.test.ts` (flag-gated no-op, live POST shape, fail-soft coverage). Implementation already on trunk (Task 3 was verify-confirmed-done; see below). Verify GREEN 1172 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped (relay unauth).
- **PR #83 (lane/mascot-welcome)** — replaces the auto-advancing loading screen with a STATIC tap-to-start Welcome (`src/app/(child)/assessment/components/Welcome.tsx`; tier-aware). Child tap is the SOLE releaser of `startConfirmed` in `assessment-client.tsx`; parent-intro + dev pilot-chooser gates now only acknowledge/advance (no longer release start). New `Welcome.test.tsx` (renderToString smoke, Mascot stubbed). Reducer unchanged. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped.
- **PR #84 (lane/coppa-consent-of-record)** — LEGAL/COPPA. Single consent source (`CONSENT_TEXT` + `CONSENT_TEXT_VERSION` "2026-06-18.v2" in `src/lib/consent/text.ts`; form + action both use same constant). Disclosure asset: `docs/legal/COPPA_Disclosure.docx` committed with two edits vs counsel original (§2 removed "school name" from not-collected list; §10 placeholder → privacy@samnewyork.com); served PDF `public/legal/coppa-disclosure-v1.pdf` generated via `tools/legal/build_coppa_pdf.py`. `/coppa` "Download PDF" button wired → `/legal/coppa-disclosure-v1.pdf`. New `consent_records` columns `disclosure_version` + `disclosure_content_sha256` (migration `supabase/migrations/20260618120000_consent_disclosure_asset.sql` + `database.types.ts` + seed mirror). Add-child action captures `DISCLOSURE_VERSION` ("coppa-disclosure-v1") + PDF sha256 (`a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea`) on every row. `src/lib/consent/text.test.ts` recomputes the PDF hash and asserts equality (drift guard). `LEAD_SCHOOL_FIELD_LIVE` default flipped ON (`!== "false"`) in `src/lib/env.ts`; "school not collected" removed from disclosure + env; `.env.example` updated. `docs/legal/Parent_Privacy_Request_Policy.docx` committed for the record. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped. REQUIRES `supabase db reset` after merge (adds 2 nullable `consent_records` columns; seed populates them). BATCHED GATE ITEMS for Dimitri (in the PR): (1) served PDF uses core fonts / ASCII punctuation — excludes the source doc's "Checkbox:"/"Button text:" authoring annotations; (2) the ON-SCREEN `/coppa` page body is still Stitch placeholder copy and does NOT yet match the counsel PDF — recommend a follow-up copy pass (parent-facing claims language, gate to Dimitri); (3) confirm committing `Parent_Privacy_Request_Policy.docx` is intended.

**Tasks verify-confirmed already on trunk (no fabricated changes):**
- **Task 1 ("wire the short picker live")** — verified already done via commits f877285 + a23097c (pre-dating PR #81). Short path already routes through `src/lib/questionPicker/pickForSession.ts:67` (`session.testType === "short"` → `pickShortTestQuestion`, `short_test_eligible` filter + previous-booklet band). Both live handlers call pickForSession: `src/lib/sessionStart/handler.ts:376,581` and `src/lib/responseSubmit/handler.ts:1154`. `test_type` defaults to "short" at `sessionStart/handler.ts:238`. Tests already cover dispatch (`pickForSession.test.ts`) + filter (`shortTestPicker.test.ts`). No PR opened. Confirm-only.
- **Task 3 ("lead-notification email send path")** — verified already done on trunk. `src/lib/followUp/submit.ts` persists the `follow_up_leads` row then calls best-effort `src/lib/followUp/notify.ts` (Resend via fetch), gated by `LEAD_NOTIFY_LIVE`, fail-soft (never throws; persistence never blocked). Not enabled (env stays founder-set). PR #82 is test-only.

**As of:** 2026-06-16 L0/L1/L2 activation wave — **PR #78 OPEN** (lane/l0-l2-activation), off trunk `a98f3e5`. Activates 19 FLIP-READY held rows across L0A/L0B/L0C/L1/L2 (one atomic UPDATE per level: sets real format + full render/answer content + `is_active=true`, guarded on `is_active=false`; activated content carries NO `_authoring.requires_format_swap` so the `questions_held_rows_inactive` CHECK permits it). New migration `20260617120000_l0_l2_activation.sql` + mirrored seed `l0-l2-activation` block (additive +214/-0). New applier `scripts/conversion/apply-activation.ts` (`pnpm convert:apply-activation`), reads per-level overlay `overlay/l{0a,0b,0c,1,2}-activation.json`; asserts only the 19 targeted ids change (non-destruction). `activation-spec.md` documents exact per-format content shapes (from `serialize.ts` + `correctness.ts` + `mintImage.ts`). FLIP-READY rows: L0A Q08/Q11 (CLICK_IMAGE_SINGLE); L0B Q02 (CLICK_IMAGE_SINGLE); L0C Q03 (SELECT_MULTIPLE), Q04 (EQUATION_SET), Q08/Q11/Q16 (MULTI_BLANK), Q14 (NUMERIC_ENTRY); L1 Q02/Q03/Q16 (MC+image), Q11/Q27 (VISUAL_MATCHING text tiles), Q13/Q15 (VISUAL_MATCHING+images), Q14 (MULTI_BLANK+image), Q17 (IMAGE_ORDERING); L2 Q06 (CLICK_IMAGE_SINGLE). Two demoted to one-image-away (image does not yet exist): SAM-L0A-Q17, SAM-L0B-Q07. Verify GREEN: **1091 tests / 76 files**, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). PR #78 OPEN — awaiting image uploads to private `question-images` bucket (l0/, l1/, l2/ folders), then founder merge + `supabase db reset`. ACTIVATION DEPENDENCY (trunk): PRs #74/#75/#76/#77 merged (L0 bank, L0 memory, short-test-eligible picker, per-tile minting); trunk head is now `a98f3e5`.

**As of:** 2026-06-15 L0 authoring session — **PR #74 OPEN** (lane/l0-authoring). Re-authors 21 SAM-L0* rows that were mis-banded KA/KB by the 2026-06-11 full-library pipeline run (migration `20260611134158`); replaces model-reconstructed content verbatim-from-docx; 49 tasks total (28 insert + 21 update across 0A/0B/0C). Three new migrations off ATLAS-ASSESSMENT head `e3f60f1` (trunk head is `b2331fb` after PR #72 merged, which PR #74 does not touch in `.agent/`): `20260616120000_add_prek_grade_levels.sql` (enum DDL only — adds 0A/0B/0C to `half_grade_level` BEFORE KA); `20260616120050_add_short_test_eligible_column.sql` (adds boolean column `questions.short_test_eligible` default false); `20260616120100_l0_overlay_load.sql` (28 inserts + 21 updates; mirrored +447/-0 additive block appended to seed.sql). Three overlay JSON files: `overlay/l0a-authoring.json`, `l0b-authoring.json`, `l0c-authoring.json`; applier `scripts/conversion/apply-l0-overlay.ts` (`pnpm convert:apply-l0-overlay`), supports level re-band in UPDATE, asserts SAM-L0-only (non-destruction). Result breakdown: 8 active (text-answerable arithmetic; bands 0A/0B); 3 held-A (image-essential, inactive); 31 held-C (`requires_format_swap=true`, `is_active=false`, satisfies `questions_held_rows_inactive` CHECK); 7 inactive (drawing/tracing/colouring/oral — no auto-grade path); 3 mis-modeled pipeline actives DEACTIVATED (SAM-L0C-Q03/Q08/Q16). Short-test eligibility in the real boolean column `questions.short_test_eligible` (ATLAS-authoritative name) set per docx Summary (31/49). Spelling Americanized. Verify GREEN: **1074 tests / 75 files**, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). PR #74 OPEN — awaiting Dimitri attended merge + `supabase db reset`.

**As of:** 2026-06-15 image-answer-inputs session — **PR #71 MERGED (`e3f60f1`)**
(lane/image-answer-inputs, branched off ATLAS-ASSESSMENT head `dfc9925` / PR #65, NOT
stacked). Adds the three click-image answer formats — `CLICK_IMAGE_SINGLE` /
`CLICK_IMAGE_MULTI` / `IMAGE_ORDERING` — fully wired through client input + server grading,
**forward-wired ahead of CONVERSION activation**. App + enum only; **no rows touched**
(enum-DDL-only migration `20260615120000`; no `is_active` / `requires_format_swap` flips;
`questions_held_rows_inactive` guardrail stays enforced). Grading reuses `select-all`
(set-equality) for multi; adds `select-one` + `order-equality`; server reads the authored
model from `content._authoring.answer_model`, tiles served render-safe from top-level
`content.tiles`. Verify GREEN **1074 tests / 75 files** (+95/+3 over the 979/72 snapshot),
tsc 0, lint 0 errors (2 known warnings), `pnpm build` OK. **MERGED to ATLAS-ASSESSMENT
2026-06-15 (merge `e3f60f1`, lane commit `7abdf4d`); trunk subsequently advanced to `a98f3e5` after PRs #74/#75/#76/#77 merged (L0 bank, L0 memory, short-test-eligible picker, per-tile minting).**
**ACTIVATION DEPENDENCY (CONVERSION-owned):**
before any of these held rows is flipped active, per-tile image minting must be added to
`serveQuestion.ts` (analogous to `mintMatchingTileImages` for VISUAL_MATCHING) to read
`content.tiles[].image_path` — otherwise activated rows serve **pictureless** (label-only).
No runtime risk while held. See NEXT_ACTIONS §3f. **(This memory PR is docs-only,
lane/memory-image-inputs-2026-06-15, off trunk, not stacked.)**

**As of:** 2026-06-13 visual-primitives session — PR #59 OPEN (lane/visual-primitives-g1-3),
verify-bar SUCCESS + Vercel preview built, awaiting attended merge. G1-3 visual-primitive +
answer-input + grading library shipped as app code; bank untouched. Verify GREEN 979 tests /
72 files, tsc 0, lint 0 errors (2 known warnings), pnpm build GREEN.
**QA-UNBLOCKING PRIORITY:** Issue-1 served-gate multirow fix is on **PR #58 (OPEN, green,
mergeable)** — NOT yet on trunk (trunk head f8c0f30 still has the buggy `.maybeSingle()`).
Merge #58 to unblock first-submit QA. A follow-up PR (lane/memory-audit-2026-06-13) carries
this session's memory + audit Appendix A, kept off #58.
Previously (2026-06-12): all four security lanes MERGED (PRs #50/#52/#53/#55); PR #51 CLOSED
(superseded by #55); PR #54 memory lane merged; `supabase db reset` run (applies
20260612090000 + 20260611090000). QA-prep package delivered. lane/qa-prep-2026-06-12 open,
PR pending.
**Session split:** CONVERSION Stage 4 / question-bank work runs in a SEPARATE session. This
session must NOT touch `scripts/conversion/` or taxonomy migrations; coordinate via repo
memory only.
**Branch:** `ATLAS-ASSESSMENT`. **Repo:** `dsogoloff/atlas-ai` → local
`C:\Users\Acer\PROJECTS\atlas-ai`.
**Origin head:** `ae281dd` (PR #81 lane/short-test-readiness-report merged, 2026-06-18).
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
**Verify baseline (ATLAS-ASSESSMENT head 970698e / f8c0f30):** 915 tests / 56 files
(confirmed 2026-06-12); 0 type errors; 2 known lint warnings (no-img-element in
profile-menu.tsx:48, no-page-custom-font in layout.tsx:56); `pnpm build` GREEN.
PR #59 lane snapshot: 979 tests / 72 files (+64/+16 over baseline).
(Earlier snapshots: 900/55 was post-#49; 864/52 was pre-#49; 554 was pre-merge era.)
## Lanes
| Lane | State | Notes |
|------|-------|-------|
| Crosswalk regen — {prev,current} band (PR #140) | OPEN PR #140 — CI running | lane/crosswalk-regen-band-20260622, off trunk `17fa2bf`. Docs/artifacts only: regenerated `served-crosswalk.md/json` against new {previous,current} sampling band (PR #139). No migration, no seed, no supabase db reset. Verify GREEN 1232/91. CLOSES CONVERSION Task C(c). Dimitri: merge at leisure. |
| Young-band + L3 QA defects (PR #134) | OPEN PR #134 — CI GREEN | lane/young-l3-qa-defects-20260622, off trunk `f95920c`. Migrations `20260622120000` (3 UPDATEs: L0A-Q11/L0B-Q02 pattern stimuli, L0C-Q13 days stem+image) + `20260622130000` (L0C-Q04 fact-family EQUATION_SET→MULTI_BLANK). Cake = SOURCE_MAP re-point (no DB). Seed parity PASS (72). Founder: upload 3 new stimulus images + re-point cake, `supabase db reset`. ONE parked item: L4-Q21 source PNG (rectangle dims). |
| Picker short outcome (PR #119) | MERGED (`c3ad839`) | lane/picker-short-outcome, base ATLAS-ASSESSMENT off `ce9a676`. `ShortTestOutcome` type + persistence + stratified short draw. Migration `20260621130000` (nullable `short_test_outcome`). Verify GREEN 1220/91. `supabase db reset` after. |
| Picker comprehensive split (PR #121) | OPEN PR #121 | lane/picker-comprehensive, stacked on #119. pass_band global split + per-strand override + per-pick plan + seen_item_ids exclusion + G5_8 cap 36→30. No new migration. Verify GREEN 1250/94. Merge next; retarget base to ATLAS-ASSESSMENT now that #119 is merged. |
| Picker floor/ceiling (PR #122) | OPEN PR #122 — FOUNDER GATE ITEMS | lane/picker-floor-ceiling, stacked on #121. Bank-aware offsets, floor-find, `manual_placement_needed` column. Migration `20260621140000`. `manualPlacement.ts` copy with §2.4 drafts PARKED for Dimitri. Verify GREEN 1260/94. Merge third; retarget base after #121 merges; `supabase db reset` after. |
| Short-eligible overset audit (PR #123) | MERGED (`c4a67e8`) | lane/short-eligible-overset-audit, off trunk `a2c0b28`. Docs/helpers only. Commit `a084d0e`. Verify GREEN 1196/89. Two items PARKED for Dimitri (thin booklets; ATLAS comprehensive-picker question). |
| Lead-notify tests (PR #82) | OPEN PR #82 | lane/lead-notify-test, off trunk `ae281dd`. Test-only: `src/lib/followUp/notify.test.ts`. Verify GREEN 1172/84. Awaiting Dimitri merge. |
| Mascot welcome screen (PR #83) | OPEN PR #83 | lane/mascot-welcome, off trunk `ae281dd`. `src/app/(child)/assessment/components/Welcome.tsx` (tap-to-start). `assessment-client.tsx` start gating refactored. Verify GREEN 1170/84. Awaiting Dimitri merge. |
| COPPA consent-of-record (PR #84) | OPEN PR #84 — LEGAL | lane/coppa-consent-of-record, off trunk `ae281dd`. Consent text canonical source, disclosure asset + served PDF, `consent_records` new columns, add-child action wired. Migration `20260618120000`. Verify GREEN 1170/84. Requires `supabase db reset` after merge. Batched gate items in PR for Dimitri. |
| L0/L1/L2 activation wave (19 FLIP-READY rows activated) | OPEN PR #78 | lane/l0-l2-activation, off ATLAS-ASSESSMENT head `a98f3e5` (trunk after PRs #74/#75/#76/#77 merged). Migration `20260617120000` + seed mirror (+214/-0). Applier `apply-activation.ts`. 19 rows flipped: L0A Q08/Q11, L0B Q02, L0C Q03/Q04/Q08/Q11/Q14/Q16, L1 Q02/Q03/Q11/Q13/Q14/Q15/Q16/Q17/Q27, L2 Q06. Two demoted (image missing): L0A-Q17, L0B-Q07. Verify GREEN 1091/76, tsc 0, lint 0 errors (2 known warnings), build OK. Awaiting image uploads to `question-images` bucket (l0/, l1/, l2/ folders) then founder merge + `supabase db reset`. |
| L0 authoring (0A/0B/0C re-band + verbatim re-author) | OPEN PR #74 | lane/l0-authoring, off ATLAS-ASSESSMENT head `e3f60f1`. Overlay re-authors 21 SAM-L0* rows (mis-banded KA/KB by pipeline) + 28 new inserts = 49 tasks. Migrations `20260616120000` (enum DDL, 0A/0B/0C) + `20260616120100` (28 inserts + 21 updates; seed.sql +426/-0). Applier `scripts/conversion/apply-l0-overlay.ts`. 8 active / 3 held-A / 31 held-C / 7 inactive; 3 pipeline mis-actives deactivated. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped. Needs founder merge + `supabase db reset`. |
| Image answer-inputs (3 click-image formats) | MERGED PR #71 (`e3f60f1`) | lane/image-answer-inputs, off ATLAS-ASSESSMENT head `dfc9925` (NOT stacked), commit `7abdf4d`. Adds question_format enum values CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI / IMAGE_ORDERING (migration `20260615120000` enum-DDL-only + database.types.ts). New grading rules `select-one` + `order-equality` and `ordered-ids` AnswerValue (`src/lib/grading/`); multi reuses `select-all`. New inputs `src/components/answer-inputs/{ClickImageSingle,ClickImageMulti,ImageOrdering,TileFace}.tsx` dispatched by question.format in QuestionTimer (QuestionShell unchanged). Server judge reads `content._authoring.answer_model` (held rows keep the model in `_authoring`); serializer strips `_authoring` and serves render-safe `content.tiles`. Exhaustive switches updated (serialize, classifier prompt, parent answers page, time norms). Resolves brief's `target_input`→`target_interaction` naming in favor of the actual key. NO rows touched; guardrail intact. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK. Codex manual/skipped (relay unauth). **Activation blocker (CONVERSION): add per-tile minting to serveQuestion.ts before activating, else pictureless — see NEXT_ACTIONS §3f.** Merged 2026-06-15 (`e3f60f1`). |
| Visual-primitive + answer-input library (G1-3) | OPEN PR #59 | lane/visual-primitives-g1-3, branched off ATLAS-ASSESSMENT head f8c0f30 (NOT stacked). App code only — no bank/seed/picker changes. Adds: 11 stem SVG primitives (`src/components/visual-primitives/`), 3 answer-input components (`src/components/answer-inputs/`), standalone grading module (`src/lib/grading/` — decoupled from Issue-1 served-question gate), 2 spec docs (`docs/visual-primitives-spec.md`, `docs/answer-model-spec.md`), dev-only gallery at `/dev/visual-primitives` (flag `isVisualPrimitivesGalleryEnabled` in `src/lib/env.ts`: always-on in dev/test, 404 in prod unless `ENABLE_VISUAL_PRIMITIVES_GALLERY=true`). Also establishes first shared UI home `src/components/` (no shared component dir existed before). Verify GREEN 979/72, tsc 0, lint 0 errors (2 known warnings), build GREEN. Vercel preview built; verify-bar running. Awaiting attended merge. |
| Served-gate multirow fix (Issue-1) | OPEN PR #58 — QA-UNBLOCKING PRIORITY | lane/served-gate-multirow-fix, commit `7245826`. `responseSubmit/handler.ts` access-log existence check `.maybeSingle()` → `.limit(1)` (tolerates >1 access-log row on first submit / Strict-Mode resume; `.maybeSingle()` raised PGRST116/500). Verified on origin 2026-06-13: trunk head f8c0f30 STILL has `.maybeSingle()` (handler.ts:385) — fix NOT on trunk. PR #58 MERGEABLE/CLEAN, verify-bar SUCCESS, Vercel SUCCESS — needs attended merge. Also carries 2 read-only docs (base sam-content-authenticity-audit.md + picker-level-band-proposal.md). |
| Session memory + audit Appendix A | follow-up PR (lane/memory-audit-2026-06-13) | The 4 uncommitted files from lane/served-gate-multirow-fix's tree (3 `.agent/` memory files + `docs/sam-content-authenticity-audit.md` Appendix A) moved to their own branch off ATLAS-ASSESSMENT to keep PR #58 = Issue-1 fix only. Docs/memory only; not stacked. NOTE: its audit doc is the FULL file (base + Appendix A) and overlaps PR #58's base audit doc — whichever merges second conflicts on that one file; resolve by keeping the fuller (Appendix A) version (recommend merge #58 first). |
| Report reskin (layout) | MERGED, BUGS OPEN | `204166b`. Editorial format in; bugs 1 & 2 fixed (`a74c613`, `fbe8c5b`); both analytics events wired. Bugs 1 & 3 (placement bar / radar / sub-strand pills on the `unreliable` degraded branch) PARKED — see NEXT_ACTIONS. |
| Consent (per-child + gate + classifier-live) | MERGED | `4dc9dc1`+`0a99f76`. Gate server-side, per `child_id`, fails closed. Classifier live in code; needs Vercel env. |
| Instructor portal | MERGED | `48c7378` (merge `a8a988c`). Roster, diagnostic view, notes, response-derived item review. Raw question content gated. |
| Analytics + satisfaction | MERGED + PUSHED | `a16fd15` (merge `71205e5`). Event store, funnel, parent satisfaction island. 2 report-resident events unwired. |
| Comprehensive-test instrumentation + engine (M2 KPI) | MERGED to ATLAS via PR #49 | Originally PRs #41/#42/#46. #41 (instrumentation) and #46 (engine) had merged into their stacked parent lane branch and were stranded off ATLAS. Re-landed 2026-06-12 via cherry-pick PR #49 (commits 7e7c37e + 2dad26c). Includes: test_type discriminator, 6 analytics enum values, assessment_test_type enum, instructor_usefulness table + RLS, all comprehensive_*/short_*/instructor_* events, per-strand coverage summary. Conflict resolved: instructor student page import union (#47 strand labels + #46 coverage summary coexist). ATLAS head b9b0662. Verify 900/55. Migration 20260611090000 still requires `supabase db reset`. |
| Consent gate regression — comprehensive | MERGED to ATLAS via PR #49 | Originally PR #42. Cherry-picked in PR #49. Asserts dual server-side consent gate fails closed for comprehensive session. |
| Ops runbook gaps | OPEN PR #43 | lane/ops-runbook-gaps. Docs only (docs/ops-runbook.md). §3 rewritten: stuck/abandoned sessions + Option A reset-by-delete / Option B force-close; §4 consent revoke + vpc_audit_log insert + revoke-all-children variant; §7 new scenario. Narration-regen KNOWN GAP documented as optional follow-on. Awaiting attended merge (no supabase db reset needed). |
| Served-question gate (security) | MERGED PR #50 (ea53da5) | lane/served-question-gate. responseSubmit requires question_access_log row for (tenant,session,question) + no existing response before scoring; else 403 question_not_served. Removes silent idempotent-retry; already_answered hard-rejected (409). |
| Duplicate-response constraint (security) | MERGED PR #55 (4b31baa) — PR #51 CLOSED | PR #51 was stacked on lane/served-question-gate and did NOT auto-retarget on #50's merge (third stranded-PR incident). Closed; superseded by PR #55 opened directly against ATLAS-ASSESSMENT. Migration 20260612090000: unique(session_id,question_id) on responses; insert conflict-safe (23505 → idempotent return). |
| AI data minimization (security) | MERGED PR #52 (57e5f93) | lane/ai-data-minimization. TEXT_ENTRY math-safe sanitizer (allowlist, max 40); narration sends firstName only; .env.example MISCONCEPTION_CLASSIFIER_LIVE default → false. Voice-locked Step-4 SYSTEM prompt TEXT unchanged. |
| Next.js upgrade + CI build step (security) | MERGED PR #53 (1997b3d) | lane/next-upgrade-ci. next + eslint-config-next 16.2.4→16.2.9; 'pnpm build' step added to verify.yml. 3 MODERATE transitive advisories (no high/critical). |
| QA-prep | PR OPEN (lane/qa-prep-2026-06-12) | supabase/dev-seed-instructor-roster.sql (dev-only, idempotent, parent-email param at top; qa-instructor@atlas.test / Atlas-Pilot-2026; aligns center). docs/qa-prep-e2e-run.md (env lines for REPORT_NARRATION_LIVE + MISCONCEPTION_CLASSIFIER_LIVE; 4-grade coverage rec Grade 1/3/4/5; QA blockers). Key finding: COMPREHENSIVE not reachable from UI (needs ENABLE_COMPREHENSIVE_PILOT=true + manual POST with comprehensive:true); data_statistics strand 0 active questions; geometry only 4 active bank-wide. |
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
See `NEXT_ACTIONS.md`.

Founder actions (current):
1. **NEW (2026-06-22) — PR #134 (young-band + L3 QA defects):** After review, merge PR #134
   then: (a) run `pnpm convert:upload-activation-images` to upload the 3 new stimulus images
   (`sam-l0a-q11-stimulus.png`, `sam-l0b-q02-stimulus.png`, `sam-l0c-q13-stimulus.png`) and
   re-pointed cake (`sam-l0b-q03-stimulus.png`); (b) re-upload a corrected
   `scripts/conversion/source/4/L4-21.png` that includes dimension labels (do NOT fabricate
   dimensions — use the real worksheet values), then re-run image upload for that key;
   (c) run `supabase db reset` (applies migrations `20260622120000` + `20260622130000`).
   (L0C-Q04 fact-family is now FIXED via MULTI_BLANK in `20260622130000` — the earlier
   EQUATION_SET prefill backlog item is resolved, no separate lane needed.)
2. **NEW (2026-06-21) — Picker Calibration:** Merge PRs in order #119 → #121 → #122 (each
   stacked on the prior; attended, after Vercel preview review). After #119 merges: run
   `supabase db reset` (adds `short_test_outcome` column). After #122 merges: run
   `supabase db reset` (adds `manual_placement_needed` column). Stacked-PR note: after
   #119 merges, manually re-point #121's base to ATLAS-ASSESSMENT if GitHub did not
   auto-retarget; same for #122 after #121. Then resolve the 3 batched gate items in
   PR #122 (§2.4 copy + render + thin-pool scope).
2. [DONE] Merged PR #50 (served-question-gate, ea53da5).
2. [DONE] Merged PR #55 (duplicate-response-constraint, 4b31baa) — superseded PR #51 (closed).
3. [DONE] Merged PR #52 (ai-data-minimization, 57e5f93).
4. [DONE] Merged PR #53 (next-upgrade-ci, 1997b3d).
5. [DONE] `supabase db reset` run — applies migration 20260612090000 + 20260611090000.
6. [DONE] Verify baseline confirmed: 915 tests / 56 files GREEN; tsc 0 errors; build GREEN.
7. Merge PR #43 (lane/ops-runbook-gaps — docs only; no DB; no supabase db reset needed).
8. Merge PR (lane/qa-prep-2026-06-12) after Vercel preview review — adds dev-seed-instructor-roster.sql + qa-prep-e2e-run.md.
9. Eyeball PR #59 Vercel preview — set `ENABLE_VISUAL_PRIMITIVES_GALLERY=true` on the Preview env + redeploy, open `/dev/visual-primitives`; then merge if satisfied. No supabase db reset needed.
10. For QA run: set ENABLE_COMPREHENSIVE_PILOT=true in .env.local; COMPREHENSIVE test also requires a manual POST to /api/assess/start with `comprehensive:true` — not reachable from the UI via startSession({child_id}) alone.
11. Curate per-question images for the 30+ inactive image-essential questions (upload manifests in each worksheet's output folder); full-page renders must never ship.
12. **NEW (2026-06-18):** Merge PR #82 (lead-notify test) after Vercel preview review. No DB change; no supabase db reset needed.
13. **NEW (2026-06-18):** Merge PR #83 (mascot welcome screen) after Vercel preview review. No DB change; no supabase db reset needed.
14. **NEW (2026-06-18) — LEGAL / CAREFUL REVIEW:** Merge PR #84 (coppa-consent-of-record) after eyeballing: (a) served PDF at `/legal/coppa-disclosure-v1.pdf` renders correctly and matches counsel intent; (b) `/coppa` page "Download PDF" button downloads the PDF; (c) `/add-child` checkbox shows the new consent text and captures on submit. After merge, run `supabase db reset` (adds 2 nullable `consent_records` columns). Then resolve the 3 batched gate items from the PR: (1) confirm PDF rendering is acceptable (core fonts / ASCII punctuation; no source-doc "Checkbox:"/"Button text:" annotations); (2) decide on a follow-up copy pass to reconcile the `/coppa` page body with the counsel PDF text (parent-facing claims language — gate to Dimitri); (3) confirm committing `docs/legal/Parent_Privacy_Request_Policy.docx` is intended.

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
