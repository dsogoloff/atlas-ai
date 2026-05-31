# PROJECT BRIEF — Atlas Assessment

## Product

Atlas Assessment is a B2B2C adaptive math placement/diagnostic platform for S.A.M
(Seriously Addictive Mathematics) centers, built by Inspirea Labs. Families are users
and beneficiaries; **centers are the paying customer**; the franchisor is an approval
gate, not necessarily the buyer. Families never pay Atlas directly.



Two-test funnel:

* **Short test** — free, \~10–15 min, top-of-funnel acquisition + misconception-data
capture; routes opt-in families to nearby centers.
* **Comprehensive test** — deeper, center-bound, embedded in center tuition; supports
placement, instructor insight, parent reporting, retention. It is a **longer
parameterization of the same adaptive engine** (raise item cap / loosen confidence
stop), NOT a separate fixed blueprint. License-gated on the real question bank.

Out of scope for this repo: CLEAR AI-literacy curriculum, school-district / FERPA
channels, any non-math product. (CLEAR is a separate Inspirea Labs product.)

## Stack

Next.js 16 + TypeScript (App Router), Tailwind. Supabase (Auth / Postgres / Storage,
RLS enforced). Vercel hosting. Resend for transactional email. Anthropic via direct
`@ai-sdk/anthropic` (the Vercel AI Gateway path was removed) — Haiku for misconception
classification, Sonnet for report narration. pnpm. Repo `dsogoloff/atlas-ai`, branch
`ATLAS-ASSESSMENT`. Verify bar: `pnpm test` + `tsc --noEmit` + lint; baseline 547 tests.
Brand: navy `#1B3A6B`, cyan `#00B8D4`, Playfair Display + DM Sans.

## Architecture (summary — full detail in ARCHITECTURE.md)

* Adaptive engine: IRT/Bayesian core + LLM-assisted, misconception-aware routing;
confidence-aware placement. Current engine: 25-item cap, confidence stop.
* Misconception classifier: Anthropic Haiku, **structured input only**
(`{format, strand, content, answerGiven, isCorrect}`) — child never sends free text to
the model; processing is server-side, post-submit; fail-soft on error.
* Report narration: Anthropic Sonnet. **The Step 4 narration prompt is voice-locked** —
do not re-open casually. Report content shape: `src/lib/report/types.ts`
(`ReportContent`, `ReportNarration`).
* Taxonomy: 3-strand / 12-sub-strand V2026 model in `tax\_\*` tables (`tax\_strands`,
`tax\_sub\_strands`, `tax\_levels`, `tax\_content`); `tax\_` prefix locked.
* Consent: per-child (COPPA Model B), captured at `/add-child`, server-side gate keyed
to `child\_id`, checked at session start and response submit, fails closed.
* Analytics: fail-soft, PII-free event store; events emitted via `after()` off the
response path.

## Current state (as of 2026-05-29 handover, pre-repo-migration)

* **Report**: editorial reskin merged (commit `204166b`) but has OPEN rendering/narration
bugs — immediate next technical work. See CURRENT\_STATE.md / NEXT\_ACTIONS.md:
page `<title>` still says "Diagnostic Excellence"; placement bar unstyled; narration
fabricates strand findings when strand data is absent; radar + sub-strand list missing
on the degraded/"unreliable" branch.
* **M2 lanes merged** to `ATLAS-ASSESSMENT`: per-child consent + server-side gate +
classifier-live (in code); instructor portal to pilot grade; analytics event store +
funnel instrumentation + parent satisfaction.
* **Classifier**: live in code; production flip needs Vercel env
(`MISCONCEPTION\_CLASSIFIER\_LIVE=true`, `ANTHROPIC\_API\_KEY`).
* **CONVERSION pipeline** (sibling): 5-stage CLI in `scripts/conversion/`; Stages 1–3
built/verified; Stage 4 (DB load, \~130-item L1–4 MVP cut) single-gated on S.A.M.
licensing.
* **Unconfirmed:** that the analytics merge pushed to origin — confirm via
`git log origin/ATLAS-ASSESSMENT -1 --oneline` and record the head in CURRENT\_STATE.md.

## Milestone position (definitions in atlas\_assessment\_strategy.md)

M0 done. M1 (licensed content + franchisor pilot approval) in flight — hard gate.
M1.5 (calibration / diagnostic validity) runs alongside the pilot under conservative
language. M2 (UWS comprehensive pilot) is the active build.

## External gates (business — see BUSINESS\_RULES.md)

* **G1** — S.A.M. content license (\~2026-06-02, Sam Chia). Unblocks the real question bank.
* **G2** — Franchisor pilot approval. SEPARATE from the content license. *Unconfirmed
whether it routes through Sam or the franchisor — needs Dimitri confirmation.*
* **G3** — Consent-flow legal review by counsel before real families.
* **G4** — Anthropic serving under-13 users: RESOLVED (product is the Anthropic customer;
child never interacts with the model directly; safeguards implemented).

