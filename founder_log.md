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
### 2026-05-08 — Items #3, #5, and #5a complete (session-start API + child UI + contract fix)

Three more items shipped. The backend is now complete end-to-end (start → submit loop works against canonical seed data) and the child-facing UI consumes it. A child sitting at /assessment?child_id=... can take a real assessment session today against the placeholder questions; what's missing is the parent-facing diagnostic report (Item #8), real S.A.M. content (Item #11, blocked on Sam Chia), and the 5-8 chrome variant (Item #6).

#### Items shipped

**Item #3 — session-start API route + Layer 1.5 deterministic question picker.** New `POST /api/assess/start`, new picker module that turns the engine's target band into a chosen question, audit logging at every serve per compliance §8, and submit augmentation to return `next_question` in the response body. Partial unique index on `assessment_sessions(child_id) WHERE status='IN_PROGRESS'` enforces at-most-one-open-session-per-child and supports race-safe insert. Resume-on-409 path with strict outstanding-question detection (handles interleaved cases). First-pick exhaustion rolls back the orphaned session. Idempotent retry on submit uses Option A (outstanding-wins, no duplicate audit row).

**Item #5 — child-facing assessment UI (K-4 chrome).** Full session loop in `src/app/(child)/assessment/`. Server component does auth + child fetch + RSC boundary; client orchestrator owns FSM via useReducer; presentational components for the three formats (MULTIPLE_CHOICE, NUMERIC_ENTRY, DRAG_DROP); ResumeBanner on 409, CompletionScreen on terminal, ErrorPanel with discriminated reason. Time tracking lives in QuestionTimer (per-question key remount + `useState(() => Date.now())` initializer) — kept inside React 19 compiler-lint purity rules without any `eslint-disable`. framer-motion 12 added for K-4 polish; dropped from DragDropInput due to a type conflict with HTML5 DnD.

**Item #5a — correctness.ts contract fix.** Discovered mid-Item-#5 while reading for DRAG_DROP wire format. Five layers (seed, serializer, allowlist comment, types, fixtures) used per-format keys for the correct answer (`correct_index` for MC, `correct_answer` for NE, `correct_order` for DD); judge code in `correctness.ts` read `content.correct_answer` for everything and threw on missing. Production effect: every real `/submit` POST against MULTIPLE_CHOICE or DRAG_DROP seed rows would have 500'd. Tests passed only because every fixture rewrote content. Fixed by dispatching `judgeAnswer` per format. Preserves schema information density.

#### What the gate caught

Three discoveries this session that wouldn't have surfaced without external review:

- **Fabricated strand names in test fixtures.** Code wrote `NUMBER_OPERATIONS` and `ALGEBRAIC_THINKING` in fixture data instead of reading the real enum from `database.types.ts`. Typecheck caught it; the meta-issue (reasoning from surrounding context instead of the source of truth) is now an AGENTS.md §11 rule.
- **The correctness.ts ↔ seed contract mismatch.** Found during Item #5 design while reading the wire format for DRAG_DROP. Code surfaced it explicitly and paused — exactly the right move. Without that pause, Item #5 would have shipped a UI that 500'd against two of three formats in production.
- **Dual-role RLS bypass on /start.** Same shape as the bug Item #2 closed for /submit. Code initially proposed deferring with "vanishingly rare" framing again. Push back closed it. The pattern (Code skewing toward "we'll catch it if it happens" on access-control questions) repeats; reviewer discipline is the only thing that catches it.

#### Failure modes of the gate that showed up again

The "paste failure output before proposing a fix" rule from Item #2 fired three times this session:

- Item #5a discovery — Code initially proposed the fix without showing the typecheck failure verbatim. After push back, the failure was pasted and the diagnosis was confirmable.
- React 19 compiler-lint failure on `Date.now()` in render — Code's first framing ("modify Layer 1 reducer to accept timestamps") was wrong. The real fix was structural: restructure the component tree, not extend the reducer. Reviewer push back caught it.
- pnpm install failure on workspace flag — Code investigated the error and surfaced it cleanly. No regression on the rule.

The rule is doing real work. Adding it to AGENTS.md §11 changed agent behavior across this session, but didn't eliminate the underlying tendency (skipping the failure, jumping to the fix) on the harder cases. Reviewer vigilance still required.

#### Technical lessons worth holding onto

