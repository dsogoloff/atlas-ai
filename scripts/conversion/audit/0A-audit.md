# 0A source-vs-authored audit (2026-06-19)

> **CORRECTION (taxonomy framing).** Any "taxonomy gap / no code / blocked on a
> code" note below is a misframing. `content_id` codes are an INTERNAL Atlas scheme,
> created by Code from each worksheet's Topic column — never a Sam/S.A.M. decision and
> never externally gated. These items were finished internally (PRs #103–#105). See
> `.agent/memory/BUSINESS_RULES.md` → "NOT licensed / NOT S.A.M.-controlled".

Every row below was judged against the per-question SOURCE crop image(s) in
`scripts/conversion/source/0a/` (viewed with Read), not the DB/overlay text alone.
Per the founder rule, 0A has 0 text-active items: all tasks are picture/manual/oral.
Image-tap rows are HELD-C, count/oral/manual are HELD-A or INACTIVE; a correctly-held
row is disposition OK (faithful). Q08 and Q11 are the two founder-approved flips
(now CLICK_IMAGE_SINGLE, active) from the merged l0-l2-activation lane.

| external_id | source interaction | authored format | faithful | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L0A-Q01 | maze: trace a line rabbit→carrots (no crop; manual) | MULTIPLE_CHOICE / inactive (none-manual) | Y | none; verbatim stem; no auto-grade path, correctly held | OK |
| SAM-L0A-Q02 | maze: trace a line bee→flower (no crop; manual) | MULTIPLE_CHOICE / inactive (none-manual) | Y | none; verbatim stem; correctly held | OK |
| SAM-L0A-Q03 | tap the big bowl (0A-03.png shows ONE bowl only) | MULTIPLE_CHOICE / held-C | N | source crop shows a single bowl, not the two-bowl size comparison the stem/image_alt require; also no 0A size-comparison taxonomy code (content_id null) | BLOCKED-C (incomplete source art + taxonomy gap; held-C is correct, do not touch) |
| SAM-L0A-Q04 | color the shapes red/blue/green (no crop; manual) | MULTIPLE_CHOICE / inactive (none-manual) | Y | none; verbatim three-color stem; coloring has no auto-grade path, correctly held; content_id null (no 0A coloring code) | OK |
| SAM-L0A-Q05 | tap the thick book (0A-05_1 thin, 0A-05_2 thick) | MULTIPLE_CHOICE / held-C | Y | none; crops match (thick=_2); answer model "thicker book" correct; correctly held | OK |
| SAM-L0A-Q06 | tap the long branch (0A-06_1 long, 0A-06_2 short) | MULTIPLE_CHOICE / held-C | Y | none; crops match (long=_1); correctly held | OK |
| SAM-L0A-Q07 | tap the tall animal (0A-07_1 donkey, 0A-07_2 giraffe) | MULTIPLE_CHOICE / held-C | Y | none; tall=giraffe(_2) confirmed in crops; correctly held | OK |
| SAM-L0A-Q08 | match object in box; box=car (0A-08_1), choices bear/ball/car (08_2/_3/_4) | CLICK_IMAGE_SINGLE / ACTIVE (founder flip) | N | activation uses 4 tiles t1–t4; t1 = 0A-08_1 which is the BOX REFERENCE car, not a choice — including the reference car as a tappable tile means a child tapping the (correct-looking) reference car is graded wrong; the real 3 choices are bear/ball/car | BLOCKED-pedagogy (active merged founder flip; tile-set/answer-model judgment, not clear-cut — FLAG for founder) |
| SAM-L0A-Q09 | draw an X by the long-pencil box (NO crop in source) | MULTIPLE_CHOICE / held-C | N | no source crop (0A-09 referenced in authoring but absent); picture content unverifiable | BLOCKED-no-source |
| SAM-L0A-Q10 | tap the taller door (0A-10_1 green=taller, 0A-10_2 brown) | MULTIPLE_CHOICE / held-C | Y | none; taller=green(_1) confirmed; correctly held | OK |
| SAM-L0A-Q11 | pattern→tap next (0A-11_1 red flower, 0A-11_2 blue flower) | CLICK_IMAGE_SINGLE / ACTIVE (founder flip) | Y | none; answer=blue flower; manifest maps 11_1→t1, 11_2→t2 with correct=t2; matches source | OK |
| SAM-L0A-Q12 | match each tail to the animal (NO crop in source) | MULTIPLE_CHOICE / held-C | N | no source crop (0A-12 referenced but absent); visual-matching content unverifiable | BLOCKED-no-source |
| SAM-L0A-Q13 | tap the bird facing left (0A-13_1 blue=left, 0A-13_2 brown=right) | MULTIPLE_CHOICE / held-C | Y | none; left=blue(_1) confirmed; correctly held | OK |
| SAM-L0A-Q14 | tap the bird flying up (0A-14_1 up, 0A-14_2 diving down) | MULTIPLE_CHOICE / held-C | Y | none; up=_1 confirmed; correctly held | OK |
| SAM-L0A-Q15 | tap the bowl on the bottom shelf (0A-15_1 one bowl, 0A-15_2 empty 3 shelves) | MULTIPLE_CHOICE / held-C | N | source has only a single bowl + empty shelves; the composite "a bowl on each shelf" the stem/image_alt require is not present in source; also no 0A position taxonomy code | BLOCKED-C (incomplete source art + taxonomy gap; held-C is correct, do not touch) |
| SAM-L0A-Q16 | draw a sweet outside the bowl (NO crop; free drawing) | MULTIPLE_CHOICE / inactive (none-manual) | Y | none; verbatim stem; free drawing has no auto-grade path, correctly held; content_id null (no 0A position code) | OK |
| SAM-L0A-Q17 | count the balloons → 5 (only single-balloon crops 0A-17_1/_2 exist) | MULTIPLE_CHOICE / held-A | N | answer key = 5 but source has NO group-of-5 balloons image; only two single balloons; needs a curated count stimulus before flip | BLOCKED-A (pending image; held-A is correct, do not touch) |
| SAM-L0A-Q18 | say the name of each shape (no crop; oral) | MULTIPLE_CHOICE / inactive (none-oral) | Y | none; verbatim stem; oral-only, no auto-grade path, correctly held | OK |

**Counts:** 18 items / 12 faithful / 0 fixed / 6 blocked.
**Blocked detail:** SAM-L0A-Q03 (BLOCKED-C: single-bowl crop, not the 2-bowl comparison; size-comparison taxonomy gap); SAM-L0A-Q08 (BLOCKED-pedagogy: active founder flip includes the box reference car 0A-08_1 as a tappable tile t1 alongside the real 3 choices — FLAG); SAM-L0A-Q09 (BLOCKED-no-source: 0A-09 crop absent); SAM-L0A-Q12 (BLOCKED-no-source: 0A-12 crop absent); SAM-L0A-Q15 (BLOCKED-C: source has a single bowl + empty shelves, not the per-shelf composite; position taxonomy gap); SAM-L0A-Q17 (BLOCKED-A: no group-of-5 balloons stimulus in source; one founder image from flip-ready).

No clear-cut fixes were found: every active/held/inactive row's stem is verbatim, formats/counts/content_ids match the authoring overlay (source of truth), no missing stimulus image that exists at source, and no British spellings. Per the fix mechanics, with zero fixes no migration was created and seed.sql was not edited.
