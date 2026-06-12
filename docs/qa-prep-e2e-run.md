# QA prep — founder end-to-end run

Prep pack for the full happy-path QA: **signup → add 4 children at different grades →
run 4 assessments → open each report (with narration) → log in as the instructor and
view the roster + an individual report.**

Verify baseline at prep time: **915 tests / 56 files GREEN**, `pnpm build` success,
ATLAS-ASSESSMENT head `970698e` (all four security lanes + memory merged; `supabase db
reset` run). Run `supabase db reset` once more only if your local DB predates that.

---

## 1. Instructor login + roster link (dev-only SQL)

Use `supabase/dev-seed-instructor-roster.sql`. It creates a QA instructor and links its
roster to **your** parent account's children **by email** (the roster is RLS-scoped to
children whose `home_center_id` matches the instructor's `center_id`, so the script
attaches the instructor to your kids' center and — dev-only — normalises all of that
parent's children onto that one center).

**Run it (Supabase Studio):**
1. Sign up as a parent in the app and add your children **first** (the script links to
   children that already exist).
2. Open Supabase Studio → **SQL Editor** → New query.
3. Paste the whole contents of `supabase/dev-seed-instructor-roster.sql`.
4. Edit the one marked line near the top — `'parent@example.com'  -- <<< EDIT ME` — to the
   email you signed up with. Run.
