# 0C source-vs-authored audit (2026-06-19)

Source of truth: `scripts/conversion/source/0c/` crops + `Level 0C Placement Worksheet.docx`
(digital-adapted; Question Summary table gives Topic / Level / Short). Authored intent:
`scripts/conversion/overlay/l0c-authoring.json` (re-authoring) +
`scripts/conversion/overlay/l0c-activation.json` (flip-to-active). Final served state read
from `supabase/seed.sql` (stage4 insert -> l0-overlay UPDATE -> l0-l2-activation UPDATE ->
young-band content fixes; last write wins).

Booklet ramps per the Summary table LEVEL column: tasks 1-13 = band 0B, tasks 14-16 = band
0C. Every row's crop (where one exists) was opened and viewed before judging.

| external_id | source interaction | authored format | faithful | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L0C-Q01 | match birds to ordinal positions (visual-matching) | MULTIPLE_CHOICE placeholder, held (blocker C), 0B | yes | none — held-C placeholder, real interaction not wired; no crop needed (stem/options text-only) | OK (correctly held) |
| SAM-L0C-Q02 | colour leaves + write number bond making 9 (manual, open-ended) | MULTIPLE_CHOICE placeholder, held (none-manual), 0B | yes | none — no auto-grade path ever; correctly inactive-manual | OK (correctly held) |
| SAM-L0C-Q03 | tap all boxes that make 10 (select-multiple) | SELECT_MULTIPLE, ACTIVE, 0B | yes | none — all 8 options present (docx table 0); correct set o1,o2,o3,o5,o8 = {5+5,3+7,2+8,1+9,6+4} verified | OK |
| SAM-L0C-Q04 | complete the fact family for 6/3/9 (equation-set) | EQUATION_SET, ACTIVE, 0B | yes | none — fact family 6+3=9 / 3+6=9 / 9-3=6 / 9-6=3 correct; format wired | OK |
| SAM-L0C-Q05 | order by size: smallest/bigger/biggest (multi-blank) | MULTIPLE_CHOICE placeholder, held (blocker C), 0B | yes | stem verbatim vs docx; options {smallest,bigger,biggest} faithful. Crop 0C-05.png viewed (a vegetable). content_id null | BLOCKED-taxonomy-gap (no Comparing-and-Ordering code; held-C placeholder also not wired) |
| SAM-L0C-Q06 | colour squares to complete colour pattern (multi-blank) | MULTIPLE_CHOICE placeholder, held (blocker C), 0B | yes | "colour"->"color" already Americanised in seed; held-C placeholder | OK (correctly held) |
| SAM-L0C-Q07 | draw shapes by attribute (manual) | MULTIPLE_CHOICE placeholder, held (none-manual), 0B | yes | none — drawing task, no auto-grade path ever | OK (correctly held) |
| SAM-L0C-Q08 | skip count by 2s, fill 4 missing numbers (multi-blank) | MULTI_BLANK, ACTIVE, 0B | yes | none — 2,_,6,_,10,12,14,_,18,_ -> 4,8,16,20 verified | OK |
| SAM-L0C-Q09 | addition story 14+5 (numeric-single) | NUMERIC_ENTRY, ACTIVE, 0B | yes | stem verbatim vs docx; 14+5=19. Crop 0C-09.png (blue/green-bead necklace) viewed — decorative, numbers in text; no image_path needed | OK |
| SAM-L0C-Q10 | subtraction story 18-6 (numeric-single) | NUMERIC_ENTRY, ACTIVE, 0B | yes | stem verbatim vs docx; 18-6=12. Crops 0C-10_1/_2.png (blue bird, yellow bird) viewed — decorative | OK |
| SAM-L0C-Q11 | number-line before/after + smaller/greater, 4 picks (multi-blank) | (handled in PR #89) | n/a | OUT OF SCOPE this PR — number-line -> 4x CLICK_IMAGE_SINGLE split is being re-landed in PR #89. Crop 0C-11.png (number line) viewed for context only; not touched here | FIXED-elsewhere (PR #89) |
| SAM-L0C-Q12 | tap all cube-shaped objects (click-image-multi) | MULTIPLE_CHOICE placeholder, held (blocker C), 0B | yes | none — click-image-multi not a wired format; held-C placeholder; image_alt non-revealing | OK (correctly held) |
| SAM-L0C-Q13 | days of week, identify torn missing day (single-MC) | CLICK_IMAGE_SINGLE, ACTIVE, 0B | yes | already-fixed young-band content fix. 4 generated word tiles viewed: t1=Thursday, t2=Friday, t3=Saturday, t4=Fryday; correct=t2 (Friday); "Fryday" spelling trap. Faithful to docx (Mon-Sun, Friday missing) | OK |
| SAM-L0C-Q14 | count pairs of same bikes (numeric-single, image-dependent) | NUMERIC_ENTRY, ACTIVE, 0C | yes | crop 0C-14.png (4 boxes of 2 motorcycles) viewed; answer=4 per docx Summary + authoring answer_model (whole-task count). image l0/sam-l0c-q14.png wired in uploader manifest; image_required=true; image_alt non-revealing | OK |
| SAM-L0C-Q15 | tap all odd-number circles (select-multiple) | MULTIPLE_CHOICE placeholder, held (blocker C), 0C | NO | docx circle set = {6,2,1,5,10,12,24,35,40,41} (10 numbers); seed/authoring placeholder set = {1,10,26,5,12,24,35,41,40} (9): phantom "26", missing "6" and "2". No 0C-15 crop; numbers taken from docx text. Correct answers {1,5,35,41} still all present, so answer model unaffected | BLOCKED-taxonomy-gap (content_id null) + FLAG option-set transcription error (see Blocked detail) |
| SAM-L0C-Q16 | break apart 32 into tens+ones (multi-blank) | MULTI_BLANK, ACTIVE, 0C | yes | crop 0C-16.png (three ten-bundles + two ones = 32, decomposed) viewed. Digital adaptation uses two blanks 32 = ___ + ___ -> 30 + 2 (image shows 30 given + "?"); text-only adaptation is faithful, answer correct | OK |

**Counts:** 16 items / 13 faithful / 0 fixed / 3 blocked.
(Faithful counts the 13 in-scope rows judged faithful: Q01,Q02,Q03,Q04,Q06,Q07,Q08,Q09,Q10,Q12,Q13,Q14,Q16. Q11 is out-of-scope/FIXED-elsewhere. Q05 and Q15 are blocked. Note Q15 is also a non-faithful placeholder.)

**Blocked detail:**
- **SAM-L0C-Q05 — BLOCKED-taxonomy-gap.** content_id null; no clean 0B "Comparing and Ordering" tax_content code exists (flagged in l0c-authoring.json taxonomy_gaps). Stem and option words are faithful to the docx; the row is correctly held-C (real interaction = multi-blank, not a wired format). No clear-cut SQL fix; needs a taxonomy code from the founder/curriculum before it can be authored/activated.
- **SAM-L0C-Q15 — BLOCKED-taxonomy-gap + option-set transcription error (FLAG, not auto-fixed).**
  - Taxonomy: content_id null; no clean 0C "Odd and Even Numbers" tax_content code (flagged in l0c-authoring.json taxonomy_gaps). Same gap as Q14.
  - Transcription error: the held placeholder option set in both `l0c-authoring.json` (the generator's source of truth) and the seed reads `{1,10,26,5,12,24,35,41,40}`. The docx source circle set is `{6,2,1,5,10,12,24,35,40,41}` — i.e. a phantom "26" was introduced and "6" and "2" were dropped. The correct odd answers `{1,5,35,41}` are still all present, so no served answer is wrong (the row is held/inactive anyway, and on activation the option set is supplied by `l0c-activation.json`, which currently has no Q15 entry).
  - Not auto-fixed because: (a) the row is a held, non-served placeholder; (b) a one-off SQL UPDATE would diverge from the `apply-l0-overlay` generator output and be overwritten on the next `pnpm convert:apply-l0-overlay`; the durable fix belongs in `l0c-authoring.json` and (when Q15 is activated) in `l0c-activation.json`, both of which sit behind the conversion pipeline and a taxonomy code that does not yet exist. Per the "when in doubt -> BLOCKED" rule this is left for the activation/authoring pass.
- **SAM-L0C-Q11 — FIXED-elsewhere (PR #89).** Out of scope for this audit; the number-line item is being re-landed as a 4x CLICK_IMAGE_SINGLE split in PR #89. Not touched here.

**Other observations (no action — all correctly authored):**
- Banding matches the docx Summary LEVEL column exactly (Q01-Q13 = 0B, Q14-Q16 = 0C).
- `short_test_eligible` matches the docx Short column for all 16 tasks (Y/N).
- Active items with answers derivable from stem text alone (Q09/Q10) carry no image_path; their crops are decorative — correct.
- Active image-bearing items (Q13 tiles, Q14 stimulus) are already wired in
  `scripts/conversion/upload-activation-images.ts` (manifest, 42 images) with non-revealing
  image_alt. No new images required for 0C.
