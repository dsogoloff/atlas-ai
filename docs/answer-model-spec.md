# Answer model & grading spec — Singapore Math, grades 1–3

**Audience:** the CONVERSION session authoring question records, and any engineer
wiring the scoring path. Companion to `docs/visual-primitives-spec.md`.

**Source of truth (types):** `src/lib/grading/types.ts` (the answer + grading
contract) and `src/components/answer-inputs/types.ts` (the input components).
Grading rules live in `src/lib/grading/grade.ts`.

---

## The hard constraint (read this first)

> **Every ACTIVE assessment item must yield a clean correct/incorrect signal.**

The adaptive engine needs a binary right/wrong from every served item to place
the child. Therefore an answer type that cannot be auto-graded — **free
drawing, open written production, "explain your thinking"** — **cannot be an
active assessment item.** Such tasks may live in the bank for instructor/print
use, but must stay `is_active = false`. The content audit
(`docs/sam-content-authenticity-audit.md`) flags any active item whose stored
answer cannot be cleanly graded as currently shaped.

This is also why the grading module is **standalone and pure**: it is the
scoring primitive the submit path calls *after* the served-question gate and
de-duplication have done their (separate, well-tested) job. Grading never
touches that gate.

---

## Three pieces per question

1. **The answer input** the child uses — an `AnswerInputSpec`
   (`equation-fill`, `equation-set`, or `visual-mc`), or an existing simple
   input (single numeric/text box, plain MC).
2. **The response** the child produces — an `AnswerValue` (the app builds this;
   authors don't write it, but it helps to know the shapes).
3. **The correct-answer model** the author stores — a `CorrectAnswerModel`.

`grade(answer, model)` returns `{ correct, reason, perBlank? }`. A response whose
shape doesn't fit the rule grades as a clean **incorrect** (never throws).

### AnswerValue shapes (produced by the app)

| shape | produced by | example |
|---|---|---|
| `{ type:"scalar", value }` | single numeric/text box | `{ "type":"scalar", "value":"508" }` |
| `{ type:"mc-index", index }` | multiple choice | `{ "type":"mc-index", "index":0 }` |
| `{ type:"blanks", values }` | `equation-fill` | `{ "type":"blanks", "values":{ "a":"6","b":"4","sum":"10" } }` |
| `{ type:"equation-set", equations }` | `equation-set` | see fact family below |

An `Equation` is `{ a, op, b, result }` with `op` one of `"+" "-" "x" "/"`.

---

## The six grading rules (`CorrectAnswerModel`)

### `exact-numeric`
Numeric box. Optional `tolerance` (default 0). `"07"`, `" 7 "`, `"+7"` all parse
to 7.
```json
{ "rule": "exact-numeric", "value": 508 }
```

### `exact-text`
Text box. Normalized (trimmed, whitespace-collapsed, lower-cased unless
`caseSensitive`). `accepted` lists alternate spellings.
```json
{ "rule": "exact-text", "value": "five hundred and eight",
  "accepted": ["508 in words"] }
```

### `mc-index`
Plain or visual multiple choice. 0-based index of the correct option.
```json
{ "rule": "mc-index", "index": 0 }
```

### `per-blank`
Every blank in an `equation-fill` must match its key. `numeric:true` compares as
numbers (with optional `tolerance`); otherwise text-normalized.
```json
{
  "rule": "per-blank",
  "blanks": {
    "a":   { "value": "6",  "numeric": true },
    "b":   { "value": "4",  "numeric": true },
    "sum": { "value": "10", "numeric": true }
  }
}
```
Result includes a `perBlank` breakdown; `correct` is true only if **all** match.

### `set-equality` — for fact families / sets of equations
The child's produced equation set must equal the `canonical` set. **Line order
is irrelevant.** With `allowCommutative: true`, the operands of `+` and `×` may
be swapped (so `2 + 6` satisfies `6 + 2`), and the canonical sentences collapse
to their **distinct facts** before comparison. Subtraction/division never
collapse. (Worked example below.)

### `equation-validity` — "write N true number sentences using these numbers"
Each produced line must be an arithmetically **true** equation built only from
`allowedNumbers`, using a permitted `op` (`ops`, default all four). Exactly
`requireCount` lines; `requireDistinct: true` forbids repeats.
```json
{
  "rule": "equation-validity",
  "allowedNumbers": [2, 6, 8],
  "ops": ["+", "-"],
  "requireCount": 2,
  "requireDistinct": true
}
```

---

## Worked example — fact family for **6, 8, 2**

What to record per question (a non-engineer can follow this):

1. **Stem:** "Write the fact family for 6, 8 and 2."
2. **Answer input** (`answerInput` field):
   ```json
   { "kind": "equation-set", "rows": 4, "ops": ["+", "-"] }
   ```
   This gives the child four editable lines, each `[ ] [+/−] [ ] = [ ]`.
3. **Correct-answer model** (`correctAnswer` field):
   ```json
   {
     "rule": "set-equality",
     "allowCommutative": true,
     "canonical": [
       { "a": 6, "op": "+", "b": 2, "result": 8 },
       { "a": 2, "op": "+", "b": 6, "result": 8 },
       { "a": 8, "op": "-", "b": 6, "result": 2 },
       { "a": 8, "op": "-", "b": 2, "result": 6 }
     ]
   }
   ```

**How grading reads it** (with `allowCommutative: true`):

- The two additions `6+2=8` and `2+6=8` are the **same fact**, so the canonical
  set collapses to **three distinct facts**: `6+2=8`, `8−6=2`, `8−2=6`.
- The child is **correct** if they produce exactly those three facts, in **any
  line order**, with the two addends in **either order**. Writing all four
  sentences is also correct (the duplicate addition collapses).
- The child is **incorrect** if any fact is missing, an extra/wrong fact is
  present, or a result is wrong.

This exact case is covered by tests in `src/lib/grading/grade.test.ts`
(shuffled line order, a commutative variant, the three-distinct-facts form, a
missing fact, and a wrong fact).

> Author's note: you may list the canonical set either as all four sentences
> (most natural for a teacher) **or** as the three distinct facts — both grade
> identically when `allowCommutative` is on. Set `allowCommutative: false` only
> if addend order must be assessed.

---

## Previewing the inputs

Dev gallery: **`/dev/visual-primitives`** — also renders every answer input with
sample params and shows the live `AnswerValue` each one emits.

**How to reach it (plain steps):**
- **Locally:** with the app running, open `http://localhost:3000/dev/visual-primitives`.
  It is always on outside production.
- **On a Vercel preview deployment:** it is hidden by default. To review it
  there, set the env var `ENABLE_VISUAL_PRIMITIVES_GALLERY` to `true` on that
  preview, then open `/dev/visual-primitives`. It stays hidden in real
  production (returns 404) unless that variable is set.
