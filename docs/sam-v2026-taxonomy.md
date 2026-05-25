# S.A.M. V2026 — Canonical Taxonomy Specification

**Status:** Authoritative. Single source of truth for the strand / sub-strand /
level / content taxonomy across the Atlas project.
**Owner:** CONVERSION topic (authors taxonomy *content*).
**Consumer:** ATLAS Item #12 (owns *schema, migration, seeding* — builds the
tables from this file).
**Source:** S.A.M. V2026 Syllabus Plan (`S_A_M_2nd_Edition_Syllabus_Plan__V2026_.pdf`),
© Seriously Addictive Learning Centre Pte Ltd. This file records curriculum
*structure* for build alignment — it contains no licensed question content.
**Repo location when committed:** `docs/sam-v2026-taxonomy.md`

---

## 1. The model

The syllabus has three nested layers, plus a Level dimension:

| Layer | Count | What it is | In Atlas |
|---|---|---|---|
| **Strand** | 3 | Top grouping, stable across every level | `strand` |
| **Sub-Strand** | 12 | The meaningful diagnostic unit | **Atlas calls this a "strand"** |
| **Content** | ~145 | Numbered topic, level-specific | `content` — the tagging grain |
| **Level** | 9 | 0A, 0B, 0C, 1–6 | `level` |

Key relationships:
- Each **sub-strand** belongs to exactly one **strand** (fixed 1-to-many — a
  sub-strand never moves strand between levels).
- Each **content** item belongs to exactly one **(sub-strand, level)** pair.
- A sub-strand's strand is therefore derivable; a content item's strand is
  derivable via its sub-strand. Schema only needs `content → sub_strand` and
  `content → level` foreign keys.
- **A question (`AssessmentItem`) tags to a `content` item.** That fixes its
  sub-strand and level automatically.

---

## 2. Strands (3)

| key | display name |
|---|---|
| `number_algebra` | Number and Algebra |
| `measurement_geometry` | Measurement and Geometry |
| `statistics` | Statistics |

---

## 3. Sub-strands (12)

"Atlas strand" = this layer. `applies` lists every level the sub-strand has
content at — note it is **not** always a contiguous range.

| key | display name | strand | level span | applies at | in MVP (L1–4) |
|---|---|---|---|---|---|
| `whole_numbers` | Whole Numbers | number_algebra | 0A–5 | 0A,0B,0C,1,2,3,4,5 | yes |
| `fractions` | Fractions | number_algebra | 2–6 | 2,3,4,5,6 | yes |
| `decimals` | Decimals | number_algebra | 4–5 | 4,5 | yes |
| `money` | Money | number_algebra | 3 | 3 | yes |
| `percentage` | Percentage | number_algebra | 5–6 | 5,6 | no |
| `rate` | Rate | number_algebra | 5 | 5 | no |
| `ratio` | Ratio | number_algebra | 6 | 6 | no |
| `algebra` | Algebra | number_algebra | 6 | 6 | no |
| `measurement` | Measurement | measurement_geometry | 0B–3 | 0B,0C,1,2,3 | yes |
| `geometry` | Geometry | measurement_geometry | 0A–6 | 0A,0B,0C,1,2,3,4,5,6 | yes |
| `area_volume` | Area and Volume | measurement_geometry | 3–6 | 3,4,5,6 | yes |
| `data_representation` | Data Representation and Interpretation | statistics | 0C–6 | 0C,1,2,3,4,**6** | yes |

> `data_representation` skips Level 5 — the L5 syllabus page has no Statistics
> column. The `applies` list is authoritative; do not infer a contiguous range.

**MVP scope:** 8 of 12 sub-strands appear in the L1–4 cut. `percentage`,
`rate`, `ratio`, `algebra` are Level 5–6 only and out of MVP scope.

---

## 4. Levels (9)

| key | display name | sort | in MVP cut |
|---|---|---|---|
| `l0a` | Level 0A | 1 | no |
| `l0b` | Level 0B | 2 | no |
| `l0c` | Level 0C | 3 | no |
| `l1` | Level 1 | 4 | **yes** |
| `l2` | Level 2 | 5 | **yes** |
| `l3` | Level 3 | 6 | **yes** |
| `l4` | Level 4 | 7 | **yes** |
| `l5` | Level 5 | 8 | no |
| `l6` | Level 6 | 9 | no |

Levels 0A/0B/0C are three distinct whole levels (not halves of a Level 0).
Levels 7–8 are a separate curriculum, not in this syllabus.

---

## 5. Content items, by level

Content keys: `{level}-{sub_strand}-{seq}`. `seq` is the topic number printed
in the syllabus. ~145 items total; L1–4 MVP cut = 71 items.

### Level 0A — 7 items
**Whole Numbers** — Numbers to 20 · Number Bonds to 10 · Addition and Subtraction Within 10
**Geometry** — Lines and Curves · Parts and Whole · Plane Shapes · Patterns

