// Derive a screen-reader text alternative for any primitive spec.
//
// Used as the default `aria-label` when a record omits `ariaLabel`, and reused
// by the dev gallery and the content audit to render a text description of each
// visual. Pure function of the spec — safe to call server-side.

import { accentWord } from "./accent";
import type {
  MaybeUnknown,
  PatternItem,
  VisualPrimitiveSpec,
} from "./types";

function n(v: MaybeUnknown): string {
  return v === "?" ? "unknown" : String(v);
}

function shadedCount(shaded: number | number[]): number {
  return Array.isArray(shaded) ? shaded.length : shaded;
}

function patternItemWord(item: PatternItem): string {
  switch (item.type) {
    case "shape":
      return `${item.color ? accentWord(item.color) + " " : ""}${item.shape}`;
    case "number":
      return String(item.value);
    case "blank":
      return "blank";
    default: {
      const _exhaustive: never = item;
      return _exhaustive;
    }
  }
}

/** Human-readable description of a visual primitive. */
export function describeVisual(spec: VisualPrimitiveSpec): string {
  if (spec.ariaLabel) return spec.ariaLabel;

  switch (spec.kind) {
    case "bar-model": {
      const rows = spec.rows
        .map((row) => {
          const parts = row.segments
            .map((s) => s.label ?? String(s.value))
            .join(", ");
          return `${row.label ? row.label + ": " : ""}${parts}`;
        })
        .join("; ");
      return `Bar model. ${rows}.`;
    }
    case "number-bond":
      return `Number bond: whole ${n(spec.whole)}, parts ${spec.parts
        .map(n)
        .join(" and ")}.`;
    case "ten-frame":
      return `Ten frame showing ${spec.filled} counter${
        spec.filled === 1 ? "" : "s"
      }.`;
    case "place-value-blocks": {
      const bits: string[] = [];
      if (spec.thousands) bits.push(`${spec.thousands} thousand`);
      if (spec.hundreds) bits.push(`${spec.hundreds} hundred`);
      if (spec.tens) bits.push(`${spec.tens} ten`);
      if (spec.ones) bits.push(`${spec.ones} one`);
      return `Place-value blocks: ${bits.length ? bits.join(", ") : "none"}.`;
    }
    case "number-line": {
      const marks = spec.marks?.length
        ? ` Marked at ${spec.marks.map((m) => m.label ?? m.value).join(", ")}.`
        : "";
      const jumps = spec.jumps?.length
        ? ` ${spec.jumps
            .map((j) => `Jump from ${j.from} to ${j.to}`)
            .join(", ")}.`
        : "";
      return `Number line from ${spec.min} to ${spec.max}.${marks}${jumps}`;
    }
    case "array":
      return `Array of ${spec.rows} rows by ${spec.cols} columns, ${
        spec.rows * spec.cols
      } in total.`;
    case "fraction-shape":
      return `Fraction ${spec.variant}: ${shadedCount(
        spec.shaded,
      )} of ${spec.denominator} parts shaded.`;
    case "analog-clock": {
      const mm = String(((spec.minute % 60) + 60) % 60).padStart(2, "0");
      const hh = ((spec.hour % 12) + 12) % 12 || 12;
      return `Analog clock showing ${hh}:${mm}.`;
    }
    case "money": {
      const piles = spec.piles
        .map((p) => `${p.count} × ${centsWord(p.cents)}`)
        .join(", ");
      return `Money: ${piles}.`;
    }
    case "shape-2d":
      return `Shapes: ${spec.shapes
        .map((s) => `${s.color ? accentWord(s.color) + " " : ""}${s.shape}`)
        .join(", ")}.`;
    case "pattern-sequence":
      return `Pattern: ${spec.items.map(patternItemWord).join(", ")}.`;
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

/** Words for a Singapore denomination given in cents. */
export function centsWord(cents: number): string {
  return cents >= 100 ? `$${cents / 100}` : `${cents}c`;
}
