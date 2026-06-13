// Visual-primitive param contract (Singapore Math, grades 1–3).
//
// THIS FILE IS THE CONTRACT. Question records (authored by the CONVERSION
// session) carry a `visual` field shaped as one of the `*Spec` types below;
// the matching React component renders it. Every spec is JSON-serializable —
// no functions, no React nodes, no image URLs. A primitive renders purely from
// its structured params and never depends on an external or copyrighted image.
//
// Worked param examples per primitive live in docs/visual-primitives-spec.md.
//
// House rules baked in here:
//  - Colours are named accents (`AccentColor`), resolved to the locked
//    sam-* CSS tokens by `accentToken()` in ./accent.ts. Records never store
//    raw hex.
//  - Every spec accepts an optional `ariaLabel` text alternative. When absent,
//    `describeVisual()` (./describe.ts) derives one, so a primitive is never
//    shipped without a screen-reader description.

/** Named brand accents — the only colours a record may reference. Mapped to
 *  the locked `--color-sam-*` tokens (globals.css `@theme`) by accentToken(). */
export type AccentColor =
  | "navy"
  | "teal"
  | "orange"
  | "red"
  | "yellow"
  | "neutral";

/** Common, optional display props every primitive accepts (NOT serialized into
 *  the param contract beyond `ariaLabel` — `className` is a render-site concern). */
export interface PrimitiveDisplayProps {
  /** Text alternative. When omitted, derived by describeVisual(). */
  ariaLabel?: string;
  /** Extra classes for the root <svg>/<figure>. Render-site only. */
  className?: string;
}

/** A value that may be unknown in a diagram (renders as "?"). */
export type MaybeUnknown = number | "?";

// ---------------------------------------------------------------------------
// 1. Bar model — Singapore part/whole & comparison bars.
// ---------------------------------------------------------------------------
export interface BarSegment {
  /** Relative length driver. Use the real quantity; widths are normalized. */
  value: number;
  /** Label drawn inside the segment (e.g. "6", "?", "red"). */
  label?: string;
  color?: AccentColor;
}
export interface BarRow {
  /** Row label drawn to the left (e.g. "Alan", "Total"). */
  label?: string;
  segments: BarSegment[];
}
export interface BarModelSpec {
  kind: "bar-model";
  rows: BarRow[];
  /** Optional brace spanning the whole of a row, e.g. to mark a total/unknown. */
  brace?: { row: number; label: string };
  caption?: string;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 2. Number bond — whole and its parts.
// ---------------------------------------------------------------------------
export interface NumberBondSpec {
  kind: "number-bond";
  whole: MaybeUnknown;
  /** 2–3 parts is the K–3 norm; any number ≥ 2 renders. */
  parts: MaybeUnknown[];
  color?: AccentColor;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 3. Ten frame — 0–10 counters per frame, multiple frames stack.
// ---------------------------------------------------------------------------
export interface TenFrameSpec {
  kind: "ten-frame";
  /** Total counters to draw, filling frames left→right, top row first. */
  filled: number;
  /** Frame count. Defaults to ceil(filled / 10), min 1. */
  frames?: number;
  color?: AccentColor;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 4. Place-value (base-10) blocks.
// ---------------------------------------------------------------------------
export interface PlaceValueBlocksSpec {
  kind: "place-value-blocks";
  thousands?: number;
  hundreds?: number;
  tens?: number;
  ones?: number;
  color?: AccentColor;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 5. Number line — ticks, point marks, and "jump" arcs.
// ---------------------------------------------------------------------------
export interface NumberLineMark {
  value: number;
  label?: string;
  color?: AccentColor;
}
export interface NumberLineJump {
  from: number;
  to: number;
  label?: string;
}
export interface NumberLineSpec {
  kind: "number-line";
  min: number;
  max: number;
  /** Tick interval. Must be > 0. */
  step: number;
  /** Show a numeral under each tick (default true). */
  showTickLabels?: boolean;
  marks?: NumberLineMark[];
  jumps?: NumberLineJump[];
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 6. Array — rows × cols of markers (multiplication/area).
// ---------------------------------------------------------------------------
export interface ArraySpec {
  kind: "array";
  rows: number;
  cols: number;
  marker?: "dot" | "square";
  color?: AccentColor;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 7. Fraction shape — bar or circle, shaded parts of equal partitions.
// ---------------------------------------------------------------------------
export interface FractionShapeSpec {
  kind: "fraction-shape";
  variant: "bar" | "circle";
  /** Equal partitions. Must be ≥ 1. */
  denominator: number;
  /** Count of shaded parts, OR explicit 0-based indices to shade. */
  shaded: number | number[];
  color?: AccentColor;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 8. Analog clock.
// ---------------------------------------------------------------------------
export interface AnalogClockSpec {
  kind: "analog-clock";
  /** 0–23 (rendered mod 12). */
  hour: number;
  /** 0–59. */
  minute: number;
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 9. Money — Singapore coins & notes, by value in cents.
// ---------------------------------------------------------------------------
/** Singapore denominations in cents: coins 5/10/20/50/100, notes 200/500/1000. */
export type MoneyCents = 5 | 10 | 20 | 50 | 100 | 200 | 500 | 1000;
export interface MoneyPile {
  cents: MoneyCents;
  count: number;
}
export interface MoneySpec {
  kind: "money";
  piles: MoneyPile[];
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 10. Simple 2D shapes.
// ---------------------------------------------------------------------------
export type ShapeName =
  | "circle"
  | "square"
  | "rectangle"
  | "triangle"
  | "pentagon"
  | "hexagon";
export interface Shape2DSpec {
  kind: "shape-2d";
  shapes: { shape: ShapeName; label?: string; color?: AccentColor }[];
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// 11. Pattern sequence — items with a blank for the missing term.
// ---------------------------------------------------------------------------
export type PatternItem =
  | { type: "shape"; shape: ShapeName; color?: AccentColor }
  | { type: "number"; value: number }
  | { type: "blank" };
export interface PatternSequenceSpec {
  kind: "pattern-sequence";
  items: PatternItem[];
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Discriminated union over every stem primitive.
// ---------------------------------------------------------------------------
export type VisualPrimitiveSpec =
  | BarModelSpec
  | NumberBondSpec
  | TenFrameSpec
  | PlaceValueBlocksSpec
  | NumberLineSpec
  | ArraySpec
  | FractionShapeSpec
  | AnalogClockSpec
  | MoneySpec
  | Shape2DSpec
  | PatternSequenceSpec;

/** Every primitive `kind`, for exhaustiveness checks and the gallery index. */
export type VisualPrimitiveKind = VisualPrimitiveSpec["kind"];
