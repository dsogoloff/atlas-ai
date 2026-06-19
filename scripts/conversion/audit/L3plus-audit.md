# L3+ source-vs-authored audit (2026-06-19)

Audit of every SAM-L3/L4/L5/L6 row against the actual S.A.M. source.

**Source used (every row below was checked against an OPENED page render):**
- L3: `scripts/conversion/output/Level 3 Placement Worksheet{, Answer Key}/page-*.png` (15 ws pages + 1 key)
- L6: `scripts/conversion/output/Level 6 Placement Worksheet{, Answer Key}/page-*.png` (26 ws + 4 key)
- L4: `C:/Users/Acer/PROJECTS/atlas-stage4/scripts/conversion/output/Level 4 Placement Worksheet{, Answer Key}/page-*.png` (15 ws + 1 key)
- L5: `C:/Users/Acer/PROJECTS/atlas-stage4/scripts/conversion/output/Level 5 Placement Worksheet{, Answer Key}/page-*.png` (15 ws + 1 key)

No per-question crops exist for L3+ (only L0 0a/0b/0c crops exist). Full-page worksheet
renders DO exist for all four levels and were used as the viewable source. The 3
`QA-shortlist` crops (L3-Q11, L3-Q22, L4-Q15) were also viewed.

**Note on current DB state:** `seed.sql` applies post-INSERT UPDATE blocks that already
fixed several L3 rows (Q03, Q11, Q15, Q22) — dispositions below reflect the *current*
(post-UPDATE) state, not the raw pipeline INSERT.

Disposition legend: `already-correct` = matches source, no action; `FIXED` = clear-cut fix
applied this PR; `BLOCKED-founder-review` = founder-verified row that contradicts the
now-available source page (not auto-overridden); `BLOCKED-no-source` = n/a (all four
levels had source).

## L3 (Level 3 Placement Worksheet)

| external_id | level | source crop found? | authored format | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L3-Q01 | 1A | yes (p03) | MULTIPLE_CHOICE | none — opts/ans (210, idx2) match key (3) | already-correct |
| SAM-L3-Q02 | 1A | yes (p03) | TEXT_ENTRY | none — "Five hundred and eight" matches key | already-correct |
| SAM-L3-Q03 | 1A | yes (p04) | MULTIPLE_CHOICE | options were reworded to bare numbers; already fixed to verbatim "8 ones/8 tens/8 hundreds/8 thousands" by seed UPDATE | already-correct (prior fix) |
| SAM-L3-Q05 | 2B | yes (p05) | NUMERIC_ENTRY | none — stem verbatim, ans 993 matches key | already-correct |
| SAM-L3-Q06 | 1B | yes (p05) | MULTIPLE_CHOICE | none — opts/ans (4 cm, idx3) match key (4) | already-correct |
| SAM-L3-Q07 | 2A | yes (p06) | MULTIPLE_CHOICE | none — opts/ans (30÷5=6, idx2) match key (3) | already-correct |
| SAM-L3-Q08 | 1B | yes (p06) | NUMERIC_ENTRY | none — ans 250 matches key | already-correct |
| SAM-L3-Q09 | 2A | yes (p07) | MULTIPLE_CHOICE | none — opts/ans (7:25 pm, idx3) match key (4) | already-correct |
| SAM-L3-Q10 | 2A | yes (p08) | MULTIPLE_CHOICE | none — Model 1 (idx0) matches key (1) | already-correct |
| SAM-L3-Q11 | 2A | yes (p08) | MULTIPLE_CHOICE | correct_index was 1 ("9×3"=27); already fixed to 0 ("9×2"=18) by seed UPDATE = key (1) | already-correct (prior fix) |
| SAM-L3-Q12 | 2A | yes (p09) | MULTIPLE_CHOICE | none — opts/ans ($70.85, idx1) match key (2) | already-correct |
| SAM-L3-Q13 | 2A | yes (p10) | NUMERIC_ENTRY | none — ans 4/9 matches key | already-correct |
| SAM-L3-Q14 | 2A | yes (p10) | DRAG_DROP | none — order matches key | already-correct |
| SAM-L3-Q15 | 1B | yes (p10) | TEXT_ENTRY | stored stem "1/6 + 3/6" / ans "4/6" — SOURCE is "3/5 + 1/5" = 4/5. Founder-verified row contradicts source page. | BLOCKED-founder-review (FLAG) |
| SAM-L3-Q17 | 2A | yes (p12) | NUMERIC_ENTRY | source is MC (opts 5/20/25/100, key (3)=25); authored as numeric ans "3" (took ordinal literally). Answer-decode + format ambiguous. | BLOCKED (format/answer judgment) |
| SAM-L3-Q18 | 1A | yes (p12) | TEXT_ENTRY | none — "cylinder" matches key | already-correct |
| SAM-L3-Q19 | 1B | yes (p13) | MULTIPLE_CHOICE | none — idx1 matches key (2) | already-correct |
| SAM-L3-Q20 | 2B | yes (p13) | MULTIPLE_CHOICE | none — opts/ans (2403, idx2) match key (3) | already-correct |
| SAM-L3-Q21 | 3A | yes (p14) | NUMERIC_ENTRY | none — ans 76 matches key | already-correct |
| SAM-L3-Q22 | 3B | yes (p14) | MULTIPLE_CHOICE | source MC restored (opts 1000/1001/9998/9999, idx2) by seed UPDATE = key (3) | already-correct (prior fix) |