5. Read the result grid: `instructor_row` and `password_ok` should be `1`;
   `children_on_roster` should equal the number of children you added (e.g. 4). If
   `children_on_roster` is 0, add children in the app and re-run (it's idempotent).

**Instructor credentials created:** `qa-instructor@atlas.test` / `Atlas-Pilot-2026`.

It does not touch the existing `dev-seed-instructor-pilot.sql` data (different UUID
prefix) and is safe to re-run.

---

## 2. Local env for LIVE narration + LIVE misconception classifier

These go in **`.env.local`** at the repo root (copy from `.env.example` if you don't have
one). Three lines (the API key is shared):

```dotenv
ANTHROPIC_API_KEY=sk-ant-...        # your real key
REPORT_NARRATION_LIVE=true          # live Sonnet narration (else deterministic stub)
MISCONCEPTION_CLASSIFIER_LIVE=true  # live Haiku misconception classifier (else stub)
```

Notes:
- `REPORT_NARRATION_LIVE` is commented out in `.env.example` (add/uncomment it);
  `MISCONCEPTION_CLASSIFIER_LIVE` ships as `false` (flip to `true`).
- With both `false`, reports **still render** with deterministic stub narration and stub
  classification — so "reports with narration" works without live calls; you only need
  these for *live* model output.
- ⚠ Turning these on makes **real, billed Anthropic API calls** and sends data to the
  model. Data minimization (PR #52) already limits what leaves the box: narration sends the
  child's **first name only**; the classifier sees only **math-safe sanitized** TEXT_ENTRY
  answers (allowlisted digits/operators, ≤40 chars) — free child text and PII never reach
  the model. Both paths are fail-soft (any API error degrades to a stub, never blocks the
  report). Restart `pnpm dev` after editing `.env.local`.

---

## 3. Grade selection for 4 children (coverage-safe)

**Default app behaviour is the SHORT adaptive test** — strand floors don't apply, so grade
choice only affects how on-grade the served items are. The per-strand-floor / hard-cap
logic below applies **only to the comprehensive test**, which is not reachable from the UI
(see Blocker A in §4).

Active bank coverage (98 active questions; K-4 tier l0a–l4 = 72, 5-8 tier l5–l6 = 26),
mapped to the engine's 6 strands:

| Engine strand | Active (bank-wide) | K-4 floor (2) | 5-8 floor (3) |
|---|---:|:--:|:--:|
| number_sense | ~61 | ✅ | ✅ |
| fractions_decimals | 23 | ✅ | ✅ |
| measurement | 5 | ✅ | ✅ |
| operations_algorithms | ≥5 | ✅ | ✅ |
| geometry | 4 | ✅ | ✅ |
| data_statistics | **0 → auto-excluded** | n/a | n/a |

**Why the hard-cap-on-unsatisfiable-floors path is NOT tripped at any grade:** the only
zero-coverage strand (`data_statistics`) has no active questions anywhere, so it is
excluded from scope upstream (`discoverEmptyBankStrands`) and never imposes a floor. Every
strand that *is* in scope has ≥4 active questions — comfortably above both the K-4 floor
(2) and the 5-8 floor (3). The picker pulls candidates per strand across **all** levels
(not tier-filtered), so a 5-8 child can still reach the lower-level geometry items to meet
its floor of 3.

**Recommended 4 grades (richest near-grade coverage, K-4 + 5-8 mix):**

| Child | Grade | SAM level | Active near-grade | Tier |
|---|---|---|---:|---|
| 1 | **Grade 1** | l1 | 15 | K-4 |
| 2 | **Grade 3** | l3 | 17 | K-4 |
| 3 | **Grade 4** | l4 | 21 | K-4 |
| 4 | **Grade 5** | l5 | 21 | 5-8 |

Avoid for a clean demo:
- **Kindergarten** — l0a has **0** active (all image-gated), l0b only 6, l0c 1. The picker
  will serve well-above-grade items; placement reads oddly. Use Grade 1 for the low end.
- **Grade 6** — l6 has only 5 active (percentage + algebra). It still terminates (floors
  are met from the bank-wide pool), but most items are served from grades 4–5, so the
  placement skews "below grade." Fine as a *second* 5-8 child if you want to exercise the
  5-8 tier budget — just expect lower-level items.

Either way, **`data_statistics` will read "not assessed"** on every report (no active
questions exist), and **geometry** is backed by only 4 items bank-wide — expect a thin
geometry signal. That is data-coverage, not a bug.

---

## 4. QA-checklist blockers

**A. Comprehensive test is not reachable from the UI (hard blocker for testing it).**
`startSession(childId)` posts only `{ child_id }`; nothing sends `comprehensive: true`, so
every assessment started by clicking is a **short** test. To exercise the comprehensive
engine you must (1) set `ENABLE_COMPREHENSIVE_PILOT=true` in `.env.local`, **and** (2) POST
to `/api/assess/start` with `{ "child_id": "...", "comprehensive": true }` directly (curl /
REST client) — there is no button. If your QA scope is the **short** flow, ignore this; §3's
floor analysis is then moot.

**B. Instructor sees an empty roster unless centers align.** The roster shows only children
whose `home_center_id` equals the instructor's `center_id`. Running the §1 script fixes
this for one parent's children; if you test with a parent the script didn't process, the
roster will be empty. Re-run the script (idempotent) after adding more children.

**C. Per-child COPPA consent must be completed.** The assessment and the AI classifier are
gated on a per-child consent record and fail **closed**. Complete the consent step for each
child during add-child; a child without consent can't be assessed and won't classify.

**D. Live narration/classifier need env + restart.** Per §2 — without `ANTHROPIC_API_KEY` +
the two `*_LIVE=true` flags you get stub output (still renders), and `.env.local` changes
need a `pnpm dev` restart.

**E. Reports need a *completed* session.** The full report (placement bar, radar,
sub-strand pills, narration strengths/areas) renders on a normally-completed session. A
speed-run / too-few-clean-responses session is flagged `unreliable` and intentionally shows
only a "Score not reliable" banner — no placement bar/radar/pills (known, parked design;
not a bug). Answer each assessment through to genuine completion.

**F. Migrations applied.** The unique `(session_id, question_id)` constraint (PR #55,
`20260612090000`) and comprehensive instrumentation (`20260611090000`) require
`supabase db reset`. This was run at prep time; only re-run if your local DB is older.

Non-blockers worth knowing: the served-question gate (PR #50) requires a question to have
been served before its answer scores — the normal UI flow always satisfies this; it only
rejects out-of-band submits. Duplicate submits are now conflict-safe (idempotent), not
errors.
