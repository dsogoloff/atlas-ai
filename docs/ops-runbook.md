# Pilot Operations Runbook

How to operate the Atlas Assessment pilot **without an admin UI** — using the
Supabase dashboard (SQL editor / table editor) and the Vercel dashboard. There
is no `/admin` route and no admin/support role; admin/job work uses the
service-role key (RLS comment, `supabase/migrations/20260426000100_rls_policies.sql:10`).

> **Scope.** This is the pilot-grade operator reference (decided 2026-05-30:
> ops runbook first, defer an admin UI). Every query below runs against the
> **production** Supabase project via the dashboard SQL editor unless noted.
> All tables carry `tenant_id` (single-tenant pilot = `inspirea_singapore_math`);
> scope queries by it if in doubt.

> **Privacy.** These tables hold child data. Read only what a support task
> needs. Do not export child-level diagnostic data, and do not share it with a
> center outside the consent rules (see BUSINESS_RULES "Privacy / data-sharing"
> and §"Consent" below). Free-text fields (`parent_satisfaction.comment`) are
> never copied into analytics.

---

## 0. Where things live

- **Database / data ops:** Supabase dashboard → SQL editor (read queries) or
  table editor.
- **Runtime behaviour flags:** Vercel dashboard → project → Settings →
  Environment Variables (see §6).
- **Logs / errors:** Vercel dashboard → project → Logs (server `console.error`
  lines from fail-soft paths show up here, e.g. `[narration]`, `[analytics]`).

Key tables (all in the `public` schema):

| Concern | Table |
|---|---|
| Parent accounts | `parents` |
| Children | `children` |
| Assessment runs | `assessment_sessions` |
| Report narration prose | `report_narrations` |
| Per-child consent | `consent_records` |
| VPC / consent audit trail | `vpc_audit_log` |
| Question-serving audit | `question_access_log` |
| Funnel analytics | `analytics_events` |
| Parent satisfaction | `parent_satisfaction` |

---

## 1. Look up a family

Email is stored on `parents.email` (denormalised from Supabase auth — do not
query `auth.users` directly).

```sql
-- By parent email
select id, email, name, home_center_id, tenant_id, created_at
from parents
where email ilike '%parent@example.com%';

-- Children for a parent (parents.id -> children.parent_id)
select id, name, grade_level, birth_year, home_center_id, created_at
from children
where parent_id = '<parent-uuid>';
```

`children.name`, `birth_year`, and `grade_level` identify the child;
`parent_id` is the FK back to the parent.

---

## 2. Inspect a child's assessments and report

```sql
-- Sessions for a child (newest first)
select id, status, started_at, completed_at, session_time_flag
from assessment_sessions
where child_id = '<child-uuid>'
order by started_at desc;
```

- `status` is `IN_PROGRESS` or `COMPLETED`. A report only exists for a
  `COMPLETED` session.
