# ARCHITECTURE — Atlas Assessment

> Locked technical decisions for v1 MVP. Agents follow these unless explicitly overridden
> by Dimitri. Any proposal that conflicts must be flagged before proceeding.
> This file consolidates the 2026-05-05 `architecture.md` and updates the items that
> drifted since (flagged **[UPDATED]**). Where the older doc still holds, it is carried.

## Decision table
| # | Area | Choice | Status |
|---|------|--------|--------|
| 1 | Auth | Supabase Auth | Locked |
| 2 | Database | Supabase Postgres | Locked |
| 3 | LLM provider | Anthropic Claude (Haiku + Sonnet), direct `@ai-sdk/anthropic` | Locked **[UPDATED]** |
| 4 | Hosting | Vercel | Locked |
| 5 | Question bank source | License from S.A.M. | Pending Sam Chia (G1) |
| 6 | Curriculum recommendation source | License from S.A.M. | Pending Sam Chia (G1) |
| 7 | Offline assessment | No for v1 (graceful degradation only) | Locked |
| 8 | Paywall / pricing | No for v1 — free pilot | Locked |
| 9 | Email | Resend + React Email | Locked |

## 1–2. Auth & Database — Supabase
- Supabase Auth + Postgres, one project. RLS is the foundation of COPPA enforcement —
  every parent/child data access is enforced at the DB layer via `auth.uid()`, not
  application-level `where` clauses.
- **Auth-user indirection:** domain tables (e.g. `parents`) have their own UUID PK plus a
  single `auth_user_id` link column. Do NOT scatter `auth.users.id` through foreign keys
  — keeps a future provider migration tractable.
- All parent/child queries rely on RLS, not app filtering. Compliance work must include
  RLS tests proving a parent cannot read another parent's data via direct API access.

## 3. LLM provider — Anthropic Claude **[UPDATED]**
- Haiku = misconception classification (5–10 calls/assessment, fast/cheap). Sonnet =
  report narration (one call/completed assessment, quality-sensitive).
- **[UPDATED] All LLM calls go direct via `@ai-sdk/anthropic`.** The Vercel AI Gateway
  path was removed (gateway auth bug). Single provider, single key.
- Calls go through a thin abstraction (`classifyMisconception` / report narration
  client) with retry + timeout; fail-soft.
- **[UPDATED] Report narration is fire-and-forget via `after()`** off the response path,
  and the report assembles on view — NOT the job-ID/poll model the 2026-05-05 doc
  described. Narration failures never block assessment completion or report render.
- **Classifier input is structured only** (`{format, strand, content, answerGiven,
  isCorrect}`); the child never sends free text to the model. Processing is server-side,
  post-submit. (Minor-safety safeguard — see BUSINESS_RULES.md.)
- Model versions + prompt templates are version-controlled and reviewed like code. The
  **Step 4 narration prompt is voice-locked** (5 live review rounds) — do not re-open
  without cause. Misconception taxonomy is passed as input context, not embedded in the
  prompt (taxonomy is data).

## 4. Hosting — Vercel
- Watch the function execution-time limit; narration is async/`after()` so it doesn't
  block requests. Secrets in Vercel env vars only. Prod/preview use separate Supabase
  projects and keys.

## 5–6. Question bank & curriculum recs — License from S.A.M. (PENDING G1)
- Blocks the real question-bank seed and curriculum-recommendation table population.
  Does NOT block engine, schema, report, consent, analytics, or UI work.
- Interim: build with clearly-fake placeholder content; never author "real-looking"
  Singapore Math items that could ship. Seed designed so licensed content loads via a
  single import. Raw question content never client-side; served one item at a time via
  API; access audit-logged; not used for LLM training.
- Curriculum recs stored as a DB table (data, not code); the report Recommendations
  section queries it and feeds the narration prompt.

## 7. Offline — No for v1
- Graceful degradation only: on connection loss, freeze politely, queue current response
  in memory, resume on reconnect; offer "save and continue later" past a threshold. No
  service worker / IndexedDB / offline question caching. Deferred to v2.

## 8. Paywall — No for v1
- Free pilot; sign-in gate but no payment. `subscription_tier` enum on Parent/Child set
  to `pilot` so tiers later are a data migration, not a schema one. Access gated by auth,
  not tier.

## 9. Email — Resend + React Email
- Templates in-repo, version-controlled. Sending wrapped in `emailClient.send()`.
  v1 emails: VPC signup verification, "report ready," password reset. VPC token logic
  (SHA-256 hashing, rate-limited resend) is custom; Resend is delivery only. Email events
  logged for the compliance audit trail.

## Cross-cutting guardrails (enforce on every feature)
1. `tenant_id` on every table (v1 = `inspirea_singapore_math`; v2 = real multi-tenancy).
2. Subject-agnostic schema — no math-specific column names/enums.
3. Misconception taxonomy stored as data, not code.
4. Curriculum recommendations stored as data, not code.
5. Themeable UI — branding from a config object; no hardcoded brand assets in components.
6. API responses scoped by `tenant_id` even with one tenant.
7. LLM calls behind an abstraction layer.
8. Email behind an abstraction layer.
9. Auth-user-ID indirection (no direct FKs to `auth.users`).
10. No raw question content client-side; served one at a time; audit-logged.

## Taxonomy (locked) — INTERNAL Atlas scheme, NOT S.A.M.-controlled
- This taxonomy is an **internal Atlas** model (the `tax_*` shape is locked as an
  engineering contract). It is **not licensed from, owned by, or approved by S.A.M./
  Sam Chia.** Sam's only curriculum signal is each worksheet's last-page table
  ("Concepts and Skills" + "Topic"); Code maps those onto these internal codes.
  Creating a new `content_id` / sub-strand node is an **internal job we finish**, never
  a "SAM-gated" decision. A NULL `content_id` = an unfinished internal tag, not an
  external dependency.
- `tax_strands` / `tax_sub_strands` / `tax_levels` / `tax_content` (`tax_` prefix LOCKED).
  3 strands / 12 sub-strands / 9 levels. `questions.content_id` = nullable FK into
  `tax_content`. `tax_levels.mvp` + `tax_content.mvp` carry the L1–4 MVP cut (read-time
  gating, not a separate dataset). Drift guards: `src/lib/taxonomy/seed.test.ts`,
  `src/lib/taxonomy/questions-bridge.test.ts` — keep green. 21 misconception codes in
  `supabase/seed.sql`; agents apply, do not author.

## v2 forward notes
- Possible Clerk migration for multi-tenant roles/SSO when school customers arrive (the
  `auth_user_id` indirection keeps it tractable). Multi-tenant optionality must not be
  foreclosed in v1.

## Open technical questions (not Cycle-1 blockers)
- Per-assessment LLM cost forecast at pilot volume.
- Audit-log storage location (same Supabase project vs. separate compliance-scoped DB).
- S.A.M. brand assets (final logos / exact hex / approved fonts) — placeholders today.