### Level 0B — 9 items
**Whole Numbers** — Numbers to 50 · Number Bonds to 10 · Addition and Subtraction Within 20 · Ordinal Numbers
**Measurement** — Calendar and Time
**Geometry** — Positions · Plane Shapes · Solid Shapes · Patterns

### Level 0C — 11 items
**Whole Numbers** — Numbers to 100 · Tens and Ones · Addition and Subtraction Within 100 · Multiplication · Division
**Measurement** — Calendar and Time · Money
**Geometry** — Plane Shapes · Solid Shapes · Patterns
**Data Representation and Interpretation** — Picture Graphs

### Level 1 — 16 items  *(MVP)*
**Whole Numbers** — Numbers 0 to 10 · Number Bonds · Addition Within 10 · Subtraction from Within 10 · Ordinal Numbers and Positions · Numbers to 20 · Addition and Subtraction · Numbers to 100 · Addition and Subtraction Within 100 · Multiplication · Division
**Measurement** — Length · Time · Money
**Geometry** — Introduction to Basic Shapes
**Data Representation and Interpretation** — Picture Graphs

### Level 2 — 15 items  *(MVP)*
**Whole Numbers** — Numbers to 1000 · Addition and Subtraction Within 1000 · Multiplication and Division Within Tables of 2, 3, 4, 5 and 10 · Word Problems Involving the Four Operations
**Fractions** — Understanding Fractions · Addition and Subtraction
**Measurement** — Length · Mass · Time · Money · Volume
**Geometry** — Forming patterns with 2-Dimension shapes · 3-Dimension shapes and figures
**Data Representation and Interpretation** — Picture Graphs · Tally Chart

### Level 3 — 20 items  *(MVP)*
**Whole Numbers** — Numbers to 10 000 · Addition and Subtraction Within 10 000 · Mental Addition and Subtraction · Multiplication and Division Within Tables of 6, 7, 8 and 9 · Multiplication and Division of 3-Digit Numbers · Word Problems Involving the Four Operations  *(see Note A — normalised)*
**Fractions** — Understanding Equivalent Fractions · Addition and Subtraction
**Money** — Addition and Subtraction of Money · Word Problems
**Measurement** — Length, Mass and Volume (Conversions) · Time · Word Problems
**Geometry** — Angles · Perpendicular Lines · Parallel Lines
**Area and Volume** — Understanding Area and Perimeter · Finding Perimeter and Area on a Grid · Area of Rectangle
**Data Representation and Interpretation** — Bar Graphs

### Level 4 — 20 items  *(MVP)*
**Whole Numbers** — Numbers up to 100 000 · Multiplication and Division of Whole Numbers · Mental Multiplication and Division · Word Problems
**Fractions** — Mixed Numbers and Improper Fractions · Addition and Subtraction of Fractions · Word Problems
**Decimals** — Understanding Decimals · Rounding Decimals · Fractions and Decimals · The Four Operations of Decimals
**Geometry** — Angles · Squares and Rectangles · Symmetry · Nets
**Area and Volume** — Area and Perimeter of Rectangles, Squares, Composite Figures · Word Problems  *(see Note C)*
**Data Representation and Interpretation** — Tables · Line Graphs · Pie Charts

### Level 5 — 25 items
**Whole Numbers** — Numbers up to 10 Million · The Four Operations of Whole Numbers · Word Problems
**Fractions** — Division of Whole Numbers with Quotient as a Fraction/Mixed Number · Conversion of Fractions to Decimals · Addition and Subtraction of Mixed Numbers · Multiplication of Fractions, Multiplication of Fractions/Mixed Numbers and Whole Numbers · Word Problems  *(see Note B — normalised)*
**Decimals** — Multiplying and Dividing by 10, 100, 1000 and Their Multiples · Converting Measurements · Word Problems
**Percentage** — Understanding Percent · Percentages, Fractions and Decimals · Percentage in Pie Charts · Word Problems
**Rate** — Understanding Rate · Word Problems
**Geometry** — Angle Properties · Triangles and Angles · Quadrilaterals and Angles
**Area and Volume** — Area of a Triangle and Composite Figures · Building Solids with Unit Cubes · Volume of Cubes and Cuboids · Volume of a Liquid in a Rectangular Tank · Word Problems

### Level 6 — 22 items
**Fractions** — Division with Fractions · Word Problems
**Percentage** — Finding Percentages · Percentage Change · Word Problems
**Ratio** — Notation, Representations and Interpretation of Ratio · Finding Equivalent Ratios · Finding New Ratios · Fractions and Ratio · Word Problems
**Algebra** — Using Letters to Represent Unknown Numbers · Evaluating and Simplifying Algebraic Expressions · Solving Simple Equations · Word Problems
**Geometry** — Angles in Geometric Shapes
**Area and Volume** — Area and Circumference of a Circle · Area and Perimeter of Semicircle, Quarter Circle, Composite Figures · Finding One Dimension or Area of a Face of a Cube/Cuboid Given Other Dimensions and Volume · Finding Volume of Liquid · Introduction to Square Root and Cube Root Symbols
**Data Representation and Interpretation** — Average · Word Problems