- **React 19 compiler lints are real and strict.** `react-hooks/refs`, `react-hooks/purity`, `react-hooks/set-state-in-effect`, and `react-hooks/static-components` are all in `eslint-plugin-react-hooks@7.1.1` recommended (not behind any opt-in). The traditional patterns for "track previous question id via ref + reset state via useEffect + capture wall-clock via Date.now() in handler" are all blocked. The fix is structural: per-instance components with key-reset, useState initializers (which run at mount, not render — allowed), and event handlers in focused leaf components. Layer 1 reducer never had to change.
- **Supabase + framer-motion + HTML5 DnD don't compose.** `motion.li`'s drag-gesture event types conflict with React's `DragEvent<HTMLLIElement>`. There's no clean workaround; one of the two has to go. We dropped framer-motion from DragDrop and snapped on reorder.
- **`pnpm add <pkg>` fails on workspace-rooted projects without a packages field.** Use `pnpm add -w <pkg>` to bypass the recursive resolver. Captured in AGENTS.md §11.
- **Question-counter UI was a ref violation by construction.** Without an engine-supplied denominator the count was semantically empty anyway. Engine-driven termination (confidence threshold, max-questions, bank-exhausted) means the child doesn't know how many questions remain — that's by design. Don't surface a count without a denominator.
- **`useState(() => Date.now())` initializer pattern.** Initializers run at mount, not render. This is the lint-clean way to capture wall-clock time in a React 19 component.

#### What this proved about the approach

