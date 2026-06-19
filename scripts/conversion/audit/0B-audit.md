# 0B source-vs-authored audit (2026-06-19)

Source of truth: `Level 0B Placement Worksheet.docx` (verbatim stems + Question Summary
table) and the per-task crops in `scripts/conversion/source/0b/`. Every row was judged
against the opened source crop image(s) and/or the docx stem text. The booklet ramps:
Summary LEVEL column puts tasks 1–12 at band 0A and tasks 13–15 at band 0B.

| external_id | source interaction | authored format | faithful | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L0B-Q01 | spot-the-difference: circle 3 differing objects on Picture B (image-tap multi) | MULTIPLE_CHOICE (placeholder, inactive_manual, blocker C) | Y | stem verbatim vs docx; circling 3 differences on the art is not a wired interaction; content_id null (no same/different tax code at 0A) | OK |
| SAM-L0B-Q02 | tap the object that comes next in the pattern (pictured tiles) | CLICK_IMAGE_SINGLE, active | Y | tiles 0B-02_1..4 = baseball/volleyball/whistle/magnet; answer = magnet (t4); matches source; image_alt non-revealing; tiles wired in uploader | OK |
| SAM-L0B-Q03 | tap the missing part of the cake (pictured tiles) | MULTIPLE_CHOICE (placeholder, held_C) | Y | crops 0B-03_1..4 = whole tiered cake + part tiles; missing-part tap is image-dependent; not a wired interaction | OK |
| SAM-L0B-Q04 | start at X, go right/up/left/down on a map grid, tap the box reached | MULTIPLE_CHOICE (placeholder, held_C) | Y | crop 0B-04_1 = street map (Bakery/School/Playground/Home + X); options match; route resolves only against the pictured grid; content_id null (0A has no position sub-strand) | OK |
| SAM-L0B-Q05 | count back from 10, fill several missing numbers (multi-blank) | MULTIPLE_CHOICE (placeholder, held_C) | Y | stem verbatim vs docx; several distinct count-back blanks = multi-blank, not a wired interaction | OK |
| SAM-L0B-Q06 | tap the numbers greater than 6 (select-multiple over number tiles) | MULTIPLE_CHOICE (placeholder, held_C) | Y | docx tiles are 4,5,6,7,8; crop 0B-06.png is a bare NUMBER LINE (no printed numbers); known answer-key conflict ("greater than 6" vs key "Color 7 and 6"); select-multiple not wired | BLOCKED-content-conflict: answer-key conflict left for founder; held_C regardless |
| SAM-L0B-Q07 | how are the shapes sorted? (single text-MC; answer read from the picture) | MULTIPLE_CHOICE, held_A | Y | crops 0B-07_1 = all-pink group, 0B-07_2 = all-green group → sorted by colour; answer "color" (index 0, Americanized from docx "colour"); format wired but answer image-dependent | OK |
| SAM-L0B-Q08 | read; write the missing numbers (total / big / small toy cars) — multi-blank, picture-dependent | MULTIPLE_CHOICE (placeholder, held_C) | Y | stem verbatim vs docx; three distinct blanks + count-the-cars picture; multi-blank not a wired interaction; docx topic "Number Bonds to 5" vs authored content_id l0a-whole_numbers-2 (taxonomy nuance, not a clear-cut fix) | OK |
| SAM-L0B-Q09 | there are 8 candy, 5 in the bag, how many in the jar? (numeric) | NUMERIC_ENTRY, active | Y | stem verbatim vs docx ("candy" Americanized); answer 3 (8−5), text-derivable; supported format | OK |
| SAM-L0B-Q10 | 3 fish in a bowl + 5 in a tank, how many altogether? tap answer (text-MC) | MULTIPLE_CHOICE, active | Y | stem + options [3,6,8] verbatim vs docx; answer 8 (3+5); source crop fish count overlaps but docx text governs | OK |
| SAM-L0B-Q11 | Mary: 7 items in a basket, took out 3, how many left? tap answer (text-MC) | MULTIPLE_CHOICE, active | Y | stem + options [4,2,6] verbatim vs docx; crop 0B-11 = basket of 7 items; answer 4 (7−3) | OK |
| SAM-L0B-Q12 | count on from 7, tap each number along the bee-maze path (image-tap multi / path) | MULTIPLE_CHOICE (placeholder, held_C) | Y | stem verbatim vs docx; path tap of multiple numbers = not a wired interaction | OK |
| SAM-L0B-Q13 | color the animal in front of / cross out the animal behind the mushrooms (image-tap) | MULTIPLE_CHOICE (placeholder, held_C) | Y | stem matches docx ("Color" Americanized from "Colour"); front/behind identification on the art = image-tap, not wired; banded 0B per Summary | OK |
| SAM-L0B-Q14 | 4 sushi on a tray + 6 in a box, how many altogether? fill in 4+6=__ (numeric) | NUMERIC_ENTRY, active | Y | crop 0B-14 = tray-of-4 + box-of-6; answer 10 (4+6); stem trims docx "Fill in the blanks."/trailing line per HARD RULE 3 (trailing fill-in folded to single numeric); image_alt non-revealing; image wired | OK |
| SAM-L0B-Q15 | Diana baked 10 cookies, Paul ate 7, how many left? fill in 10−7=__ (numeric) | NUMERIC_ENTRY, active | Y | crop 0B-15 = tray of 10 cookies; stem verbatim vs docx; answer 3 (10−7); supported format | OK |

**Counts:** 15 items / 15 faithful / 0 fixed / 1 blocked.

**Blocked detail:**
- SAM-L0B-Q06 — BLOCKED-content-conflict. The Question Summary marks Task 6 as "Compare
  numbers within 10" and the docx tiles read 4,5,6,7,8, but crop `0B-06.png` is a bare
  number line with no printed numbers, and the answer-key text ("Color 7 and 6") includes
  6 while the stem ("Tap the numbers greater than 6") excludes 6. The conflict is genuine
  and unresolved — the intended on-page tiles and correct subset can't be settled from the
  source — so this is left for the founder. It also stays held_C because select-multiple
  over number tiles is not a wired player capability. Not touched, per the standing block.

**Notes (faithful-but-flagged, no fix applied):**
- SAM-L0B-Q08 — docx Summary topic is "Number Bonds to 5" while the authored content_id is
  `l0a-whole_numbers-2` (Number Bonds to 10). Taxonomy-mapping judgment, not an
  unambiguous fix; flagged only.
- 8 held_C rows (Q03, Q04, Q05, Q06, Q08, Q12, Q13 + Q01 inactive_manual) and 1 held_A row
  (Q07) all require unshipped player capabilities (image-tap single/multi, multi-blank,
  select-multiple, path) before activation; correctly held.
