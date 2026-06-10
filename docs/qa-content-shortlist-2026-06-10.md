# QA Content Shortlist — Founder PDF Verification (2026-06-10)

> **Where the images are:** the founder's working copy of this sheet — with the
> worksheet/answer-key page renders embedded inline — lives locally at
> `scripts/conversion/output/QA-shortlist/QA-content-shortlist.md`. The page
> renders are licensed S.A.M. content and are **never committed** to git
> (`scripts/conversion/output/` is gitignored); this committed twin references
> them by file path only.

Three question-bank rows where the loaded answer disagrees with (or could not be
matched to) the parsed answer-key entry. Each section shows the row **as loaded**
in the bank, the **raw answer-key entry**, the page renders to check (worksheet
page first, then the answer-key page), and a decision checkbox.

Images are full-page renders from Stage 1 — captions say where on the page the
task sits.

---

## 1. SAM-L3-Q11 — Level 3 Placement Worksheet, task 11

**Stem as loaded:** "Which of the following is equal to 18?"

**Options as loaded:**

| index | option |
|---|---|
| 0 | 9 × 2 |
| 1 | 9 × 3 |
| 2 | 9 ÷ 2 |
| 3 | 6 ÷ 3 |

**Stored answer as loaded:** `correct_index = 1` → "9 × 3" (= 27, not 18)

**Parsed answer-key entry (raw):** `11. 1` → option (1) in the key's 1-based
numbering → "9 × 2" (= 18) → 0-based index **0**

**Proposed fix:** change `correct_index` 1 → 0. Evidence:
1. Answer key ordinal "1" = option (1) "9 × 2".
2. Stem arithmetic: 9 × 2 = 18; the stored option 9 × 3 = 27.
3. Stage 3's own review flag for this row: "correct_index corrected to 0
   (option 1 in answer key = 9×2=18)".

**Worksheet page (Level 3, page 8 — task 11 is the lower half of the page):**
`scripts/conversion/output/QA-shortlist/SAM-L3-Q11-worksheet-p08.png`

**Answer key (Level 3, page 1 — entry "11. 1" mid-list):**
`scripts/conversion/output/QA-shortlist/L3-answer-key-p01.png`

**Decision:**
- [ ] Confirm fix: `correct_index` → 0 ("9 × 2")
- [ ] Other: ___________________________________________

---

## 2. SAM-L3-Q22 — Level 3 Placement Worksheet, task 22

**Stem as loaded:** "What is the greatest 4-digit even number?"

**Format as loaded:** NUMERIC_ENTRY (no options)

**Stored answer as loaded:** `correct_answer = "9998"`

**Parsed answer-key entry (raw):** `22. 3`

**What tracing the PDF found:** the source task 22 is actually MULTIPLE CHOICE —
the worksheet page shows options **(1) 1000, (2) 1001, (3) 9998, (4) 9999**.
Stage 2 extraction missed the options (its raw text has only the stem), so the
row was loaded as numeric entry. The key entry "3" means option (3) = **9998**,
which is exactly the stored answer — and 9998 is mathematically the greatest
4-digit even number. So the stored value is consistent with the key once the
option list is decoded; only the question format changed (MC in the source,
numeric entry as loaded).

**Question for you:** is it acceptable to keep this as NUMERIC_ENTRY with
answer 9998 (a strictly harder version of the same task — the child must produce
the number rather than pick it), or should it be restored to multiple choice
with the four options above and `correct_index = 2`?

**Worksheet page (Level 3, page 14 — task 22 is mid-page, between tasks 21 and 23):**
`scripts/conversion/output/QA-shortlist/SAM-L3-Q22-worksheet-p14.png`

**Answer key (Level 3, page 1 — entry "22. 3" near the bottom of the list):**
`scripts/conversion/output/QA-shortlist/L3-answer-key-p01.png`

**Decision:**
- [ ] Keep as loaded: NUMERIC_ENTRY, answer "9998" (no change)
- [ ] Restore source format: MULTIPLE_CHOICE, options 1000 / 1001 / 9998 / 9999, correct_index = 2
- [ ] Other: ___________________________________________

---

## 3. SAM-L4-Q15 — Level 4 Placement Worksheet, task 15

**Stem as loaded:** "Aaron and Billy took part in a marathon. When Aaron had run
5 km 250 m, he had run 3 times the distance Billy had run. What was the distance
Billy had run? Express your answer in kilometres and metres."

**Format as loaded:** NUMERIC_ENTRY

**Stored answer as loaded:** `correct_answer = "1 km 750 m"`

**Parsed answer-key entry (raw):** `5 km 250 m = 5250 m` — this is only the
FIRST LINE of the key's worked solution. The full key entry reads:

```
5 km 250 m = 5250 m
5250 ÷ 3 = 1750
1750 = 1 km 750 m
Billy had run 1 km 750 m.
```

**What tracing the PDF found:** the key's final answer is **1 km 750 m**, which
matches the stored answer exactly (5250 ÷ 3 = 1750 m = 1 km 750 m). The
"mismatch" was the parser truncating a multi-line worked solution to its first
line. Proposed: **no change** — please eyeball the worksheet page and key to
confirm.

**Worksheet page (Level 4, page 9 — task 15 is the top of the page):**
`scripts/conversion/output/QA-shortlist/SAM-L4-Q15-worksheet-p09.png`

**Answer key (Level 4, page 1 — task 15 entry in the right-hand column of the table, top row):**
`scripts/conversion/output/QA-shortlist/L4-answer-key-p01.png`

**Decision:**
- [ ] Confirm: no change, stored "1 km 750 m" is correct
- [ ] Other: ___________________________________________
