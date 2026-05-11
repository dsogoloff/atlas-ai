# Atlas Assessment — Content Taxonomy

## Purpose and framing

Atlas uses a 2-layer taxonomy for placement diagnostics. The top layer is the MOE official content organization (3 strands), used so Atlas placement results map cleanly to Singapore curriculum vocabulary for parent and school communication. The diagnostic layer is Atlas's value-add: 6 finer-grained bands the adaptive engine uses for posterior estimation and the parent report uses for actionable mastery breakdown.

Every Atlas band maps to exactly one MOE strand and one or more MOE sub-strands. Bands never cross MOE strand boundaries.

## MOE strand reference

Source: 2021 MOE Primary Mathematics Syllabus, Updated October 2025 — [PDF](https://www.moe.gov.sg/api/media/92bff26d-b2b4-4535-b868-b8415c744b91/2021-Primary-Mathematics-Syllabus-P1-to-P6-Updated-October-2025.pdf), Section 5 ("Content by Level").

The syllabus organizes content into 3 strands. Sub-strand and topic coverage below is the P1-P2 scope verified for the v1 demo:

### 1. Number and Algebra

- **Whole Numbers**
  - P1: Numbers up to 100; Addition and Subtraction (within 100); Multiplication and Division (multiplying within 40, dividing within 20)
  - P2: Numbers up to 1000; Addition and Subtraction (algorithms up to 3 digits); Multiplication and Division (tables of 2, 3, 4, 5, 10)
- **Fractions**
  - P2 onward: Fraction of a Whole (denominators ≤ 12); Addition and Subtraction (like fractions within one whole)
- **Money**
  - P1: cents up to $1, dollars up to $100
  - P2: dollars and cents, decimal notation, comparing and converting amounts

### 2. Measurement and Geometry

- **Measurement**
  - P1: Length (cm); Time (telling time to 5 min, am/pm, duration of hour and half hour)
  - P2: Length / Mass / Volume (m, g, kg, L); Time (telling time to the minute, measuring time in hours)
- **Geometry**
  - P1: 2D Shapes (identifying rectangle/square/triangle/circle/half circle/quarter circle, forming figures, identifying composite shapes, copying on dot/square grid)
  - P2: 2D shape extensions

### 3. Statistics

- **Data Representation and Interpretation**
  - P1: Picture Graphs (reading and interpreting data)
  - P2: data representation extensions

P3-P6 content is out of scope for the v1 demo. Sub-strand names and ranges for those levels are not asserted in this document until imports land.

## The 6 Atlas diagnostic bands

Each band lists: machine-readable enum value, human-readable label, MOE strand parent, MOE sub-strand(s) covered, definition, and worked examples from the imported question bank where coverage exists.

### 1. `number_sense` — Number Sense

- **MOE strand**: Number and Algebra
- **MOE sub-strand(s)**: Whole Numbers — the *structure* of numbers (notation, place value, magnitude, composition, ordering, patterns)
- **Definition**: Questions where the diagnostic is whether the child understands how numbers are built and related, not whether they can compute a result. Includes number bonds, place-value decomposition, ordering, magnitude comparison, skip-counting patterns. The cognitive task is *recognize / identify / arrange numbers*, not *perform an arithmetic procedure*.

**Examples from current bank:**

- **SAM-L2-Q01** (1A): *"What is the missing number? 1 and ___ make 10."* — Number bond. Surface looks like addition, but the diagnostic is whether the child has internalized the composition of 10 (10 = 1 + 9), not whether they can compute 10 − 1.
- **SAM-L2-Q07** (1B): *"76 = ___ tens 6 ones"* — Place-value decomposition; identifies whether the child reads multi-digit numbers structurally.
- **SAM-L2-Q21** (2B): *"Arrange in order, greatest first: 652, 716, 629, 708"* — Magnitude comparison across three-digit numbers.
- **SAM-L2-Q22** (2B): *"860, 840, 820, 800, ?"* — Skip-counting pattern with a hundreds-boundary crossing.

### 2. `operations_algorithms` — Operations & Algorithms

- **MOE strand**: Number and Algebra
- **MOE sub-strand(s)**: Whole Numbers (the *procedures* — addition, subtraction, multiplication, division, including regrouping); Money (when the diagnostic is the arithmetic, not the decimal-notation aspect — see Money classification in edge cases)
- **Definition**: Questions where the diagnostic is whether the child can execute an arithmetic procedure — pick the right operation, apply the algorithm correctly (with regrouping where required), produce a numerical result. Word problems with an underlying operation classify here, by that operation. No WORD_PROBLEMS escape hatch.

**Examples from current bank:**

- **SAM-L2-Q11** (2A): *"Jo had 7 apples. Her brother gave her some more. She has 35 now. How many did her brother give her?"* — Change-unknown word problem; underlying operation is 35 − 7 with regrouping.
- **SAM-L2-Q14** (2A): *"Mrs Tan puts 12 birds into 3 cages. How many in each cage?"* — Partitive division.
- **SAM-L2-Q17** (2A): *"Larry has $45. He buys a school bag for $29. How much does he have left?"* — Money + subtraction with regrouping. Money framing is incidental; diagnostic is the subtraction procedure.

### 3. `fractions_decimals` — Fractions & Decimals

- **MOE strand**: Number and Algebra
- **MOE sub-strand(s)**: Fractions (P2 onward); decimal-notation aspect of Money (P2 only — when the diagnostic is the notation $2.50 vs. 250¢ rather than the arithmetic). Standalone decimal content at upper primary will map here once imports land; the precise upper-primary sub-strand name is not asserted in this document.
- **Definition**: Questions about fractional or decimal number representations — naming, comparing, ordering, converting between forms, performing operations on fractions or decimals where the conceptual focus is the representation itself.

**Coverage in current bank**: **none**. Item #11 deferred all P2 fraction items. The first `fractions_decimals` row arrives with the next content import wave.

**Forward-looking example** (illustrative, not yet imported): *"Which fraction is larger: ½ or ¼?"* — Fraction comparison.

### 4. `measurement` — Measurement

- **MOE strand**: Measurement and Geometry
- **MOE sub-strand(s)**: Measurement (length, mass, volume, time)
- **Definition**: Questions about measuring physical quantities — reading instruments (ruler, scale, clock), choosing or converting units, computing durations or differences in measured quantities. The diagnostic is the measurement skill, not the underlying arithmetic.

**Coverage in current bank**: **none**. Q05 and Q12 of the original 22 SAM-L2 source items (picture-graph chart reading; toy car on a ruler) would have classified here. Both deferred from Item #11 for image-asset infrastructure.

**Forward-looking example**: *"The toy car ends at 9 cm and starts at 2 cm on the ruler. How long is it?"* — Length measurement with zero-point reasoning. The diagnostic is reading the ruler correctly, not the subtraction.

### 5. `geometry` — Geometry

- **MOE strand**: Measurement and Geometry
- **MOE sub-strand(s)**: Geometry (2D shapes and spatial reasoning at P1-P2)
- **Definition**: Questions about identifying, classifying, composing, or decomposing 2D shapes (and at upper primary, 3D shapes). Spatial-property reasoning lives here.

**Coverage in current bank**: **none**. Q02 and Q03 of the original 22 SAM-L2 source items (counting overlapping triangles; identifying composite shapes) would have classified here. Both deferred from Item #11 for image-asset infrastructure.

**Forward-looking example**: *"Which two shapes make up the figure below?"* — Composite shape decomposition.

### 6. `data_statistics` — Data & Statistics

- **MOE strand**: Statistics
- **MOE sub-strand(s)**: Data Representation and Interpretation
- **Definition**: Questions about reading, interpreting, comparing, or summarizing data presented in a chart, table, or graph. The diagnostic is interpreting the representation, not the underlying arithmetic.

**Coverage in current bank**: **none**. Q05 of the original 22 SAM-L2 source items (picture-graph reading + comparison subtraction) had a foot in both `data_statistics` and `operations_algorithms` — see Edge case F below.

**Forward-looking example**: *"In the picture graph, Mark has 14 shells and Adam has 5. How many more does Mark have?"* — Picture-graph reading with comparison.

## Edge case examples

The failure mode of a taxonomy rubric is wishy-washy edge cases that don't resolve. Each pair below names a rule, then 1-2 examples with classification reasoning.

### Edge case A: Number Sense vs Operations & Algorithms

**Rule**: Classify by what the *distractors* target. Distractors that are arithmetic errors (subtraction direction, computation mistakes) point at the procedure → `operations_algorithms`. Distractors that are number-structure errors (place value, digit concatenation, zero placeholder) point at the structure → `number_sense`. Surface form "X more than Y" can sit in either band; the diagnostic intent is what the distractors reveal.

- **SAM-L2-Q09** (1A): *"What is 3 more than 54?"* — Distractors: 51 (subtraction direction), 84 (place-value misread), 543 (digit concatenation). Two of three distractors target number structure; one targets the operation. **Surface tag in this document: `operations_algorithms`** — the correct path requires performing 54 + 3, and the place-value distractors capture *how* the child went wrong while performing it. Defensible alternate: `number_sense` by virtue of distractor weight. **Flagged for founder review in Item #12 Phase 5 re-tagging.**
- **SAM-L2-Q20** (2A): *"What is 100 more than 504?"* — Distractors target zero-placeholder and place-value errors (`NS_ZERO_VALUE`, `NS_PLACE_VALUE_CONFUSION`). The diagnostic is whether the child understands the hundreds digit of 504 — can add 100 to it structurally. **Classifies as: `number_sense`.**

Q09 and Q20 have nearly identical surface form but different diagnostic centers. The distinguishing signal is the distractor profile.

### Edge case B: Number Sense vs Operations & Algorithms — expanded form

- **SAM-L2-Q19** (2A): *"What is the missing number? 600 + 40 + 8 = ___"* — The literal task is addition. But the addition is trivial; the diagnostic is whether the child can compress expanded form to standard form. **Classifies as: `number_sense`.** Rule: when the surface arithmetic is a trivial reading of place-value structure, it's `number_sense`.

### Edge case C: Word problems — no escape hatch

Word problems classify by their underlying mathematical content, not by their framing. The previous WORD_PROBLEMS strand existed because word problems can be hard to classify by content. The fix is: read the verbs and the math, ignore the props.

- **SAM-L2-Q11** (2A): *"Jo had 7 apples..."* — Underlying op = 35 − 7 = 28. **Classifies as: `operations_algorithms`.**
- **SAM-L2-Q17** (2A): *"Larry has $45..."* — Underlying op = 45 − 29 = 16. Money is incidental. **Classifies as: `operations_algorithms`.**
- **Hypothetical**: *"There are 8 triangles and 5 squares. How many shapes in total?"* — Underlying op = addition. Shape vocabulary is a noun, not the diagnostic. **Classifies as: `operations_algorithms`** (NOT `geometry`).

### Edge case D: Money — arithmetic vs decimal notation

Money content classifies as `operations_algorithms` by default — the underlying arithmetic content is the diagnostic, currency context is incidental. The exception is when the question is primarily about decimal *notation* (introduced in P2 Money, e.g., $2.50 ↔ 250¢) — in which case it classifies as `fractions_decimals`.

**Money + decimal notation rule:**

- **Decimal notation present + decimal *concept* being tested → `fractions_decimals`.** Examples: *"Which is larger: $0.07 or $0.7?"*, *"Write 250 cents in decimal dollar notation."* The diagnostic is how the digits behave under decimal notation; stripping the `$` sign changes what is being measured.
- **Decimal notation present + arithmetic *procedure* being tested → `operations_algorithms`.** Examples: *"$2.50 + $1.20 = ?"*, *"John has $5 and spends $2.30. How much is left?"* The diagnostic is the procedure; stripping the `$` sign yields a standard arithmetic problem with the same difficulty.

**Operationalization**: if the question can be solved by stripping the `$` sign and performing standard arithmetic, classify as `operations_algorithms`. If stripping the `$` sign changes what's being measured, classify as `fractions_decimals`.

**Worked examples:**

- **SAM-L2-Q17** (2A): *"Larry has $45. He buys a school bag for $29. How much left?"* — Strip `$`: 45 − 29 = 16. Standard subtraction with regrouping. **`operations_algorithms`.**
- **Hypothetical**: *"Express 250 cents in dollars and cents."* — Stripping `$` removes the question entirely; the diagnostic IS the notation. **`fractions_decimals`.**
- **Hypothetical**: *"$2.50 + $1.20 = ?"* — Strip `$`: 2.50 + 1.20 = 3.70. Decimal-aware addition, but the diagnostic is the addition procedure, not the notation comprehension. **`operations_algorithms`.** (Decimal-aware addition at P2 is part of Money sub-strand procedure work; the notation is a vehicle for the arithmetic, not the target.)

### Edge case E: Measurement vs Geometry

At P1-P2, perimeter and area are not yet introduced in the MOE syllabus. A question that asks about the "length around a rectangle" before perimeter is formally introduced classifies as `measurement` (the cognitive task is length-summing), not `geometry`.

At P3 and beyond, perimeter and area introduce a real ambiguity (it's a property of a shape but quantified by measurement). Deferred to v1.5 rubric expansion.

### Edge case F: Data & Statistics vs Operations & Algorithms — chart reading

A picture-graph question with a comparison ("Mark 14, Adam 5, how many more?") draws on both chart-reading and arithmetic. The classification depends on which skill is the primary **diagnostic emphasis** — i.e., if a child got the question wrong, which band's mastery would you most question?

**Operationalization**: would the question still make sense if you replaced the chart with a textual number list?

- If **yes** (the chart is decorative; the same comparison could be asked from the plain text "Mark has 14, Adam has 5"), the chart is incidental. The diagnostic emphasis is the arithmetic. **`operations_algorithms`.**
- If **no** (the chart is load-bearing — the question requires reading a scale legend, counting icons across rows, or extracting numbers that only appear in the visual), the diagnostic emphasis is the chart interpretation. **`data_statistics`.**

**Two hypothetical contrasts:**

- *"How many more apples than oranges does the picture graph show?"* on a 1:1-scale picture graph where Apples = 8 and Oranges = 5. The arithmetic is fact-level (8 − 5); the non-trivial work is reading the graph (counting icons in each row). **Diagnostic emphasis = chart interpretation → `data_statistics`.**
- *"Each apple in this graph represents 5 fruits. The graph shows 3 apples for the morning harvest. How many fruits is that?"* — Chart interpretation is fixed by the legend (3 apples × 5 fruits-per-apple). The diagnostic is the multiplication 3 × 5 = 15. **Diagnostic emphasis = arithmetic → `operations_algorithms`.**

The Q05 source item ("how many more seashells did Mark collect than Adam?" with a 1:1 picture graph; Mark = 14 shells across two rows, Adam = 5 in one row) sits closer to the first hypothetical. The subtraction (14 − 5 = 9) is fact-level at the 2A target difficulty; the chart reading (distinguishing the two rows, counting 14 shells in Mark's two-row entry, reading the 1:1 scale legend) is the non-trivial work. Diagnostic emphasis = chart interpretation. **Classifies as: `data_statistics`.**

## Current bank coverage by Atlas band

Re-tagging preview based on the band definitions above (Phase 5 will lock in the migration):

| Atlas band | Imported (Item #11) — preview |
|---|---|
| `number_sense` | 7-8 (Q01, Q07, Q10, Q19, Q20, Q21, Q22, with Q09 on the boundary) |
| `operations_algorithms` | 3-4 (Q11, Q14, Q17, with Q09 on the boundary) |
| `fractions_decimals` | 0 |
| `measurement` | 0 |
| `geometry` | 0 |
| `data_statistics` | 0 |

The 4-band gap (`fractions_decimals`, `measurement`, `geometry`, `data_statistics`) was surfaced after the Item #11 Phase 3 visual gate and is tracked in the content-followups roadmap as a demo-readiness blocker — not a taxonomy problem.

## Deferred to v1.5

Three additional diagnostic bands extend the taxonomy for upper-primary content. Sub-strand names below are described conceptually rather than asserted against the MOE syllabus, pending verification when upper-primary content imports land.

- **Proportional Reasoning** — ratio, rate, percentage. Maps to upper-primary sub-strands of MOE Number and Algebra (P5-P6 scope).
- **Algebraic Thinking** — patterns formalized into expressions and simple equations. Maps to upper-primary sub-strand(s) of MOE Number and Algebra (P6 scope).
- **Area & Volume** — extends measurement into quantitative attributes of 2D and 3D figures. Maps to upper-primary content within MOE Measurement and Geometry.

A cross-cutting **Problem Solving & Applications** competency is also deferred. The pedagogical justification comes from the MOE syllabus itself (verbatim from the 2021 MOE Primary Mathematics Syllabus, Updated October 2025):

> "The central focus of the mathematics curriculum is the development of mathematical problem-solving competency, supported by five inter-related components – concepts, skills, processes, metacognition and attitudes."

A v1.5 Problem Solving & Applications layer would add an orthogonal placement axis — not a 7th band, but a perpendicular signal that a child has (or hasn't) demonstrated multi-step / non-routine application across the existing bands.

The MOE syllabus additionally identifies six clusters of "big ideas" as cross-cutting conceptual scaffolds: **Equivalence, Diagrams, Invariance, Measures, Notations, Proportionality.** These are out of scope for the demo but worth tracking as expansion targets if the diagnostic layer evolves further.

## Migration note

This taxonomy replaces the prior 6-strand structure: `NUMBER_SENSE`, `OPERATIONS`, `WORD_PROBLEMS`, `FRACTIONS_DECIMALS`, `GEOMETRY`, `MEASUREMENT_DATA`. Mapping:

| Old strand | New Atlas band(s) |
|---|---|
| `NUMBER_SENSE` | `number_sense` |
| `OPERATIONS` | `operations_algorithms` |
| `WORD_PROBLEMS` | (no equivalent — classified by underlying content) |
| `FRACTIONS_DECIMALS` | `fractions_decimals` |
| `GEOMETRY` | `geometry` |
| `MEASUREMENT_DATA` | split into `measurement` + `data_statistics` |

Item #12 implements the schema-and-content migration across Phases 2-7. The 11 currently-imported grade-2 questions are re-tagged in Phase 5 using the band assignments worked out in the Examples and Edge cases sections above; the Q09 ambiguity carries a founder-review flag into that phase.
