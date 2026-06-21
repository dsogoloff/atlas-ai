# Young-band (0A/0B/0C) image-row activation — status audit (2026-06-21)

**Finding: the young-band SHORT-TEST beta has NO remaining content gate.** The
short-test-eligible young-band image set is fully activated on trunk (`ce9a676`),
and the 9 rows that are NOT active were **adjudicated by the founder as EXCLUDED
from the short test** — that exclusion is durably encoded (`short_test_eligible=false`
AND `is_active=false`) and enforced by the picker. They are **not** a pending
content gap and **not** a beta gate.

> **Correction (2026-06-21).** An earlier revision of this doc framed these 9 rows
> as "held / blocked on missing source crop." That mislabelled a CLOSED founder
> decision as an open gap. They are excluded from the short test by adjudication;
> art status is irrelevant to the short test. Any per-row art note below is a
> COMPREHENSIVE-test/future concern only — never a short-test blocker.

This audit was requested as "activate the held-INACTIVE young-band image rows."
The activation premise is stale: prior sessions already activated every short-test
row. PR #78 (`l0-l2-activation`) plus the 2026-06-20 wave —
`l0a/l0b/l0c-taxonomy-activation`, `l0b-position`, `l0a-q15`, `l0a-q17`,
`l0b-q03-q06`, and the `l0-qa-content-fixes` batch — flipped every short-test-eligible
young-band image row to active and corrected the known defect patterns.

## Short-test exclusion — is it machine-readable? (per-row)
Yes for all 9. The short picker (`src/lib/questionPicker/shortTestPicker.ts:50–51`)
selects only `is_active = true AND short_test_eligible = true`
(test: `shortTestPicker.test.ts:88`). Every excluded row carries BOTH booleans
`false` in `seed.sql` (mirrored from migrations; parity PASS), so the picker
**cannot** serve them — they are inert to the short test regardless of art status.
The exclusion FACT is encoded in a column the picker reads; only the exclusion
REASON lives in prose (this doc). **No new flag is needed.**

| row | is_active | short_test_eligible | excluded from short test by |
|---|---|---|---|
| SAM-L0A-Q09 | false | false | column (picker-enforced) |
| SAM-L0A-Q12 | false | false | column (picker-enforced) |
| SAM-L0B-Q01 | false | false | column (picker-enforced) |
| SAM-L0B-Q08 | false | false | column (picker-enforced) |
| SAM-L0B-Q12 | false | false | column (picker-enforced) |
| SAM-L0B-Q13 | false | false | column (picker-enforced) |
| SAM-L0C-Q01 | false | false | column (picker-enforced) |
| SAM-L0C-Q06 | false | false | column (picker-enforced) |
| SAM-L0C-Q12 | false | false | column (picker-enforced) |

## Method (triple-verified, source of truth = `supabase/seed.sql`)
The dev DB builds entirely from `seed.sql`; a row is INSERTed once then mutated by
later UPDATE blocks (last-write-wins; the second INSERT block is
`on conflict do nothing`). Effective `is_active` per row was computed three ways and
all three agree: (1) a row-by-row subagent trace of seed; (2) an ordered
statement parser (`bools[-2]` = `is_active` in each INSERT row, plus ordered UPDATE
overrides); (3) direct reads of the contested seed blocks. Crops on disk enumerated
from `scripts/conversion/source/0{a,b,c}/` (untracked, licensed). Seed↔migration
parity: **PASS** (`pnpm seed:check-activation-parity` — 69 migrations, every
activation mirrored).

## Effective state — 53 rows: 36 active / 17 inactive

### Active young-band IMAGE rows (26): 0A=11, 0B=6, 0C=9
- **0A (11):** Q03, Q05, Q06, Q07, Q08, Q10, Q11, Q13, Q14, Q15 (CLICK_IMAGE_SINGLE);
  Q17 (MULTIPLE_CHOICE + image stimulus).
- **0B (6):** Q02, Q03 (CLICK_IMAGE_SINGLE); Q04, Q07 (MULTIPLE_CHOICE + image);
  Q14, Q15 (NUMERIC_ENTRY + image).
