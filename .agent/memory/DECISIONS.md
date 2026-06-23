# DECISIONS LOG (most recent first)

Durable, dated decisions. ⚑ = business/strategy/legal/privacy/pricing — requires Dimitri
to change. Unmarked = technical, reversible by Claude Code with cause.

## 2026-06-22

* **CONVERSION Task C(c) RESOLVED — L0A/L0B "render identically" symptom was sampling-band
  collapse, not duplicated bank content (PRs #139 + #140, 2026-06-22).** Investigation
  confirmed 0A and 0B are distinct booklet ordinals with disjoint level filters; the picker
  never mis-maps them. The symptom (a 0B-anchored child receiving identical questions to a
  0A-floor child) was caused by the old previous-only sampling band: at level 0B, "previous"
  = {0A} — the same pool sampled by a 0A-floor child. PR #139 (commit `263fa53`) widened the
  band to {previous, current} at every non-floor level (floor 0A samples itself only). A 0B
  cohort now samples {0A, 0B} and receives its own 0B-level items, distinct from the floor
  pool. PR #140 (lane/crosswalk-regen-band-20260622, off trunk `17fa2bf`) regenerated the
  short-test served-order→external_id crosswalk artifacts (`served-crosswalk.md/json`) to
  reflect this, refreshed stale cross-check annotations, and added per-child delta notes.
  No bank de-dupe, no re-authoring, no migration, no seed change. Verify GREEN 1232/91.
  PR #140 OPEN (docs/artifacts only; no supabase db reset needed).

* **Parent-instructions screen restored (default-ON) with FINAL founder-approved copy
  (PRs #135 + #136).** `ENABLE_PARENT_INTRO` flipped to default-ON (`!== "false"`, mirroring
  BETA_WELCOME_LIVE) so the age-dependent screen renders by default (read-aloud ≤ grade 2 /
  no-assistance ≥ grade 3 — logic was already implemented, only gated off). ⚑ The DRAFT copy in
  `src/lib/proctoring/copy.ts` was replaced verbatim with the founder-approved FINAL wording
  (#136). Read-aloud now shows only the boxed summary (the italic "Doing any of these…" note was
  dropped); no-assistance gained a concept-help point (parent may explain a unit conversion,
  then let the child do the math); button is "Start the assessment". §2.4 discipline retained;
  any future wording change is parent-facing claims language → still gate to Dimitri.

* **Short-test progress bar reflects a per-session ceiling, not a fixed 25 (PR #135).** /start
  now stamps `max_questions` on the wire: short = `min(SHORT_TEST_CONFIG.hardCap 15, eligible
  pool size in the previous-booklet band)`; comprehensive = engine `MAX_QUESTIONS`. So a thin
  band shows "of up to 8" (exhaustion-bound) and a deep band "of up to 15" (cap-bound). Computed
  best-effort in the start handler (discovery failure falls back to the cap), threaded through
  types→api→reducer→`computeProgressDisplay`. Display-only; never blocks the start path.

* **Beta-welcome relocated to a once-only onboarding step; add-child grade made required
  (PR #135).** The beta-welcome screen no longer gates every assessment — it shows ONCE between
  COPPA and child setup via a localStorage flag (`atlas_beta_welcome_seen`) on `/add-child`
  (a beta notice, not a legal record → no DB column). "Current grade" on add-child is now a
  required selection (anchors the picker band); the DB column stays nullable, so this is a
  UI-only requirement and compliance.md §3 data-minimization at the storage layer is unchanged.

* **Task C picker verdicts — confirm-only, no code change.** (a) Short-test L1 = 8 is GENUINE
  bank exhaustion (the previous-booklet eligible pool is exactly 8), not a stop-short bug —
  matches the prior served-order crosswalk. (b) The short-test sampling level band is FIXED for
  the session (never widened on interim results); question order is RE-DERIVED adaptively each
  pick. (c) L0A==L0B is NOT a picker mis-map (0A/0B are distinct booklet ordinals with disjoint
  filters); if they render identically it is a content-bank identity issue → flagged for the
  CONVERSION lane (ATLAS lane does not touch bank content).

* **Duplicate-migration version 20260620120000 collision verified already resolved on
  trunk — no new work this session.** The 20-commit fast-forward already present at session
  start contained the rename: `l0a_taxonomy_activation` → `20260620120001`; `follow_up_leads_optin_zip`
  kept on `20260620120000`. No duplicate version prefixes remain. All references (seed mirror,
  `regen-seed-activations.ts`) confirmed consistent. Session item closed as confirm-only.

* **Young-band missing stimuli fixed by faithfully cropping the rendered worksheet pages
  (PR #134, lane/young-l3-qa-defects-20260622, 2026-06-22).** Missing or incorrect stimulus
  images for SAM-L0A-Q11, SAM-L0B-Q02, SAM-L0C-Q13, and SAM-L0B-Q03 were resolved by
  cutting crops directly from the Word-rendered PDF pages of the corresponding S.A.M.
  worksheets using the committed reproducible generator
  `scripts/conversion/gen_young_qa_stimuli.py` (Word→PDF→PNG→crop). No images were
  re-drawn, reconstructed from memory, or approximated. SAM-L0C-Q13 also received a
  verbatim stem re-author from the worksheet and a choice reduction to two options
  (Friday/Fryday). Three DB rows updated via migration `20260622120000`; SAM-L0B-Q03
  received only a SOURCE_MAP re-point (no DB change). Source PNGs are gitignored; founder
  uploads to the private `question-images` bucket post-merge.

* **SAM-L0C-Q04 fact-family fixed by re-authoring EQUATION_SET → MULTI_BLANK; the
  "EQUATION_SET prefill gap" framing was over-scoped (2026-06-22, superseded same day).**
  Initial read: the row rendered blank because `EquationSet.tsx` seeds all cells empty (no
  given/prefill concept), so it was parked as a cross-cutting "prefill" lane. On founder
  re-scoping, the correct fix is far simpler and needs NO new concept: MULTI_BLANK already
  renders an inline `tokens` template (text + blank slots). Re-authored content so the
  GIVEN operands are visible `text` tokens (3+6 / 6+3 / 9-3 / 9-6) and each result is its
  own `blank`; per-blank numeric grading reuses the same answers the EQUATION_SET
  `canonical` held (9, 9, 6, 3). Migration `20260622130000` + seed mirror (overrides the
  earlier EQUATION_SET activation block, last-write-wins), folded into PR #134. Lesson:
  prefer an EXISTING format that already fits the worksheet shape over inventing a new
  cross-cutting capability for a single QA item.

## 2026-06-21

* **Short-test outcome persisted as structured jsonb on session close (PR #119,
  lane/picker-short-outcome, 2026-06-21).** New `ShortTestOutcome` type in
  `src/lib/shortTest/outcome.ts` captures `measured_level`, `intake_level`,
  `pass_band` (clean/mixed/weak/insufficient — 8-graded-item floor; clean ≥0.8 /
  mixed 0.5–0.8 / weak <0.5 / insufficient <8 graded), `clean_pass_ratio`,
  `strand_map{correct,seen,ratio}`, and `seen_item_ids`. Persisted to new nullable
  jsonb column `assessment_sessions.short_test_outcome` (migration `20260621130000`; no
  seed mirror) on session close via `persistShortTestOutcome` in `responseSubmit/handler.ts`
  (gated to short sessions). Readiness line in `report/readiness.ts` requires ≥8 graded
  AND clean ratio; 0A current level suppressed. Pass-band thresholds are canonical in
  `outcome.ts`. Verify GREEN 1220 tests / 91 files; tsc 0; lint 0 errors (2 known warnings);
  build OK. Codex manual/skipped (relay unauth).

* **Short picker replaced with stratified coverage-first draw (PR #119).** New
  `src/lib/engine/shortTest.ts` implements a coverage-first router (~2 questions per strand,
  fewest-served then max-variance fill) with a coverage+count stop condition (10–15
  questions; no SE gate). In-scope strands are those with ≥1 active `short_test_eligible`
  item in the previous-booklet band (new `picker.discoverShortEligibleCounts`). Floor clamps
  to pool availability so thin pools still terminate in range. Wired into
  `responseSubmit` decideTermination/buildRouter for the short path; short picker filter +
  previous-booklet band unchanged.

* **Comprehensive picker anchors on measured short-test level with pass_band global split
  (PR #121, lane/picker-comprehensive, 2026-06-21).** `loadComprehensiveOutcomeContext`
  reads the child's latest completed short session's `ShortTestOutcome`; derives the
  BOOKLET_LEVELS index of `measured_level` as the anchor (neutral grade when no outcome).
  Global split by pass_band in new `src/lib/engine/comprehensiveSplit.ts`: clean 30/50/20
  over M-1/M/M+1; mixed 50/30/20 over M-1/M/M-2; weak below-weighted (floor-find seed);
  insufficient/none neutral 50/30/20. `planNextOffset` steers each pick to the
  largest-deficit offset. Per-strand override `strandAdjustedSplit` redistributes each
  strand's offsets by its `strand_map` ratio. Per-pick plan in new
  `src/lib/questionPicker/comprehensiveLevelPlan.ts` maps offset to target±1 booklet band
  + difficulty centred on the planned booklet (thin pool falls through to a neighbour; no
  starvation). `replay.replayStrandOffsetCounts` attributes actual served level back to an
  offset so the split self-corrects. `seen_item_ids` always excluded
  (`PickContext.extraExcludedIds`, merged in both handlers). Comprehensive length 20–30,
  cap 30; G5_8 `hardCap` 36→30 (K_4 stays target 20 / cap 26). `NextQuestionRequest` /
  `PickerRequest` gain optional per-pick `levelBand`; `pickForSession` honours it for
  comprehensive; short + legacy paths untouched. No new migration (uses PR #119 column).
  Verify GREEN 1250 / 94 files; tsc 0; lint 0 errors (2 known warnings); build OK.

* **Bank-aware ceiling/floor and floor-find walk-down added (PR #122,
  lane/picker-floor-ceiling, 2026-06-21).** New `picker.discoverAvailableBooklets` →
  `availableOrdinals` limits the split to booklets the active bank actually serves
  (CEILING = no reach above highest available; FLOOR = walk-down stops at lowest loaded
  booklet). Floor-find for `weak` pass_band: hands level to adaptive engine over
  `floorFindBand` (at-and-below available band) so it walks down M-1→M-2→… until solid.
  Wired in `responseSubmit` router + sessionStart first pick. `evaluateFloorFind` sets
  `manual_placement_needed = true` when engine settled at/below the lowest loaded booklet
  AND child is still not solid (< `FLOOR_FIND_SOLID_RATIO` 0.5). New nullable boolean
  column `assessment_sessions.manual_placement_needed` (migration `20260621140000`; no seed
  mirror), persisted on comprehensive completion (`persistComprehensivePlacement`; no-op for
  short). `src/lib/report/manualPlacement.ts` carries the manual-placement copy line
  (founder-locked verbatim) and §2.4 DRAFT lines (`floorFoundLine`, `ceilingLine`) pending
  Dimitri confirmation. Verify GREEN 1260 / 94 files; tsc 0; lint 0 errors (2 known
  warnings); build OK. Codex manual/skipped (relay unauth). Post-merge requires
  `supabase db reset`.

* ⚑ **Open / unconfirmed (needs Dimitri) — §2.4 draft parent copy in
  `src/lib/report/manualPlacement.ts` (PR #122).** `floorFoundLine` and `ceilingLine` are
  parent-facing outcome claims drafted this session but NOT confirmed by Dimitri. These
  sentences explain to a parent what it means when the assessment hit the bottom or top of
  the question bank. They must not render until Dimitri approves the exact wording. Batched
  in PR #122 body as gate item (1). Follow-up lane (render + instructor surface) is also
  blocked on this decision — gate item (2) in PR #122.
* **Short-eligible / comprehensive over-set audit (L0A–L4) — key parity VERIFIED
  COMPLETE; over-set ceiling is source-key capped (PR #123, lane/short-eligible-overset-audit,
  commit `a084d0e`, off trunk `a2c0b28`).** Task 2 result: ZERO key-parity gaps — every
  active, source-Short=Y row is already `short_test_eligible=true` (the
  `l1-l4-short-eligible-backfill` migration 20260619080000 + young-band L0 authoring both
  honor the key exactly). Zero over-flags (no row is STE while source `Short≠Y`). No UPDATE
  applied. Task 3 result: no strand×booklet cell reaches the ~15–18 target (max = booklet-2
  number_sense = 13). Per-booklet active&STE pools: 0A=18, 0B=13, 0C=8, booklet-1=27,
  booklet-2=25, booklet-3=13, booklet-4=5. Ceiling is set by source Short=Y counts, not by
  mis-flagging. Structural finding: each worksheet's questions band across MULTIPLE booklets
  (L1→0C+1, L2→1+2, L3→1+2+3, L4→2+3+4), so per-worksheet Short=Y totals overstate
  per-booklet reserve. Validation: source Short=Y docx counts exactly match backfill IN-lists
  (L1 17/L2 21/L3 20/L4 25); per-booklet pools reproduce the prior served-crosswalk exactly.
  Three source-Short=Y rows (`SAM-L3-Q04`, `SAM-L3-Q23`, `SAM-L4-Q17`) have no DB row
  (converter-skipped) — recoverable only by re-authoring. Reusable helpers committed:
  `overset-state.mts`, `_extract_short_keys.py`, `build-overset-matrix.mjs`,
  `bank-final-state.json`. Licensed source tree + `source-short-keys.json` gitignored.
  Verify GREEN 1196/89, tsc clean, lint 2 known warnings. Two items PARKED for Dimitri:
  thin-booklet content decision + ATLAS comprehensive-picker architecture question.

* **Trunk head advanced past `ce9a676`.** Local memory cited a stale head; trunk reached
  `a2c0b28` during the over-set audit work, then `c4a67e8` once PR #123 merged — the current
  ATLAS-ASSESSMENT head (PR #119 Picker Calibration PR1 is also merged, at `c3ad839`).

## 2026-06-20

* **CORRECTION — the Atlas taxonomy / `content_id` codes / level design / banding are
  an INTERNAL Atlas scheme, NOT S.A.M.-controlled.** A false belief had propagated
  across sessions that Sam Chia / S.A.M. owns or must approve Atlas's curriculum
  structure, and that NULL-`content_id` items were "SAM-gated / blocked on a taxonomy
  code." This is wrong. **The truth:** (a) Sam Chia's only role is content **licensing**
  — he supplied the S.A.M. placement worksheets and approved their use; the only
  curriculum signal from Sam is each worksheet's last-page "Concepts and Skills" + "Topic"
  table. (b) Sam does NOT own/define/approve Atlas taxonomy, `content_id` codes, level
  design, or banding; there is no external "locked S.A.M. taxonomy." (c) `content_id`
  codes are an internal scheme created by Code during conversion; a NULL `content_id` is
  an internal tagging job we finish, never externally gated. (d) The ONLY genuine S.A.M.
  dependencies are content-licensing (granted) and franchisor/pilot approval (granted).
  Corrected across repo memory/instruction + audit/conversion notes in
  lane/correct-sam-taxonomy-belief. The previously-"gated" L0 items were finished
  internally in PRs #103–#105 (new nodes l0a-geometry-5/6, l0c-geometry-4,
  l0c-whole_numbers-6; 0B position → existing l0b-geometry-1). Supersedes any earlier
  "needs founder/S.A.M. taxonomy decision" wording.

## 2026-06-18

* **Tasks 1 & 3 verified already-implemented on trunk; no fabricated changes shipped.** The 2026-06-18 session brief asserted "wire the short picker live" (Task 1) and "lead-notification email send path" (Task 3) were outstanding. Both were verify-confirmed done as of trunk `ae281dd` (trunk had advanced past PR #81, lane/short-test-readiness-report, merged, which itself followed commits f877285 + a23097c). Task 1: the short path already routes through `src/lib/questionPicker/pickForSession.ts:67` with `short_test_eligible` filter + previous-booklet band; both live handlers call pickForSession; `test_type` defaults to "short" at sessionStart handler:238; dispatch + filter covered by existing tests. Task 3: `src/lib/followUp/submit.ts` already calls `src/lib/followUp/notify.ts` (Resend/fetch, `LEAD_NOTIFY_LIVE`-gated, fail-soft). Both shipped confirm-only (Task 1) or test-only PR #82 (Task 3) rather than fabricating redundant changes.

* ⚑ **COPPA consent flow now binds each consent row to a versioned disclosure PDF + content hash (consent-of-record), and `LEAD_SCHOOL_FIELD_LIVE` default flipped ON per counsel clearance (PR #84, lane/coppa-consent-of-record, 2026-06-18).** Key changes: (a) `CONSENT_TEXT` in `src/lib/consent/text.ts` updated to counsel-approved checkbox attestation (version "2026-06-18.v2"); single source used by both the rendered form and the `add-child` action (killed rendered-vs-persisted drift). (b) `docs/legal/COPPA_Disclosure.docx` committed with two edits vs counsel original (§2 removed "school name" from not-collected list; §10 placeholder filled with privacy@samnewyork.com); served PDF `public/legal/coppa-disclosure-v1.pdf` generated via `tools/legal/build_coppa_pdf.py`; `/coppa` "Download PDF" button wired. (c) New `consent_records` columns `disclosure_version` + `disclosure_content_sha256` (migration `20260618120000_consent_disclosure_asset.sql`); add-child action captures `DISCLOSURE_VERSION` ("coppa-disclosure-v1") + PDF sha256 (`a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea`) on every row; `src/lib/consent/text.test.ts` recomputes the PDF hash and asserts equality (drift guard). (d) `LEAD_SCHOOL_FIELD_LIVE` default flipped from `=== "true"` to `!== "false"` (ON by default) in `src/lib/env.ts`; "school not collected" statement removed from disclosure and env; `.env.example` updated. Verify GREEN 1170 tests / 84 files, tsc 0, lint 0 errors (2 known warnings), build GREEN. Codex manual/skipped. Requires `supabase db reset` after merge (2 nullable columns; pre-existing rows unaffected). Three batched gate items in the PR body for Dimitri review.

* **Mascot welcome screen — tap-to-start replaces auto-advancing loading screen (PR #83, lane/mascot-welcome, 2026-06-18).** New `src/app/(child)/assessment/components/Welcome.tsx` (playful "Welcome!" lettering + waving mascot + one red "Let's go!" button; tier-aware). Child's tap is now the sole releaser of `startConfirmed` in `assessment-client.tsx`; the start effect + network call only fire on tap, never in background. Parent-intro + dev pilot-chooser gates now only acknowledge/advance (`introAcknowledged` / new `testModeChosen`); they no longer release the start. New `Welcome.test.tsx` (renderToString smoke, Mascot stubbed). Reducer unchanged. Verify GREEN 1170/84. Codex manual/skipped.

* **Trunk advanced to `ae281dd` (PR #81, lane/short-test-readiness-report, merged, 2026-06-18).**

## 2026-06-16

* **L0/L1/L2 activation wave — 19 FLIP-READY rows activated end-to-end (PR #78, lane/l0-l2-activation, 2026-06-16).** All answer formats now wired: input + serialize + grade + mint. Activation follows #71 (3 click-image formats) + #77 (per-tile minting); both must be on trunk before this PR applies. Formats flipped: CLICK_IMAGE_SINGLE (L0A Q08/Q11; L0B Q02; L2 Q06), SELECT_MULTIPLE (L0C Q03), EQUATION_SET (L0C Q04), MULTI_BLANK (L0C Q08/Q11/Q16; L1 Q14+image), NUMERIC_ENTRY (L0C Q14), MC+image (L1 Q02/Q03/Q16), VISUAL_MATCHING text-tile (L1 Q11/Q27), VISUAL_MATCHING+images (L1 Q13/Q15), IMAGE_ORDERING (L1 Q17). Each activation: atomic UPDATE guarded on `is_active=false`; activated content carries NO `_authoring.requires_format_swap` (satisfies `questions_held_rows_inactive` CHECK). `activation-spec.md` documents per-format content shapes. Verify GREEN: 1091 tests / 76 files, tsc 0, lint 0 errors (2 known warnings), build OK. PR #78 OPEN — blocked on founder uploading images to `question-images` bucket before merge.

* **Rule confirmed: every activated row must have an existing uploadable image — else held.** Two rows demoted from FLIP-READY to one-image-away during this pass: SAM-L0A-Q17 (group-of-balloons image absent; only single-balloon crops exist) and SAM-L0B-Q07 (two sorted-shapes part-crops need compositing into one image). Pattern: do not flip `is_active=true` for image-bearing questions until the image file exists in the `question-images` bucket.

* **Trunk advanced to `a98f3e5` (PRs #74/#75/#76/#77 merged: L0 bank, L0 memory, short-test-eligible picker, per-tile minting).** PR #78 branches off this head.

## 2026-06-15

* ⚑ **`half_grade_level` enum extended with pre-K bands 0A / 0B / 0C (founder-directed,
  2026-06-15).** 0A = age 3 / Nursery 3; 0B = age 4 / pre-K; 0C = age 5 / Kindergarten.
  Kept DISTINCT — not collapsed into existing KA/KB — per founder instruction. Added BEFORE
  KA in the enum DDL (`20260616120000_add_prek_grade_levels.sql`; enum-DDL-only, no seed
  mirror). Rationale: preserves ordering semantics and avoids back-compat breakage on KA/KB
  rows already in the bank.

* **SAM-L0 verbatim re-author over the 2026-06-11 pipeline rows (PR #74, lane/l0-authoring,
  2026-06-15).** The 2026-06-11 full-library pipeline run (migration `20260611134158`) had
  loaded 21 SAM-L0* rows mis-banded KA/KB with model-reconstructed content (e.g. literal
  "Option B (unknown)"). Decision: re-author all 21 verbatim-from-docx via three additive
  overlays (l0a/l0b/l0c-authoring.json) + 28 new inserts (49 total tasks). Mis-modeled
  pipeline actives SAM-L0C-Q03/Q08/Q16 deactivated. Result: 8 active (text-answerable
  arithmetic, bands 0A/0B), 3 held-A (image-essential), 31 held-C (non-wired interaction),
  7 inactive (drawing/tracing/colouring/oral). Short-test eligibility stored in the real
  boolean column `questions.short_test_eligible` (ATLAS-authoritative name; migration
  `20260616120050`, default false), set per docx Summary (31/49) — NOT a content key.
  Verify GREEN 1074/75; tsc 0; lint 0 errors (2 known warnings); build OK.
  PR #74 OPEN — awaiting founder merge + `supabase db reset`.

## 2026-06-14

* **L1 art curation — wired curated images + activated 5 image-essential L1 items
  (SAM-L1-Q04/Q05/Q10/Q12/Q19).** Art extracted from the founder's Level 1 worksheet `.docx`
  (rendered via Word→PDF→200 DPI, cropped by `scripts/conversion/l1_*.py`), uploaded by founder
  to the private `question-images/l1/` bucket. Migration
  `20260614120000_l1_art_wire_activate.sql` (+ seed.sql mirror) sets `image_path` +
  `is_active=true`. Cleaned dead `[object]`/`[image]` stem placeholders on Q05/Q12 (player has
  no placeholder substitution; they would have rendered literally). Held pending Track B input
  wiring: Q13/Q15 (visual-matching), Q07 (click/matching display plumbing), Q17 (image-ordering
  lane) — all carry `_authoring.requires_format_swap`, so the `questions_held_rows_inactive`
  guardrail keeps them inactive.

* **SAM-L1-Q22 kept TEXT-ONLY — not re-imaged (founder decision).** The l1-overlay
  (`20260613120100`) already activated Q22 with a stem that states the numbers ("6 and 3 make
  9. … 2 and 6 make ___") and auto-grades from text. Adding the cropped bond image only adds a
  render dependency for no grading benefit. → v1.5 enhancement: add the number-bond visual via
  the Atlas parametric primitive (logged in ROADMAP Deferred). The uploaded `sam-l1-q22.png`
  stays in the bucket, unused, for that future work.

## 2026-06-13

* **G1-3 visual-primitive + answer-input + grading library built as app code, own PR #59
  off ATLAS-ASSESSMENT (lane/visual-primitives-g1-3, branched from head f8c0f30 — NOT
  stacked), per founder brief.** Bank untouched; CONVERSION session owns all bank-side
  changes. Adds: 11 stem SVG primitives (`src/components/visual-primitives/`), 3 answer-input
  components (`src/components/answer-inputs/`), standalone grading module (`src/lib/grading/`),
  2 spec docs (`docs/visual-primitives-spec.md`, `docs/answer-model-spec.md`), dev-only gallery
  at `/dev/visual-primitives`. Verify GREEN 979 tests / 72 files (+64/+16 over 915/56
  baseline), tsc 0 errors, lint 0 errors (2 known warnings), `pnpm build` GREEN.

* **Grading kept as a standalone pure module (`src/lib/grading/`), explicitly NOT wired into
  `responseSubmit/handler.ts`.** Rationale: avoids entangling with or regressing the Issue-1
  served-question gate; grading logic is exercised by its own spec suite and can be integrated
  cleanly in a dedicated wiring lane after the gate is stable.

* ⚑ **Hard rule documented: every ACTIVE assessment item must be auto-gradeable.**
  Non-auto-gradeable answer types (free drawing, open production) cannot be active items.
  Gradeability flag raised for SAM-L1-Q25 ("write a fact family 6,8,2") — the one active
  G1-3 item not yet mapped to an auto-gradeable answer type; queued for CONVERSION re-authoring
  (equation-set answer input + set-equality grading model per `docs/answer-model-spec.md`).

* **Dev gallery (`/dev/visual-primitives`) gated by a standalone env flag
  (`ENABLE_VISUAL_PRIMITIVES_GALLERY` / `isVisualPrimitivesGalleryEnabled`) kept OUT of the
  §12 `ROLLOUT_FLAGS` registry.** Rationale: it gates an internal developer eyeball page, not
  a user-facing feature; adding it to the registry would break the existing test that pins the
  registry's default-off count. Flag is always-on in dev/test, 404 in prod unless the env var
  is set.

* **New shared UI home `src/components/` introduced (reversible call).** No shared component
  directory existed in the repo before this lane. The split (`visual-primitives/` and
  `answer-inputs/` subdirs) is consistent with standard Next.js layout conventions.

* **Read-only audit extended — Appendix A added to `docs/sam-content-authenticity-audit.md`.**
  29 active G1-3 items classified by rendering bucket: 13 pure-text / 15 math-notation /
  1 parametric-visual / 0 bespoke-image / 0 drawing. Answer-format breakdown: 15 single /
  9 MC / 4 ordering-matching / 1 set-of-equations. One gradeability flag: SAM-L1-Q25 (see
  above). Active G1-3 set has ZERO bespoke-image items. Moved off lane/served-gate-multirow-fix
  (to keep PR #58 = Issue-1 fix only) into its own follow-up PR `lane/memory-audit-2026-06-13`
  off ATLAS-ASSESSMENT, bundled with this session's three memory/run-state files (not stacked).

* **Issue-1 (submit 500 / served-gate multirow) fix is on PR #58, OPEN — the QA-unblocking
  priority.** `lane/served-gate-multirow-fix`, commit `7245826`. The fix: the
  `question_access_log` existence check in `responseSubmit/handler.ts` switched from
  `.maybeSingle()` (raises PGRST116/500 on >1 row) to `.limit(1)` (0-or-1 array), so the
  served-gate tolerates multiple access-log rows on first submit / Strict-Mode resume. Verified
  on origin 2026-06-13: trunk (head f8c0f30) STILL has `.maybeSingle()` (handler.ts:385) — the
  fix is NOT on trunk; `.limit(1)` exists only on the lane branch. PR #58 is MERGEABLE / CLEAN /
  verify-bar SUCCESS / Vercel SUCCESS — needs only the attended merge button. PR #58 also carries
  two read-only docs (the base `sam-content-authenticity-audit.md` + `picker-level-band-proposal.md`).
  (Earlier same-session note "uncommitted, no PR" was true at session start; superseded — the
  founder committed + opened #58 mid-session.)

* **Content-integrity gate PARKED for the CONVERSION session (bank-owned).** Root cause:
  the `questions` table has NO provenance/rights/"model-reconstructed" column, so authenticity
  is only inferable from `external_id` + migration comments. ~5 ACTIVE model-reconstructed/
  vision-recovered SAM-* rows need PDF-faithful re-authoring before they can be trusted as
  served items: **SAM-L3-Q15** (mojibake-page MC, options invented then dropped → TEXT_ENTRY
  "4/6"), **SAM-L3-Q03** (options were model value-equivalents, since replaced with page-verbatim —
  re-confirm), **SAM-L6-Q09/Q11/Q12** (fraction answers vision-recovered from symbol-font keys),
  plus **SAM-L4-Q15** (answer "1 km 750 m" self-flagged suspect — pending founder PDF check).
  Separately, **24 inactive image-essential L1-3 rows** (L1 6 / L2 8 / L3 10) need either curated
  per-question images OR re-authoring against the new parametric primitives before activation.
  All of this is CONVERSION-owned; other sessions coordinate via repo memory only.

* **Picker level-band widening decided-in-principle: ±3 half-grades with graceful widening**
  (see `docs/picker-level-band-proposal.md`, carried on PR #58). IMPLEMENT AFTER the CONVERSION
  re-authoring above — widening the served band before the model-reconstructed rows are
  PDF-faithful would surface untrusted content more often. Sequencing decision, not yet built.

* **Grading machinery (PR #59) is built but deliberately NOT wired to the live submit path —
  gated on CONVERSION authoring `correctAnswer` models.** The `src/lib/grading/` rules are
  proven by their own suite; wiring them into `responseSubmit` is a future lane that can only
  add value once bank records carry `correctAnswer` (CorrectAnswerModel) per
  `docs/answer-model-spec.md`. Until then the live path is unchanged.

## 2026-06-12

* ⚑ **PROCESS RULE HARDENED — "GitHub auto-retargets on parent merge" is FALSE (third
  stranded-PR incident, 2026-06-12).** PR #51 (duplicate-response unique constraint) was
  opened STACKED on its parent lane branch `lane/served-question-gate` (PR #50). The PR #51
  body asserted its base would auto-retarget to `ATLAS-ASSESSMENT` once #50 merged. It did
  NOT: after #50 merged, #51's base still pointed at the now-dead parent lane branch, so
  merging it would have stranded the unique-constraint commit + migration off the default
  branch (a fourth would-be incident, caught before merge). Resolution: #51 was CLOSED and
  superseded by **PR #55**, opened directly against `ATLAS-ASSESSMENT` with the same content
  (commit `4b31baa`, migration 20260612090000_responses_unique_session_question). #55 merged
  clean. **Rule (canonical, supersedes the optimistic half of the prior entry):** GitHub only
  auto-retargets a child PR when the parent branch is DELETED, never merely on parent *merge*.
  Before merging any stacked child PR, MANUALLY verify the base label reads `ATLAS-ASSESSMENT`
  (`gh pr view <n> --json baseRefName`); if it still names a lane branch, either retarget it
  (`gh pr edit <n> --base ATLAS-ASSESSMENT`) or re-open it fresh against the trunk. Do NOT
  trust a PR-body claim that it "will auto-retarget." Prefer NOT stacking security/migration
  PRs at all — open each independently against `ATLAS-ASSESSMENT`. Incidents: #35 (2026-06-10),
  #42/#46 (2026-06-12), #51 (2026-06-12).

* **Security lanes all merged to ATLAS-ASSESSMENT; verify baseline → 915/56 (2026-06-12).**
  Merge order landed: #50 (served-question gate, `ea53da5`) → #55 (unique constraint +
  conflict-safe submit, `4b31baa`; replaces stranded/closed #51) → #52 (AI data
  minimization, `57e5f93`) → #53 (Next 16.2.4→16.2.9 + CI build step, `1997b3d`) → #54
  (memory). PRs #48 and #51 closed. ATLAS-ASSESSMENT head `970698e`. `supabase db reset`
  run (applies 20260612090000 + 20260611090000). Full verify on the merged head: **915
  tests / 56 files GREEN**, tsc 0 errors, lint 2 known warnings (profile-menu.tsx:48 img,
  layout.tsx:56 font), `pnpm build` success. New verify baseline = 915/56.

* ⚑ **PROCESS RULE — Stacked-PR hygiene (second incident; founder-instructed, 2026-06-12).**
  Before merging any stacked (child) PR, confirm its base is `ATLAS-ASSESSMENT` (not a
  parent lane branch). If the parent branch was already merged and not deleted, the child PR
  will show "MERGED" but its commits land on the dead parent branch — stranded off the
  default branch. Prevention: retarget the child PR's base to `ATLAS-ASSESSMENT` (or delete
  the parent lane branch so GitHub auto-retargets) BEFORE merging the child. After merging
  any parent PR, immediately delete its lane branch. First incident: CONVERSION PR #35
  (2026-06-10). Second incident: PRs #42/#46 (2026-06-12) — see re-landing record below.

* **Stranded PRs #42/#46 re-landed via cherry-pick PR #49 (merged to ATLAS, 2026-06-12).**
  Root cause: #42 (consent regression test, 7e7c37e) and #46 (comprehensive engine,
  2dad26c) had merged into their stacked parent lane branch (lane/comprehensive-instructor-analytics,
  already merged as #41), not ATLAS-ASSESSMENT. ATLAS-ASSESSMENT was verified to have
  882/54 tests (missing both commits). First reland attempt PR #48 conflicted (#45
  full-library-conversion and #47 instructor-portal-polish had landed since #41). PR #48
  CLOSED. PR #49 cherry-picked both commits onto current ATLAS head, resolving one
  single-file conflict (instructor student page: #47 added per-item strand labels; #46
  adds per-strand coverage summary — both coexist via import union resolution). Verified
  GREEN 900/55. Founder-authorized merge. ATLAS-ASSESSMENT head is now b9b0662.
  Verify baseline updated: 900 tests / 55 files.

* **Four security-remediation PRs opened (external audit findings), all verify GREEN,
  Codex skipped (relay credential-blocked), awaiting attended merge (2026-06-12).**
  - PR #50 (lane/served-question-gate, base ATLAS): served-question gate in responseSubmit —
    requires a question_access_log row for (tenant,session,question) AND no existing response
    before scoring; else 403 question_not_served. Removes silent idempotent-retry;
    already_answered is now a hard 409. Verify 901/55.
  - PR #51 (lane/duplicate-response-constraint, STACKED on #50 — MERGE #50 FIRST): migration
    20260612090000_responses_unique_session_question.sql adds unique(session_id,question_id)
    on responses; insert is conflict-safe (23505 detection) returns existing result
    deterministically — converts #50's 409 into a race-safe idempotent return. Seed check
    clean (no violations). DDL-only (no seed.sql mirror needed). Verify 902/55.
  - PR #52 (lane/ai-data-minimization, base ATLAS, independent): (a) misconception classifier
    math-safe sanitizer for TEXT_ENTRY answer_given (allowlist digits/ws/operators/symbols,
    max 40 chars) — non-conforming skips the Haiku call, returns fail-soft method:'none', so
    PII never reaches the model; MC path unchanged. (b) narration sends FIRST NAME only via
    firstName(display_name); voice-locked Step-4 SYSTEM prompt TEXT unchanged (data-only).
    (c) .env.example MISCONCEPTION_CLASSIFIER_LIVE default flipped true→false. Verify 913/56.
  - PR #53 (lane/next-upgrade-ci, base ATLAS, independent): next + eslint-config-next
    16.2.4→16.2.9 (exact pins; lockfile regenerated; no code fixes); 'pnpm build' step added
    to .github/workflows/verify.yml. Post-upgrade pnpm audit: 3 MODERATE transitive advisories
    (postcss/ws/brace-expansion) — no high/critical; transitive pins not chased per scope.
    Verify 900/55 + build GREEN.

## 2026-06-11

* ⚑ **Comprehensive-test instrumentation is "instrument-only" for this session — adaptive
  engine reparameterization DEFERRED.** Decision by Dimitri 2026-06-11 (Option 1 of a
  clarifying question). Rationale: adds the test_type discriminator + fires
  comprehensive_* / short_* / instructor_* analytics events + ships a consent regression
  test without touching the adaptive engine (item cap, confidence stop, routing depth).
  Engine reparameterization is deferred to the SEPARATE comprehensive-assembly session that
  owns the question-bank/session-split boundary. Instruments M2 comprehensive-pilot funnel
  KPIs without colliding with that work. TODO(comprehensive-engine) marker left in codebase
  at the hook point.

* **Comprehensive instructor analytics lane built (PR #41, lane/comprehensive-instructor-analytics).**
  Migration 20260611090000_comprehensive_instructor_analytics.sql: 6 new
  analytics_event_name enum values; new assessment_test_type enum +
  assessment_sessions.test_type column (default 'short'); instructor_usefulness table +
  RLS mirroring pedagogical_notes. Events wired: comprehensive_test_started/_item_answered/
  _completed (test_type='comprehensive'), short_test_started/_item_answered/_completed
  (test_type='short'), instructor_report_viewed (tracker island + server action),
  placement_recommendation_created (fires once at session completion, both terminal paths,
  props {sam_level, termination_reason}, PII-free), instructor_usefulness_submitted (1-5 +
  optional note; RLS table + server action + client island; event carries {rating,
  has_comment} only), short_result_viewed (parent report view, test_type='short').
  sessionStart honors a comprehensive? flag only when ENABLE_COMPREHENSIVE_PILOT is on
  (fail-safe to short). Hand-edited database.types.ts to match DDL (supabase gen types not
  runnable by assistant). Migration NOT exercised by CI — validated on founder's
  supabase db reset. Verify GREEN: 882 tests / 54 files; tsc clean; lint 0 errors (2
  pre-existing warnings). Codex SKIPPED (relay credential-blocked). Awaiting attended merge.

* **Consent-gate regression test — comprehensive session (PR #42, lane/consent-gate-comprehensive,
  STACKED on PR #41).** Regression test only: asserts dual server-side consent gate
  (sessionStart + responseSubmit) fails closed for a comprehensive session exactly as for
  short — 403 consent_required, no session created / no response accepted. No handler fix
  needed (gate runs unconditionally before test_type resolution). Verify GREEN: 884 tests /
  54 files. Base PR auto-retargets to ATLAS-ASSESSMENT once PR #41 merges — MERGE #41 FIRST.

* **Ops runbook gaps closed (PR #43, lane/ops-runbook-gaps, docs only).** docs/ops-runbook.md
  §3 rewritten as "Stuck / abandoned sessions, and report regeneration": Option A
  reset-by-delete (cascades responses/question_access_log, nulls analytics_events.session_id)
  and Option B force-close to COMPLETED (sets completed_at per check constraint, no-narration
  caveat). §4 consent revoke: companion vpc_audit_log insert + revoke-all-children-of-a-parent
  variant. §7: new "child can't start a new assessment" scenario. Narration-regen KNOWN GAP
  (§3) remains open — needs a service-role script, not SQL; documented as an optional
  code follow-on. Verify GREEN: baseline (docs-only change). Codex SKIPPED. Awaiting
  attended merge.

* **Verify baseline confirmed at 864 tests / 52 files on ATLAS-ASSESSMENT head (2026-06-11).**
  Earlier per-lane snapshots (644/47, 554) were pre-merge counts from specific worktrees.
  CLAUDE.md's pinned "554" is stale — treat the live pnpm test count as authoritative
  (CLAUDE.md updated to say this in commit 86f8cad on lane/verify-baseline-count).

## 2026-06-10

* ⚑ **G1 LIFTED — S.A.M. founder granted permission to digitize the entire test library
  (2026-06-10).** Stage 4 (DB load script) fully unblocked. Geography, duration, and
  derivative/brand rights of the license remain open (see Open / unconfirmed below).

* **Marketing §2.4 — remaining "diagnostic" scrub merged (PR #20); precision-claim fix
  open (PR #21).** PR #20 (`lane/marketing-diagnostic-scrub`, commit `e6d9515`, merged in
  `d4743c7`) scrubbed the remaining rendered "diagnostic" claims to "assessment". PR #21
  (`lane/marketing-precision-claim`, commits `e52258c`+`32f35d6`, DONE-pending-merge)
  removes the unbacked "98% accuracy" precision claim and renames the "Diagnostic
  Precision" card heading to "Misconception Mapping". PR #21 awaits Dimitri's attended
  merge after Vercel preview review.

* **CONVERSION Stage 4 DB load script built (PR #23, lane/conversion-stage4-load,
  commit `40d32b3`, worktree `atlas-stage4`).** `pnpm convert:load` emits a timestamped
  questions migration + byte-identical `seed.sql` mirror; idempotent; `image_required`
  rows load `is_active=false`; source pages upload to private `question-images` bucket
  under `conversion-staging/<external_id>/`; missing creds → graceful skip + manifest.
  Verify GREEN: 604 tests / 44 files. DONE-pending-merge.

* **Content-id backfill built (PR #22, lane/questions-content-id-backfill, commits
  `5b249f5`+`c6e1485`, worktree `atlas-backfill`).** Maps all 11 SAM-L2 questions to
  `content_id`. Seed.sql mirror placed AFTER the `tax_content` seed block (ordering
  matters; new drift test pins this). Verify GREEN: 569 tests / 44 files.
  DONE-pending-merge.

## 2026-06-05

* **§2.4 marketing hero pill line-74 fix shipped as PR #16 (lane/marketing-assessment-wording,
  DONE-pending-merge).** `(marketing)/page.tsx:74` hero pill changed from
  "S.A.M Mathematical Diagnostic Suite" → "S.A.M Mathematical Assessment Suite". CI GREEN,
  Vercel preview pass. Five additional visible parent/educator-facing occurrences of
  "diagnostic" on the marketing page (lines 84, 135, 170, 298, 313) were left untouched by
  design (lane scoped to line 74); these are flagged for a Dimitri §2.4 call before any
  follow-up lane. Line 131 is a non-rendered code comment — not a concern.

* **Codex confirmed NOT programmatically reachable on this box — credential blocker, not
  transport.** Evidence documented in PR #17 (lane/codex-reachability-finding,
  DONE-pending-merge): codex-cli 0.130.0 installed; api.openai.com reachable (Cloudflare
  cf-ray returned); but no `~/.codex/auth.json` and no `OPENAI_API_KEY`; `codex exec`
  returns `401 Unauthorized: Missing bearer or basic authentication`. Manual-mode relay
  (`manual_codex_review.ps1`) remains the fallback. Automated-relay upgrade and `.mcp.json`
  remain PARKED pending Dimitri authenticating the CLI (`codex login`) or providing
  `OPENAI_API_KEY` on this box. `tools/relay/README.md` updated with a
  "Reachability check — 2026-06-05" section. CI GREEN.

## 2026-05-31

* **Relay built in MANUAL mode first.** `tools/relay/manual_codex_review.ps1` bundles a
  lane diff for Codex review and validates the JSON reply against
  `tools/schemas/codex_review.schema.json`; `codex-finding-resolver` then applies accepted
  findings. Automated transport and `.mcp.json` deferred until Codex reachability is
  confirmed (parked). Script is ASCII-only for PS 5.1 compatibility; secret scrub matches
  secret values (not key names) to avoid false positives; local-only (`tools/relay/.reviews/`
  gitignored). Tooling-only lane (no app code changed). Implemented in PR #9, merge
  `164a1b2`. CI GREEN: 554 tests / 41 files. Codex review SKIPPED (manual harness; no
  Codex endpoint wired this session).

* **Orchestration workflow moved to lane/* branch → PR → CI (verify-bar) → manual Codex →
  Dimitri merges attended via Vercel preview.** ATLAS-ASSESSMENT is protected by the
  "Branch Protection" GitHub ruleset (requires a pull request and the `verify-bar` status
  check to pass; direct pushes rejected). The agent never merges or pushes to the protected
  branch — merging is Dimitri's attended action. Rationale: protected branch rejects direct
  pushes; lane PRs make report-fix changes reviewable with a Vercel preview before merge.
  Implemented in PR #7 (no-ff merge `016e4ea`): `.github/workflows/verify.yml`,
  `.github/pull_request_template.md`, CLAUDE.md step 6 + RUNBOOK step 8 reconciled. CI
  passed GREEN: 554 tests / 41 files, no `ANTHROPIC_API_KEY` (classifier/narration mocked).

* **Ruleset scope corrected `~ALL` → `~DEFAULT_BRANCH`.** As first activated, the "Branch
  Protection" ruleset targeted `~ALL` branches, so the `required_status_checks`/`deletion`
  rules applied to every ref — which blocked pushing a new `lane/*` branch to origin
  (`Required status check "verify-bar" is expected`) and blocked deleting merged lane
  branches. That breaks the lane→PR flow (you can't create the lane on origin to open a PR
  from). Rescoped the ruleset's `conditions.ref_name.include` to `["~DEFAULT_BRANCH"]`
  (ATLAS-ASSESSMENT is the default branch) via `gh api`, authorized attended by Dimitri.
  ATLAS-ASSESSMENT remains fully protected (PR + `verify-bar`, no direct push, no deletion,
  no non-fast-forward); `lane/*` branches are now pushable and deletable. Surfaced by
  dogfooding the flow on the PR #8 memory lane.

## 2026-05-30

* ⚑ **Admin/support tooling for the pilot = ops runbook first; admin UI deferred.**
  Decision by Dimitri 2026-05-30. Rationale: no admin role exists in the schema; an admin
  UI surfacing child data is privacy-sensitive; the pilot can be operated via
  Supabase/Vercel dashboards. `docs/ops-runbook.md` shipped (merge `5709c13`). Admin UI
  remains deferred indefinitely unless Dimitri directs otherwise. OPTIONAL follow-on: a
  service-role script calling `attemptNarration` to regenerate a report narration without
  a re-take (noted as a KNOWN GAP in ops-runbook §3; build only if the pilot needs it).

* **Feature-flag mechanism = env-var boolean getters (not DB-backed) for the
  single-tenant pilot.** 11 §12 staged-rollout flags added to `src/lib/env.ts`, all
  default-off (only `'true'` enables): `enable_short_test_beta`,
  `enable_comprehensive_pilot`, `enable_center_routing`, `enable_external_centers`,
  `enable_diagnostic_snapshot_sharing`, `enable_full_history_sharing`,
  `enable_machine_generated_items`, `enable_instructor_assigned_practice`,
  `enable_socratic_assistant`, `enable_multi_tenant`, `enable_franchisor_dashboard`.
  `ROLLOUT_FLAGS` registry exported for introspection. New `src/lib/env.test.ts` pins the
  default-off invariant. `.env.example` documents all 11 (commented/off) + the previously
  missing `REPORT_NARRATION_LIVE` entry. DB-backed per-tenant flag table deferred to
  multi-tenant v2. Fix `efccf4f`, merge `a9d45ba`. Verify GREEN: 554 tests. Codex
  SKIPPED (relay not wired).

* **Brand-dot scrub applied to client-facing copy.** Lane `brand-dot-scrub`, fix
  `ffa77e5`, merged `47f9e59`, pushed; origin head `47f9e59`. Trailing dot removed from
  "S.A.M" in 9 rendered strings across 7 files: parent report footer disclaimer and
  next-steps body (`page.tsx`), parent-report-feedback, instructor portal empty-state and
  item-review note, signup center-selector labels (x3 in `signup-form.tsx`), assessment
  QuestionShell top bar, marketing hero pill. Deliberately excluded: code comments / logs
  / type docs / tests; marketing footer sentence-final "S.A.M." (grammatically correct);
  `layout.tsx` description metadata. The "Diagnostic" wording at `(marketing)/page.tsx:74`
  is a separate §2.4 open question — not touched and not resolved. Verify GREEN: 550
  tests, 0 type errors, 1 known font lint warning. Codex SKIPPED (relay not wired).

* **Narration anti-fabrication guard implemented (§2.4 / credibility).** Lane
  `report-narration-events`, fix `43b24c8`, merged `fbe8c5b`, pushed; origin head
  `fbe8c5b`. When every sub-strand band is `no_data` / total 0, `strand_lede` is
  suppressed and `key_findings.strengths` cleared deterministically post-validation;
  `placement_line`, `recommendations_lede`, and misconception-derived `growth_areas` are
  kept. Implementation is a data-path guard only — the voice-locked Step-4 prompt is
  untouched. New test added. Verify bar GREEN: 550 tests (+3), 0 type errors, 1 known font
  lint warning, pre- and post-merge. Codex review SKIPPED (relay not wired, no
  `.mcp.json`).

* **Both report-resident funnel events wired.** `parent_report_generated` emitted after
  successful `report_narrations` upsert (fail-soft, PII-free, service client) in
  `trigger.ts`. `center_followup_opted_in` wired via new server action
  `recordCenterFollowupOptIn` in `feedback-actions.ts` (mirrors `recordReportViewed` RLS
  ownership check) and new client wrapper `center-followup-cta.tsx` firing on CTA click.
  Href stays `CTA_LINKS` placeholder. New tests added. Same commit/merge as above.

* **Report CTA label applied in `page.tsx`.** "Schedule a conversation with a S.A.M center
  director" (no trailing dot) applied at the CTA render site. The `:63` entry is resolved
  from the brand-dot scrub list.

* **Bugs 1 (placement bar) and 3 (radar / sub-strand pills) PARKED pending founder
  confirmation.** These affect only the degraded/"unreliable" branch (speed-run with too
  few clean responses). The banner-only render on that branch is consistent with §2.4
  (no strand findings asserted when data absent). Needs on-screen check against a real
  completed assessment by Dimitri (he runs the dev server). See NEXT_ACTIONS.md PARKED
  entry for the full question.

* ⚑ **Report CTA label resolved (consultative wording).** Label is **"Schedule a
  conversation with a S.A.M center director"**. The commercial alternative "Schedule a
  free class" was explicitly rejected. Href stays a placeholder until real scheduling is
  wired; this decision covers the label only. Brand token is "S.A.M" with no trailing
  dot, consistent with BUSINESS_RULES §"Claims & language". Label to be applied when the
  CTA is wired.

* **Report bug 1 fixed — page `<title>` scrub (§2.4).** `src/app/layout.tsx:40` title
  changed from `"Atlas Assessment | Diagnostic Excellence"` to
  `"Atlas Assessment | Assessment Report"`. Lane: `report-title-scrub` off
  `ATLAS-ASSESSMENT`. Fix commit `c487f1c`, merged `--no-ff` as `a74c613`, pushed to
  origin. Verify bar GREEN (547 tests, 0 type errors, 1 known font lint warning) pre- and
  post-merge. Codex review SKIPPED — relay not wired, no `.mcp.json` in this repo.
  Remaining report bugs (3) and unwired analytics events (2) remain open.

## 2026-05-29

* ⚑ **Comprehensive test = longer parameterization of the existing adaptive engine**, not
a separate fixed blueprint. Config, not a build. License-gated.
* ⚑ **Anthropic API may serve under-13 users** for this product (product is the Anthropic
customer; child never interacts with the model directly; safeguards implemented).
Classifier taken off stub in code; production flip needs Vercel env. (Gate G4 resolved.)
* ⚑ **Consent is per-child (COPPA Model B)** — captured at `/add-child`; `/coppa` is
disclosure-only; server-side gate keyed to `child\_id`; fails closed.
* ⚑ **Report named "Assessment Report," not "Diagnostic"** (§2.4). Headline proficiency
donut dropped (unsupported precision pre-M1.5).
* **Adopt the editorial report format** (founder's `atlas-sample-report.html`).
Layout-only reskin first; 4-beat findings depth + narration voice re-tune deferred (to
avoid re-opening the voice-locked Step 4 prompt before the SAM deck). Radar stays
3-strand; sub-strand list maps to `tax\_\*` (ignore the sample's illustrative 5 names).
* **M2 lanes built via git worktrees**, one branch each off `ATLAS-ASSESSMENT`, merged one
at a time with the verify bar between. `pnpm install` per worktree; no `node\_modules`
junction.
* **Instructor portal gates raw S.A.M question content** — misconceptions +
recommendations + response-derived item review only; no parent PII; center-scoped via RLS.
* **Analytics emits are fail-soft and PII-free**; satisfaction is a self-contained island
mounted by one additive line on the report page (report internals untouched).

## 2026-05-28

* **Subagent fleet, two layers.** Layer 1 (coupled product DESIGN debate) stays an
in-thread conversation. Layer 2 (parallelizable EXECUTION) = `verify` + `audit` (haiku,
read-only) + `product-manager` orchestrator delegating to built-in `general-purpose`
workers. Fleet lives in `.claude/agents/`.
* **ROI test for any new agent (all five must hold):** repeated use; independent /
parallelizable; context-isolation pays; execution not coupled design; maintenance cost
justified. Default is NO new agent.
* **Rejected:** custom worker agents (backend/frontend/test) — use scoped
`general-purpose`; peer-to-peer "agent teams"; a six-role day-one fleet.

## 2026-05-29 (repo migration / orchestration — this session)

* **Move technical orchestration into Claude Code**; this chat retains business/strategy
only. Durable memory migrated into the repo under `.agent/memory/`; live state under
`.agent/runs/`.
* **Relay topology:** Code orchestrator is the only hub; Code→Codex and Code→subagents;
subagents never talk laterally (summary-in/summary-out). (Re-affirms the rejected
peer-to-peer model.)
* **Repo `.agent/runs/` replaces the technical `\*\_handover.md` files** (ATLAS / CONVERSION
/ AGENTS). Chat handover files retained for business/strategy topics only.
* **Codex's proposed fleet pared down:** keep existing `verify` / `audit` /
`product-manager`; add only `codex-finding-resolver`. Dropped `orchestrator-reviewer`
(conflicts with product-manager), `backend-/frontend-implementer`, `test-engineer`.
* **De-duped memory:** single decision log at `.agent/memory/DECISIONS.md`; `ROADMAP.md`
is technical-only and defers milestone definitions to `atlas\_assessment\_strategy.md`.
* Repo moved to a short path `C:\\Users\\Acer\\PROJECTS\\atlas-ai` (old nested path with `!`
and spaces was a tooling hazard). Old worktrees removed. Fresh checkout confirmed origin
head `71205e5` (analytics merge) — all three M2 lanes pushed; codebase complete.
* `AGENTS.md` reconciled (deduped garbled autonomy stub; full autonomy rules promoted to
§1; worktree/verify-bar/taxonomy conventions added). `CLAUDE.md` is now a distinct
orchestration file, NOT a symlink to `AGENTS.md`; `GEMINI.md` symlink optional.
* Fleet = `product-manager` / `verify` / `audit` / `codex-finding-resolver` /
`repo-memory-maintainer` (5). Codex's `orchestrator-reviewer` / `backend-` / `frontend-`
/ `test-engineer` rejected; its duplicate `Business-Rules.md` / `Next-Actions.md` /
`Claude-Code-Orchestrator.md` discarded (canonical files exist).

## 2026-05-26 / 2026-05-25 (taxonomy + CONVERSION)

* **Taxonomy V2026 locked:** `tax\_\*` tables (`tax\_` prefix locked); `questions.content\_id`
nullable FK; `tax\_levels.mvp` + `tax\_content.mvp` carry the L1–4 MVP cut (read-time
gating). Old flat six-strand taxonomy dropped.
* **CONVERSION pipeline** = standalone 5-stage CLI in `scripts/conversion/`. Stages 1–3
(extract / segment / tag) built + verified; Stage 4 (DB load) single-gated on S.A.M.
licensing. Stage 3 tagging uses forced Anthropic tool-use (Sonnet), strict schema, the
21 misconception codes; quality reviewed and accepted.
* ⚑ Answer keys ship for ALL worksheets (Sam-confirmed). Anthropic-API processing of
licensed question text for tagging is permitted — processing, not training (Sam-confirmed).
* ⚑ MVP bank = lightly adaptive + public-item supplementation later; not S.A.M. questions
1:1 as the whole bank.

## 2026-05-05 (architecture baseline — see ARCHITECTURE.md)

* Supabase Auth + Postgres; Anthropic Haiku+Sonnet; Vercel; Resend; no offline v1; no
paywall v1. Cross-cutting guardrails (tenant\_id, subject-agnostic schema, taxonomy/recs
as data, themeable UI, abstraction layers, auth-user indirection, no raw question
client-side). **Superseded since:** LLM calls now direct `@ai-sdk/anthropic` (gateway
removed); report narration is fire-and-forget via `after()`, not job-ID/poll.

## Standing / carried

* ⚑ `atlas\_assessment\_strategy.md` is canonical; read-only for agents; flag deviations.
* ⚑ No consumer paywall; B2B2C; school sales out of scope; per-child consent;
licensed-asset treatment of S.A.M. content (see BUSINESS\_RULES.md).
* Verify bar (`pnpm test` + `tsc --noEmit` + lint) green before every commit.

## Open / unconfirmed (need Dimitri)

* Franchisor pilot-approval routing (Sam vs. franchisor) — G2.
* License scope specifics (geography, duration, derivative/brand rights) — G1.
* Pricing model — all options still open.

