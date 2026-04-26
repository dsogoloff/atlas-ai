# Atlas Assessment — Architecture & Technical Decisions

> **Status**: Locked-in technical decisions for v1 MVP. Agents must follow these unless explicitly overridden by the founder. Any agent proposal that conflicts with this document must be flagged for review before proceeding.

---

## Decision Log Summary

| # | Decision Area | Choice | Status |
|---|---------------|--------|--------|
| 1 | Auth provider | Supabase Auth | Locked |
| 2 | Database | Supabase Postgres | Locked |
| 3 | LLM provider | Anthropic Claude (Haiku + Sonnet) | Locked |
| 4 | Hosting | Vercel | Locked |
| 5 | Question bank source | License from S.A.M. | Pending Sam Chia conversation |
| 6 | Curriculum recommendation source | License from S.A.M. | Pending Sam Chia conversation |
| 7 | Offline-capable assessment | **No for v1** | Locked |
| 8 | Paywall / pricing | **No for v1** — free pilot | Locked |
| 9 | Email provider | Resend | Locked |

---

## 1. Authentication — Supabase Auth

**Choice**: Supabase Auth (built into the Supabase project).

**Rationale**:
- Already running Supabase as the backend; adding a separate auth provider would mean two services to operate, two billing relationships, and glue code to keep user IDs in sync.
- Row Level Security (RLS) policies key off `auth.uid()` natively. Every COPPA-relevant data access ("this parent can only see this parent's children") gets enforced at the database layer. With external auth, this is plumbed manually on every query — one missed `where` clause is a data leak.
- The COPPA "email plus" VPC flow specified in `compliance.md` is custom logic regardless of provider. Supabase Auth stays out of the way while we build it.
- Free at MVP scale (included in Supabase plan).

**Implementation guardrails**:
- Use Supabase Auth's `auth.users` table as the identity source.
- Do **not** put `auth.users.id` directly into foreign keys throughout the schema. Each domain table (e.g., `parents`) has its own UUID primary key, with `auth_user_id` as a single linked column. This makes future provider migration possible.
- All queries that touch parent or child data must rely on RLS policies, not application-level filtering.
- The Compliance Agent must produce explicit RLS test cases verifying that a parent cannot read another parent's data via direct API access.

**v2 forward note**: When school customers arrive in v2, we may migrate to Clerk for better multi-tenant role hierarchies and SSO. The `auth_user_id` abstraction above keeps that migration tractable.

---

## 2. Database — Supabase Postgres

**Choice**: Supabase-hosted Postgres.

**Rationale**:
- Same project as auth — simplest possible architecture.
- RLS lives in Postgres, which is the foundation of COPPA enforcement.
- Standard SQL means no lock-in beyond the hosting layer.

**Implementation guardrails**:
- Schema design follows the data models in `features.md` (Question, AssessmentSession, Response, Parent, Child, etc.).
- Every table has a `tenant_id` column from day one (per Architectural Guardrails in `features.md`), even though v1 always sets it to `inspirea_singapore_math`.
- Migrations managed via Supabase migration tooling. All schema changes are versioned in git.
- No direct database access from the client — all queries go through API routes or Supabase client with RLS enforced.

---

## 3. LLM Provider — Anthropic Claude

**Choice**: Anthropic Claude — Haiku 4.5 for high-volume classification, Sonnet (current generation) for report narrative generation.

**Rationale**:
- Two distinct LLM workloads with different latency and quality budgets:
  - **Misconception classification** on free-response items: 5–10 calls per assessment, must be fast (<2s) and cheap. Haiku 4.5 fits — fast, inexpensive, accurate enough for structured classification with a defined taxonomy.
  - **Report narrative generation**: one call per completed assessment. Latency budget is generous (5–10s acceptable while parents wait for the report to render). Quality matters significantly because parents read it carefully. Sonnet is the right choice.
- Single provider reduces operational complexity (one API key, one billing relationship, one set of failure modes to handle).