- **0C (9):** Q05 (IMAGE_ORDERING); Q09, Q10, Q14 (NUMERIC_ENTRY + image);
  Q11A, Q11B, Q11C, Q11D, Q13 (CLICK_IMAGE_SINGLE).

(Plus 10 active text-only young-band rows: 0B Q06/Q09/Q10/Q11, 0C Q03/Q04/Q08/Q15/Q16,
and the count is otherwise non-image.)

### Brief's named defect patterns — verified already clean (no action)
- **L0C-Q05 (IMAGE_ORDERING)** serves shuffled tiles `[t2, t3, t1]` with id-keyed
  `order-equality` grading `order:[t1,t2,t3]` — not pre-sorted. Correct.
- **L0A-Q08 (CLICK_IMAGE_SINGLE)** the box-reference object is now a separate
  `image_path` stimulus, NOT a tappable tile; 3 choice tiles t1/t2/t3, correct=t3.
  The 0A-audit (2026-06-19) pedagogy flag was resolved by the 0620 QA batch.
- Stems checked against source wording on the active image set; no "circles"-type
  mismatch found.

## Inactive young-band rows (17)

### Image rows EXCLUDED from the short test — founder-adjudicated (9)
**Not a content gap. Not a beta gate.** These were adjudicated out of short-test
scope; `short_test_eligible=false` + `is_active=false` keep them out, picker-enforced.
The "art" column is a COMPREHENSIVE-test/future note only — it has NO bearing on the
short test and must not be read as a short-test blocker.

| row | target interaction | short-test status | comprehensive-only art note (future) |
|---|---|---|---|
| SAM-L0A-Q09 | click-image-single | excluded (adjudicated) | no `0A-09` crop yet |
| SAM-L0A-Q12 | visual-matching (tails→animals) | excluded (adjudicated) | no `0A-12` crop yet |
| SAM-L0B-Q01 | click-image-multi (spot 3 differences) | excluded (adjudicated) | single-scene; needs discrete tiles |
| SAM-L0B-Q08 | multi-blank (count toy cars) | excluded (adjudicated) | picture-dependent; no `0B-08` crop |
| SAM-L0B-Q12 | click-image-multi (bee number path) | excluded (adjudicated) | no `0B-12` crop |
| SAM-L0B-Q13 | click-image (front/behind animals) | excluded (adjudicated) | no `0B-13` crop |
| SAM-L0C-Q01 | visual-matching (ordinal birds) | excluded (adjudicated) | no `0C-01` crop |
| SAM-L0C-Q06 | multi-blank (colour pattern) | excluded (adjudicated) | picture-dependent; no `0C-06` crop |
| SAM-L0C-Q12 | click-image-multi (tap all cubes) | excluded (adjudicated) | no `0C-12` crop |

All answer formats these rows would use (CLICK_IMAGE_SINGLE/MULTI, VISUAL_MATCHING,
IMAGE_ORDERING, MULTI_BLANK) are already wired end-to-end in ATLAS (#71 + #77), so
there is **no ATLAS render/grader change** outstanding for them either.

### Other inactive young-band rows (8)
- Manual/trace: SAM-L0A-Q01, SAM-L0A-Q02 (maze "draw a line"), SAM-L0A-Q16,
  SAM-L0C-Q02, SAM-L0C-Q07 (drawing/colour-in — no auto-grade path).
- Oral: SAM-L0A-Q18.
- Text content-ambiguity: SAM-L0B-Q05 (count-back blank layout ambiguous — founder).
- Retired: SAM-L0C-Q11 (original number-line row; superseded by active Q11A–D).

## Short-test beta gate status
**No remaining content gate for the young-band short test.** The short-test-eligible
set is fully active; the 9 excluded image rows are adjudicated out and picker-enforced.

## Cross-topic seams
- **ATLAS render/grader:** none. All formats are wired; the active image set serves
  and grades correctly.
- **Short test:** nothing outstanding.
- **COMPREHENSIVE test (future, NOT a short-test/beta concern):** if any of the 9
  excluded rows are ever brought into the comprehensive bank, they would first need
  curated per-question crops (full-page renders must never ship) and a deliberate
  re-adjudication. Tracked as comprehensive-only; do not surface as a short-test gap.
