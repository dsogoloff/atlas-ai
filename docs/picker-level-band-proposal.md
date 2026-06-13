# Proposal: constrain served items to a level band around the child's grade

**Status:** proposal only — NO code change in this session. The question bank and
picker are owned by the CONVERSION session; this is a founder decision before any change.
**Author context:** written while diagnosing QA Issue 2 (founder saw questions that
don't look like they belong to the child's grade). This documents *why* that happens and a
candidate fix. It does not modify `src/lib/questionPicker/picker.ts`.

---

## Current behavior (what the picker does today)

`pickQuestion` (`src/lib/questionPicker/picker.ts:89-94`) selects candidates with **only**:

```sql
SELECT id, external_id, strand, level, difficulty, format, content
FROM questions
WHERE tenant_id = $tenant AND strand = $strand AND is_active = true
```

Then it sorts the candidates by **difficulty distance** to the engine's `targetDifficulty`
(`picker.ts:117`, `compareCandidates`) and serves the nearest unserved one. There is **no
filter on `level`** — the row's `level` (a half-grade difficulty calibration, e.g. `3A`)
is read but never used to gate eligibility.

**Consequence:** for a given strand, the picker can serve *any* active item in the whole
bank, regardless of the source grade, as long as its `difficulty` is the closest to the
engine's current target. Because the SAM bank maps higher-source-grade items (e.g.
`SAM-L5-*`, `SAM-L6-*`) onto mid-range `level`s, a young child whose estimate drifts upward
in a thin strand can be served an item sourced from a much higher grade — which reads as
"a question not from my grade's worksheet." This is a **provenance/credibility** surprise,
not a correctness bug: the engine is doing exactly what adaptive placement is meant to do
(find the edge of ability), but the *source grade* of the item is unconstrained.

This is distinct from, and compounds, the authenticity issue tracked in
`docs/sam-content-authenticity-audit.md` (some active `SAM-*` rows have model-reconstructed
content). Together they explain "questions not in the source PDFs."

---

## Proposed band logic

Add an **eligibility band** on `level` (source grade), applied *before* the
difficulty-distance sort, derived from the child's grade/tier:

1. **Anchor.** Map the child's `grade_level` → a half-grade anchor index (the same axis
   `levelTheta`/`levelAt` already use, KA … 8B). The engine already derives the child's
   posterior mean per strand; use the **session's running estimate** for that strand as the
   anchor when available, else the grade anchor at session start.
2. **Band.** Allow `level` within **±N half-grades** of the anchor (start with **N = 3**,
   i.e. ~1.5 grades either side — wide enough to keep adaptivity, narrow enough to exclude
   a Grade-1 child seeing Grade-6-sourced items). N is a single tunable constant.
3. **Filter then sort.** Restrict candidates to the band, then keep the existing
   difficulty-distance sort within the band.
4. **Graceful widening (critical).** If the band has **zero** eligible unserved candidates
   in a strand, **widen** the band step-by-step (N → N+2 → unbounded) rather than declaring
   the strand exhausted. The last step is exactly today's unconstrained behavior, so the
   band can only ever *narrow* selection when richer in-band content exists — it never makes
   a strand unservable that is servable today.

Implementation note: this is a candidate-filter change inside `pickQuestion`, plus passing
the anchor through `PickerRequest`/`PickerContext`. `discoverEmptyBankStrands` stays as-is
(it answers "is the strand empty at all," not "empty in band").

---

## What breaks / what to weigh

**If we DO add the band:**
- ✅ Removes the cross-grade surprise — items served track the child's grade/ability.
- ✅ Reduces exposure of higher-grade SAM source items to young children (a licensing/
  credibility nicety).
- ⚠️ **Thin strands get thinner.** Coverage is already sparse (geometry 4 active bank-wide,
  `data_statistics` 0 — see `docs/qa-prep-e2e-run.md`). A band can empty a strand for a
  given child; the **graceful-widening** step (4) is therefore mandatory, or comprehensive
  per-strand floors and short-test routing would bank-exhaust earlier and skew placement.
- ⚠️ **Adaptivity ceiling/floor.** A genuinely advanced young child (or struggling older
  one) is legitimately served off-grade today; a hard band caps how far the test can chase
  the real edge of ability. ±3 half-grades preserves most of that range; too small an N
  would blunt the diagnostic.
- ⚠️ Needs the anchor plumbed in and tested (engine estimate vs grade anchor; what to do
  before the first response when there's no per-strand estimate yet).

**If we do NOT add the band (status quo):**
- ✅ Maximum adaptivity; simplest code; no risk of new bank-exhaustion.
- ❌ The founder keeps seeing off-grade-sourced items and reads them as "not from this
  grade's worksheet" — the exact QA complaint.
- ❌ Higher-grade SAM source content remains servable to younger children.

---

## Recommendation (for founder decision)

Adopt the band **with mandatory graceful widening** and **N = 3 half-grades**, owned by the
CONVERSION session alongside the bank work (so band tuning and content curation move
together). Do not ship a hard band without the widening fallback, given current strand
thinness. If the bank is enriched later (geometry/data_statistics activated), N can tighten.

No change will be made until the founder approves and the CONVERSION session picks it up.
