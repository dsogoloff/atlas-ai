# DECISIONS LOG (most recent first)

Durable, dated decisions. ⚑ = business/strategy/legal/privacy/pricing — requires Dimitri
to change. Unmarked = technical, reversible by Claude Code with cause.

## 2026-06-11

* **Comprehensive adaptive engine built (PR #46, lane/comprehensive-engine, STACKED on PR #42;
  stack is #41 -> #42 -> #46; merge order: #41, #42, #46).** SUPERSEDES the same-day
  "engine reparameterization DEFERRED" entry below — founder explicitly reassigned the
  engine work to this session after the instrument-only PR #41 landed.
  New `src/lib/engine/comprehensive.ts` (pure, no side-effects): COMPREHENSIVE_CONFIG
  (tunable) with per-tier budgets G5_8 {target30, softFloor24, hardCap36, perStrandFloorN3}
  and K_4 {20, 16, 26, 2}; placementSeThreshold 1.0 (half-grade-index).
  comprehensiveShouldTerminate stops when BOTH placement-SE <= threshold AND every in-scope
  strand has met perStrandFloorN AND responseCount >= softFloor, OR hardCap — reuses locked
  wire reasons. comprehensiveNextQuestionRequest: phase 1 coverage floor (fewest-served
  first, tie = max variance); phase 2 adapt (max varianceLevelIndex). placementSe = sqrt
  variance of in-scope-average posterior. Hookup: sessionStart comprehensive first-pick via
  comprehensive router (in-scope = STRANDS minus discoverEmptyBankStrands; tier via
  deriveTier). responseSubmit comprehensive branch uses comprehensive terminate + router;
  replayStrandCounts sibling added (replayEngineState untouched). NextQuestionRequest.reason
  extended with comprehensive-floor|comprehensive-adapt. TODO(comprehensive-engine) marker
  resolved. Short-test path byte-identical (MAX_QUESTIONS/CONFIDENCE_THRESHOLD/
  shouldTerminate/nextQuestionRequest untouched). No new scoring model.
  Instructor student view: comprehensive-only "Strand coverage" section (deep adaptive /
  floor only / partial) via service-role responses->questions.strand aggregation (counts +
  strand labels only, never question content; compliance §8). Renders nothing for short
  sessions. comprehensive_* + placement_recommendation_created events confirmed firing at
  real lifecycle points. Dev-seed: supabase/dev-seed-instructor-pilot.sql (DEV-ONLY,
  idempotent, root-level, NOT a migration; does not modify question bank/taxonomy —
  founder may keep or drop). Verify GREEN: 900 tests / 55 files; tsc clean; lint 0 errors
  (2 pre-existing warnings). Codex SKIPPED (relay credential-blocked). Awaiting attended
  merge. Known risks: in-scope approximated by tenant-wide active-content availability (not
  a child-level-band predicate — future refinement); a strand whose small bank exhausts
  before the floor keeps floor unmet and runs to hardCap (intended backstop); COMPREHENSIVE_CONFIG
  constants are MVP defaults to revisit after real pilot run-length data.

* ⚑ **Comprehensive-test instrumentation is "instrument-only" for this session — adaptive
  engine reparameterization DEFERRED.** Decision by Dimitri 2026-06-11 (Option 1 of a
  clarifying question). Rationale: adds the test_type discriminator + fires
  comprehensive_* / short_* / instructor_* analytics events + ships a consent regression
  test without touching the adaptive engine (item cap, confidence stop, routing depth).
  Engine reparameterization is deferred to the SEPARATE comprehensive-assembly session that
  owns the question-bank/session-split boundary. Instruments M2 comprehensive-pilot funnel
  KPIs without colliding with that work. TODO(comprehensive-engine) marker left in codebase
  at the hook point.
  **NOTE (same day): SUPERSEDED — founder reassigned engine work to this session; built in
  PR #46 (see entry above). The deferred intent was never a merged decision; the engine is
  now built.**

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

