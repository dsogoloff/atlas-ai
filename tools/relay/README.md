# Relay — Code ↔ Codex review hop

The relay lets the orchestrator (Claude Code) get an independent Codex review of a lane
diff and feed the findings back to the `codex-finding-resolver` agent. The orchestrator is
the only hub; Codex is a spoke. Summary-in / summary-out.

**Mode: manual.** Codex is not wired programmatically yet, so review is a copy-paste hop
driven by `manual_codex_review.ps1`. The automated transport (an MCP server + `.mcp.json`)
is **parked** until Codex reachability is confirmed — see `.agent/runs/NEXT_ACTIONS.md` §2.
There is intentionally no `.mcp.json` in the repo yet; adding one before the transport is
known would be guesswork.

## The loop

```
lane/* diff  ──bundle──►  request-*.md  ──paste──►  Codex
                                                      │
codex-finding-resolver  ◄──validate──  findings.json ◄┘
        │
        └─ applies accepted fixes, rejects gates, re-verifies
```

1. **Bundle** — from the lane branch:
   ```
   pwsh tools/relay/manual_codex_review.ps1
   ```
   Diffs the current branch against `ATLAS-ASSESSMENT`, runs the secret scrub, and writes a
   review-request file under `tools/relay/.reviews/` (gitignored).
2. **Review** — paste that file into Codex. It returns JSON per
   `../schemas/codex_review.schema.json` (an empty `findings` array is valid).
3. **Validate** — save the reply and check it:
   ```
   pwsh tools/relay/manual_codex_review.ps1 -FindingsFile tools/relay/.reviews/<reply>.json
   ```
   Structural validation against the schema + a severity summary. Malformed replies are
   rejected here, before the resolver runs.
4. **Resolve** — hand the validated findings + the lane diff to the `codex-finding-resolver`
   agent. It confirms each finding against the code, applies accepted fixes, and **rejects**
   anything that conflicts with `BUSINESS_RULES.md`, the voice-locked Step-4 narration
   prompt, or `ARCHITECTURE.md` locks (those are gates for Dimitri, not code fixes). Then it
   re-runs the verify bar.

## Safety (hard rules — see `.agent/runs/RUNBOOK.md` "Relay safety")

- **Local-only.** The relay must never carry secrets, child PII, or licensed S.A.M.
  question text off-box. Review payloads are diffs/code, not data dumps.
- The bundle step scans added lines for secret-shaped strings (API keys, service-role keys,
  private-key blocks, JWTs, `password=`/`secret=` literals) and **refuses** to write the
  bundle if any match. `-Force` overrides only if you have confirmed they are false
  positives. The scrub cannot detect licensed question text or PII — that is on you: never
  paste question content or child data into a review.
- If Codex is unreachable, this manual hop *is* the fallback; note the degraded mode in
  `CURRENT_STATE.md` and keep the lane moving.

## Files

| Path | What |
|------|------|
| `manual_codex_review.ps1` | Bundle + validate hop (PowerShell 5.1+). |
| `../schemas/codex_review.schema.json` | Findings contract the resolver consumes. |
| `.reviews/` | Local request/reply payloads. Gitignored — never committed. |