---

## 6. Transcription decisions & notes

These were resolved during transcription. None block the build; all are worth
a quick eyeball with S.A.M. at the ~2026-06-02 meeting.

- **Note A — Level 3, Whole Numbers.** The source PDF fragmented this list
  across mid-topic line wraps (showing 10 numbered fragments and a stray "6.").
  Normalised to the 6 intended topics shown above. Intent is unambiguous, but
  flag for S.A.M. confirmation.
- **Note B — Level 5, Fractions.** The source PDF numbers two consecutive
  topics "3". Normalised to a clean 1–5 sequence above.
- **Note C — "Area and Volume" vs "Area and Perimeter".** The sub-strand is
  printed as *Area and Perimeter* at Level 4 and *Area and Volume* at Levels
  3, 5, 6. Treated as **one** sub-strand; canonical name = **Area and Volume**
  (`area_volume`).
- **Money — sub-strand vs content.** "Money" appears as a *content topic*
  under the Measurement sub-strand at Levels 0C, 1, 2, **and** as its own
  *sub-strand* under Number and Algebra at Level 3. Both are kept faithfully:
  the `money` sub-strand exists at Level 3 only; the lower-level Money topics
  remain Measurement content.
- **Tally Chart.** Printed lowercase as "Tally chart" (L2); normalised to
  title case.
- **Word Problems** recurs as a distinct content topic within many
  sub-strands. Each is its own content row, scoped to its sub-strand + level —
  they are not merged.

---

## 7. Machine-readable taxonomy (for ATLAS #12 seeding)

This JSON is the authoritative seed payload — ATLAS #12 builds tables from it
rather than re-transcribing. `content` is a flat array; `level` and
`sub_strand` are foreign keys; `mvp` mirrors the level's MVP flag.

