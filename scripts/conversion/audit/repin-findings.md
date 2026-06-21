# Crosswalk re-pin findings — three ambiguous QA items (lane/qa-crosswalk-l1l2)

Source of truth for "which row does the founder's served-order note mean" is the
engine-replay crosswalk (`served-crosswalk.md` / `.json`), which replays the real
adaptive engine over `supabase/seed.sql`. The replay does not mint images, so it is
unaffected by the image-upload path. Each item below was source-verified against
`scripts/conversion/source/1/Level 1 Placement Worksheet.docx` (stems + Question Key)
and the per-figure crops.

## Crosswalk integrity (Task 1)

The earlier "MISMATCH — parser needs review" banner was a STALE hardcoded expectation,
not a real served≠eligible gap. The script now treats the manual estimate as a
cross-check, not ground truth:

- The estimate used L1 band {0C} = 3, but the real `levelBand.ts` yields band
  {0C,KA,KB} = 8 eligible. L3/L4 estimates were off by one (a manual miscount).
  0B (13) and L2 (27) matched exactly, validating the seed parser.

### Per-child served-vs-eligible verdict (engine replay, both answer paths)

| Child (band) | Eligible | Served | Stop reason | Verdict |
|---|---|---|---|---|
| QA Zero-C {0B} | 13 | 13 | all-strands-excluded | ✅ bank-exhaustion — serves the full eligible set |
| QA Level 1 {0C,KA,KB} | 8 | 8 | all-strands-excluded | ✅ bank-exhaustion — serves the full eligible set |
| QA Level 2 {1A,1B} | 27 | 25 | max-questions (25 cap) | ✅ correct — capped at 25 by design; 2 eligible left unserved |
| QA Level 3 {2A,2B} | 25 | 25 | max-questions (25 cap) | ✅ correct — exactly hits the 25 cap |
| QA Level 4 {3A,3B} | 13 | 13 | all-strands-excluded | ✅ bank-exhaustion — serves the full eligible set |

No child stops short due to a picker defect. Where served < 25 it is genuine
bank-exhaustion of the eligible previous-level set (0B/L1/L4); where served = 25 it is
the engine's MAX_QUESTIONS cap (L2/L3). Spot-checks against known items pass: the
"missing digit (■) subtraction" item pins to SAM-L4-Q06 (QA-L4 served pos 10), and
the "How much money is there?" items pin to SAM-L2-Q16 (QA-L2) and SAM-L3-Q12 (QA-L3).

## Re-pins (Task 2)

### L2-Q1 → SAM-L1-Q28 — FIXED
QA Level-2 served position 1 = SAM-L1-Q28 (the only "arrange 17/20/10" item; **not**
external_id SAM-L2-Q01, which is "1 and ___ make 10"). Source task 28: "Move the
numbers in order from smallest to largest." with movable tiles 17, 20, 10; key 10,17,20.
- Already DRAG_DROP (tile-ordering) from 20260610170100, but the stem was carried over
  from the original NUMERIC_ENTRY row and still embedded the literal numbers, duplicating
  the tiles. The 17/20/10 are the operands to arrange — kept as tiles, not deleted.
- Fix: stem → "Arrange the numbers in order, from smallest to largest." (direction kept so
  the ascending answer is unambiguous). items stay [17,20,10] (worksheet order ≠ answer
  order, so tiles serve shuffled); correct_order stays [10,17,20]. Grading unchanged.
- Migration `20260621120000_l1_q28_stem_rework.sql` + seed mirror.

### L2-Q2 → SAM-L1-Q23 — REPORTED (no fix; decision queue)
QA Level-2 served position 2 = SAM-L1-Q23 "Lily has 7 ribbons. She buys another 3 red
ribbons. How many ribbons does Lily have now?" (NUMERIC_ENTRY, answer 10). The crosswalk
confirms this is the **ribbon word problem**, NOT triangle-counting (SAM-L2-Q02, which is
served at L2 position 4) — so the founder's "ribbon images" note pins here.
- No serve-time image defect: the row is not `image_required`, has no image_path, and is
  fully answerable from the stem (the numbers 7 and 3 are stated in the text). The source
  ribbon figures (crops L1-23_1 = 7 blue ribbons, L1-23_2 = 3 red ribbons) are
  illustrative and redundant with the stem.
- Per task guidance ("do not invent a fix" when there is no image defect), no content
  change made. DECISION QUEUE: add illustrative ribbon art (crop+upload, image_required:
  false) for visual parity with the worksheet, or leave as text-only? Product/content call.

### L1-Q3 → SAM-L1-Q01 — REPORTED (already source-correct; no fix)
QA Level-1 served position 3 = SAM-L1-Q01 "Tap the things that have the same color."
(CLICK_IMAGE_MULTI; the only red-bearing item in the QA-L1 test). Source task 1: 6 objects.
- Crops L1-1_1..6 in worksheet order: red tulip, blue drop, red car, green apple, red
  top-hat, yellow balloon → reds are INTERLEAVED at positions 1/3/5. The current tiles
  (t1..t6) are authored in exactly this source order, and the serializer
  (`serialize.ts`) preserves authored tile order (no server-side shuffle/sort). So the
  reds are **not** bunched at render; the display already matches source.
- Grading is id-keyed (select-all on t1/t3/t5), independent of display order — shuffle-safe.
- No change needed. Reported for the record. (If a future render is observed to bunch the
  reds, it would be a player-side bug, not a content-ordering issue.)

## Decision queue (founder)
1. **L2-Q2 / SAM-L1-Q23**: add illustrative ribbon art (7 blue + 3 red), or keep
   text-only? No bug either way; the math is text-complete.