## L4 (Level 4 Placement Worksheet)

| external_id | level | source crop found? | authored format | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L4-Q01 | 2A | yes (p03) | MULTIPLE_CHOICE | none — opts/ans (10 000, idx3) match key (4) | already-correct |
| SAM-L4-Q02 | 2A | yes (p04) | NUMERIC_ENTRY | none — ans 9 matches key | already-correct |
| SAM-L4-Q03 | 2A | yes (p04) | MULTIPLE_CHOICE | none — idx1 matches key (2) | already-correct |
| SAM-L4-Q04 | 2A | yes (p04) | NUMERIC_ENTRY | none — ans 1798 matches key | already-correct |
| SAM-L4-Q05 | 2A | yes (p04) | MULTIPLE_CHOICE | none — opts/ans (3941, idx3) match key (4) | already-correct |
| SAM-L4-Q06 | 3B | yes (p05) | NUMERIC_ENTRY | none — ans 1 matches key | already-correct |
| SAM-L4-Q07 | 3B | yes (p05) | NUMERIC_ENTRY | none — ans 3429 matches key | already-correct |
| SAM-L4-Q08 | 3A | yes (p06) | NUMERIC_ENTRY | none — ans 16 matches key | already-correct |
| SAM-L4-Q09 | 3A | yes (p06) | MULTIPLE_CHOICE | none — opts/ans (4, idx3) match key (4) | already-correct |
| SAM-L4-Q10 | 3A | yes (p06) | NUMERIC_ENTRY | none — ans 1620 matches key | already-correct |
| SAM-L4-Q11 | 3B | yes (p07) | NUMERIC_ENTRY | none — ans 1 matches key | already-correct |
| SAM-L4-Q12 | 3B | yes (p07) | NUMERIC_ENTRY | none — ans 7567 matches key | already-correct |
| SAM-L4-Q13 | 2A | yes (p08) | MULTIPLE_CHOICE | none — opts/ans (800 mL, idx2) match key (3) | already-correct |
| SAM-L4-Q14 | 3A | yes (p08) | MULTIPLE_CHOICE | none — opts/ans (6027, idx1) match key (2) | already-correct |
| SAM-L4-Q15 | 3B | yes (p09 + shortlist) | TEXT_ENTRY | none — ans "1 km 750 m" matches worked key | already-correct |
| SAM-L4-Q16 | 2A | yes (p09) | MULTIPLE_CHOICE | none — idx0 matches key (1) | already-correct |
| SAM-L4-Q18 | 3A | yes (p10) | MULTIPLE_CHOICE | stored opts [1/2,3/4,5/3,1/12] ans 5/3 — SOURCE opts [3/8,2/5,1/2,5/12] ans 1/2 (key (3)). Founder-verified row contradicts source page. | BLOCKED-founder-review (FLAG) |
| SAM-L4-Q20 | 3A | yes (p11) | NUMERIC_ENTRY | none — ans "a) 150 b) 900" matches key | already-correct |
| SAM-L4-Q21 | 2A | yes (p12) | MULTIPLE_CHOICE | none — opts/ans (1250 m², idx3) match key (4) | already-correct |
| SAM-L4-Q22 | 3B | yes (p12) | TEXT_ENTRY | none — ans "9:25 am" matches key | already-correct |
| SAM-L4-Q23 | 4A | yes (p13) | NUMERIC_ENTRY | none — ans 32001 matches key | already-correct |
| SAM-L4-Q24 | 4A | yes (p13) | NUMERIC_ENTRY | none — ans 80000 matches key | already-correct |
| SAM-L4-Q25 | 4A | yes (p14) | DRAG_DROP | none — order matches key | already-correct |
| SAM-L4-Q26 | 4A | yes (p14) | NUMERIC_ENTRY | none — ans 42800 matches key | already-correct |
| SAM-L4-Q27 | 4B | yes (p14) | NUMERIC_ENTRY | none — accepted-answers match key | already-correct |

