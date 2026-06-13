# Visual-primitive spec — Singapore Math, grades 1–3

**Audience:** the CONVERSION session authoring question records, and any engineer
wiring the assessment renderer. **Status:** app-code contract. The bank itself is
owned by CONVERSION; this document defines the `visual` field a question record
may carry and how it renders.

**Source of truth (types):**
`src/components/visual-primitives/types.ts`. This doc mirrors it with a worked
example per primitive. If the two ever disagree, the TypeScript file wins.

## How it works

A question record carries an optional structured visual:

```jsonc
{
  "external_id": "SAM-Lx-Qn",
  "content": { "stem": "…", "visual": { /* one *Spec below */ } }
}
```

The renderer maps `visual.kind` to a React component
(`<VisualPrimitive spec={visual} />`). Every spec is **plain JSON** — no
functions, no image URLs, no copyrighted assets. Each primitive draws itself
from numbers and labels alone.

Three rules every record author follows:

1. **Colours are names, never hex.** Allowed: `navy`, `teal`, `orange`, `red`,
   `yellow`, `neutral`. They map to the locked S.A.M. palette. Omit `color` to
   get the sensible default (usually navy).
2. **Unknowns.** Where a field accepts `MaybeUnknown`, write the literal
   string `"?"` to show an unknown box (e.g. a missing part in a number bond).
3. **Accessibility is automatic.** Every primitive generates a screen-reader
   description. Add `"ariaLabel": "…"` only to override it (e.g. to phrase it in
   the question's words).

Each spec also accepts an optional `ariaLabel` (string). It is the only display
field stored in the record; sizing/styling is the renderer's job (primitives are
responsive and scale to their container, so they work on a narrow phone).

---

## The eleven primitives

### 1. `bar-model` — part/whole & comparison bars

Rows of proportional bars. Segment widths share a common scale across rows so
lengths are comparable. Optional `brace` marks a row (e.g. the whole).

```json
{
  "kind": "bar-model",
  "rows": [
    { "label": "Total", "segments": [{ "value": 10, "label": "10", "color": "navy" }] },
    { "label": "Parts", "segments": [
      { "value": 6, "label": "6", "color": "teal" },
      { "value": 4, "label": "4", "color": "orange" }
    ] }
  ],
  "brace": { "row": 0, "label": "whole" },
  "caption": "10 is 6 and 4"
}
```

### 2. `number-bond` — whole and its parts

```json
{ "kind": "number-bond", "whole": 10, "parts": [6, 4] }
```
Unknown part: `{ "kind": "number-bond", "whole": 10, "parts": [6, "?"] }`.

### 3. `ten-frame` — counters in 2×5 frames

`filled` counters fill left→right, top row first; frames default to
`ceil(filled / 10)`.

```json
{ "kind": "ten-frame", "filled": 7, "color": "teal" }
```
Numbers > 10 stack frames: `{ "kind": "ten-frame", "filled": 13 }`.

### 4. `place-value-blocks` — base-10 blocks

Only the place fields you set are drawn (`thousands`, `hundreds`, `tens`,
`ones`).

```json
{ "kind": "place-value-blocks", "hundreds": 2, "tens": 3, "ones": 4 }
```
(= 234.)

### 5. `number-line` — ticks, marks, jumps

```json
{
  "kind": "number-line",
  "min": 0, "max": 10, "step": 1,
  "marks": [{ "value": 3, "label": "3", "color": "orange" }],
  "jumps": [{ "from": 3, "to": 7, "label": "+4" }]
}
```
Hide numerals with `"showTickLabels": false`.

### 6. `array` — rows × columns of markers

```json
{ "kind": "array", "rows": 3, "cols": 4, "marker": "dot", "color": "teal" }
```
`marker` is `"dot"` (default) or `"square"`.

### 7. `fraction-shape` — bar or circle

`shaded` is either a count (shade the first N) or explicit 0-based indices.

```json
{ "kind": "fraction-shape", "variant": "bar", "denominator": 4, "shaded": 3 }
```
Circle, shading specific parts:
```json
{ "kind": "fraction-shape", "variant": "circle", "denominator": 6, "shaded": [0, 2, 4] }
```

### 8. `analog-clock`

```json
{ "kind": "analog-clock", "hour": 9, "minute": 25 }
```
`hour` is read mod 12; the hour hand advances with the minutes.

### 9. `money` — Singapore coins & notes

Each pile is a denomination in **cents** with a count. Coins: 5, 10, 20, 50,
100 (the $1 coin). Notes: 200, 500, 1000 (= $2/$5/$10).

```json
{
  "kind": "money",
  "piles": [
    { "cents": 100, "count": 1 },
    { "cents": 50, "count": 2 },
    { "cents": 10, "count": 3 }
  ]
}
```
(= $1 + 2×50c + 3×10c = $2.30.)

### 10. `shape-2d` — simple 2D shapes

One or more of: `circle`, `square`, `rectangle`, `triangle`, `pentagon`,
`hexagon`.

```json
{
  "kind": "shape-2d",
  "shapes": [
    { "shape": "triangle", "label": "triangle", "color": "orange" },
    { "shape": "hexagon", "label": "hexagon", "color": "teal" }
  ]
}
```

### 11. `pattern-sequence` — repeating/growing patterns

Items render left→right; `{ "type": "blank" }` is the missing term (the answer).

```json
{
  "kind": "pattern-sequence",
  "items": [
    { "type": "shape", "shape": "circle", "color": "navy" },
    { "type": "shape", "shape": "square", "color": "orange" },
    { "type": "shape", "shape": "circle", "color": "navy" },
    { "type": "shape", "shape": "square", "color": "orange" },
    { "type": "blank" }
  ]
}
```
Number patterns use `{ "type": "number", "value": 800 }` items.

---

## Edge handling (what happens with degenerate params)

Primitives never throw. Empty arrays render an empty but valid figure; counts
clamp to ≥ 0; `denominator < 1` renders one part; `step ≤ 0` renders a single
segment; clock values normalize. This is so a half-authored record still renders
a stable preview in the gallery rather than crashing the page.

## Previewing

Dev gallery: **`/dev/visual-primitives`** (see `docs/answer-model-spec.md` for the
reach instructions — same page hosts the answer inputs).