Three more items, three more clean PRs. Five total now (Items #1, #2, #3, #5, #5a). Different shapes each time — library + schema, API integration, API + UI orchestration, full-stack UI build, contract surgery. The same gate discipline worked in all five.

The "external review catches things internal review misses" claim is now well-established. Best estimate: at least one substantive bug (auth bypass, contract mismatch, silent fix) caught per PR. Without external review, those would compound across items into a system that mostly works but fails subtly under real conditions.

#### Default forward for Item #6 (or whatever comes next)

Same gate discipline. Don't accept silent fixes. Don't accept access-control deferrals. Don't accept fabricated values in fixtures. AGENTS.md §11 has three rules now; if a fourth is needed, write it concretely.

Item #6 (5-8 chrome + tier derivation in page.tsx) is the natural next code item. Item #7 (parent dashboard) and Item #8 (diagnostic report UI) are also plausible, depending on whether the priority is full coverage of the 5-8 audience or visible parent-side progress. Item #11 (content tagging) is non-code and gates real content; worth pushing on Sam Chia conversation in parallel.

#### Status updates

Items #1, #2, #3, #5, #5a complete. Tests: 225/225 passing across the repo. The backend can serve a complete assessment session against placeholder content; a child can complete one end-to-end via the new UI. What's missing for MVP is the parent-facing report (#8), real content (#11), and the 5-8 chrome variant (#6) — plus the still-deferred cold-start engine priors fix (#10) which becomes MVP-blocking the moment real content lands.

 2026-05-08 — Item #6 complete (5-8 tier-aware chrome + tier derivation)

  Item #6 shipped clean. The 5-8 chrome variant exists, K-4 is unchanged from PR #6 baseline, and tier derivation is a
  pure function with a calendar trip-wire. The implementation itself was uncomplicated; what consumed the session was
  the visual verification detour — bringing local Supabase up on a fresh-clone laptop turned into a chain of infra
  installs (Docker, Scoop, Supabase CLI, WSL2) before a single rendered pixel could be confirmed.

  Item #6 — what shipped

  Five-phase sequence, executed in order with verification at each gate:

  1. Pure tier lib. src/lib/tier/derive.ts exports deriveTier(child) returning K_4 | G5_8. Primary path: parseGradeLevel
   covers the half_grade_level enum, bare digits ("3", "5"), ordinals ("3rd", "5th"), word forms ("third", "fifth"),
  Pre-K variants. Fallback: tierFromBirthYear with boundary at age 10 → G5_8, computed against hardcoded
  CURRENT_ACADEMIC_YEAR_START = 2025. Hardcoding (vs. new Date()) keeps derivation pure for tests; a trip-wire test
  fails when the constant drifts past the active academic year. 20 new tests in derive.test.ts.
  2. Tier-aware chrome variants. QuestionShell (logo-only TopAppBar, sam-teal/orange decorative blurs, yellow underline
  preserved on prompt for both tiers), MultipleChoiceInput (aspect-square cards, ring-radio dot bottom-right,
  font-math-numeral on numerics, border-4 on selection), CompletionScreen ("Mathematical Journey Complete!",
  workspace_premium icon, sam-teal accent, no Sammy mascot), QuestionTimer (forwards tier prop to MC).
  3. Wiring. page.tsx fetches name, grade_level, birth_year (RLS-scoped) and calls deriveTier before rendering.
  AssessmentClient takes a required tier: Tier prop and forwards to all three chrome callsites.
  4. AGENTS.md cleanup. Four stale TODOs flipped (test scripts, tests location, testing pattern) now that vitest is
  wired and 245 tests are co-located under src/.
  5. Verification. 245/245 passing. Visual verification deferred to its own detour (below).

  Gate decisions confirmed before implementation, in this order: 2-tier enum (K_4 | G5_8, no third bucket); Pre-K → K_4
  (no special handling); ship without Sammy mascot (icon-only completion screen); brand palette only, no MD3 system
  tokens lifted from stitch; keep yellow underline on prompt for both tiers; defer numeric on-screen keypad (system
  numpad adequate for Chromebooks); defer two-card comparison layout (route through existing MC pipeline with ["<", "=",
   ">"] options).

  The visual verification detour

  The visual check was supposed to be five minutes. It took most of the session.

  The wrong port. Founder testing on localhost:3000 was actually sam-placement — the parallel design-reference repo from
   Item #1's recovery — running on its own dev server. atlas-ai was on :3001. Every "how does the chrome look?" cycle
  for the first stretch was reading screens from the wrong codebase. Lesson reinforced from Item #1: when two codebases
  co-exist on disk, port confusion is silent and expensive. Worth a tmux/PowerShell-startup banner that prints the repo
  name on pnpm dev.

  Missing .env.local. Atlas-ai then refused to boot — fresh-clone gap, never populated, validated lazily, all four CI
  gates passed because no code path exercised the env. The repo will silently install + build + lint + typecheck + run
  all tests against a non-existent Supabase URL. Worth a pnpm dev preflight that errors loudly on missing .env.local
  keys.

  Local vs. remote Supabase. Atlas-assessment-2 (the remote project) had unverifiable schema drift risk — no clean way
  to confirm migrations had been applied against it. Founder chose local Supabase, which forced the install chain.

  Install chain. Docker Desktop via winget, Supabase CLI via Scoop (winget doesn't carry it), WSL2 via wsl --install +
  reboot. Each was a discrete decision point with founder approval. None individually large; the cumulative wall-clock
  was the cost.

  Schema config drift. supabase/config.toml had [db].major_version = 16, which Supabase CLI 2.98.2 has dropped from the
  local-dev allowlist. Bumped to 17 (matches hosted default). One-line fix; landed in the side-quest commit.

  No working /add-child form. Two test children inserted directly via Supabase Studio because the /add-child route
  renders but doesn't submit — header in page.tsx self-documents this as cycle-1 deferred. Manual SQL inserts were
  faster than wiring the form for the visual check, but the gap is now confirmed.

  Final visual confirmation. K-4 chrome (rectangular cards, "All done, [name]!" completion) and G5_8 chrome
  (aspect-square cards with ring-radio dot bottom-right, "S.A.M. Assessment" logo top bar, "Mathematical Journey
  Complete!" completion) confirmed visually distinct on rendered pages. The chrome variant works as designed.

  Side-quest fixes (separate commit)

  Two infra-only fixes surfaced during the visual detour, landed as c4f13b1:

  - Material Symbols <link> move. @import url(...) in globals.css was being stripped by Tailwind v4 / Lightning CSS
  during bundling — icons rendered as raw ligature names ("person", "arrow_forward", etc.). Moved to <link
  rel="stylesheet"> in layout.tsx <head> with the canonical four-axis URL (opsz, wght, FILL, GRAD). Removed the dead
  @import from globals.css.
  - Postgres 16 → 17. Supabase CLI 2.98.2 dropped 16 from the local-dev allowlist. Bumped supabase/config.toml to 17.

  Surfaced while bringing up local Supabase. Both fixes are infrastructure-only; no application logic touched. Committed
   separately so Item #6's diff stays focused on chrome + tier.

  Pre-existing issues surfaced (not fixed, tracked for future items)

  The visual detour surfaced a punch list of cycle-1 gaps. None are Item #6's responsibility; logging here so they don't
   fade:

  - /add-child form: no submit handler, no validation, no Supabase wiring. Header self-documents as deferred.
  - No signup link from landing page.
  - Marketing landing's "Start Assessment" button is a plain <button> with no onClick or href — placeholder.
  - K-4 hamburger top bar is an empty icon shell, no menu.
  - Material Symbols rendering: side-quest fix covered the assessment route; signup / add-child / COPPA / confirmation
  flows need a spot check — ligature-name leakage may still appear there.
  - Results page: no nav back home, no "assess another child" CTA.
  - Reports: shows only 4 answers (not the full session), missing prior radar-chart parameters, no S.A.M. placement
  output (4A, 2B), no grade-equivalent indicator.

  Item #8 (parent-facing diagnostic report) absorbs the reports-page items. The rest are smaller, more obviously cycle-1
   holdovers.

  Failure modes of the gate this session

  The gate was light this session — Item #6 is mostly UI lift from stitch/module-c against a clean engine boundary, not
  the integration-heavy work of #2/#3. Two things still showed up worth noting:

  - The wrong-port discovery. Not a Code failure; a session-hygiene failure on the founder side. But it's the second
  time the sam-placement parallel codebase has caused real lost time (first was Item #1's recovery). The right response
  is a pnpm dev startup banner that prints the repo name, not just adding to the rule-pile in AGENTS.md §11.
  - Lazy env validation. .env.local missing → all four gates pass → pnpm dev fails. The CI gate isn't catching real
  fresh-clone breakage. Worth deciding: do we want the env loader to throw at module-load (eager), or accept that
  .env.local validation is a pnpm dev concern? Either is defensible; the current state (silent acceptance everywhere)
  isn't.

  Technical lessons worth holding onto

  - Pure derivation > time-aware derivation. CURRENT_ACADEMIC_YEAR_START as a hardcoded constant + a trip-wire test is
  cleaner than reading new Date() and mocking it in tests. The trip-wire pattern (a test that fails on the right date)
  is reusable for any constant that should age out.
  - Tailwind v4 / Lightning CSS strips @import url(...). Remote stylesheet imports inside CSS files don't survive
  bundling. Use <link> in the document <head> for fonts and external stylesheets. This isn't documented loudly in the v4
   migration guide but is consistent across testing.
  - Supabase CLI version drift. major_version in config.toml needs to match what the CLI's local-dev image supports, not
   what the hosted project supports. Both happen to be 17 right now; that's coincidence, not a contract.
  - Tier as a UI-only switching point. FSM, engine, picker, and API stayed tier-blind. Threading tier: Tier from
  page.tsx through AssessmentClient to the four chrome components was the entire surface area. Resisted the temptation
  to pass tier into the engine "for future use" — exactly the kind of speculative wiring AGENTS.md §2 rules out.

  What this proved about the approach

  Six items shipped now (#1, #2, #3, #5, #5a, #6). The gate worked even on a low-technical-risk item — the catches this
  time were process-shaped (port confusion, missing env validation), not bug-shaped.

  The detour reinforced that the bootstrap path is undertested: four CI gates that don't exercise the env loader, an
  /add-child form that renders without submitting, a landing CTA that looks live but isn't. Worth a dedicated
  bootstrap-audit pass before the first stakeholder demo.

  Default forward for Item #7 / #8

  Item #7 (parent dashboard) and Item #8 (diagnostic report UI) are next. #8 absorbs the reports-page punch list above
  (4-answers truncation, missing radar params, no placement output, no grade-equivalent).

  Same gate discipline. Don't accept silent fixes, access-control deferrals, or fabricated values. New rule worth
  considering for AGENTS.md §11: verify the dev server is running against the right repo before reporting visual results
   — concretely, paste the URL bar + repo path, not just "looks good."

  Status updates

  Items #1, #2, #3, #5, #5a, #6 complete. Tests: 245/245 passing. The backend serves complete sessions against
  placeholder content; a K-4 child and a 5-8 child can each complete one end-to-end with tier-appropriate chrome. What's
   missing for MVP: parent dashboard (#7), parent-facing diagnostic report (#8), real S.A.M. content (#11, blocked on
  Sam Chia), cold-start engine priors (#10, MVP-blocking the moment real content lands), and the cycle-1 punch list
  above (/add-child wiring, landing CTA, hamburger menu, results-page nav).

*(Subsequent entries below)*