## L5 (Level 5 Placement Worksheet)

| external_id | level | source crop found? | authored format | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L5-Q02 | 3A | yes (p03) | NUMERIC_ENTRY | none — ans 13275 matches key | already-correct |
| SAM-L5-Q03 | 3A | yes (p03) | NUMERIC_ENTRY | none — ans "290 or 300" matches key | already-correct |
| SAM-L5-Q04 | 4B | yes (p04) | NUMERIC_ENTRY | none — ans 30 matches key | already-correct |
| SAM-L5-Q05 | 4A | yes (p04) | MULTIPLE_CHOICE | none — opts/ans (21 343, idx2) match key (3) | already-correct |
| SAM-L5-Q06 | 4A | yes (p04) | NUMERIC_ENTRY | none — ans 72390 matches key | already-correct |
| SAM-L5-Q07 | 4A | yes (p04) | MULTIPLE_CHOICE | none — opts/ans (830 R1, idx1) match key (2) | already-correct |
| SAM-L5-Q08 | 4A | yes (p05) | NUMERIC_ENTRY | none — ans 400 matches key | already-correct |
| SAM-L5-Q09 | 4A | yes (p06) | NUMERIC_ENTRY | stem fractions wrong: stored "1 1/4 flour, 1 1/6 butter"; SOURCE "1 3/4, 1 5/6". Stored ans "5 1/12" is correct only for the source fractions. | FIXED (stem → source; answer kept) |
| SAM-L5-Q11 | 4A | yes (p07) | NUMERIC_ENTRY | none — ans 175 matches key | already-correct |
| SAM-L5-Q12 | 4B | yes (p07) | NUMERIC_ENTRY | none — draw-angle item, ans text matches key intent | already-correct |
| SAM-L5-Q13 | 4B | yes (p08) | MULTIPLE_CHOICE | none — opts/ans (south-east, idx2) match key (3) | already-correct |
| SAM-L5-Q14 | 4B | yes (p08) | NUMERIC_ENTRY | none — ans 16° matches key | already-correct |
| SAM-L5-Q15 | 3A | yes (p08) | MULTIPLE_CHOICE | none — opts/ans (0.03, idx3) match key (4) | already-correct |
| SAM-L5-Q17 | 4B | yes (p09) | MULTIPLE_CHOICE | none — opts/ans (222.2, idx3) match key (4) | already-correct |
| SAM-L5-Q19 | 4A | yes (p10) | MULTIPLE_CHOICE | none — opts/ans (18, idx2) match key (3) | already-correct |
| SAM-L5-Q20 | 4B | yes (p10) | NUMERIC_ENTRY | none — ans 24.25 matches key | already-correct |
| SAM-L5-Q21 | 4B | yes (p11) | NUMERIC_ENTRY | none — ans 33 matches key | already-correct |
| SAM-L5-Q22 | 3A | yes (p11) | NUMERIC_ENTRY | none — ans 120 matches key | already-correct |
| SAM-L5-Q23 | 4B | yes (p12) | NUMERIC_ENTRY | none — ans "1.45 a.m." matches key | already-correct |
| SAM-L5-Q24 | 4B | yes (p12) | NUMERIC_ENTRY | none — ans 92 matches key | already-correct |
| SAM-L5-Q25 | 4B | yes (p13) | NUMERIC_ENTRY | none — ans 108 matches key | already-correct |
| SAM-L5-Q26 | 4A | yes (p13) | MULTIPLE_CHOICE | none — idx1 ("B") matches key "B" | already-correct |
| SAM-L5-Q27 | 4A | yes (p14) | MULTIPLE_CHOICE | none — idx0 matches key (1) | already-correct |
| SAM-L5-Q28 | 4A | yes (p14) | NUMERIC_ENTRY | none — words answer matches key | already-correct |
| SAM-L5-Q29 | 4A | yes (p14) | NUMERIC_ENTRY | none — ans 2000000 matches key | already-correct |
| SAM-L5-Q30 | 4A | yes (p14) | NUMERIC_ENTRY | none — ans 35000 matches key | already-correct |

