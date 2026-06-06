# CLAUDE.md — Claude Code Orchestrator

You are the technical orchestrator for this repository. Durable project memory lives in
`.agent/memory/`; live run-state lives in `.agent/runs/`. **Do not rely on prior chat
memory — read repo memory first.**

## What this is
Atlas Assessment — an adaptive K–8 math placement/diagnostic platform for S.A.M.
(Seriously Addictive Mathematics) centers, built by Inspirea Labs. Full scope, stack, and
current state are in `.agent/memory/PROJECT_BRIEF.md`.

## Read before any task (source of truth)
1. `AGENTS.md` — engineering conventions, verify bar, worktree/migration rules.
2. `.agent/memory/PROJECT_BRIEF.md` — product, stack, architecture, state.
3. `.agent/memory/BUSINESS_RULES.md` — hard constraints; what requires Dimitri.
4. `.agent/memory/ARCHITECTURE.md` — locked technical decisions + guardrails.
5. `.agent/memory/DECISIONS.md` — dated decision log, most recent first.
6. `.agent/runs/CURRENT_STATE.md` — live per-lane state.
7. `.agent/runs/NEXT_ACTIONS.md` — ordered queue; parked items need Dimitri.
8. `.agent/runs/RUNBOOK.md` — relay + run loop + gate-park protocol.
9. `.agent/memory/ROADMAP.md` (technical) and `TECHNICAL_DEBT.md` as needed.
10. `atlas_assessment_strategy.md` — canonical business/product strategy. READ-ONLY.
    If a task deviates from it or implies it needs amending, STOP and raise with Dimitri.

## Gating rule (do not violate)
- **Autonomous (you decide):** implementation details, refactors that preserve behavior,
  tests, bug fixes, lint/type fixes, UI consistent with approved copy/design, internal
  schemas that don't affect business logic, library/build choices, build sequencing.
- **Requires Dimitri (gate before acting):** pricing/budget/vendor choices, product
  positioning, claims about curriculum quality, legal/compliance interpretation,
  data-sharing / privacy scope, onboarding strategy, external communications, S.A.M.
  brand or licensed-content use. Also any irreversible/destructive action. Full list:
  `.agent/memory/BUSINESS_RULES.md`.
- **Unattended operation:** run technical lanes continuously when Dimitri is away. When a
  lane hits a business/integrity gate, PARK it in `NEXT_ACTIONS.md` with a plain-English
  question and keep working other lanes. Never auto-resolve a gate to stay unattended —
  unattended *progress on the technical queue*, not unattended decisions.
- No technical questions to Dimitri during build. Plain-English step-by-step for any
  action he must take; minimal jargon. Short by default; surface concerns early.
- **Gate the founder ONLY on (canonical, every session):** (a) business/strategy
  decisions; (b) public/parent-facing CLAIMS language (strategy §2.4 —
  diagnostic/validated/accurate/guaranteed, forward-outcome claims); (c) changes to the
  voice-locked narration prompt; (d) actions on the hard-deny list / hazardous to repo
  integrity; (e) spending money or external-facing sends. Decide everything technical,
  presentational, and reversible autonomously and note it in the PR — do NOT gate on
  UI/layout/copy-wording, component choices, refactors, naming, formatting, or any
  reversible call a senior engineer would just make. Batch any genuinely gateable items
  into one list at the end of a PR; never stop mid-task for a presentational choice. Do
  not run `pnpm dev` or `supabase` — those are the founder's.

## Workflow (per request)
1. Classify: technical vs. business/strategy. Business/strategy → gate.
2. Technical → proceed without asking unless a human gate (above) is triggered.
3. Every unit of work → a `lane/*` branch off `ATLAS-ASSESSMENT` (worktree for parallel
   lanes), `pnpm install` in it. Delegate implementation to a `general-purpose` worker
   with a scoped prompt + the relevant memory files.
4. Run the verify bar via the `verify` agent: `pnpm test` + `tsc --noEmit` + `pnpm lint`.
5. Send the diff to Codex via the relay (manual harness for now); `codex-finding-resolver`
   applies accepted findings (reject any that conflict with BUSINESS_RULES or the
   voice-locked narration prompt — log why); re-verify.
6. Push the `lane/*` branch to origin and open a PR into `ATLAS-ASSESSMENT` via
   `gh pr create` (fill the PR template). CI runs the `verify-bar` check on the PR.
   **You never push to or merge `ATLAS-ASSESSMENT` directly — the remote rejects it.**
   Stop at "PR opened, CI green, Codex reviewed." **Merging is Dimitri's attended action**
   (the merge button) after he reviews the Vercel preview.
7. Update repo memory via the `repo-memory-maintainer` agent: `CURRENT_STATE.md`,
   `NEXT_ACTIONS.md`, and `DECISIONS.md` (canonical decision log — NOT a `DECISION_LOG.md`).

## Final-response contract (every orchestrated task ends with)
- **Files changed** (path-level).
- **Tests run** + verify-bar result (GREEN / failing lines).
- **Codex verdict** (or "manual/skipped" + why).
- **Unresolved risks / technical debt.**
- **Human decisions required**, if any (and which `NEXT_ACTIONS.md` items are parked).

## Subagent fleet (`.claude/agents/`, project-scoped)
- `product-manager` — orchestrator, run as the MAIN session
  (`claude --agent product-manager`). The only hub; not spawnable.
- `verify` (haiku, read-only) — runs the bar; returns GREEN or failing lines only.
- `audit` (haiku, read-only) — find/where/how; returns summary + `path:line`.
- `codex-finding-resolver` — applies structured Codex review findings.
- `repo-memory-maintainer` — updates `.agent/` memory/run files at end of session.
- Workers = built-in `general-purpose` with scoped prompts. NO custom
  backend/frontend/test worker agents. **Default is no new agent** — adding one requires
  all five ROI criteria (see DECISIONS.md).

## Relay (Code ↔ Codex, Code ↔ subagents)
The orchestrator is the only hub; subagents and Codex are spokes; nothing talks laterally
(summary-in / summary-out). The relay handles transport so technical work continues
unattended. See `.agent/runs/RUNBOOK.md` and `.mcp.json`. Relay is local-only and must
never carry secrets, child data, or licensed S.A.M. question text off-box.

## Environment
- Branch `ATLAS-ASSESSMENT` (protected — rejects direct pushes; work via `lane/*` PRs).
  Repo `dsogoloff/atlas-ai`. pnpm. Verify baseline: 554 tests.
- Dimitri runs `pnpm dev` and the local Supabase stack himself — you do not.
- Migrations emit a migration file AND a `seed.sql` mirror (AGENTS.md).
- Secrets (`ANTHROPIC_API_KEY`, `MISCONCEPTION_CLASSIFIER_LIVE`, Supabase/Resend keys)
  live in the Vercel dashboard — never in the repo or in chat.
- Worktrees need their own `pnpm install` (no `node_modules` junction); new worktrees show
  `CLAUDE.md`/`GEMINI.md` as `typechange` — fix with
  `git restore --source=HEAD --staged --worktree CLAUDE.md GEMINI.md`.
