# L1 Answer-Input Wiring — Build Spec (lane/answer-input-wiring)

Goal: make four held answer-input types **work** in the live player + server
grading so CONVERSION can later activate the held L1 rows. **We do NOT activate
any row** (no `is_active=true`, no edits to held-row data). The bare-`is_active`
guardrail (`questions_held_rows_inactive`) must stay valid throughout.

## Locked decisions (founder-approved 2026-06-14)
1. **Read from REAL top-level `content` fields**, not `content._authoring`. At
   activation CONVERSION promotes `_authoring` → real content keys (the guardrail
   migration comment already says activation "set[s] real format + content"). We
   define the post-activation content shape per format here; `_authoring` stays
   the staging/spec area and is never read at runtime.
2. **Matching is graded BINARY all-or-nothing** (correct iff every pair right).
   Return a per-pair breakdown for diagnostics (mirror `grade.ts` `perBlank`),
   but the gradeable signal stays binary — inside the locked grading contract.
3. **Image-ordering (Q17) is SPLIT to its own lane** — not built here.

## Two grading worlds we are bridging
- Live: player inputs emit **strings**; `correctness.ts judgeAnswer()` returns
  **boolean**; serializer strips answers.
- New: `grade.ts grade(AnswerValue, CorrectAnswerModel)` scores structured values.
- Bridge: new inputs serialize their `AnswerValue` to a JSON **string** on submit
  (the DRAG_DROP precedent); `correctness.ts` parses that string back to an
  `AnswerValue`, reads the answer model from real content fields, and calls
  `grade()`.

## New `question_format` enum values (additive migration only — NO activation)
`SELECT_MULTIPLE`, `VISUAL_MATCHING`, `MULTI_BLANK`, `EQUATION_SET`.
(Single-select click-on-image needs NO new format — those items are
MULTIPLE_CHOICE held on art.)

## Post-activation content shapes  (server-side `questions.content`)
Render-safe fields cross to the client; **answer fields stay server-side** and
are stripped by `serialize.ts`.

### SELECT_MULTIPLE
```
{ stem, select_rule: "all" | "count",
  options: [{ id, label }],          // render-safe (tappable targets)
  correct: string[],                 // ANSWER (server-only) — only when rule="all"
  count: number,                     // only when rule="count"; visible in stem, render-safe
  image_path?, image_alt?, image_required?  // existing single-image plumbing
}
```
Wire: `{ stem, select_rule, options, count?, image? }`. STRIP `correct`.

### VISUAL_MATCHING
```
{ stem,
  left:  [{ id, label, image_path?, image_alt? }],   // render-safe (per-tile image optional)
  right: [{ id, label, image_path?, image_alt? }],   // render-safe (per-tile image optional)
  pairs: { [leftId]: rightId },      // ANSWER (server-only)
  image_path?, ... }                 // existing QUESTION-level single-image plumbing
```
Wire: `{ stem, left, right, image? }` where each left/right item is
`{ id, label, image? }`. STRIP `pairs`.

**Per-tile images** (added — L1 Q13 shapes→names, Q15 3D solids→names,
Q07 scene + candidate tiles need a separate image *per tile*, not one
question-level image). Each `left`/`right` item may carry its own
`image_path` (bucket-relative path into `question-images`) plus an
optional answer-safe `image_alt`. At serve time `mintMatchingTileImages`
(mintImage.ts) mints a short-TTL signed URL per tile — the same signed-URL
machinery as the question-level `image_path` — and the serializer attaches
it as the item's `image: { url, alt, required }` envelope. `image_alt`
falls back to the tile's render-safe `label` when not authored, so the
alt-mandatory mint invariant holds without a per-tile alt.

The raw per-tile `image_path`/`image_alt` are **server-only** and never
cross the wire (the serializer builds each item key-by-key from `id` +
`label`, dropping everything else; the client sees only the minted
`image` envelope). Per-tile images are **display-only**: the wire answer
is still `{ type:"pairs", pairs }` and grading is unchanged
(`correctness.ts` reads `content.pairs` — `match-pairs` on ids). The
client renderer (`MatchingInput.tsx`) shows the image when present and
falls back to the text `label` when absent or on image-load failure.
Items with no `image_path` (e.g. Q11/Q27, labels-only) keep the exact
prior `{ id, label }` wire shape — fully backward compatible.

### MULTI_BLANK
```
{ stem,
  tokens: FillToken[],               // render-safe template (text + blank ids)
  blanks: { [id]: BlankKey },        // ANSWER (server-only)
  image_path?, ... }
```
Wire: `{ stem, tokens, image? }`. STRIP `blanks`. (`FillToken`/`BlankKey` already
exist in answer-inputs/types.ts and grading/types.ts.)

### EQUATION_SET
```
{ stem,
  rows: number,                      // render-safe
  ops?: Op[],                        // render-safe (selectable operators)
  answer_rule: "set-equality" | "equation-validity",
  // set-equality:   canonical: Equation[], allowCommutative?: boolean
  // equation-validity: allowedNumbers: number[], requireCount: number,
  //                    requireDistinct?: boolean, validityOps?: Op[]
  image_path?, ... }
```
Wire: `{ stem, rows, ops?, image? }`. STRIP every answer field
(`canonical`/`allowCommutative`/`allowedNumbers`/`requireCount`/...).

