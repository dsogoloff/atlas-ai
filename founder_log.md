# Founder Log

Session-level reflection on building Atlas Assessment. The canonical record of *what* lives in the spec docs (`features.md`, `compliance.md`, `architecture.md`) and the agent rules live in `AGENTS.md`. This log captures *how the work felt* and *what was learned about the process itself* — material that doesn't fit anywhere else and fades fast if not written down.

Entries are appended chronologically. Newest at the bottom. No required structure; the value is in the writing, not the format.

---

## 2026-05-07 — Items #1 and #2 complete (timeFlagging + response-submit API)

First two end-to-end passes through the multi-agent pipeline + external review gate. Both items shipped clean PRs. Items remaining for MVP are still substantial, but the foundation pieces (schema, engine, time-flagging library, submit API) are now real and integration-tested.

### The pattern that worked

Code proposes → I review the file diff in chat → external Claude (separate session) sanity-checks → I paste back → Code implements with file-by-file approval. Always option 1 (Yes) or option 3 (No) on Code's prompts. Never option 2 (allow-all-edits-during-session) — that shortcut would have skipped every gate the review caught.

The friction of mechanical copy-paste between Code and external Claude is doing real work. It's tempting to want to automate the bridge, but the framing distance is part of why the review catches things. Reviewing a diff Code presents to *you* is a different cognitive act than reviewing the same diff via an automation. Don't optimize this away before MVP.

### What the gate actually caught

Across Items #1 and #2, the external review prevented at least these from shipping silently:

- **avgTimeMs Phase-2 leak** (#1) — Code initially included a field that belonged to a future fluency-scoring feature, not v1 flagging.
- **usedFallback persistence gap** (#1) — first migration draft would have made fallback telemetry always read 0 in production. Caught before the migration sealed.
- **Silent-reading multiplier missing** (#1) — original norm table used oral WCPM directly; would have systematically over-estimated reading time for word problems.
- **Upper-grade curve double-counting with IRT** (#1) — first norm table had per-operation seconds rising at higher grades, which would have double-counted with the IRT difficulty parameter.
- **Sam-placement parallel codebase divergence** (mid-#1) — discovered hours into the work that Code was conflating two different codebases. The recovery cost was real; the lesson was to verify `git remote -v` and the canonical baseline at session start.
- **Supabase select-string typing failure** (#2) — Code tried to silently fix a TS2339 error by collapsing a concatenated select string. Pushback caught the silent-fix; the actual lesson (Supabase's `.select()` is generic over string literal types and breaks on concatenation) is now captured as a comment in `handler.ts` for the next contributor.
- **Dual-role RLS bypass** (#2) — Code initially proposed deferring an authorization bypass with "vanishingly rare" framing. The fix was small (one query, one Set lookup); the deferral would have shipped a documented hole in the access model that the rest of the architecture assumes is enforced.

Without the external review, at least three of these would have shipped. The compounding effect over many items would be substantial.

### Failure modes of the gate worth watching

Two patterns showed up in both items:

**(a) Code proposes fixes without showing the failure first.** Both Item #2 instances of this — the select-string fix and the test-environment server-only resolution — followed the same shape: error encountered, fix designed around it, fix presented as the response with no failure context. AGENTS.md §11 now has a rule capturing this ("Always paste failure output before proposing a fix"). Watch for whether the rule actually changes behavior in Item #3.

**(b) Code's risk classification on access-control skews toward "vanishingly rare."** The dual-role bypass push happened twice in different framings before being closed. Don't accept "we'll catch it if it happens" framing on auth or compliance-shaped questions in v1. The asymmetry matters: if it's rare, the fix is free; if it isn't rare, deferral is wrong.

Both of these are *agent behaviors*, not *technical problems*. The right response is reviewer discipline (push back consistently), not technical fixes. Adding rules to AGENTS.md helps but doesn't eliminate the need to actively watch for these patterns.

### Technical lessons worth holding onto

- **Supabase `.select()` typing.** The argument must be a single string literal — template-literal type inference parses it at compile time. String concatenation produces opaque `GenericStringError` types on every column access. Comment in `src/lib/responseSubmit/handler.ts` flags this for next contributor.
- **vitest doesn't honor the `react-server` export condition.** `server-only` package needs an alias stub (`vitest.shims/server-only.ts`), not the real package, for tests to resolve. Setting the global condition would have side effects on future React component tests.
- **NOT NULL with transient defaults during ALTER, then drop the default.** This pattern (Migration A1, B) lets schema changes apply cleanly to existing rows AND forces future inserts to supply values explicitly. The whole point is "don't silently default the telemetry away."
- **Replay over persist for engine state.** Pure functional engine + small response counts (≤25 per session) means re-deriving state from responses on every request is cheaper than maintaining a separate `engine_state` column. Document the threshold for reconsideration (Item #2's `replay.ts` does this).

### What this proved about the approach

The pattern works across different work shapes. Item #1 was library + schema + tests + docs (foundation work, mostly internal). Item #2 was API + integration + tests + auth (integration work, lots of cross-system reasoning). Both shipped clean under the same gate discipline.

That's two data points, not a proven general rule. But it's enough confidence to default forward into Item #3 with the same approach, no shortcuts even if the work feels routine.

### Default forward for Item #3

Same gate discipline. Don't accept silent fixes. Don't accept access-control deferrals. Verify `git remote -v` at session start. Don't lift from sam-placement without flagging it explicitly. AGENTS.md §11 is the canonical record of session-by-session corrections; new corrections go there, one line, concrete.

The next item is `/api/assess/start`, which depends on the question-picker design conversation that's been deferred. That conversation should be its own planning round, not folded silently into start's implementation.

---

*(Subsequent entries below)*
