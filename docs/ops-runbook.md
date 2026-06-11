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

## 3. Stuck / abandoned sessions, and report regeneration

### Find a stuck session

`sessionStartHandler` auto-resumes the newest `IN_PROGRESS` session for a child
on the next start, so an abandoned run keeps re-opening until it is closed or
removed. A "child can't start a fresh assessment" report is almost always this.
Find stale runs:

```sql
-- IN_PROGRESS sessions idle for > 1 day (tune the interval)
select s.id as session_id, s.child_id, c.name as child_name,
       s.started_at,
       (select max(r.created_at) from responses r where r.session_id = s.id)
         as last_response_at,
       (select count(*)         from responses r where r.session_id = s.id)
         as response_count
from assessment_sessions s
join children c on c.id = s.child_id
where s.status = 'IN_PROGRESS'
  and s.started_at < now() - interval '1 day'
order by s.started_at;
```

### Option A — reset (let the child start fresh) — recommended for an abandoned run

Delete the stuck `IN_PROGRESS` session. Its `responses` and `question_access_log`
rows cascade-delete; `analytics_events.session_id` is set null (funnel rows are
kept, just unlinked). On the child's next visit a brand-new session starts.
**Only ever delete an `IN_PROGRESS` session** — a `COMPLETED` session is the
parent's report and must never be deleted.

```sql
-- Reset ONE abandoned in-progress session (verify the id from the query above).
-- The `and status = 'IN_PROGRESS'` guard makes this a no-op on a completed row.
delete from assessment_sessions
where id = '<session-uuid>' and status = 'IN_PROGRESS';
```

### Option B — force-close (end the run, keep what was answered)

Mark it `COMPLETED` so it stops resuming and its current placement estimate
freezes. The `assessment_sessions_completed_chk` constraint requires
`completed_at` to be set in the same statement.

```sql
update assessment_sessions
set status = 'COMPLETED', completed_at = now()
where id = '<session-uuid>' and status = 'IN_PROGRESS';
```

> **Caveat.** A SQL force-close does **not** run the app's `closeSession` path, so
> it does **not** generate a narration row and does not recompute placement. The
> report renders data-only from the frozen `current_estimate`; with too few clean
> responses it lands on the `unreliable` banner (§2). Prefer Option A for a
> genuinely abandoned run; use Option B only when the answered items should be
> retained as a finished session.

### Report / narration regeneration — still a code follow-on

Re-running narration for an already-completed session has **no operator SQL**:
the narration upsert fires only from `closeSession` on completion
(`src/lib/responseSubmit/handler.ts`; `src/lib/report/narration/trigger.ts`), and
the upsert is idempotent on `session_id`. Flipping `REPORT_NARRATION_LIVE` (§6)
affects **future** completions only, not past sessions. A standalone "regenerate
narration for session X" service-role script (calling `attemptNarration(sessionId)`)
is a small optional follow-on — raise it if the pilot needs it; until then,
re-take is the only way to refresh prose.

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

There is no app revoke flow, so log the operator action yourself for the audit
trail — `consent_revoked` is an existing `vpc_audit_log` event type. Run this
alongside the update above (`vpc_audit_log` has no `child_id` column, so the
child ref goes in `metadata`):

```sql
insert into vpc_audit_log (tenant_id, parent_id, event_type, metadata)
select c.tenant_id, c.parent_id, 'consent_revoked',
       jsonb_build_object('child_id', c.id, 'actor', 'ops-manual')
from children c
where c.id = '<child-uuid>';
```

To revoke for **every** child of one parent, swap the `where` on the update for
`where child_id in (select id from children where parent_id = '<parent-uuid>')
and revoked = false`, and the audit `select` for `where c.parent_id =
'<parent-uuid>'`.

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
| "Child is stuck / can't start a new assessment." | §3 — an abandoned `IN_PROGRESS` session keeps auto-resuming; reset (Option A, recommended) or force-close (Option B). |
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
