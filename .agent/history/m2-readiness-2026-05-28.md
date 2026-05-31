> HISTORICAL SNAPSHOT (2026-05-28, pre-M2-merge) — stale; see .agent/runs/CURRENT_STATE.md for live state.

# M2 (UWS Comprehensive Pilot) — Build-State Readiness Inventory

**Date:** 2026-05-28
**Scope:** Build-state only. External/business gates (Sam Chia licensing, franchisor approval, legal review) are tracked elsewhere and deliberately excluded.
**Method:** Read-only audit of `src/`, `supabase/migrations/`, and project docs against the M2 exit criteria and the surfaces whose status was unclear. Status legend: **BUILT** (works end-to-end) / **PARTIAL** (partially wired, real gaps) / **STUB** (scaffold/placeholder, no working data path) / **NOT BUILT** (absent).

> A report reskin is in flight in a separate session. Surface 5 below confirms the report *pipeline* (generation + render + narration) only; visual styling is out of scope here and was not evaluated.

---

## Inventory

| # | Item | Status | Evidence (path:line) | Gap to pilot |
|---|------|--------|----------------------|--------------|
| 1 | Parent account + child profile | **BUILT** | `src/app/(auth)/signup/` (form + action + audit); `src/app/(auth)/add-child/`; `supabase/migrations/20260426000000_initial_schema.sql:92–133` (parents/children, `home_center_id`, 30-day grace cols); `src/lib/sessionStart/handler.ts:140–176` (parent→child ownership chain) | None. Multi-child via `parent_id` FK works. |
| 2 | Consent flow (COPPA "email plus" VPC) | **PARTIAL** | Built: `src/app/(auth)/signup/signup-form.tsx:261–308` (consent checkbox), `src/app/(auth)/signup/actions.ts:120–148` + `src/app/auth/callback/route.ts:54–79` (`vpc_audit_log` writes), schema `…initial_schema.sql:49–61,273–286`. Missing: `src/app/(auth)/coppa/page.tsx:178–193` (checkbox is UI-only, never persists), `src/lib/sessionStart/handler.ts:134–216` (no consent check before session insert), `src/app/api/assess/{start,submit}/route.ts` (no consent gate) | Consent gate is **not enforced**: a child assessment can start without a recorded consent. `/coppa` consent is not persisted. No per-assignment consent table (`InstructorChildAssignment` deferred to Phase 2, `features.md:267`). No consent-version tracking for material-change re-consent. |
| 3 | Comprehensive test assembly | **NOT BUILT** | Single adaptive form only: `src/lib/engine/engine.ts:36` (`MAX_QUESTIONS = 25`), `engine.ts:185–210` (`shouldTerminate`: max / confidence / bank-exhausted); `features.md:32` (~15-min single form). No form-type parameter anywhere. | No comprehensive form distinct from the short placement test. Engine is adaptive and could be parameterized (length/stopping rule), but no blueprint, no second form, no `comprehensive_*` path exists. |
| 4 | Assessment runtime | **BUILT** | `src/lib/questionPicker/picker.ts:80–132` (item delivery); `src/lib/responseSubmit/handler.ts:467–486` (response capture) + `src/app/api/assess/submit/route.ts`; `src/lib/misconceptionClassifier/classifier.ts:27–50` (classify); `src/lib/sessionStart/handler.ts:125–341` + `src/app/(child)/assessment/lib/reducer.ts:45–73` (lifecycle FSM); `responseSubmit/handler.ts:733–758` (`closeSession`) | None blocking. Caveat: misconception classifier defaults to **stub mode** (fail-soft, empty codes) pending Anthropic K-8 ToS alignment — `handler.ts:447`; gated by `MISCONCEPTION_CLASSIFIER_LIVE`. |
| 5 | Parent report (generation + render + narration) | **BUILT** | `src/lib/report/narration/generate.ts:34–66`, `…/llmClient.ts:85–140` (direct `@ai-sdk/anthropic`), `…/validate.ts:56–76` (Zod gate), `…/trigger.ts:43–124` (async, failure-isolated); `supabase/migrations/20260525000000_add_report_narrations.sql` + `20260526000000_*`; render `src/app/(parent)/report/page.tsx:174–189`, `key-findings.tsx:30–60` | None for the pipeline. Visual reskin handled in a separate session (not assessed here). |
| 6 | Instructor view / dashboard | **STUB** | Placeholder: `src/app/(instructor)/instructor/page.tsx:1–13` ("Cycle 0 … pending", zero queries). Schema/RLS ready: `…initial_schema.sql:138–150` (instructors), `:156–167` (`pedagogical_notes`), `…rls_policies.sql:69–96` (`app_instructor_can_access_child`). Spec `features.md:227–267` | Entire portal UI absent. 6a roster STUB, 6b diagnostic view STUB, 6c placement-to-instructor STUB, 6d notes BUILT schema-only/no UI, 6e item-level review NOT BUILT, 6f data-minimisation designed at schema/RLS but unverifiable until UI exists. |
| 7 | Analytics + conversion tracking | **NOT BUILT** | No event emitters anywhere in `src/` (no `track(`, `logEvent`, PostHog/Segment/Mixpanel/gtag/Plausible). No analytics/event table in `src/lib/supabase/database.types.ts`. Strategy §9 (`.claude/atlas_assessment_strategy.md:1010–1048`) defines ~30 events; **0 emitted** | M2 exit criterion "conversion tracking is functioning" (strategy §M2:551) unmet. Need SDK integration + the §9 taxonomy (`short_test_*`, `parent_report_*`, `placement_recommendation_created`, etc.) + funnel/completion plumbing. |
| 8 | Parent satisfaction capture | **NOT BUILT** | No rating/survey UI in `src/app/(parent)/report/*` or `…/dashboard/`. No `satisfaction_survey`/`feedback`/`rating` table in schema. Strategy lists `parent_satisfaction_submitted` (§9.1) and `SatisfactionSurvey` entity (§13) | No widget, no table, no plumbing. Instructor usefulness capture (`instructor_usefulness_submitted`) also absent (depends on Surface 6 UI). |
| 9 | Placement recommendation logic | **BUILT** | `src/lib/engine/engine.ts:217–235` (`placementEstimate`: posterior→level+tier), `src/lib/engine/levels.ts:19–52` (18 half-grade scale), `src/lib/tier/derive.ts:41–72` (K_4 vs G5_8), surfaced `src/app/(parent)/report/placement-card.tsx:28–45`; rubric `docs/level-subdivision-rubric.md` | None for parent surface. Not yet surfaced to instructors (blocked on Surface 6). |
| 10 | Admin / support tooling | **PARTIAL** | Audit infra exists + writes wired: `…initial_schema.sql:273–304` (`vpc_audit_log`, `question_access_log`), `20260509000000_misconception_classifier_audit.sql:43–46`, `src/lib/questionAccessLog/log.ts:37`, `src/app/(auth)/signup/actions.ts:120`. No operator UI | No admin route, user lookup, report-regeneration tool, or log-inspection UI. Logs exist but nothing to read/operate them with during a live pilot. |
| 11 | Feature flags (strategy §12) | **PARTIAL** | Two LLM env flags, default-off: `src/lib/env.ts:52–54` (`isMisconceptionClassifierLive`), `:64–66` (`isReportNarrationLive`). Strategy §12 (`…strategy.md:1378–1390`) calls for 11 flags | **`enable_comprehensive_pilot` does not exist** (nor `enable_center_routing`, sharing flags, `enable_multi_tenant`, etc.). Existing flags gate LLM calls only, not feature rollout. Default-off posture is correct for what exists. |
| 12 | Tenant scoping | **BUILT** | `…initial_schema.sql:67–72` (tenants table); all 13 core tables carry `NOT NULL tenant_id` FK (`:74–304`); single-tenant seed `supabase/seed.sql:15–16` (`inspirea_singapore_math`); RLS `…rls_policies.sql:317–327` | None. Single-tenant pilot does **not** foreclose v2 multi-tenant; multi-tenant code paths (M5) simply not built. |

