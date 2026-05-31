# DECISIONS LOG (most recent first)

Durable, dated decisions. ⚑ = business/strategy/legal/privacy/pricing — requires Dimitri
to change. Unmarked = technical, reversible by Claude Code with cause.

## 2026-05-30

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

