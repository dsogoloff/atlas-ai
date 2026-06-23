# Level 5 & 6 conversion — content-supply gap report (2026-06-22)

**STOPPED per instruction** ("If any item lacks source … STOP and report it as a
content-supply gap rather than fabricating"). The L5/L6 source as provided is **not
sufficient to author gradeable, source-faithful questions**: it contains the blank
worksheet + the skills Question Summary, but **no correct-answer / solutions key**.
Nothing was fabricated, computed, loaded, or activated.

## What's in source (verified)
For each level, `scripts/conversion/source/<n>/`:
- `Level <n> Placement Worksheet.docx` — the **blank student worksheet** (questions +
  embedded figures) followed by a **Question Summary** ("Answer Key" / "Question Key")
  table: `Task | Concepts and Skills | Topic | Level | Short Test`.
- A handful of per-question PNG crops (see image inventory below).

Source-verified by rendering every page (Word → PDF → PNG) and reading the full text +
the Question Summary key for both levels:
- **Every** MC answer marker renders empty `(  )` and **every** `Answer: ____` line is
  blank — this is the *student* worksheet, not a marked/answer copy.
- The page titled "Answer Key" (L5) / "Question Key" (L6) is the **skills summary**
  (Task/Skills/Topic/Level/Short), **not** the solutions. No correct answers anywhere.

## GAP 1 — no answer/solutions key (BLOCKING, both levels, all 68 questions)
The Atlas pipeline derives `correct_answer` from a **paired answer-key** input
(Stage 2: "`correct_answer` from the paired answer key"); the L1–L4 runs used separate
answer-key PDFs. None was provided for L5/L6. Without the authoritative S.A.M. answers,
authoring gradeable rows would require **computing/inferring 68 placement answers** —
including estimation, rounding-convention, mixed-number-format, money and
geometry-from-figure items where the expected answer form is S.A.M.-specific. That is
exactly the inference the locked rule ("author from source, not from inference") and the
no-fabricate instruction forbid, and getting any wrong mis-places a child.
**→ Need: the S.A.M. Level-5 and Level-6 ANSWER KEYS** (the marked copy or the
solutions PDF), as separate inputs (same as L1–L4).

## GAP 2 — image-essential questions with no curated crop (L6 only, secondary)
Independent of GAP 1. These two L6 questions cannot be authored even with answers,
because the question data lives in a figure that has no crop in `source/6/`:
- **SAM-L6-Q25** — "Some water from a full tank is drained into a barrel … the figure
  shows the amount of water left" (2-part L / time). No `L6-25` crop.
- **SAM-L6-Q26** — "The figure is made up of identical rectangles … what percentage is
  shaded?" No `L6-26` crop.
**→ Need: curated crops for L6-Q25 and L6-Q26** (per-question, never the full page).

## Short-test column — fully read from the key (the mandatory field)
Transcribed verbatim from each Question Summary's `Short Test` column:
- **L5 (30 tasks):** Short = **Y for all except Task 12** ("Drawing angles to 180°" —
  manual draw, no auto-grade). → 29 Y / 1 N.
- **L6 (38 tasks):** Short = **Y for all except Task 17** ("Draw the top/side/front
  view of a solid") **and Task 35** ("Draw a parallelogram"). Both manual draw. → 36 Y / 2 N.

These are read and recorded now so that, once GAP 1 is closed, `short_test_eligible`
is set strictly from the key with zero guessing.

## Per-question inventory

### Level 5 — 30 tasks (Topic / Level / Short / format / image)
Levels per key: Tasks 1–27 = **Level 4** (booklet review), Tasks 28–30 = **Level 5**.
Image crops present: `L5-8, L5-14, L5-24, L5-25, L5-26, L5-27_1..4` → tasks 8,14,24,25,26,27. **All L5 image-essential gradeable questions have crops.**

| # | Skill (abbrev) | Topic | Lvl | Short | format | image | crop | answer |
|--|--|--|--|--|--|--|--|--|
|1|Place value within 100 000|Whole Numbers 1|4|Y|MC|–|–|**missing**|
|2|Compare within 100 000|Whole Numbers 1|4|Y|NUMERIC/text|–|–|**missing**|
|3|Estimate sum of two WN|Whole Numbers 2|4|Y|NUMERIC|–|–|**missing**|
|4|Common factors & multiples|Whole Numbers 2|4|Y|NUMERIC|–|–|**missing**|
|5|4-digit × 1-digit|Whole Numbers 3|4|Y|MC|–|–|**missing**|
|6|3-digit × 2-digit|Whole Numbers 3|4|Y|NUMERIC|–|–|**missing**|
|7|4-digit ÷ 1-digit w/ remainder|Whole Numbers 3|4|Y|MC|–|–|**missing**|
|8|Read line graph|Tables & Line Graphs|4|Y|NUMERIC|**essential**|L5-8|**missing**|
|9|Add mixed numbers (word)|Fractions|4|Y|NUMERIC|–|–|**missing**|
|10|Compare/order WN & fractions|Fractions|4|Y|DRAG/order|–|–|**missing**|
|11|Fraction of a set (word)|Fractions|4|Y|NUMERIC|–|–|**missing**|
|12|Draw angle to 180°|Angles|4|**N**|manual draw|–|–|n/a (manual)|
|13|Turns ↔ 8-point compass|Angles|4|Y|MC|–|–|**missing**|
|14|Unknown angle in a square|Squares & Rectangles|4|Y|NUMERIC|**essential**|L5-14|**missing**|
|15|Place value of decimals (3dp)|Decimals 1|4|Y|MC|–|–|**missing**|
|16|Compare/order decimals|Decimals 1|4|Y|order/text|–|–|**missing**|
|17|Subtract decimals + round|Decimals 2/1|4|Y|MC|–|–|**missing**|
|18|Decimal → fraction simplest|Decimals 1|4|Y|MC|–|–|**missing**|
|19|Estimate quotient dec ÷ WN|Decimals 2|4|Y|MC|–|–|**missing**|
|20|4-ops decimals (word)|Decimals 2|4|Y|NUMERIC ($)|–|–|**missing**|
|21|4-ops decimals (word)|Decimals 2|4|Y|NUMERIC ($)|–|–|**missing**|
|22|Convert minutes → seconds|Time|4|Y|NUMERIC|–|–|**missing**|
|23|Time in 24-hour clock|Time|4|Y|NUMERIC|–|–|**missing**|
|24|One dimension from perimeter|Area & Perimeter|4|Y|NUMERIC|**essential**|L5-24|**missing**|
|25|Composite-figure word problem|Area & Perimeter|4|Y|NUMERIC|**essential**|L5-25|**missing**|
|26|Line of symmetry?|Symmetry|4|Y|MC/identify|**essential**|L5-26|**missing**|
|27|Most lines of symmetry|Symmetry|4|Y|MC(image)|**essential**|L5-27_1..4|**missing**|
|28|Read/write WN to 10 million|Whole Numbers 1|5|Y|TEXT|–|–|**missing**|
|29|Compare WN to 10 million|Whole Numbers 1|5|Y|NUMERIC/text|–|–|**missing**|
|30|Round to nearest thousand + estimate|Whole Numbers 2|5|Y|NUMERIC|–|–|**missing**|

### Level 6 — 38 tasks
Levels per key: Tasks 1–35 = **Level 5** (booklet review), Tasks 36–38 = **Level 6** (Algebra).
Image crops present: `L6-14,15,16,17(-1/_2),18,19,30,31,32,33,34`. **Missing crops: L6-25, L6-26** (image-essential — GAP 2).

| # | Skill (abbrev) | Topic | Lvl | Short | format | image | crop | answer |
|--|--|--|--|--|--|--|--|--|
|1|Place value to 10 million|Whole Numbers|5|Y|NUMERIC|–|–|**missing**|
|2|Greater than 990 000|Whole Numbers|5|Y|MC|–|–|**missing**|
|3|Estimate sum (round to 1000)|Whole Numbers|5|Y|NUMERIC|–|–|**missing**|
|4|Round + divide by 500|Whole Numbers|5|Y|NUMERIC|–|–|**missing**|
|5|Order of operations|Four Ops of WN|5|Y|MC|–|–|**missing**|
|6|Multi-step 4-ops (word)|Four Ops of WN|5|Y|NUMERIC|–|–|**missing**|
|7|Fractions ↔ division|Fractions & Mixed Numbers|5|Y|MC|–|–|**missing**|
|8|Fraction → decimal|Fractions & Mixed Numbers|5|Y|NUMERIC|–|–|**missing**|
|9|Add mixed numbers|Add/Sub Mixed Numbers|5|Y|NUMERIC|–|–|**missing**|
|10|Subtract mixed → decimal (word)|Add/Sub Mixed Numbers|5|Y|NUMERIC|–|–|**missing**|
|11|Mixed number × WN|Multiplication …|5|Y|NUMERIC|–|–|**missing**|
|12|Product of two proper fractions|Multiplication …|5|Y|NUMERIC|–|–|**missing**|
|13|Multi-step 4-ops fractions (word)|Fractions|5|Y|NUMERIC|–|–|**missing**|
|14|Identify base & height of triangle|Area of Triangles …|5|Y|MC|**essential**|L6-14|**missing**|
|15|Area of a triangle|Area of Triangles …|5|Y|NUMERIC|**essential**|L6-15|**missing**|
|16|Area of composite figure|Area …|5|Y|NUMERIC|**essential**|L6-16|**missing**|
|17|Draw top/side/front view|Volume|5|**N**|manual draw|**essential**|L6-17|n/a (manual)|
|18|Volume of a cube|Volume|5|Y|MC|**essential**|L6-18|**missing**|
|19|Volume of liquid in tank (word)|Volume|5|Y|NUMERIC|**essential**|L6-19|**missing**|
|20|Decimal → fraction|Decimals|5|Y|MC|–|–|**missing**|
|21|Decimal × tens/hundreds/thousands|Decimals|5|Y|NUMERIC|–|–|**missing**|
|22|Convert measurement (kg→g)|Decimals/Measure|5|Y|NUMERIC|–|–|**missing**|
|23|Rate (find rate/total/units)|Rate|5|Y|NUMERIC|–|–|**missing**|
|24|Rate (word)|Rate|5|Y|NUMERIC ($)|–|–|**missing**|
|25|Volume of liquid (drained tank, word)|Volume|5|Y|NUMERIC×2|**essential**|**none (L6-25)**|**missing**|
|26|Percentage of figure shaded|Percentage|5|Y|NUMERIC %|**essential**|**none (L6-26)**|**missing**|
|27|Fraction → percentage (>50%?)|Percentage|5|Y|MC|–|–|**missing**|
|28|Find the part using percentage|Percentage|5|Y|NUMERIC|–|–|**missing**|
|29|Percentage word problem (tax)|Percentage|5|Y|NUMERIC ($)|–|–|**missing**|
|30|Read pie chart (percentage)|Percentage|5|Y|NUMERIC ×2|**essential**|L6-30|**missing**|
|31|Unknown angle on a straight line|Angles|5|Y|MC|**essential**|L6-31|**missing**|
|32|Unknown angle right triangle|Triangles|5|Y|NUMERIC|**essential**|L6-32|**missing**|
|33|Unknown angle isosceles triangle|Triangles|5|Y|NUMERIC|**essential**|L6-33|**missing**|
|34|Unknown angle in a rhombus|Quadrilaterals|5|Y|NUMERIC|**essential**|L6-34|**missing**|
|35|Draw a parallelogram|Quadrilaterals|5|**N**|manual draw|–|–|n/a (manual)|
|36|Simplify linear expression|Algebra|6|Y|TEXT|–|–|**missing**|
|37|Evaluate expression by substitution|Algebra|6|Y|NUMERIC|–|–|**missing**|
|38|Solve linear equation|Algebra|6|Y|NUMERIC|–|–|**missing**|

(`format` is inferred from the worksheet layout — MC where four options print, else free-response NUMERIC/TEXT — for planning only; final formats will be set during authoring once answers exist.)

## Pipeline status
- Stage 1 (extract) needs PDFs in `input/`; `input/` is empty and only `.docx` exist —
  not the blocker (the docx renders fine; the missing **answer key** is).
- Stages 2–4 (segment/AI-tag/load) all depend on a paired answer key for
  `correct_answer`, and the AI-tag stage is **inference**, which the instructions
  prohibit for authoring. Running them now would emit ungradeable/AI-guessed rows.
- **No migration, seed, or DB change made.** Verify bar unaffected (docs-only lane).

## What I need to finish the conversion (single round)
1. **S.A.M. Level-5 and Level-6 answer keys** (marked copy or solutions) — closes GAP 1
   for all 68 questions. Drop them in `source/5` and `source/6` (or `input/` as PDFs).
2. **Curated crops for L6-Q25 and L6-Q26** — closes GAP 2.

With those in hand I can author all questions source-faithfully (answers from the key,
`short_test_eligible` strictly from the Short column already transcribed above),
content_id / strand / sub-strand / difficulty / misconception per the Atlas scheme,
wire crops, load via UPDATEs mirrored in `seed.sql`, and run the verify bar.
