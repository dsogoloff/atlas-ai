# Atlas Assessment — Level Subdivision Rubric

## Purpose

S.A.M. published material organizes content by coarse "Level" — Level 1 covers P1, Level 2 covers P2, Level 3 covers P3, and so on. Atlas's adaptive engine needs finer subdivisions — 1A and 1B for P1, 2A and 2B for P2, etc. — so the posterior can move in smaller increments and the placement report can distinguish "still working on P2 fundamentals" from "ready for P3."

This document defines the criteria Atlas uses to subdivide each S.A.M. level into A and B sublevels.

## Subdivision principles

The A/B split applies four axes in priority order:

1. **Numerical complexity range** — A starts at the smaller-number end of the level's curriculum boundary; B extends to the upper end. Both stay inside the parent S.A.M. level's MOE-curriculum scope.
2. **Step count** — A is single-step (one operation, one decision). B may be multi-step within the level's scope.
3. **Algorithmic regrouping** — A typically avoids regrouping; B requires it where the level's operations make regrouping possible.
4. **Conceptual familiarity** — A is content the child has been introduced to within the parent level's MOE-syllabus scope. B applies that content in less-familiar contexts or compositions.

A question can be A even if it crosses one of the B axes, as long as the others place it firmly in introduction territory. The axes are guidance for resolving close calls, not a strict checklist.

### Operationalization

When classifying a new item, walk the four axes top-down. The first axis that clearly separates A from B determines the assignment. If none separates cleanly, default to A — be generous on introduction-side; the engine will move the posterior upward fast on correct answers anyway, and IRT difficulty parameters will refine the placement over response history.

## Per-level definitions

The sublevel definitions below are scoped to MOE P1-P2 curriculum content (the v1 demo scope). Forward-looking placeholders for 3A/3B are sketched but left deliberately under-specified until P3 imports arrive and the band can be calibrated against real items.

### 1A — P1 introduction (S.A.M. Level 1, lower half)

- **Numerical complexity**: whole numbers ≤ 20 typically; occasional reach into the 30-50 range when the operation is at fact level.
- **Operation complexity**: single-step.
- **Conceptual scope**: number bonds, basic counting, +/− facts within 20, basic 2D shape identification, time to the hour, length using cm at first-introduction.
- **Regrouping**: not introduced.

**Examples from current bank:**
- **SAM-L2-Q01** (number bond, 1A): *"1 and ___ make 10."* — Single-step composition of 10 within the P1 number-bonds introduction range; no regrouping. Sits cleanly in 1A by all four axes.
- **SAM-L2-Q09** (1A): *"What is 3 more than 54?"* — The operand 54 pushes past the pure-1A numerical range (axis 1), but the operation is fact-level addition (axis 2) and there is no regrouping (axis 3). Two of three axes place this in A; one places it in B. The S.A.M. source-of-truth level is L2-Q09 (i.e., the booklet treats this as P2 material), but the Atlas tagging in the import migration is 1A. The defensible read is that the *operation* (add 3) is well within P1 fact range even though the operand reaches into the P1 upper boundary. **Defensible alternate: 1B by axis 1. Founder's call when re-tagging.**

### 1B — P1 mastery (S.A.M. Level 1, upper half)

- **Numerical complexity**: whole numbers up to 100; +/− across the upper P1 range.
- **Operation complexity**: still single-step. Multi-step word problems are 2A or later.
- **Conceptual scope**: place value (tens / ones), comparing and ordering numbers to 100, +/− within 100 including with regrouping, multiplication facts of 2, 5, 10, time to 5 min, picture-graph reading at P1 level.
- **Regrouping**: yes, where +/− requires it.

**Examples from current bank:**
- **SAM-L2-Q07** (1B): *"76 = ___ tens 6 ones"* — Place-value decomposition. Numbers in the upper P1 range; structural-understanding diagnostic.
- **SAM-L2-Q10** (1B): *"Arrange smallest first: 68, 81, 9"* — Ordering across the P1 range, mixed single-digit and two-digit operands.

### 2A — P2 introduction (S.A.M. Level 2, lower half)

- **Numerical complexity**: whole numbers up to 1000; place value extending into hundreds.
- **Operation complexity**: single-step procedures dominate; simple single-step word problems land here. Multi-step deferred to 2B.
- **Conceptual scope**: place value (hundreds / tens / ones), +/− with regrouping in 2-3 digits, basic division as partitive sharing, multiplication tables of 2, 3, 4, 5, 10, length / mass / volume measurement with metric units, time to the minute, fraction-of-a-whole introduction (P2).
- **Regrouping**: routine, including across hundreds.

