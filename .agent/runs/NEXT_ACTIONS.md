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
- [x] Admin/support tooling — ops runbook DONE 2026-05-30 (merge `5709c13`). Operator
      stuck-session gap + consent-revoke companion insert + §7 new scenario closed by PR #43
      (lane/ops-runbook-gaps, docs/ops-runbook.md — awaiting merge). Admin UI deferred by
      decision 2026-05-30 (no admin role in schema; privacy-sensitive; pilot operable via
      Supabase/Vercel dashboards).
- [ ] OPTIONAL follow-on: service-role report-narration regen script (only if pilot needs
      it — no operator mechanism exists today to regenerate a narration without a re-take;
      see `docs/ops-runbook.md` §3 KNOWN GAP — now explicitly documented in PR #43 as an
      optional code follow-on).

## 3b. Comprehensive-test instrumentation (M2 KPI coverage) — COMPLETE on ATLAS

- [x] **MERGED to ATLAS via PR #49 (2026-06-12).** PRs #41 (instrumentation) and #46
      (engine) had landed in the stacked parent lane branch and were stranded. PR #48
      (reland attempt) CLOSED (conflicts). PR #49 cherry-picked commits 7e7c37e (#42 consent
      regression) + 2dad26c (#46 engine) onto current ATLAS head; single conflict resolved
      (instructor student page import union). Verify 900/55. ATLAS head b9b0662. Migration
      20260611090000 present — requires `supabase db reset` (see founder actions).

- [x] **MERGED to ATLAS via PR #49 — consent gate regression test (was PR #42).**

- [ ] **Comprehensive-engine reparameterization** — item cap / confidence stop / routing
      depth for the comprehensive test type. DEFERRED to the SEPARATE
      comprehensive-assembly session (decision 2026-06-11). TODO(comprehensive-engine)
      marker in codebase identifies the hook point.

- [ ] **OPEN PR #43 — lane/ops-runbook-gaps (docs only). Dimitri: merge in any order;
      no supabase db reset needed.** docs/ops-runbook.md §3 (stuck/abandoned sessions +
      Option A reset-by-delete / Option B force-close); §4 consent revoke + vpc_audit_log
      insert + revoke-all-children variant; §7 new scenario. Narration-regen KNOWN GAP
      documented as optional code follow-on.

## 3c. Security remediation lanes (external audit) — 2026-06-12 — ALL MERGED

All four security lanes are merged to ATLAS-ASSESSMENT (head 970698e). `supabase db reset`
run (applies 20260612090000 + 20260611090000). Verify baseline 915/56/build GREEN.

- [x] **MERGED PR #50 (ea53da5) — lane/served-question-gate.** responseSubmit requires
      question_access_log row for (tenant,session,question) AND no existing response; else 403
      question_not_served. already_answered is hard 409.

- [x] **MERGED PR #55 (4b31baa) — supersedes CLOSED PR #51.** PR #51 stacked on
      lane/served-question-gate; did NOT auto-retarget on #50's merge (third stranded-PR incident;
      DECISIONS.md updated). PR #51 closed; PR #55 opened directly against ATLAS-ASSESSMENT.
      Migration 20260612090000: unique(session_id,question_id) on responses; conflict-safe insert.

- [x] **MERGED PR #52 (57e5f93) — lane/ai-data-minimization.** TEXT_ENTRY math-safe sanitizer
      (allowlist, max 40; PII never reaches Haiku; fail-soft method:'none'). Narration firstName
      only. .env.example MISCONCEPTION_CLASSIFIER_LIVE default → false. Voice-locked Step-4
      SYSTEM prompt TEXT unchanged.

- [x] **MERGED PR #53 (1997b3d) — lane/next-upgrade-ci.** next + eslint-config-next
      16.2.4→16.2.9. 'pnpm build' step added to verify.yml. 3 MODERATE transitive advisories
      (postcss/ws/brace-expansion) — no high/critical.