```json
{
  "version": "S.A.M. V2026",
  "source": "S_A_M_2nd_Edition_Syllabus_Plan__V2026_.pdf",
  "strands": [
    { "key": "number_algebra", "name": "Number and Algebra" },
    { "key": "measurement_geometry", "name": "Measurement and Geometry" },
    { "key": "statistics", "name": "Statistics" }
  ],
  "levels": [
    { "key": "l0a", "name": "Level 0A", "sort": 1, "mvp": false },
    { "key": "l0b", "name": "Level 0B", "sort": 2, "mvp": false },
    { "key": "l0c", "name": "Level 0C", "sort": 3, "mvp": false },
    { "key": "l1", "name": "Level 1", "sort": 4, "mvp": true },
    { "key": "l2", "name": "Level 2", "sort": 5, "mvp": true },
    { "key": "l3", "name": "Level 3", "sort": 6, "mvp": true },
    { "key": "l4", "name": "Level 4", "sort": 7, "mvp": true },
    { "key": "l5", "name": "Level 5", "sort": 8, "mvp": false },
    { "key": "l6", "name": "Level 6", "sort": 9, "mvp": false }
  ],
  "sub_strands": [
    { "key": "whole_numbers", "name": "Whole Numbers", "strand": "number_algebra", "applies": ["l0a","l0b","l0c","l1","l2","l3","l4","l5"] },
    { "key": "fractions", "name": "Fractions", "strand": "number_algebra", "applies": ["l2","l3","l4","l5","l6"] },
    { "key": "decimals", "name": "Decimals", "strand": "number_algebra", "applies": ["l4","l5"] },
    { "key": "money", "name": "Money", "strand": "number_algebra", "applies": ["l3"] },
    { "key": "percentage", "name": "Percentage", "strand": "number_algebra", "applies": ["l5","l6"] },
    { "key": "rate", "name": "Rate", "strand": "number_algebra", "applies": ["l5"] },
    { "key": "ratio", "name": "Ratio", "strand": "number_algebra", "applies": ["l6"] },
    { "key": "algebra", "name": "Algebra", "strand": "number_algebra", "applies": ["l6"] },
    { "key": "measurement", "name": "Measurement", "strand": "measurement_geometry", "applies": ["l0b","l0c","l1","l2","l3"] },
    { "key": "geometry", "name": "Geometry", "strand": "measurement_geometry", "applies": ["l0a","l0b","l0c","l1","l2","l3","l4","l5","l6"] },
    { "key": "area_volume", "name": "Area and Volume", "strand": "measurement_geometry", "applies": ["l3","l4","l5","l6"] },
    { "key": "data_representation", "name": "Data Representation and Interpretation", "strand": "statistics", "applies": ["l0c","l1","l2","l3","l4","l6"] }
  ],
  "content": [
    { "key": "l0a-whole_numbers-1", "level": "l0a", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers to 20", "mvp": false },
    { "key": "l0a-whole_numbers-2", "level": "l0a", "sub_strand": "whole_numbers", "seq": 2, "name": "Number Bonds to 10", "mvp": false },
    { "key": "l0a-whole_numbers-3", "level": "l0a", "sub_strand": "whole_numbers", "seq": 3, "name": "Addition and Subtraction Within 10", "mvp": false },
    { "key": "l0a-geometry-1", "level": "l0a", "sub_strand": "geometry", "seq": 1, "name": "Lines and Curves", "mvp": false },
    { "key": "l0a-geometry-2", "level": "l0a", "sub_strand": "geometry", "seq": 2, "name": "Parts and Whole", "mvp": false },
    { "key": "l0a-geometry-3", "level": "l0a", "sub_strand": "geometry", "seq": 3, "name": "Plane Shapes", "mvp": false },
    { "key": "l0a-geometry-4", "level": "l0a", "sub_strand": "geometry", "seq": 4, "name": "Patterns", "mvp": false },

    { "key": "l0b-whole_numbers-1", "level": "l0b", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers to 50", "mvp": false },
    { "key": "l0b-whole_numbers-2", "level": "l0b", "sub_strand": "whole_numbers", "seq": 2, "name": "Number Bonds to 10", "mvp": false },
    { "key": "l0b-whole_numbers-3", "level": "l0b", "sub_strand": "whole_numbers", "seq": 3, "name": "Addition and Subtraction Within 20", "mvp": false },
    { "key": "l0b-whole_numbers-4", "level": "l0b", "sub_strand": "whole_numbers", "seq": 4, "name": "Ordinal Numbers", "mvp": false },
    { "key": "l0b-measurement-1", "level": "l0b", "sub_strand": "measurement", "seq": 1, "name": "Calendar and Time", "mvp": false },
    { "key": "l0b-geometry-1", "level": "l0b", "sub_strand": "geometry", "seq": 1, "name": "Positions", "mvp": false },
    { "key": "l0b-geometry-2", "level": "l0b", "sub_strand": "geometry", "seq": 2, "name": "Plane Shapes", "mvp": false },
    { "key": "l0b-geometry-3", "level": "l0b", "sub_strand": "geometry", "seq": 3, "name": "Solid Shapes", "mvp": false },
    { "key": "l0b-geometry-4", "level": "l0b", "sub_strand": "geometry", "seq": 4, "name": "Patterns", "mvp": false },

    { "key": "l0c-whole_numbers-1", "level": "l0c", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers to 100", "mvp": false },
    { "key": "l0c-whole_numbers-2", "level": "l0c", "sub_strand": "whole_numbers", "seq": 2, "name": "Tens and Ones", "mvp": false },
    { "key": "l0c-whole_numbers-3", "level": "l0c", "sub_strand": "whole_numbers", "seq": 3, "name": "Addition and Subtraction Within 100", "mvp": false },
    { "key": "l0c-whole_numbers-4", "level": "l0c", "sub_strand": "whole_numbers", "seq": 4, "name": "Multiplication", "mvp": false },
    { "key": "l0c-whole_numbers-5", "level": "l0c", "sub_strand": "whole_numbers", "seq": 5, "name": "Division", "mvp": false },
    { "key": "l0c-measurement-1", "level": "l0c", "sub_strand": "measurement", "seq": 1, "name": "Calendar and Time", "mvp": false },
    { "key": "l0c-measurement-2", "level": "l0c", "sub_strand": "measurement", "seq": 2, "name": "Money", "mvp": false },
    { "key": "l0c-geometry-1", "level": "l0c", "sub_strand": "geometry", "seq": 1, "name": "Plane Shapes", "mvp": false },
    { "key": "l0c-geometry-2", "level": "l0c", "sub_strand": "geometry", "seq": 2, "name": "Solid Shapes", "mvp": false },
    { "key": "l0c-geometry-3", "level": "l0c", "sub_strand": "geometry", "seq": 3, "name": "Patterns", "mvp": false },
    { "key": "l0c-data_representation-1", "level": "l0c", "sub_strand": "data_representation", "seq": 1, "name": "Picture Graphs", "mvp": false },

    { "key": "l1-whole_numbers-1", "level": "l1", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers 0 to 10", "mvp": true },
    { "key": "l1-whole_numbers-2", "level": "l1", "sub_strand": "whole_numbers", "seq": 2, "name": "Number Bonds", "mvp": true },
    { "key": "l1-whole_numbers-3", "level": "l1", "sub_strand": "whole_numbers", "seq": 3, "name": "Addition Within 10", "mvp": true },
    { "key": "l1-whole_numbers-4", "level": "l1", "sub_strand": "whole_numbers", "seq": 4, "name": "Subtraction from Within 10", "mvp": true },
    { "key": "l1-whole_numbers-5", "level": "l1", "sub_strand": "whole_numbers", "seq": 5, "name": "Ordinal Numbers and Positions", "mvp": true },
    { "key": "l1-whole_numbers-6", "level": "l1", "sub_strand": "whole_numbers", "seq": 6, "name": "Numbers to 20", "mvp": true },
    { "key": "l1-whole_numbers-7", "level": "l1", "sub_strand": "whole_numbers", "seq": 7, "name": "Addition and Subtraction", "mvp": true },
    { "key": "l1-whole_numbers-8", "level": "l1", "sub_strand": "whole_numbers", "seq": 8, "name": "Numbers to 100", "mvp": true },
    { "key": "l1-whole_numbers-9", "level": "l1", "sub_strand": "whole_numbers", "seq": 9, "name": "Addition and Subtraction Within 100", "mvp": true },
    { "key": "l1-whole_numbers-10", "level": "l1", "sub_strand": "whole_numbers", "seq": 10, "name": "Multiplication", "mvp": true },
    { "key": "l1-whole_numbers-11", "level": "l1", "sub_strand": "whole_numbers", "seq": 11, "name": "Division", "mvp": true },
    { "key": "l1-measurement-1", "level": "l1", "sub_strand": "measurement", "seq": 1, "name": "Length", "mvp": true },
    { "key": "l1-measurement-2", "level": "l1", "sub_strand": "measurement", "seq": 2, "name": "Time", "mvp": true },
    { "key": "l1-measurement-3", "level": "l1", "sub_strand": "measurement", "seq": 3, "name": "Money", "mvp": true },
    { "key": "l1-geometry-1", "level": "l1", "sub_strand": "geometry", "seq": 1, "name": "Introduction to Basic Shapes", "mvp": true },
    { "key": "l1-data_representation-1", "level": "l1", "sub_strand": "data_representation", "seq": 1, "name": "Picture Graphs", "mvp": true },

    { "key": "l2-whole_numbers-1", "level": "l2", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers to 1000", "mvp": true },
    { "key": "l2-whole_numbers-2", "level": "l2", "sub_strand": "whole_numbers", "seq": 2, "name": "Addition and Subtraction Within 1000", "mvp": true },
    { "key": "l2-whole_numbers-3", "level": "l2", "sub_strand": "whole_numbers", "seq": 3, "name": "Multiplication and Division Within Tables of 2, 3, 4, 5 and 10", "mvp": true },
    { "key": "l2-whole_numbers-4", "level": "l2", "sub_strand": "whole_numbers", "seq": 4, "name": "Word Problems Involving the Four Operations", "mvp": true },
    { "key": "l2-fractions-1", "level": "l2", "sub_strand": "fractions", "seq": 1, "name": "Understanding Fractions", "mvp": true },
    { "key": "l2-fractions-2", "level": "l2", "sub_strand": "fractions", "seq": 2, "name": "Addition and Subtraction", "mvp": true },
    { "key": "l2-measurement-1", "level": "l2", "sub_strand": "measurement", "seq": 1, "name": "Length", "mvp": true },
    { "key": "l2-measurement-2", "level": "l2", "sub_strand": "measurement", "seq": 2, "name": "Mass", "mvp": true },
    { "key": "l2-measurement-3", "level": "l2", "sub_strand": "measurement", "seq": 3, "name": "Time", "mvp": true },
    { "key": "l2-measurement-4", "level": "l2", "sub_strand": "measurement", "seq": 4, "name": "Money", "mvp": true },
    { "key": "l2-measurement-5", "level": "l2", "sub_strand": "measurement", "seq": 5, "name": "Volume", "mvp": true },
    { "key": "l2-geometry-1", "level": "l2", "sub_strand": "geometry", "seq": 1, "name": "Forming patterns with 2-Dimension shapes", "mvp": true },
    { "key": "l2-geometry-2", "level": "l2", "sub_strand": "geometry", "seq": 2, "name": "3-Dimension shapes and figures", "mvp": true },
    { "key": "l2-data_representation-1", "level": "l2", "sub_strand": "data_representation", "seq": 1, "name": "Picture Graphs", "mvp": true },
    { "key": "l2-data_representation-2", "level": "l2", "sub_strand": "data_representation", "seq": 2, "name": "Tally Chart", "mvp": true },

    { "key": "l3-whole_numbers-1", "level": "l3", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers to 10 000", "mvp": true },
    { "key": "l3-whole_numbers-2", "level": "l3", "sub_strand": "whole_numbers", "seq": 2, "name": "Addition and Subtraction Within 10 000", "mvp": true },
    { "key": "l3-whole_numbers-3", "level": "l3", "sub_strand": "whole_numbers", "seq": 3, "name": "Mental Addition and Subtraction", "mvp": true },
    { "key": "l3-whole_numbers-4", "level": "l3", "sub_strand": "whole_numbers", "seq": 4, "name": "Multiplication and Division Within Tables of 6, 7, 8 and 9", "mvp": true },
    { "key": "l3-whole_numbers-5", "level": "l3", "sub_strand": "whole_numbers", "seq": 5, "name": "Multiplication and Division of 3-Digit Numbers", "mvp": true },
    { "key": "l3-whole_numbers-6", "level": "l3", "sub_strand": "whole_numbers", "seq": 6, "name": "Word Problems Involving the Four Operations", "mvp": true },
    { "key": "l3-fractions-1", "level": "l3", "sub_strand": "fractions", "seq": 1, "name": "Understanding Equivalent Fractions", "mvp": true },
    { "key": "l3-fractions-2", "level": "l3", "sub_strand": "fractions", "seq": 2, "name": "Addition and Subtraction", "mvp": true },
    { "key": "l3-money-1", "level": "l3", "sub_strand": "money", "seq": 1, "name": "Addition and Subtraction of Money", "mvp": true },
    { "key": "l3-money-2", "level": "l3", "sub_strand": "money", "seq": 2, "name": "Word Problems", "mvp": true },
    { "key": "l3-measurement-1", "level": "l3", "sub_strand": "measurement", "seq": 1, "name": "Length, Mass and Volume (Conversions)", "mvp": true },
    { "key": "l3-measurement-2", "level": "l3", "sub_strand": "measurement", "seq": 2, "name": "Time", "mvp": true },
    { "key": "l3-measurement-3", "level": "l3", "sub_strand": "measurement", "seq": 3, "name": "Word Problems", "mvp": true },
    { "key": "l3-geometry-1", "level": "l3", "sub_strand": "geometry", "seq": 1, "name": "Angles", "mvp": true },
    { "key": "l3-geometry-2", "level": "l3", "sub_strand": "geometry", "seq": 2, "name": "Perpendicular Lines", "mvp": true },
    { "key": "l3-geometry-3", "level": "l3", "sub_strand": "geometry", "seq": 3, "name": "Parallel Lines", "mvp": true },
    { "key": "l3-area_volume-1", "level": "l3", "sub_strand": "area_volume", "seq": 1, "name": "Understanding Area and Perimeter", "mvp": true },
    { "key": "l3-area_volume-2", "level": "l3", "sub_strand": "area_volume", "seq": 2, "name": "Finding Perimeter and Area on a Grid", "mvp": true },
    { "key": "l3-area_volume-3", "level": "l3", "sub_strand": "area_volume", "seq": 3, "name": "Area of Rectangle", "mvp": true },
    { "key": "l3-data_representation-1", "level": "l3", "sub_strand": "data_representation", "seq": 1, "name": "Bar Graphs", "mvp": true },

    { "key": "l4-whole_numbers-1", "level": "l4", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers up to 100 000", "mvp": true },
    { "key": "l4-whole_numbers-2", "level": "l4", "sub_strand": "whole_numbers", "seq": 2, "name": "Multiplication and Division of Whole Numbers", "mvp": true },
    { "key": "l4-whole_numbers-3", "level": "l4", "sub_strand": "whole_numbers", "seq": 3, "name": "Mental Multiplication and Division", "mvp": true },
    { "key": "l4-whole_numbers-4", "level": "l4", "sub_strand": "whole_numbers", "seq": 4, "name": "Word Problems", "mvp": true },
    { "key": "l4-fractions-1", "level": "l4", "sub_strand": "fractions", "seq": 1, "name": "Mixed Numbers and Improper Fractions", "mvp": true },
    { "key": "l4-fractions-2", "level": "l4", "sub_strand": "fractions", "seq": 2, "name": "Addition and Subtraction of Fractions", "mvp": true },
    { "key": "l4-fractions-3", "level": "l4", "sub_strand": "fractions", "seq": 3, "name": "Word Problems", "mvp": true },
    { "key": "l4-decimals-1", "level": "l4", "sub_strand": "decimals", "seq": 1, "name": "Understanding Decimals", "mvp": true },
    { "key": "l4-decimals-2", "level": "l4", "sub_strand": "decimals", "seq": 2, "name": "Rounding Decimals", "mvp": true },
    { "key": "l4-decimals-3", "level": "l4", "sub_strand": "decimals", "seq": 3, "name": "Fractions and Decimals", "mvp": true },
    { "key": "l4-decimals-4", "level": "l4", "sub_strand": "decimals", "seq": 4, "name": "The Four Operations of Decimals", "mvp": true },
    { "key": "l4-geometry-1", "level": "l4", "sub_strand": "geometry", "seq": 1, "name": "Angles", "mvp": true },
    { "key": "l4-geometry-2", "level": "l4", "sub_strand": "geometry", "seq": 2, "name": "Squares and Rectangles", "mvp": true },
    { "key": "l4-geometry-3", "level": "l4", "sub_strand": "geometry", "seq": 3, "name": "Symmetry", "mvp": true },
    { "key": "l4-geometry-4", "level": "l4", "sub_strand": "geometry", "seq": 4, "name": "Nets", "mvp": true },
    { "key": "l4-area_volume-1", "level": "l4", "sub_strand": "area_volume", "seq": 1, "name": "Area and Perimeter of Rectangles, Squares, Composite Figures", "mvp": true },
    { "key": "l4-area_volume-2", "level": "l4", "sub_strand": "area_volume", "seq": 2, "name": "Word Problems", "mvp": true },
    { "key": "l4-data_representation-1", "level": "l4", "sub_strand": "data_representation", "seq": 1, "name": "Tables", "mvp": true },
    { "key": "l4-data_representation-2", "level": "l4", "sub_strand": "data_representation", "seq": 2, "name": "Line Graphs", "mvp": true },
    { "key": "l4-data_representation-3", "level": "l4", "sub_strand": "data_representation", "seq": 3, "name": "Pie Charts", "mvp": true },

    { "key": "l5-whole_numbers-1", "level": "l5", "sub_strand": "whole_numbers", "seq": 1, "name": "Numbers up to 10 Million", "mvp": false },
    { "key": "l5-whole_numbers-2", "level": "l5", "sub_strand": "whole_numbers", "seq": 2, "name": "The Four Operations of Whole Numbers", "mvp": false },
    { "key": "l5-whole_numbers-3", "level": "l5", "sub_strand": "whole_numbers", "seq": 3, "name": "Word Problems", "mvp": false },
    { "key": "l5-fractions-1", "level": "l5", "sub_strand": "fractions", "seq": 1, "name": "Division of Whole Numbers with Quotient as a Fraction/Mixed Number", "mvp": false },
    { "key": "l5-fractions-2", "level": "l5", "sub_strand": "fractions", "seq": 2, "name": "Conversion of Fractions to Decimals", "mvp": false },
    { "key": "l5-fractions-3", "level": "l5", "sub_strand": "fractions", "seq": 3, "name": "Addition and Subtraction of Mixed Numbers", "mvp": false },
    { "key": "l5-fractions-4", "level": "l5", "sub_strand": "fractions", "seq": 4, "name": "Multiplication of Fractions, Multiplication of Fractions/Mixed Numbers and Whole Numbers", "mvp": false },
    { "key": "l5-fractions-5", "level": "l5", "sub_strand": "fractions", "seq": 5, "name": "Word Problems", "mvp": false },
    { "key": "l5-decimals-1", "level": "l5", "sub_strand": "decimals", "seq": 1, "name": "Multiplying and Dividing by 10, 100, 1000 and Their Multiples", "mvp": false },
    { "key": "l5-decimals-2", "level": "l5", "sub_strand": "decimals", "seq": 2, "name": "Converting Measurements", "mvp": false },
    { "key": "l5-decimals-3", "level": "l5", "sub_strand": "decimals", "seq": 3, "name": "Word Problems", "mvp": false },
    { "key": "l5-percentage-1", "level": "l5", "sub_strand": "percentage", "seq": 1, "name": "Understanding Percent", "mvp": false },
    { "key": "l5-percentage-2", "level": "l5", "sub_strand": "percentage", "seq": 2, "name": "Percentages, Fractions and Decimals", "mvp": false },
    { "key": "l5-percentage-3", "level": "l5", "sub_strand": "percentage", "seq": 3, "name": "Percentage in Pie Charts", "mvp": false },
    { "key": "l5-percentage-4", "level": "l5", "sub_strand": "percentage", "seq": 4, "name": "Word Problems", "mvp": false },
    { "key": "l5-rate-1", "level": "l5", "sub_strand": "rate", "seq": 1, "name": "Understanding Rate", "mvp": false },
    { "key": "l5-rate-2", "level": "l5", "sub_strand": "rate", "seq": 2, "name": "Word Problems", "mvp": false },
    { "key": "l5-geometry-1", "level": "l5", "sub_strand": "geometry", "seq": 1, "name": "Angle Properties", "mvp": false },
    { "key": "l5-geometry-2", "level": "l5", "sub_strand": "geometry", "seq": 2, "name": "Triangles and Angles", "mvp": false },
    { "key": "l5-geometry-3", "level": "l5", "sub_strand": "geometry", "seq": 3, "name": "Quadrilaterals and Angles", "mvp": false },
    { "key": "l5-area_volume-1", "level": "l5", "sub_strand": "area_volume", "seq": 1, "name": "Area of a Triangle and Composite Figures", "mvp": false },
    { "key": "l5-area_volume-2", "level": "l5", "sub_strand": "area_volume", "seq": 2, "name": "Building Solids with Unit Cubes", "mvp": false },
    { "key": "l5-area_volume-3", "level": "l5", "sub_strand": "area_volume", "seq": 3, "name": "Volume of Cubes and Cuboids", "mvp": false },
    { "key": "l5-area_volume-4", "level": "l5", "sub_strand": "area_volume", "seq": 4, "name": "Volume of a Liquid in a Rectangular Tank", "mvp": false },
    { "key": "l5-area_volume-5", "level": "l5", "sub_strand": "area_volume", "seq": 5, "name": "Word Problems", "mvp": false },

    { "key": "l6-fractions-1", "level": "l6", "sub_strand": "fractions", "seq": 1, "name": "Division with Fractions", "mvp": false },
    { "key": "l6-fractions-2", "level": "l6", "sub_strand": "fractions", "seq": 2, "name": "Word Problems", "mvp": false },
    { "key": "l6-percentage-1", "level": "l6", "sub_strand": "percentage", "seq": 1, "name": "Finding Percentages", "mvp": false },
    { "key": "l6-percentage-2", "level": "l6", "sub_strand": "percentage", "seq": 2, "name": "Percentage Change", "mvp": false },
    { "key": "l6-percentage-3", "level": "l6", "sub_strand": "percentage", "seq": 3, "name": "Word Problems", "mvp": false },
    { "key": "l6-ratio-1", "level": "l6", "sub_strand": "ratio", "seq": 1, "name": "Notation, Representations and Interpretation of Ratio", "mvp": false },
    { "key": "l6-ratio-2", "level": "l6", "sub_strand": "ratio", "seq": 2, "name": "Finding Equivalent Ratios", "mvp": false },
    { "key": "l6-ratio-3", "level": "l6", "sub_strand": "ratio", "seq": 3, "name": "Finding New Ratios", "mvp": false },
    { "key": "l6-ratio-4", "level": "l6", "sub_strand": "ratio", "seq": 4, "name": "Fractions and Ratio", "mvp": false },
    { "key": "l6-ratio-5", "level": "l6", "sub_strand": "ratio", "seq": 5, "name": "Word Problems", "mvp": false },
    { "key": "l6-algebra-1", "level": "l6", "sub_strand": "algebra", "seq": 1, "name": "Using Letters to Represent Unknown Numbers", "mvp": false },
    { "key": "l6-algebra-2", "level": "l6", "sub_strand": "algebra", "seq": 2, "name": "Evaluating and Simplifying Algebraic Expressions", "mvp": false },
    { "key": "l6-algebra-3", "level": "l6", "sub_strand": "algebra", "seq": 3, "name": "Solving Simple Equations", "mvp": false },
    { "key": "l6-algebra-4", "level": "l6", "sub_strand": "algebra", "seq": 4, "name": "Word Problems", "mvp": false },
    { "key": "l6-geometry-1", "level": "l6", "sub_strand": "geometry", "seq": 1, "name": "Angles in Geometric Shapes", "mvp": false },
    { "key": "l6-area_volume-1", "level": "l6", "sub_strand": "area_volume", "seq": 1, "name": "Area and Circumference of a Circle", "mvp": false },
    { "key": "l6-area_volume-2", "level": "l6", "sub_strand": "area_volume", "seq": 2, "name": "Area and Perimeter of Semicircle, Quarter Circle, Composite Figures", "mvp": false },
    { "key": "l6-area_volume-3", "level": "l6", "sub_strand": "area_volume", "seq": 3, "name": "Finding One Dimension or Area of a Face of a Cube/Cuboid Given Other Dimensions and Volume", "mvp": false },
    { "key": "l6-area_volume-4", "level": "l6", "sub_strand": "area_volume", "seq": 4, "name": "Finding Volume of Liquid", "mvp": false },
    { "key": "l6-area_volume-5", "level": "l6", "sub_strand": "area_volume", "seq": 5, "name": "Introduction to Square Root and Cube Root Symbols", "mvp": false },
    { "key": "l6-data_representation-1", "level": "l6", "sub_strand": "data_representation", "seq": 1, "name": "Average", "mvp": false },
    { "key": "l6-data_representation-2", "level": "l6", "sub_strand": "data_representation", "seq": 2, "name": "Word Problems", "mvp": false }
  ]
}
```

**Counts (integrity check):** 3 strands · 12 sub-strands · 9 levels · 145
content items. By level: 0A 7 · 0B 9 · 0C 11 · 1 16 · 2 15 · 3 20 · 4 20 ·
5 25 · 6 22. MVP cut (L1–4): 71 content items.

---

## 8. Hand-off to ATLAS Item #12

ATLAS #12 builds and seeds the tables from §7. Recommended shape:
- `strands`, `sub_strands`, `levels`, `content` tables, plus `tenant_id` on
  each (per the v1-protects-v2 guardrail).
- `content` is the FK target for `AssessmentItem` — a question references a
  `content` row; sub-strand and level follow from it.
- `AssessmentItem.strand_id` in the report spec maps to **`sub_strand`** here
  (Atlas "strand" = S.A.M. sub-strand). Worth aligning the field name during
  the #12 migration to avoid future confusion.
- The `sub_strands.applies` array is the sub-strand × level applicability set
  — useful for the adaptive engine; do not assume contiguous ranges.

CONVERSION will tag converted questions against `content` keys from this file.
Any later change to the taxonomy goes through this file first, then re-seeds.