**Examples from current bank:**
- **SAM-L2-Q11** (2A): *"Jo had 7 apples..."* — Single-step word problem; subtraction with regrouping in the 2-digit range.
- **SAM-L2-Q14** (2A): *"12 birds into 3 cages..."* — Partitive division within the tables-of-3 range.
- **SAM-L2-Q17** (2A): *"Larry has $45..."* — Money + subtraction with regrouping; single-step.
- **SAM-L2-Q19** (2A): *"600 + 40 + 8 = ___"* — Expanded form within the hundreds range.
- **SAM-L2-Q20** (2A): *"100 more than 504?"* — Hundreds-place increment; single-step.

### 2B — P2 mastery (S.A.M. Level 2, upper half)

- **Numerical complexity**: whole numbers up to 1000; ordering or pattern-finding across larger ranges within the boundary; boundary-crossing in patterns (e.g., 800 → 780).
- **Operation complexity**: multi-step within P2 scope; questions that require coordinating two procedures or two comparisons; harder application contexts.
- **Conceptual scope**: extension of 2A — ordering 4+ three-digit numbers, skip-counting patterns crossing hundreds boundaries, like-fractions +/− (P2 MOE introduction), multi-step money problems.
- **Regrouping**: routine; multi-step questions may involve multiple regrouping events.

**Examples from current bank:**
- **SAM-L2-Q21** (2B): *"Arrange greatest first: 652, 716, 629, 708"* — Ordering 4 three-digit numbers. Requires within-hundred comparison (700s pair, 600s pair) as a secondary task — a multi-step quality even though the top-level task is "order".
- **SAM-L2-Q22** (2B): *"860, 840, 820, 800, ?"* — Skip-counting backward by 20s with a hundreds-boundary crossing. The boundary is the diagnostic challenge; without it, the question would be 1B.

### 3A / 3B (forward-looking placeholder)

P3 content is out of scope for the v1 demo. These criteria are deliberately under-specified until P3 imports land and the band can be calibrated against real items.

- **3A (placeholder)**: P3 introduction. Numbers up to 10,000; multiplication and division beyond the P2 tables; introduction of multi-digit multiplication and long-division algorithms; introduction of fractions of a set; perimeter and area introduced for rectangles; time-to-the-second for short durations.
- **3B (placeholder)**: P3 mastery. Multi-step with two operations; harder application contexts; first ambiguity between measurement-band and geometry-band content (perimeter, area).

Both sublevels will be refined when the first P3 content imports arrive. Treat the bullets above as scoping intent, not as classification rules.

## Cross-S.A.M.-level note

A question published in a S.A.M. Level 2 booklet is not deterministically Atlas 2A or 2B. The S.A.M. level is a curriculum-publisher signal about which year group the booklet targets; the Atlas sublevel is a difficulty signal about which adaptive bin the engine should serve from. They correlate strongly but are not identical.

Concretely:

- A S.A.M. Level 2 question might Atlas-tag as 1B if its numerical range stays within the P1 boundary (e.g., a Level 2 booklet question that happens to use small numbers for a place-value-of-10 problem). **SAM-L2-Q01** is precisely this case — it's a S.A.M. Level 2 booklet item but its diagnostic (number bond within 10) places it at 1A by all four subdivision axes.
- A S.A.M. Level 1 question might Atlas-tag as 2A if its operation complexity rises above pure facts.
- A S.A.M. Level 2 question is most-often Atlas 2A; the engine learns the actual difficulty empirically from response patterns and will recalibrate the IRT difficulty parameter over time.

### Classification flow when importing new items

1. Start with the parent S.A.M. level as a default — Level 1 → 1A, Level 2 → 2A, Level 3 → 3A.
2. Walk the four subdivision principles top-down.
3. If any principle clearly places the item in B-territory (multi-step; regrouping required; ordering of 4+ items; boundary-crossing patterns; less-familiar context), bump to B.
4. If multiple principles place the item in B-territory and the operation actually extends past the parent level's MOE-syllabus scope, consider whether it belongs in the next level's A.

Atlas's IRT difficulty parameter then refines the placement within the assigned bin over response history. The sublevel assignment is the starting point, not the final answer.
