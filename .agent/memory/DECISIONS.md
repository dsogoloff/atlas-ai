# DECISIONS LOG (most recent first)

Durable, dated decisions. ⚑ = business/strategy/legal/privacy/pricing — requires Dimitri
to change. Unmarked = technical, reversible by Claude Code with cause.

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

