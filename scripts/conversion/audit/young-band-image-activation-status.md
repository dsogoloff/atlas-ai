# Young-band (0A/0B/0C) image-row activation — status audit (2026-06-21)

**Finding: the young-band image-row activation is already complete on trunk
(`ce9a676`). Zero held-INACTIVE young-band image rows are activatable — every
remaining held image row is blocked on a missing source crop or single-scene art
(founder/CONVERSION curation), not on anything ATLAS-side.**

This audit was requested as "activate the held-INACTIVE young-band image rows."
The premise is stale: prior sessions already did it. PR #78 (`l0-l2-activation`)
plus the 2026-06-20 wave — `l0a/l0b/l0c-taxonomy-activation`, `l0b-position`,
`l0a-q15`, `l0a-q17`, `l0b-q03-q06`, and the `l0-qa-content-fixes` batch — flipped
every art-present young-band image row to active and corrected the known defect
patterns. Nothing remains that can be flipped without new source art or a founder
content decision.

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

## HELD list — remaining inactive young-band rows (17) with reasons

### Image / image-dependent, held (9) — ALL blocked on missing source art
None has a source crop on disk; per the brief these are routed to held, not activated.

| row | target interaction | reason held |
|---|---|---|
| SAM-L0A-Q09 | click-image-single | no `0A-09` crop in source (picture unverifiable) |
| SAM-L0A-Q12 | visual-matching (tails→animals) | no `0A-12` crop in source |
| SAM-L0B-Q01 | click-image-multi (spot 3 differences) | single-scene, no discrete-tile crop |
| SAM-L0B-Q08 | multi-blank (count toy cars) | picture-dependent; no `0B-08` crop |
| SAM-L0B-Q12 | click-image-multi (bee number path) | no `0B-12` crop |
| SAM-L0B-Q13 | click-image (front/behind animals) | no `0B-13` crop |
| SAM-L0C-Q01 | visual-matching (ordinal birds) | no `0C-01` crop |
| SAM-L0C-Q06 | multi-blank (colour pattern) | picture-dependent; no `0C-06` crop |
| SAM-L0C-Q12 | click-image-multi (tap all cubes) | no `0C-12` crop |

All four answer formats these rows want (CLICK_IMAGE_SINGLE/MULTI, VISUAL_MATCHING,
IMAGE_ORDERING, MULTI_BLANK) are already wired end-to-end in ATLAS (#71 + #77).
**The only blocker is source art** — a CONVERSION/founder curation job, not an ATLAS
render/grader change.

### Non-image / out-of-scope held (8)
- Manual/trace: SAM-L0A-Q01, SAM-L0A-Q02 (maze "draw a line"), SAM-L0A-Q16,
  SAM-L0C-Q02, SAM-L0C-Q07 (drawing/colour-in — no auto-grade path).
- Oral: SAM-L0A-Q18.
- Text content-ambiguity: SAM-L0B-Q05 (count-back blank layout ambiguous — founder).
- Retired: SAM-L0C-Q11 (original number-line row; superseded by active Q11A–D).

## Cross-topic seams
- **ATLAS render/grader:** none. All formats the held rows need are already wired;
  the active image set serves and grades correctly. No ATLAS change required.
- **Founder content decision (carried over, not new):** SAM-L0B-Q05 blank layout.
- **CONVERSION/founder art curation:** the 9 image rows above need curated
  per-question crops before any can flip (full-page renders must never ship).
