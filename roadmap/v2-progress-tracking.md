# v2 Progress Tracking — Deferred Feature List

> **Created**: 2026-05-10
> **Status**: Reviewer's proposal. Founder edits welcome before commit.
> **Parent reference**: features.md:277 ("Growth Tracking" Phase 2 row).
>
> This file elaborates the one-line "Growth Tracking" entry in features.md's
> Phase 2 table into 17 concrete sub-features across five surface areas.
> Planning artifact, not a build spec. Items here are not on the v1 path
> and not currently scheduled. Items move into features.md / architecture.md
> Decision Log when they're committed for build.

---

## Context — v1 vs v2

v1 ships single-snapshot assessments. A child takes an assessment, gets a
placement and report, and the data is preserved per compliance.md §4
(24-month retention). Multiple sessions per child are supported by the
schema (`assessment_sessions` keyed on `child_id`, no uniqueness constraint
beyond the IN_PROGRESS partial index from `20260507000300`), but no v1
feature reads across sessions or surfaces longitudinal data to parents
or instructors.

v2 extends that into multi-session product surface. The 17 sub-features
below break "Growth Tracking" into concrete UX, instructor, notification,
compliance, and engine workstreams.

---

## Why deferred from v1

**Pilot families are single-cohort, single-window.** The v1 pilot is 50–100
homeschool families taking their first assessment. Multi-session features
require ≥2 sessions per child to exercise; pilot timeline doesn't generate
that signal at meaningful volume.

**Real progress data requires real S.A.M. content.** Item #11 (S.A.M.
licensing, blocked on Sam Chia conversation) gates the placeholder→real
content swap. Validating "Maya improved on Operations from session 1 to
session 2" without real calibrated content produces noise, not signal.

**Progress tracking is its own meaningful product surface.** Weeks of UX
work, notification infrastructure, compliance re-review for retention
changes, and engine extensions. Better designed after observing actual
pilot engagement patterns — what cadence parents return at, what
instructors ask for during enrollment conversations, which milestones
parents notice — than spec'd in advance.

**Schema already supports it.** The v1 data model is forward-compatible:
multi-session per child is native, response-level data is preserved,
engine prior version is stamped per session as of Item #10 Phase 1.
Deferring to v2 accrues no technical debt; v2 work is additive UX,
notifications, and engine intelligence on top of the existing foundation.

---

## Features

### Parent-facing report + dashboard

#### 1. Per-child progress timeline in parent dashboard

Visual showing all completed assessments over time, with placement level
and key strand scores per session.

- **Depends on**: ≥2 completed assessments per child (real pilot/post-pilot
  data); existing parent dashboard from Item #7.
- **Open**: timeline shape — line chart per strand, milestone-icon row,
  delta cards. UX choice deferred.

#### 2. Cross-session comparison view in parent report

Side-by-side or delta visualization of strand mastery between the most
recent and prior assessment.

- **Depends on**: ≥2 completed assessments; report page from Item #8;
  the strand radar component from Item #8.5 is the natural reusable surface.
- **Open**: comparison scope — most-recent-vs-prior only, or full history
  filter (3 months ago / 6 months ago / 1 year ago)?

#### 3. Misconception resolution tracking

Explicit "previously detected, now resolved" or "still detected" framing
on the misconception card.