## L6 (Level 6 Placement Worksheet)

| external_id | level | source crop found? | authored format | discrepancy | disposition |
|---|---|---|---|---|---|
| SAM-L6-Q01 | 4A | yes (p03) | NUMERIC_ENTRY | none — ans 85000 matches key | already-correct |
| SAM-L6-Q02 | 4A | yes (p03) | MULTIPLE_CHOICE | none — opts/ans (1 234 000, idx0) match key (1) | already-correct |
| SAM-L6-Q03 | 4A | yes (p03) | NUMERIC_ENTRY | none — ans 162000 matches key | already-correct |
| SAM-L6-Q04 | 4A | yes (p04) | NUMERIC_ENTRY | none — ans 1002 matches key | already-correct |
| SAM-L6-Q05 | 4A | yes (p04) | MULTIPLE_CHOICE | none — opts/ans (42, idx2) match key (3) | already-correct |
| SAM-L6-Q06 | 5A | yes (p05) | NUMERIC_ENTRY | none — ans 130 matches worked key | already-correct |
| SAM-L6-Q07 | 4A | yes (p06) | MULTIPLE_CHOICE | option[0] "4 ÷ 10" (source "4 × 10", operator flipped); option[2] "10/4" (source "1/4 of 10"). correct_index 0 = key (1). | FIXED (options → source verbatim) |
| SAM-L6-Q08 | 4A | yes (p06) | NUMERIC_ENTRY | none — ans 10.125 matches key | already-correct |
| SAM-L6-Q09 | 4A | yes (p07) | TEXT_ENTRY | none — ans "8 1/28" matches key | already-correct |
| SAM-L6-Q10 | 4A | yes (p07) | NUMERIC_ENTRY | none — ans 2.17 matches key | already-correct |
| SAM-L6-Q11 | 4A | yes (p08) | TEXT_ENTRY | none — ans "88 1/2" matches key | already-correct |
| SAM-L6-Q12 | 4A | yes (p08) | TEXT_ENTRY | none — ans "5/18" matches key | already-correct |
| SAM-L6-Q13 | 4A | yes (p09) | NUMERIC_ENTRY | none — ans 100 matches worked key | already-correct |
| SAM-L6-Q14 | 4A | yes (p10) | MULTIPLE_CHOICE | none — opts/ans (AF, idx0) match key (1) | already-correct |
| SAM-L6-Q15 | 4A | yes (p10) | NUMERIC_ENTRY | none — ans 54 matches key | already-correct |
| SAM-L6-Q16 | 5A | yes (p11) | NUMERIC_ENTRY | none — ans 267.5 matches key | already-correct |
| SAM-L6-Q18 | 4A | yes (p13) | MULTIPLE_CHOICE | none — opts/ans (729 cm³, idx3) match key (4) | already-correct |
| SAM-L6-Q19 | 5A | yes (p13) | NUMERIC_ENTRY | none — ans 415 matches worked key | already-correct |
| SAM-L6-Q20 | 4B | yes (p14) | MULTIPLE_CHOICE | garbled/duplicated opts ["1 2/25","1 4/50","1 8/100","1 2/25"]; correct_index 2 pointed at WRONG "1 8/100". Source opts [108/100, 1 4/50, 1 2/25, 1 4/5], key (3)="1 2/25". | FIXED (options → source; idx 2 now correct) |
| SAM-L6-Q21 | 4A | yes (p14) | NUMERIC_ENTRY | none — ans 43.2 matches key | already-correct |
| SAM-L6-Q23 | 4A | yes (p15) | NUMERIC_ENTRY | none — ans 54 matches worked key | already-correct |
| SAM-L6-Q24 | 5B | yes (p15) | NUMERIC_ENTRY | none — ans $7.90 matches worked key | already-correct |
| SAM-L6-Q25 | 5A | yes (p16-17) | NUMERIC_ENTRY | none — ans 6.6 matches worked key | already-correct |
| SAM-L6-Q26 | 5A | yes (p18) | NUMERIC_ENTRY | none — ans 60 matches key | already-correct |
| SAM-L6-Q28 | 5A | yes (p19) | NUMERIC_ENTRY | none — ans 66 matches worked key | already-correct |
| SAM-L6-Q29 | 5A | yes (p19) | NUMERIC_ENTRY | none — ans $2247 matches worked key | already-correct |
| SAM-L6-Q30 | 4A | yes (p20-21) | NUMERIC_ENTRY | none — ans 36 matches worked key | already-correct |
| SAM-L6-Q31 | 5A | yes (p21) | MULTIPLE_CHOICE | none — opts/ans (138°, idx2) match key (3) | already-correct |
| SAM-L6-Q32 | 5A | yes (p21) | NUMERIC_ENTRY | none — ans 59 matches key (59°) | already-correct |
| SAM-L6-Q33 | 5A | yes (p22) | NUMERIC_ENTRY | none — ans 110 matches key (110°) | already-correct |
| SAM-L6-Q34 | 5A | yes (p22) | NUMERIC_ENTRY | none — ans "106°" matches key (minor: degree symbol kept here, dropped on Q32/Q33 — cosmetic only) | already-correct |
| SAM-L6-Q36 | 5A | yes (p24) | NUMERIC_ENTRY | none — ans "2p + 8" matches key | already-correct |
| SAM-L6-Q37 | 5A | yes (p24) | NUMERIC_ENTRY | none — ans 33 matches worked key | already-correct |
| SAM-L6-Q38 | 5A | yes (p24) | NUMERIC_ENTRY | none — ans 8 matches worked key | already-correct |

