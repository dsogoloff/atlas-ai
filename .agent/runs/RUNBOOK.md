# RUNBOOK — Orchestration & Relay

How Claude Code runs technical work, attended or unattended. Operational detail of the
relay transport lives with the relay code (`tools/relay/`) and `.mcp.json`; this is the
operating protocol.

## Roles
- **Orchestrator** = the main Claude Code session, run as `claude --agent product-manager`.
  The ONLY hub. Plans lanes, delegates, brokers Codex review, reconciles, commits.
- **Workers** = built-in `general-purpose`, given scoped lane prompts. Do the file-modifying
  work. No custom worker agents.
- **verify** (haiku, read-only) — runs the bar; returns GREEN or failing lines.
- **audit** (haiku, read-only) — find/where/how; returns summary + `path:line`.
- **codex-finding-resolver** — takes structured Codex findings and applies fixes.
- **Codex** = external reviewer reached via the relay. Reviews diffs; returns findings as
  JSON conforming to `tools/schemas/codex_review.schema.json`.

Topology: orchestrator ↔ each spoke only. Subagents and Codex never talk to each other.
Summary-in / summary-out — raw output stays in the spoke's context.

## The run loop (per lane)
1. Orchestrator picks the next item from `NEXT_ACTIONS.md`.
2. If the item touches a BUSINESS/INTEGRITY gate (see BUSINESS_RULES.md) → park it
   (see "Gate-park protocol") and pick another lane.
3. Independent file-modifying lane → create a git worktree + branch off `ATLAS-ASSESSMENT`;
   `pnpm install` in it.
4. Delegate the lane to a `general-purpose` worker with a scoped prompt + the relevant
   memory files as context.
5. `verify` runs the bar. Not green → fix → re-verify.
6. Send the diff to **Codex** via the relay for review.
7. `codex-finding-resolver` applies accepted findings; re-verify. (Reject findings that
   conflict with BUSINESS_RULES or the voice-locked narration prompt — log why.)
8. Push the `lane/*` branch to origin and open a PR targeting `ATLAS-ASSESSMENT` via
   `gh pr create`. The PR template (`.github/pull_request_template.md`) auto-populates
   the description with VISIBLE CHANGE / PREVIEW / verify-bar / Codex / Dimitri-decides
   sections. CI (`verify-bar` job in `.github/workflows/verify.yml`) runs the bar
   automatically. Codex review remains a **manual** harness for now (relay not wired) —
   note in the PR when skipped. **STOP here.** Merging into `ATLAS-ASSESSMENT` is
   Dimitri's attended action via the GitHub merge button after he reviews the Vercel
   preview. Direct push or merge to `ATLAS-ASSESSMENT` is impossible — the branch is
   protected on origin and rejects direct pushes.
9. Update `CURRENT_STATE.md` (what changed, PR status, current origin head) and
   `NEXT_ACTIONS.md` (tick item once Dimitri merges).
10. Append any new durable decision to `DECISIONS.md`; new debt to `TECHNICAL_DEBT.md`.

## Gate-park protocol (the core of unattended operation)
When a lane needs a decision Dimitri owns:
- STOP that lane. Do NOT guess, default, or auto-resolve to keep running.
- In `NEXT_ACTIONS.md`, mark the item **PARKED — needs Dimitri**, with a one-line,
  plain-English question and any options.
- Continue other, ungated lanes.
- On Dimitri's answer, record it in `DECISIONS.md`, unpark, resume.

Integrity hazards (data loss, consent semantics, irreversible deletes, anything that could
corrupt the repo or leak child data) are treated as gates too — park, don't proceed.

## Commit discipline
- Verify bar green before every commit (baseline 554 tests). Conventional-ish messages.
- Migrations: file + `seed.sql` mirror (AGENTS.md). One lane = one branch = one PR
  (Dimitri merges attended).
- Never commit secrets. Never commit `input/`/`output/` of the conversion pipeline
  (gitignored); `conversion.log` is tracked.

## Relay safety (hard rules)
- Local-only. The relay must not carry secrets, child PII, or licensed S.A.M. question
  text off-box. Codex review payloads = diffs/code, not data dumps; do not paste licensed
  question content or child data into a review.
- If the relay or Codex is unreachable, fall back to manual review
  (`tools/relay/manual_codex_review.ps1`) and keep the loop going; note the degraded mode
  in `CURRENT_STATE.md`.

## Unconfirmed (needs Dimitri / setup detail)
- Whether Codex is reachable programmatically (automated relay) or review is a manual
  copy-paste hop for now (hence `manual_codex_review.ps1`). Confirm before relying on
  step 6 running unattended.
- Exact relay transport / `.mcp.json` contents — finalized when the relay is built (treat
  the relay as a normal build lane with the verify bar, not a memory artifact).