- **Depends on**: classifier producing real codes across ≥2 sessions
  (Item #9 + Anthropic K-8 ToS + real S.A.M. content); MisconceptionList
  card from Item #8.
- **Open**: resolution definition — "not detected in latest session" vs
  "not detected in N consecutive sessions". The former is permissive
  (could be a single-session sampling miss); the latter is stricter but
  needs more session volume to fire.

#### 4. Improvement narrative (LLM-generated)

Sonnet-generated summary highlighting growth areas plus remaining focus
areas; one LLM call per report view, cached.

- **Depends on**: Anthropic K-8 ToS landed (currently in flight per
  founder log Item #9); existing report-narrative LLM seam pattern from
  Item #9; ≥2 sessions of data.
- **Open**: cache key shape (per session-pair? per report version?
  invalidate when classifier reruns?).

#### 5. Engine prior chaining

`replayEngineState` consults prior-session posteriors as an informed
starting point instead of uniform cold-start. Future evolution of the
prior-config infrastructure landed in Item #10.

- **Depends on**: Item #10 Phase 2-3 (current work — establishes
  prior-config + per-session version stamping); ≥1 prior session per
  child.
- **Open**: chaining strategy — latest prior only, weighted average,
  age-decayed; how prior-session-derived priors are versioned vs.
  config-derived priors (`engine_prior_version` may need a "chained-vN"
  variant).

#### 6. Time-since-last-assessment framing

Recommendations and copy aware of elapsed time (e.g., "since your last
assessment 3 months ago...").

- **Depends on**: `assessment_sessions.completed_at` (already present,
  initial schema:239); recommendation copy refresh.
- **Open**: time thresholds — when does elapsed time warrant caveating
  results, recommending re-assessment, or showing growth-tracking UI
  prominently?

### Instructor / S.A.M. center surface

#### 7. Center-level cohort dashboard

Instructor sees all enrolled families' progress trends in aggregate
across the center.

- **Depends on**: instructor portal expanded beyond features.md §7
  (currently spec'd, not built); meaningful pilot volume per center
  (rough threshold ≥10 children/center for non-trivial aggregates).
- **Open**: aggregation primitives — avg placement per strand, top
  misconceptions, completion rate, time-to-completion distribution.

#### 8. Individual child trend views for instructor

Same data as feature 1, surfaced inside the instructor portal for
enrollment conversations.

- **Depends on**: feature 1 (likely shares the timeline component);
  instructor portal.
- **Open**: visibility scope — does instructor see identical view to
  parent, or richer (response-level data, time flags, classifier
  confidence)?

#### 9. Misconception cohort patterns

Aggregations like "30% of grade-2 students at this center show
OP_NO_REGROUPING" surfaced for instructor planning.

- **Depends on**: real classifier output across the cohort (Item #9 +
  K-8 ToS + real content); instructor portal; pilot volume per center.
- **Open**: privacy threshold — k-anonymity minimum cohort size before
  showing patterns (e.g., suppress until cell ≥5 children); whether
  patterns are per-center, per-tenant-per-grade, or both.

#### 10. Progress-based re-assessment cadence recommendations

Instructor sees "Maya hasn't been assessed in 4 months; recommend
re-assessment" prompts in the roster view.

- **Depends on**: feature 6 (time-since); instructor portal; cadence
  policy decision.
- **Open**: cadence policy — fixed interval (3 months / 6 months),
  age-aware (younger children re-assess sooner), or growth-rate-aware
  (children showing rapid progress re-assess sooner)?

### Notifications + engagement

#### 11. Re-assessment reminders

Parent receives a notification at configured intervals.

- **Depends on**: recurring/triggered notification infrastructure (Resend
  is wired for transactional only — no recurring scheduler exists in v1);
  parent notification preferences UI; compliance review (recurring
  child-tied notifications under COPPA).
- **Open**: default cadence; opt-in vs opt-out at signup; whether the
  notification copy needs counsel review (it references the child by
  name, like other transactional emails).

#### 12. Progress milestone notifications

Triggered notifications on level-up, misconception resolution, or
significant strand improvement.

- **Depends on**: feature 3 (resolution tracking); milestone thresholds
  ("significantly improved" needs a definition); same infrastructure as
  feature 11.
- **Open**: notification fatigue — how many milestones per session is
  too many? Whether instructor also receives milestone notifications
  for their cohort.

#### 13. Annual/quarterly progress report PDF

Recurring emailed summary that parents can save or share with instructors.

- **Depends on**: PDF rendering (the v1 report is web-only; PDF export
  was deferred from Item #8); recurring scheduler (same gap as feature
  11); ≥2 sessions for the comparison content to be meaningful.
- **Open**: PDF tooling choice (Puppeteer, React-PDF, server-rendered
  HTML with print stylesheet); cadence default.

### Compliance + data retention

#### 14. Multi-session retention extension

The v1 24-month retention (compliance.md §4) may need re-evaluation for
engaged families with year-over-year data — losing assessment history at
24 months hurts the value proposition for returning families.

- **Depends on**: pilot data demonstrating year-over-year engagement
  patterns; compliance/counsel review of any retention extension.
- **Open**: COPPA implications — does extending retention require
  re-consent from existing parents? VPC audit log treatment for
  retention-policy-version-on-row.

#### 15. Parent-controlled history visibility

Account-settings option for parents to opt in to long-term history
retention beyond 24 months.

- **Depends on**: feature 14 (compliance review); account settings UI
  extension; explicit opt-in event in the VPC audit log.
- **Open**: longer-retention duration — indefinite while account active,
  +24 months, child-age-tied (until child turns 18)?

### Engine intelligence

#### 16. Empirical prior recalibration

The priors-v1.json algorithmic placeholder is replaced with empirically-
derived priors from real student response data. Future evolution of the
prior-config infrastructure landed in Item #10.

- **Depends on**: ≥200–300 responses per item (the calibration threshold
  used elsewhere — cf. compliance.md §12 fallback observability for the
  same number); real S.A.M. content live; the priors-v* file shape from
  Item #10.
- **Open**: per-grade vs per-grade-per-strand calibration; whether
  calibration uses only completed sessions or all responses; feature
  flag for switching prior config versions in production.

#### 17. Cross-session calibration

IRT priors informed by all of a child's prior responses across sessions,
not just the current session.

- **Depends on**: feature 5 (engine prior chaining); accumulated
  response data per child.
- **Open**: COPPA / consent — is using prior-session data to bias the
  current session covered by existing v1 consent, or does it require an
  additive consent line? Decay/forgetting policy on stale prior data
  (a 2-years-ago session is less informative than a 2-months-ago one).

---

## What's already in place (v1 schema)

The data foundation for v2 is on disk. v2 work does not require schema
migrations beyond what v1 ships, except for the optional retention work
in features 14–15.

- `assessment_sessions.child_id` foreign key (initial schema, line 236) —
  multiple sessions per child are natively supported.
- `assessment_sessions.completed_at` (initial schema, line 239) —
  timeline ordering primitive.
- `assessment_sessions.current_estimate jsonb` (initial schema, line 240)
  — per-session placement output, available for cross-session comparison
  without re-deriving from responses.
- `assessment_sessions.engine_prior_version` (Item #10 Phase 1, migration
  20260510000000) — version stamp lets v2 chain priors across sessions
  while preserving each session's original prior context for replay.
- `responses.session_id` foreign key cascade — full response-level data
  per session is available for v2 calibration (feature 16) and
  cross-session calibration (feature 17).
- 24-month retention (compliance.md §4) — covers year-over-year
  comparison cases through 2 cycles; feature 14 evaluates extension.

Features 1–13 are UI / notification / report-rendering work on top of
this foundation. Features 14–15 require additive retention-config
changes. Features 16–17 extend the prior-config infrastructure rather
than replacing it.

---

## Cross-references

- `features.md:277` — Growth Tracking Phase 2 row this file elaborates.
- `features.md:223` — multi-session-per-child note in §6 User Accounts.
- `compliance.md:151` — 24-month retention rationale; feature 14 will
  require re-evaluation if v2 extends retention.
- `founder_log.md` Item #10 entries (Phases 1–3, 2026-05-10) — establish
  the priors-v* file shape and `engine_prior_version` stamping that
  features 5 and 16 build on.
- `architecture.md` Decision Log — no v2 decisions locked yet; v2 build
  will add rows for retention extension, notification cadence policy,
  and PDF rendering tooling.