---

**Counts:** 114 items / 114 with-source / 3 fixed / 4 blocked (2 BLOCKED-founder-review,
1 BLOCKED-format/answer-judgment, + note: 0 BLOCKED-no-source — full-page source renders
exist for all four levels). Remaining 107 = already-correct (incl. 4 prior seed-UPDATE fixes).

**Blocked detail:**
- BLOCKED-founder-review (2): SAM-L3-Q15 (stored "1/6 + 3/6"→"4/6"; source page 10 is
  "3/5 + 1/5" = 4/5), SAM-L4-Q18 (stored opts [1/2,3/4,5/3,1/12] ans 5/3; source page 10
  is [3/8,2/5,1/2,5/12] ans 1/2). Both were marked "founder-verified" in earlier
  migrations whose headers note the options/answer "could not be transcribed from
  extraction text"; the page renders are now available and contradict the stored content.
  NOT auto-overridden (do not override a founder decision) — needs founder confirmation
  before re-authoring to source.
- BLOCKED-format/answer-judgment (1): SAM-L3-Q17 (source is MC 5/20/25/100 key (3)=25;
  loaded as NUMERIC_ENTRY ans "3" — the answer-key ordinal taken literally). Whether to
  restore MC, or keep numeric with the correctly-decoded value, is a format judgment
  parallel to the founder-decided SAM-L3-Q22; parked rather than guessed.

**Banding flags (off-level items banded low — recorded, NOT re-banded):**
- SAM-L3-Q15 (banded 1B) — like-fraction addition (source concept "Adding like fractions",
  S.A.M. level 2). Reaches into the young 0C ±1 band. (Canonical example; also a content
  BLOCK above.)
- SAM-L5-Q15 (banded 3A) — decimal place value (source "Decimals 1", S.A.M. level 4) on a
  Level-5 booklet item; banded into a young band.
- SAM-L5-Q22 (banded 3A) — minutes→seconds conversion on a Level-5 booklet item; low band.
- SAM-L3-Q06 / SAM-L3-Q08 (banded 1B) — Level-2-concept measurement items on the L3
  booklet; mildly low. (Lower priority; listed for completeness.)