---

## Biggest remaining build (dominates M2 scope)

1. **Instructor view / dashboard (Surface 6)** — the surface the brief flagged as thin, confirmed STUB. Schema, RLS, and the `pedagogical_notes` table exist, but every instructor-facing screen is a "Cycle 0" placeholder: no roster, no per-student diagnostic view, no placement surfaced to instructors, no notes UI, no item-level review. This is a from-scratch portal build (data fetching + UI + data-minimisation verification).

2. **Analytics + conversion tracking (Surface 7)** — zero of the ~30 strategy §9 events are emitted; no analytics SDK is integrated and no event/funnel table exists. M2 explicitly requires conversion tracking to function. This is net-new instrumentation across signup, the assessment runtime, and the report, plus a funnel/completion view.

3. **Consent enforcement + per-assignment consent (Surface 2)** — the signup VPC trail is built, but the consent gate is not enforced server-side (a child assessment can start without a persisted consent), the `/coppa` consent screen doesn't persist, and per-assignment consent (`InstructorChildAssignment`) doesn't exist. For a live pilot collecting child data this is the compliance-critical gap.

Smaller but net-new: **parent satisfaction capture (Surface 8)** — widget + table + plumbing; **a comprehensive form (Surface 3)** if the pilot truly needs a longer test distinct from the short placement form (otherwise this may be a scope/definition question, not a build); **admin/support tooling (Surface 10)** — minimum operator lookup + log-reading UI.

---

## Believed-done, confirmed

- **Parent account + child profile (1)** — BUILT. Signup, parent→child linkage, multi-child.
- **Assessment runtime (4)** — BUILT end-to-end (API → engine → DB → close). Only caveat is the misconception classifier defaulting to fail-soft stub mode pending ToS alignment.
- **Parent report pipeline (5)** — BUILT (generation + narration + render); reskin separate.
- **Placement recommendation logic (9)** — BUILT and surfaced on the parent report.
- **Tenant scoping (12)** — BUILT; `tenant_id` on all core tables, single-tenant seed, does not foreclose v2.

---

## Notes on a couple of classifications

- **Surface 3** is classed NOT BUILT *for a comprehensive form distinct from the short test*. A working adaptive engine exists and is the short placement form; whether "comprehensive" means a longer parameterization of that engine or a separate fixed blueprint is a product-definition question worth resolving before estimating the build.
- **Surface 6 "notes field" (6d)** is the one instructor sub-capability with real backing: the `pedagogical_notes` table and its RLS are fully defined. It is schema-complete with no UI, so it reads as BUILT at the data layer but contributes nothing usable until the portal exists.
