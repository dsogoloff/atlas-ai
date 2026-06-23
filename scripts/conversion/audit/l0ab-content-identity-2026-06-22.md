# L0A vs L0B "identical rendering" — content identity investigation (2026-06-22)

**Founder QA (cross-topic from ATLAS):** L0A and L0B questions render identically. ATLAS
cleared the picker ("0A and 0B are distinct booklet ordinals with disjoint level filters")
and routed it here as a suspected **content-bank identity bug** (same content authored under
both L0A and L0B external_ids, or 0B seeded as a copy of 0A).

## Verdict: NOT a content bug. Content is faithful and distinct per booklet.
The identical rendering is a **short-test band-resolution** effect, not duplicated content.
**No content was wrong; nothing was fabricated or changed.**

## What I checked

### 1. Effective content of every active L0 row (dedup)
`scripts/conversion/audit/dump-l0-content.ts` replays `supabase/seed.sql`
(INSERT first-wins + UPDATE last-writer, evaluating the `is_active` guard) and prints the
EFFECTIVE state of all 34 active SAM-L0A / SAM-L0B / SAM-L0C rows, then runs two duplicate
detectors:
- **exact normalized content** identical across different external_ids → **0 matches**
- **same stem + same image keys** across different external_ids → **0 matches**

Every active row has a distinct stem and distinct content. There is **no** row authored
under both an L0A and an L0B id. (Image keys are per-question in `SOURCE_MAP`; no shared art.)

### 2. Source-verification (0A and 0B worksheets + keys + PNGs)
Spot-checked representative L0B rows against the **0B** worksheet (rendered page + Question
Summary key + PNGs) — all are genuine 0B-booklet content, not copies of 0A:
- SAM-L0B-Q02 = 0B Task 2 pattern (magnet/baseball). SAM-L0B-Q03 = 0B Task 3 cake.
- SAM-L0B-Q06 = 0B Task 6 "numbers greater than 6". SAM-L0B-Q11 = 0B Task 11 "Mary put 7
  items in a basket… took out 3" (choices 4/2/6).
The 0A worksheet content (SAM-L0A-*) is the 0A booklet (big/small, thick/thin, patterns,
positions, counting). The two booklets are different and each level's rows match ITS source.

### 3. Why they render identically — the real mechanism (proven)
The S.A.M. booklets are a **spiral**: the 0B booklet's first 12 tasks are themselves
**level-0A skills** (per the 0B Question Summary key — Tasks 1–12 = `0A`, Tasks 13–15 = `0B`),
and the 0C booklet's first 13 tasks are level-0B skills. So `questions.level` for the active
rows is:
- **level 0A (18 rows):** SAM-L0A-Q03/05/06/07/08/10/11/13/14/15/17 **+** SAM-L0B-Q02/03/06/07/09/10/11
- **level 0B (15 rows):** SAM-L0B-Q14/15 **+** SAM-L0C-Q03/04/05/08/09/10/11A-D/13
- **level 0C (3 rows):** SAM-L0C-Q14/15/16

The **short test samples the PREVIOUS booklet** (`levelBand.previousBookletOrdinal`,
clamped at the 0A floor). Resolving the real band logic for each intake choice:

| intake choice | anchor booklet | SHORT band (prev booklet) | COMPREHENSIVE band (±1) |
|---|---|---|---|
| Pre-K (age 4) | 0A (0) | **{0A}** | {0A,0B} |
| Pre-K (age 5) | 0B (1) | **{0A}** | {0A,0B,0C,KA,KB} |
| Pre-K (bare)  | 0C (2) | {0B} | {0B,0C,KA,KB,1A,1B} |
| Grade 1       | 1  (3) | {0C,KA,KB} | … |

A **Pre-K (age 4)** child (anchor 0A) and a **Pre-K (age 5)** child (anchor 0B) BOTH resolve
the short test to band **{0A}** — the age-5 child because its *previous* booklet is 0A, the
age-4 child because the ordinal clamps at the 0A floor. Same band → same level-0A pool (18
rows, deterministic comparator) → **identical served questions**. That is the "L0A and L0B
render identically" the founder saw.

This is consistent with ATLAS's statement: the *anchor* ordinals and the *comprehensive*
±1 band ARE distinct for 0A vs 0B. The collapse happens only in the **short test's
previous-booklet sampling**, which ATLAS's note did not cover.

## Recommendation (picker/product decision — ATLAS lane, not content)
There is nothing to fix in the content bank. The question is a **product/picker** one:

> For the youngest band, should a 0B-anchored child's SHORT test sample its *previous*
> booklet (0A) — identical to a 0A child — or its *own* booklet (0B)?

Today's behavior (sample previous booklet) means both youngest cohorts are diagnosed on
0A-readiness. If 0A and 0B children should get distinct short tests, the change is in
`src/lib/questionPicker/levelBand.ts` (short-test sampling for the floor band) — an ATLAS
picker change, **not** a content edit. No fabrication, no content/seed change made here.

## Artifacts
- `scripts/conversion/audit/dump-l0-content.ts` — effective-content dump + cross-id dedup
  (re-runnable: `pnpm tsx scripts/conversion/audit/dump-l0-content.ts`).