**Implementation guardrails**:
- All LLM calls go through a thin abstraction layer: `llmClient.classifyMisconception(...)` and `llmClient.generateReport(...)`. Provider-specific code lives only in the implementation behind these interfaces.
- This abstraction allows swapping providers in the future without touching feature code.
- LLM calls must be wrapped in retry logic with exponential backoff and a timeout.
- Report generation must be **asynchronous** — kick off generation, return a job ID, poll for completion. Do not block the API request waiting for the LLM, especially given Vercel function execution time limits.
- Model versions and prompt templates are version-controlled in the repo. Changes to either are reviewed like code.
- Prompts must include the relevant misconception taxonomy as input context — taxonomy is not embedded in the prompt template itself (taxonomy is data, per the v2 architectural guardrails).

---

## 4. Hosting — Vercel

**Choice**: Vercel.

**Rationale**:
- Next.js + Vercel is the path of least resistance.
- Edge functions handle API routes well.
- Preview deployments per PR are useful for the multi-agent review workflow.
- Env/secret management is solid.

**Implementation guardrails**:
- Watch Vercel function execution time limits (60s on Pro). Report generation must be async (per #3) to avoid hitting these limits on long LLM calls.
- All secrets (Supabase service key, Anthropic API key, Resend API key) stored in Vercel env vars, never committed to the repo.
- Production, staging, and preview environments have separate Supabase projects and separate API keys.

---

## 5. Question Bank Source — License from S.A.M. (PENDING)

**Choice**: License or co-develop with S.A.M. (Seriously Addictive Mathematics).

**Rationale**:
- S.A.M. owns 30,000+ pages of proprietary Singapore Math assessment content. The product positioning ("S.A.M. Atlas Assessment, Powered by Inspirea Labs") is built on this strategic relationship.
- Licensing is the fastest path AND the strongest competitive position — the moat becomes "we have the actual S.A.M. content," not "we recreated something similar."
- Authoring 720+ items in-house would cost $10k–22k and take 2–3 months.
- AI-generating items is legally and pedagogically risky for an assessment product.

**Status**: Requires formalization with Sam Chia. **Blocking for question bank seed, but NOT blocking for engine/schema work.**

**Implementation guardrails for the interim period**:
- Agents build the engine and schema with **clearly fake placeholder content** (e.g., "Q-001: 1 + 1 = ?"). Do **not** author "real-looking" Singapore Math questions that could accidentally ship.
- The seed script must be designed so the real licensed content can be loaded via a single import once available.
- Per `compliance.md` and S.A.M. licensing constraints:
  - Raw question content must never be exposed client-side (questions served one at a time via API).
  - Full bank is never sent to the browser.
  - All access to question content is audit-logged.
  - Question content is not used for LLM training.

---

## 6. Curriculum Recommendation Source — License from S.A.M. (PENDING)

**Choice**: S.A.M. produces the strand+level → Dimensions Math chapter mapping table.

**Rationale**:
- This mapping is pedagogical IP. S.A.M. instructors do this every day when placing students into the curriculum.
- Atlas should not be authoring this independently.
- Bundled with #5 in a single ask of Sam Chia.

**Status**: Requires formalization with Sam Chia. Bundled with #5.

**Expected deliverable from S.A.M.**: A structured mapping (CSV or JSON) like:
```json
{
  "strand": "Operations",
  "level": "2B",
  "primary_recommendation": "Dimensions Math 2B",
  "supplementary": ["Extra Practice 2A Chapter 5"],
  "notes": "Solidify regrouping in subtraction before progressing."
}
```

**Implementation guardrails**:
- Stored as a database table (not hardcoded), per the v2 architectural guardrails (curriculum recommendations as data, not code).
- The Recommendations section of the parent report queries this table and feeds the results into the LLM narrative generation prompt.

---

## 7. Offline-Capable Assessment — NO for v1

**Choice**: Graceful degradation only. No service worker, no IndexedDB, no offline question caching.

**Rationale**:
- Implementation complexity is high: service worker, IndexedDB, IRT engine state synchronization, conflict resolution on reconnect, secure question caching that doesn't violate the "no raw question exposure client-side" rule.
- Value at MVP is low: assessments are 15 minutes long, taken at home on wifi, and the failure mode (briefly losing connection) is recoverable via pause+reconnect+resume.
- Estimated cost: 2–3 weeks of work plus a permanent class of bugs.

**Implementation guardrails**:
- v1 must implement **graceful degradation**: if connection drops mid-assessment, UI freezes politely, queues the current response in memory, and resumes when reconnected.
- Display a clear "Connection lost — reconnecting..." indicator during outages.
- If the outage exceeds a threshold (e.g., 60 seconds), offer a "Save and continue later" option that persists session state to the server.
- Full offline mode is deferred to v2.

---

## 8. Paywall / Pricing — NO for v1

**Choice**: Free pilot. No payment infrastructure in v1.

**Rationale**:
- v1 strategy is the S.A.M. partnership demo and homeschool family pilot. Neither involves payment.
- Pricing decisions need real usage data. Build first, observe, then price.
- Adding a paywall later is straightforward. Pricing wrong at launch is hard to recover from.

**Implementation guardrails**:
- v1 has a **sign-in gate** on the assessment (parents must register), but no payment.
- Parent and Child schemas include a `subscription_tier` enum field, set to `pilot` for all v1 users. This makes adding tiers later a data migration, not a schema migration.
- All assessment functionality is gated by authentication, not by tier — so introducing tiers later doesn't require rewriting access logic.

---

## 9. Email Provider — Resend

**Choice**: Resend with React Email for templates.

**Rationale**:
- Best DX for Next.js.
- Modern API.
- React Email templates are version-controlled with the rest of the codebase.
- Free tier (3K emails/month) covers MVP pilot. $20/month for 50K covers any realistic v1 growth.

**Email types in v1**:
- Parent signup verification (the "email plus" VPC flow per `compliance.md`)
- "Your child's assessment report is ready" notification
- Password reset

**Implementation guardrails**:
- All email templates built with React Email and stored in the repo.
- Email sending wrapped in a thin abstraction (`emailClient.send(template, params)`) so the provider can be swapped if needed.
- Verification token logic (SHA-256 hashing, rate-limited resend) is implemented per `compliance.md` — Resend is the delivery mechanism, not the verification system.
- All email events (sent, delivered, bounced, opened) logged for compliance audit trail.

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| LLM | Anthropic Claude (Haiku 4.5 + Sonnet current) |
| Email | Resend + React Email |
| Hosting | Vercel |
| Version control | GitHub |

---

## Architectural Guardrails (Cross-Cutting)

These apply to every feature and every cycle. The Technical Feasibility agent must enforce them.

1. **`tenant_id` on every table** (v1 = `inspirea_singapore_math` always; v2 = real multi-tenancy).
2. **Subject-agnostic schema** — no math-specific column names or enums.
3. **Misconception taxonomy stored as data**, not code.
4. **Curriculum recommendations stored as data**, not code.
5. **Themeable UI** — all branding sourced from a config object, no hardcoded brand assets in components.
6. **API responses scoped by tenant** — every API call filters by `tenant_id` even when there's only one tenant.
7. **LLM calls wrapped in abstraction layer** — `llmClient.classify()` and `llmClient.generateReport()`.
8. **Email sending wrapped in abstraction layer** — `emailClient.send()`.
9. **Auth user ID indirection** — domain tables reference `auth_user_id`, not direct foreign keys to `auth.users`.
10. **No raw question content client-side** — questions served one at a time via API; access audit-logged.

---

## Pre-Build Dependency

**Question bank and curriculum recommendation licensing from S.A.M.** — gated on a conversation with Sam Chia.

This blocks:
- Final question bank seed
- Curriculum recommendation table population

This does **not** block:
- Schema design
- IRT/Bayesian engine implementation
- LLM-assisted question selection layer
- Misconception classification engine
- Report generation pipeline
- Parent flow UI
- Child assessment UI
- Instructor dashboard
- Email/auth/COPPA flows

**Recommended sequencing**: Cycles 0–2 (audit, schema, engine architecture) proceed in parallel with the Sam Chia conversation. Real content loads via the seed script once licensing is formalized.

---

## Open Questions Still to Resolve

These are not blockers for Cycle 1 but should be answered before the relevant build phase.

1. **LLM cost forecasting**: Estimate per-assessment cost (Haiku + Sonnet calls combined) at expected pilot volume. Inform pricing decisions for v2.
2. **Audit log storage**: Where do question-access audit logs live? Same Supabase project, or a separate compliance-scoped database?
3. **Pilot recruitment**: How are the 50–100 homeschool families recruited? S.A.M. parent network, Singapore Math forums, or paid acquisition?
4. **S.A.M. brand assets**: Final logo files, exact color hex codes, and any approved fonts. Currently using placeholder values in `design.md`.