## 3d. Pre-scale security mediums (NOT in scope this session — pre-pilot-hardening)

These were identified during the external audit but are out of scope until the 4 security
lanes above are merged and stable. Do not build until Dimitri confirms prioritization.

- [ ] **PARKED (pre-scale):** Rate limiting on assessment/submit endpoints.
- [ ] **PARKED (pre-scale):** Trusted-IP extraction for question_access_log / audit
      (don't trust client-supplied IP).
- [ ] **PARKED (pre-scale):** RLS integration tests — prove cross-parent / cross-center
      isolation at the DB layer.

## 3e. QA-prep for founder's end-to-end run — DELIVERED 2026-06-12

- [x] Dev-only idempotent SQL script: `supabase/dev-seed-instructor-roster.sql`.
      Creates qa-instructor@atlas.test / Atlas-Pilot-2026; aligns instructor center to
      parent's children's center; parent-email param at top; Studio-paste-ready.
- [x] Env lines confirmed: `docs/qa-prep-e2e-run.md` documents REPORT_NARRATION_LIVE +
      MISCONCEPTION_CLASSIFIER_LIVE in `.env.local`; 4-grade coverage recommendation
      Grade 1/3/4/5.
- [x] Coverage checked. Key QA findings surfaced in the doc:
      - **COMPREHENSIVE not reachable from UI** — startSession sends only `{child_id}`;
        requires ENABLE_COMPREHENSIVE_PILOT=true AND manual POST to /api/assess/start
        with `comprehensive:true`. Short-path assessment unaffected.
      - **data_statistics strand: 0 active questions** — auto-excluded from scope.
      - **geometry strand: only 4 active questions bank-wide** — thin coverage.
- [ ] **OPEN PR (lane/qa-prep-2026-06-12) — Dimitri: merge after Vercel preview review.**
      Adds supabase/dev-seed-instructor-roster.sql + docs/qa-prep-e2e-run.md.
- [ ] **PARKED — needs Dimitri decision:** COMPREHENSIVE test UI reachability. Options:
      (a) leave as manual-POST only for pilot (no UI change; document for pilot testers);
      (b) add a dev-mode toggle in the assessment start flow. Plain-English: the
      "comprehensive" assessment mode cannot be triggered by a parent clicking Start — it
      needs a direct API call. Is that acceptable for the pilot, or do you want a UI
      path? Needs product call before building.

## 3f. Visual-primitive + answer-input library (G1-3) — PR #59 OPEN 2026-06-13

- [ ] **PARKED — needs Dimitri:** Eyeball the gallery on the PR #59 Vercel preview. Steps:
      (1) set `ENABLE_VISUAL_PRIMITIVES_GALLERY=true` in the Vercel Preview env for this PR,
      (2) redeploy the preview, (3) open `/dev/visual-primitives`. Then merge if satisfied.
      No DB change; no supabase db reset needed.

- [ ] **★ PRIORITY (QA-unblocking) — MERGE PR #58 (Issue-1 served-gate multirow fix).**
      lane/served-gate-multirow-fix, commit `7245826`. `responseSubmit/handler.ts` access-log
      existence check `.maybeSingle()` → `.limit(1)`. Verified 2026-06-13: the fix is NOT on
      trunk (head f8c0f30 still `.maybeSingle()` at handler.ts:385); first-submit/Strict-Mode
      resume still 500s on trunk. PR #58 is MERGEABLE/CLEAN, verify-bar SUCCESS, Vercel SUCCESS —
      attended merge only; no DB change / no supabase db reset. (Earlier "uncommitted, no PR"
      note superseded — founder committed + opened #58 mid-session.)

- [ ] **Follow-up PR (lane/memory-audit-2026-06-13)** carries this session's 3 memory/
      run-state files + `docs/sam-content-authenticity-audit.md` Appendix A — moved off
      lane/served-gate-multirow-fix to keep PR #58 = Issue-1 fix only. Off ATLAS-ASSESSMENT,
      not stacked. Its audit doc is the FULL file and overlaps #58's base audit doc → merge
      #58 first, then resolve the one-file conflict by keeping the fuller (Appendix A) version.

- [ ] **CONVERSION session — re-author SAM-L1-Q25** ("write a fact family 6,8,2") from a
      collapsed single TEXT_ENTRY answer to the equation-set answer input + set-equality
      grading model (per `docs/answer-model-spec.md` worked 6/8/2 example). This is the one
      gradeability-flagged active G1-3 item. Bank-owned; do not touch in app lanes.

- [ ] **CONVERSION — content-integrity gate (PARKED, bank-owned).** Root cause: `questions`
      has no provenance/rights/"model-reconstructed" column (authenticity only inferable from
      `external_id` + migration comments). ~5 ACTIVE rows need PDF-faithful re-authoring before
      they can be trusted as served items: **SAM-L3-Q15** (mojibake MC, options invented→dropped,
      now TEXT_ENTRY "4/6"); **SAM-L3-Q03** (options were model value-equivalents, replaced with
      page-verbatim — re-confirm); **SAM-L6-Q09/Q11/Q12** (fraction answers vision-recovered from
      symbol-font keys); **SAM-L4-Q15** (answer "1 km 750 m" self-flagged suspect — pending founder
      PDF check). See `docs/sam-content-authenticity-audit.md` ACTIVE-candidates section.

- [ ] **CONVERSION/content — 24 inactive image-essential L1-L3 rows** (L1 6 / L2 8 / L3 10)
      are the bespoke tail; each needs either a curated per-question image OR re-authoring
      against the parametric primitives before activation. The active G1-3 set has ZERO
      bespoke-image items; no blocker on the current active bank.

- [ ] **Picker level-band widening — decided-in-principle: ±3 half-grades, graceful widening**
      (`docs/picker-level-band-proposal.md`, on PR #58). IMPLEMENT AFTER the CONVERSION
      re-authoring above (don't widen the served band while model-reconstructed rows are still
      unverified). Sequencing decision; not yet built.

## 3i. L0/L1/L2 activation wave — PR #78 OPEN 2026-06-16

- [ ] **★ BEFORE MERGING PR #78 — Dimitri: upload manifest images to the private
      `question-images` bucket.** An activated image row whose file is missing will 500 at
      serve time. Required folders: `l0/`, `l1/`, `l2/`. Full upload manifest is in
      `scripts/conversion/l0-l2-activation-notes.md`. Also confirm the 7 already-active L2
      images are present in the bucket. After upload: merge PR #78 + `supabase db reset`.

- [ ] **PARKED — one-image-away (flip once founder provides a single curated image):**
      - SAM-L0A-Q17: needs a group-of-balloons image (only single-balloon crops exist).
      - SAM-L0B-Q07: needs the two sorted-shapes part-crops composited into one image.

- [ ] **PARKED — content decisions (held inactive, non-blocking):**
      - SAM-L0B-Q06: number-line crop has no printed numbers; answer key "Color 7 and 6"
        conflicts with stem "greater than 6". Needs founder/S.A.M. to supply real tiles +
        correct subset.
      - SAM-L0B-Q03: no answer key / reference available.
      - SAM-L0B-Q05: ambiguous given/blank layout.
      - SAM-L1-Q07: no correct option identified.
      - SAM-L1-Q25: verbatim stem only at DB head, not overlay — pull to overlay to flip
        equation-set.
      - SAM-L1-Q08: multi-axis position answer, not clean binary; held.

- [ ] **PARKED — structural blocks (non-activation-path until resolved):**
      - Single-scene no-discrete-tiles: SAM-L1-Q01/Q06/Q26.
      - Missing source image: SAM-L0A-Q12, SAM-L0B-Q08/Q12/Q13, SAM-L0C-Q01/Q06/Q12.

- [ ] **PARKED — taxonomy-gap (content_id NULL) rows remain blocked until taxonomy
      extended (founder/S.A.M. decision):**
      SAM-L0A-Q03/Q05/Q06/Q07/Q09/Q10/Q13/Q14/Q15/Q16, SAM-L0B-Q01/Q04,
      SAM-L0C-Q05/Q15.

- [ ] **NOTE (non-blocking, cosmetic review):** SAM-L1-Q16 crop has baked-in
      question-number/name text — flag if undesirable for parent render.

## 3h. L0 authoring (0A/0B/0C) — PR #74 OPEN 2026-06-15

- [ ] **Dimitri: merge PR #74 after Vercel preview review, then run `supabase db reset`.**
      Applies two migrations: `20260616120000` (enum DDL — adds 0A/0B/0C to `half_grade_level`)
      and `20260616120100` (28 inserts + 21 re-banded updates). No app-code change; no verify
      re-run needed post-merge. Seed.sql mirror is purely additive (+426/-0).

- [ ] **PARKED — taxonomy gaps (needs founder/S.A.M. decision, non-blocking).**
      Four L0 topic areas have no taxonomy code and `content_id NULL` because no code was
      invented (correct behavior per BUSINESS_RULES): 0A "Same or different"; 0A
      position/direction words; 0C "Comparing and Ordering"; 0C "Odd and Even Numbers".
      Extending the taxonomy = founder/S.A.M. decision. No build until directed.

- [ ] **PARKED — 0B Task 6 answer-key conflict (SAM-L0B-Q06, held inactive).**
      Stem asks for the number "greater than 6"; answer key says "Colour 7 and 6" — "6" is
      not greater than 6. Row is inactive (held-C). Needs founder/S.A.M. to clarify the
      intended correct subset before this row can be activated.

- [ ] **Activation of held L0 image/format rows** (3 held-A + 31 held-C) — same dependency
      as L1-3: per-tile image minting must be added to `serveQuestion.ts` (NEXT_ACTIONS §3g)
      AND curated per-question images must be placed (crops from docx in
      `input/source/0{a,b,c}/`, not committed). Non-blocking while held.

- [ ] **content_id on the 21 re-banded L0 rows is unchanged** — the overlay UPDATE re-bands
      `level` but does not re-resolve `content_id` (same limitation as L1/L2 appliers).
      Resolve in a future taxonomy-extension pass if/when L0 codes are assigned.

## 3g. Image answer-inputs (3 click-image formats) — PR #71 MERGED 2026-06-15

- [x] **MERGED — PR #71 (lane/image-answer-inputs), merge `e3f60f1` (lane commit `7abdf4d`).**
      Off ATLAS-ASSESSMENT head `dfc9925`, not stacked; trunk head is now `e3f60f1`. Adds
      question_format values CLICK_IMAGE_SINGLE / CLICK_IMAGE_MULTI / IMAGE_ORDERING with full
      client input + server grading, forward-wired. Enum-DDL-only migration `20260615120000`
      (applied on the next `supabase db reset`; no row data, no seed mirror). NO rows touched;
      guardrail intact. Verify GREEN 1074/75, tsc 0, lint 0 errors (2 known warnings), build OK.

- [ ] **★ ACTIVATION DEPENDENCY (CONVERSION-owned, MUST precede activation) — per-tile image
      minting for the 3 image formats.** `serveQuestion.ts` currently mints per-tile signed
      URLs ONLY for VISUAL_MATCHING (`mintMatchingTileImages`, which reads `content.left`/
      `content.right`). The image-input formats carry their tiles at `content.tiles[]` with
      per-tile `image_path`; an analogous minting pass must be added BEFORE any of these held
      rows is flipped `is_active=true`, or they will serve **pictureless** (TileFace falls back
      to the text label). No runtime risk while held (held rows are never served). Activation
      contract (from migration `20260615120000` header): set format to the matching enum value,
      populate `content.tiles`, wire per-tile minting, clear
      `content._authoring.requires_format_swap`, set `is_active=true` — and KEEP
      `content._authoring.answer_model` where `correctness.ts` reads it for these formats.

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
- [~] Full-library digitization (0A–0C, 5–7; PDFs already in input/). **Phase 1 DONE
  2026-06-11 (lane/full-library-run, worktree atlas-stage4):** tagged+loaded 0A/0B/0C/5/6
  (L7 parked). Tagged 117 (0 failed). Loaded **81 rows** (active 50 / inactive 31; 32
  skipped — mostly Kindergarten DRAG_DROP picture/drawing tasks + L5/L6 symbol-font MC
  caught by the options-divergence guard). Delta migration
  `20260611134158_load_sam_questions.sql` (81 new external_ids only).
  - **L6 key recovery:** the 7 symbol-font L6 keys (Q9–Q13 text/arithmetic, Q15/Q16 area)
    were vision-recovered from the answer-key + worksheet page images and injected into L6
    stage2 before tagging. Q9–Q13 loaded ACTIVE; Q15/Q16 INACTIVE (image-essential, key
    stored — activate at curation). Q17 (draw top/side view) skipped (drawing, no key).
    Mixed/fraction answers (Q9 "8 1/28", Q11 "88 1/2", Q12 "5/18") reclassified
    NUMERIC→TEXT_ENTRY via `20260611140000_reclassify_l6_recovered_text_entry.sql`
    (mirrored in seed after the new-levels INSERT). Q10 "2.17", Q13 "100" stay NUMERIC.
  - **⚠ PENDING RECONCILIATION (founder Option-1 decision 2026-06-11):** to leave the
    L1–4 rows byte-for-byte unchanged, the new-levels rows were added to `seed.sql` as a
    **separate block OUTSIDE the stage4 BEGIN/END markers** (the loader rebuilds the
    marker block from on-disk stage3 outputs, and L1–4's stage3 outputs are stale vs the
    two correction migrations — a cumulative re-run would drop the gated L3 rows). A
    future full cumulative re-load must (a) make the L1–4 stage3 sources guard-clean
    (fold in the `20260610170100`/`20260610180000` fixes) and then (b) fold the new-levels
    block back inside the single stage4 marker block. Until then the stage5/qa audits
    label the new levels "hand-seeded"/"UNKNOWN" (cosmetic artifact of the split).
  - Backups left in place: `supabase/seed.sql.prefulllib.bak` (pre-new-levels seed) and
    `output/Level 6 Placement Worksheet/stage2-questions.json.pre-recovery.bak`.
  - Phase 2 sweep GREEN: mc-index 51 MC (44 match / 1 known L3-Q11 mismatch / 6 no-key);
    stage5 audit checked=161 suspect=37 unverifiable=17; QA refreshed
    `output/QA-audit-L1-4.{md,csv}` (161 rows, 99 active / 62 inactive). Verify bar GREEN
    (864 tests / 52 files, tsc 0, lint 2 known warnings). Phase 3 NOT started (stopped per
    instruction).
- [ ] Remaining digitization: L7 (parked); image curation for the new inactive image-
  essential rows; recover the L5/L6 symbol-font MC options skipped by the guard.

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
- **Attend-merge PR #43 (ops-runbook-gaps) — PARKED awaiting Dimitri.** Docs only; no DB;
  no supabase db reset needed. (PRs #41 and #42 are now on ATLAS via earlier merges;
  migration 20260611090000 applied via supabase db reset 2026-06-12.)
- **Founder actions for conversion run — PARKED (updated, 2026-06-10).** Image curation for
  30 inactive image-essential questions (upload manifests in each worksheet output folder).
  Radar acceptance check: complete one fresh dev assessment, confirm radar populates.
- **COMPREHENSIVE test UI reachability — PARKED (new, 2026-06-12).** See 3e above for the
  plain-English question. Needs product call before any build.
- Franchisor pilot-approval routing — G2 (business gate).
- Pricing model (business gate); G1 license scope specifics (now LIFTED for digitization
  permission; geography/duration/derivative rights remain open).