## Wire-string convention (client → server `answer_given`)
New inputs submit `JSON.stringify(answerValue)` where `answerValue` is the exact
`AnswerValue` the component emits. `correctness.ts` parses it back.

## `grade.ts` / grading/types.ts additions
New `AnswerValue` members:
- `{ type: "id-set"; ids: string[] }`        (SELECT_MULTIPLE)
- `{ type: "pairs"; pairs: Record<string,string> }`  (VISUAL_MATCHING)

New `CorrectAnswerModel` members:
- `{ rule: "select-all"; correct: string[] }`
- `{ rule: "select-count"; count: number; optionIds: string[] }`
- `{ rule: "match-pairs"; pairs: Record<string,string> }`

`GradeResult`: add optional `perPair?: Record<string, boolean>`.

New rule semantics (all return clean binary `correct`):
- **select-all**: dedupe `ids` → set; correct iff set equals `correct` set
  (order-irrelevant; no extras, none missing).
- **select-count**: dedupe `ids`; every id ∈ `optionIds`; correct iff unique
  count === `count`. (This is Q26 "any 10 of 15" — NOT set-equality.)
- **match-pairs**: for each `leftId` in model.pairs, `perPair[leftId] =
  answer.pairs[leftId] === model.pairs[leftId]`; correct iff all true AND no
  extra/missing left ids. (per `multi-blank`/`per-blank` already exists; reuse.)

Reuse existing rules: `per-blank` (MULTI_BLANK), `set-equality` &
`equation-validity` (EQUATION_SET). Keep `grade()` switch exhaustive (`never`).

## `correctness.ts` additions
Import `grade` + types from `@/lib/grading`. Add a `parseAnswerValue(raw)` helper
(JSON.parse + shape-guard the `type`; throw on malformed — matches the
throws-on-malformed posture). New cases:
- `SELECT_MULTIPLE`: read `select_rule`; rule "all" → `select-all` w/ `correct`;
  rule "count" → `select-count` w/ `count` + option ids. `return grade(...).correct`.
- `VISUAL_MATCHING`: read `pairs` → `match-pairs`. `return grade(...).correct`.
- `MULTI_BLANK`: read `blanks` → `per-blank`. `return grade(...).correct`.
- `EQUATION_SET`: read `answer_rule` → build set-equality / equation-validity
  model. `return grade(...).correct`.
The switch return type is `boolean`, so TS forces handling all new enum members.

## `serialize.ts` + questionPicker/types.ts additions
Add `ClientQuestionContent` union members for the 4 new formats (render-safe
fields only). Add `stripContent` cases building output **key-by-key** from the
allowlist (never spread `content`). Answer fields MUST NOT appear. Thread `image`
through like the existing cases.

## Player dispatch — QuestionTimer.tsx + new live input components
Add 4 cases. New wrapper components in
`src/app/(child)/assessment/components/` (live inputs emit a string via
`onSubmit`):
- `SelectMultipleInput.tsx` — options as toggleable tap targets + Submit;
  emits `JSON.stringify({ type:"id-set", ids })`. Use `select_rule`/`count` for
  UX hints (e.g. show "pick N"); grading is server-side.
- `MatchingInput.tsx` — two columns; tap a left then a right to pair (re-tap to
  change); Submit; emits `JSON.stringify({ type:"pairs", pairs })`.
- `MultiBlankInput.tsx` — wraps shared `EquationFill` + Submit; emits
  `JSON.stringify(blanksAnswerValue)`.
- `EquationSetInput.tsx` — wraps shared `EquationSet` + Submit; emits
  `JSON.stringify(equationSetAnswerValue)`.
Keyboard + aria parity with existing inputs (see DragDropInput for the bar).

## Migration
New `supabase/migrations/2026061412xxxx_add_l1_input_formats.sql`: four
`alter type question_format add value if not exists '<X>';` lines, enum DDL
ALONE (mirror `20260610170000_add_text_entry_format.sql`). **No seed.sql mirror**
(enum DDL is schema, not row data — same note as the TEXT_ENTRY migration). NO
data/row changes; do not touch held rows or the guardrail.

## Generated types
Hand-edit `src/lib/supabase/database.types.ts`: add the 4 values to BOTH the
`question_format:` union AND the `Constants...question_format: [...]` array
(can't run `supabase gen` here). `engine/types.ts` derives via `Enums<>` — no
change needed there.

## Tests (add, keep baseline green)
- `grade.test.ts`: select-all (match, extra, missing, dup), select-count (right
  count, wrong count, out-of-set, dup), match-pairs (all-right, one-wrong→binary
  false + perPair, extra/missing left).
- `correctness.test.ts`: one happy + one wrong per new format, plus a
  malformed-content throw and a malformed-answer case.
- `serialize.test.ts`: per new format, assert the wire object has ONLY the
  render-safe keys and that the answer fields (`correct`/`pairs`/`blanks`/
  `canonical`/...) are absent (`Object.keys` allowlist invariant).

## Verify bar (must be green before handoff)
`pnpm test` && `tsc --noEmit` && `pnpm lint` && `pnpm build`.