- `session_time_flag` (`normal | rushed | struggling | mixed | unreliable`)
  determines what the parent report shows. **`unreliable` / `mixed`** render a
  "Score not reliable" banner only — no placement, no radar, no strand pills,
  by design (the score isn't trustworthy). `rushed` / `struggling` / `normal`
  render the full report. (If someone reports "the report is missing the
  chart", first check this flag — a speed-run lands on `unreliable`.)

```sql
-- The narration prose row for a session (PK = session_id)
select session_id, status, model, generated_at,
       placement_line, strand_lede, recommendations_lede,
       findings_strengths, findings_growth_areas
from report_narrations
where session_id = '<session-uuid>';
```

- `status = 'failed'` means narration generation fell back to a data-only
  render (the report still works, just without the warm prose). Empty
  `strand_lede` / `findings_strengths` with a populated report is expected when
  the session had no measured strand data (anti-fabrication guard).

The parent views the report at **`/report?child=<child-uuid>`** (it resolves
the child's latest completed session).

---

## 3. Regenerate a report — **not currently possible as an operator action**

There is **no** operator mechanism (no CLI, no API endpoint, no admin route) to
re-run narration for an existing session. `attemptNarration` is invoked **only**
from `closeSession` during the response-submit flow on session completion
(`src/lib/responseSubmit/handler.ts`; `src/lib/report/narration/trigger.ts`).

- The upsert is idempotent on `session_id`, so completing a session again
  overwrites its narration row cleanly — but the only way to re-trigger it today
  is for the child to **re-take and complete** the assessment.
- If narration is stub/empty because the live flag was off at completion time,
  flipping `REPORT_NARRATION_LIVE` (see §6) only affects **future** completions,
  not past sessions.

**Known gap.** A standalone "regenerate narration for session X" operator script
is not built. If the pilot needs it, that is a small follow-on lane (a
service-role script calling `attemptNarration(sessionId)`); raise it and it can
be added. Until then, re-take is the only path.

---

## 4. Consent (per-child, COPPA Model B)

Consent is per `child_id`. The assessment gate is server-side and fails closed:
a child assessment will not start, and responses are not accepted, without an
**unrevoked** consent record for that child.

```sql
-- Current consent state for a child
select id, consent_type, consent_text_version,
       data_uses, sharing_permissions,
       revoked, revoked_at, granted_at
from consent_records
where child_id = '<child-uuid>'
order by granted_at desc;
```

- A child is consented when a row exists with `revoked = false`.
- `sharing_permissions` (jsonb) records which sharing tiers the parent opted
  into; `data_uses` records disclosed uses.

**Revoking consent** is a boolean flip + timestamp (there is no separate revoke
flow today). This is privacy-sensitive — revocation stops future assessment for
that child:

```sql
-- Revoke (privacy action — confirm intent first; see BUSINESS_RULES)
update consent_records
set revoked = true, revoked_at = now()
where child_id = '<child-uuid>' and revoked = false;
```

> Any change to consent semantics (beyond this operational flip) requires
> Dimitri + counsel review (G3). Do not alter `consent_text` / version columns.

---

## 5. Audit & analytics queries

```sql
-- VPC / consent audit trail for a parent
select event_type, center_id, metadata, created_at
from vpc_audit_log
where parent_id = '<parent-uuid>'
order by created_at desc;

-- Questions served in a session (compliance §8 access log)
select question_id, child_id, created_at
from question_access_log
where session_id = '<session-uuid>'
order by created_at;

-- Funnel events (PII-free; ids + non-PII props only)
select event_name, tenant_id, child_id, session_id, props, created_at
from analytics_events
order by created_at desc
limit 200;

-- Parent satisfaction (1-5 rating; comment is free text — handle with care)
select rating, comment, session_id, created_at
from parent_satisfaction
order by created_at desc;
```

- `vpc_audit_log.event_type` covers consent + center lifecycle
  (`consent_initiated`, `verification_*`, `consent_revoked`, `center_selected`,
  `center_changed`, …).
- The misconception-classifier audit is **not** a separate table — it lives on
  two columns of `responses`: `misconception_classifier_method`
  (`none | distractor-map | haiku | failed`) and
  `misconception_classifier_version`.

```sql
-- Classifier method distribution (health check)
select misconception_classifier_method, count(*)
from responses
group by 1 order by 2 desc;
```

---

## 6. Runtime behaviour flags (Vercel env)

Set in the Vercel dashboard (Settings → Environment Variables). Each is
**default-off**; only the literal string `true` enables it. A change takes
effect on the next deploy / function cold start.

**LLM gates (operational):**

| Var | Effect when `true` |
|---|---|
| `MISCONCEPTION_CLASSIFIER_LIVE` | Real Anthropic Haiku misconception calls (else deterministic stub). Cleared to go live; needs `ANTHROPIC_API_KEY`. Fail-soft. |
| `REPORT_NARRATION_LIVE` | Real Anthropic Sonnet narration (else stub JSON). Flip once the Anthropic DPA lands. Fail-soft; affects future completions only. |

**§12 staged-rollout flags (all default-off):** `ENABLE_SHORT_TEST_BETA`,
`ENABLE_COMPREHENSIVE_PILOT`, `ENABLE_CENTER_ROUTING`, `ENABLE_EXTERNAL_CENTERS`,
`ENABLE_DIAGNOSTIC_SNAPSHOT_SHARING`, `ENABLE_FULL_HISTORY_SHARING`,
`ENABLE_MACHINE_GENERATED_ITEMS`, `ENABLE_INSTRUCTOR_ASSIGNED_PRACTICE`,
`ENABLE_SOCRATIC_ASSISTANT`, `ENABLE_MULTI_TENANT`, `ENABLE_FRANCHISOR_DASHBOARD`
(defined in `src/lib/env.ts`). Several gate features that are not built yet —
the flag is an inert guard. **Do not enable** a data-sharing flag
(`ENABLE_DIAGNOSTIC_SNAPSHOT_SHARING`, `ENABLE_FULL_HISTORY_SHARING`) without
parent opt-in + counsel review (G3); and `ENABLE_COMPREHENSIVE_PILOT` /
content-dependent flags need the S.A.M licence (G1) first.

---

## 7. Common support scenarios

| Scenario | Where to look |
|---|---|
| "Parent can't see a report." | §2 — is there a `COMPLETED` session? Is `session_time_flag` `unreliable`/`mixed` (banner-only by design)? |
| "Report has no chart / placement." | §2 — almost always an `unreliable`/`mixed` speed-run; confirm with a real completed assessment. |
| "Report prose looks thin / data-only." | §2 — `report_narrations.status = 'failed'`, or `REPORT_NARRATION_LIVE` was off at completion (§3: re-take to refresh). |
| "Family wants their data removed / consent withdrawn." | §4 — revoke (privacy action; confirm intent). Broader deletion = Dimitri + counsel (G3). |
| "Is the classifier actually running live?" | §5 health query + §6 `MISCONCEPTION_CLASSIFIER_LIVE`. |
| "Funnel numbers look wrong." | §5 `analytics_events`; remember emits are fail-soft (a logging hiccup drops an event, never blocks the user). |

---

## 8. Hard don'ts

- Don't edit `consent_text` / `consent_text_version` rows (audit integrity).
- Don't bulk-export child-level diagnostic data.
- Don't enable a data-sharing or content-gated flag without the relevant gate
  (G1 licence / G3 counsel) cleared.
- Don't run `supabase db reset` against anything but a throwaway local DB.
- Escalate anything touching pricing, data-sharing scope, S.A.M brand/licence,
  or external comms to Dimitri (BUSINESS_RULES).
