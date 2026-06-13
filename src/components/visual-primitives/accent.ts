// Resolve named accents to the locked sam-* CSS tokens (globals.css @theme).
// Records reference colours by name only; raw hex never enters the bank.

import type { AccentColor } from "./types";

/** CSS var reference for an accent's fill. Use in SVG `fill`/`stroke`
 *  attributes, which do not accept Tailwind classes. */
export function accentToken(color: AccentColor = "navy"): string {
  switch (color) {
    case "navy":
      return "var(--color-sam-navy)";
    case "teal":
      return "var(--color-sam-teal)";
    case "orange":
      return "var(--color-sam-orange)";
    case "red":
      return "var(--color-sam-red)";
    case "yellow":
      return "var(--color-sam-yellow)";
    case "neutral":
      return "var(--color-sam-gray-light)";
    default: {
      const _exhaustive: never = color;
      return _exhaustive;
    }
  }
}

/** A readable colour word for aria text. */
export function accentWord(color: AccentColor = "navy"): string {
  return color === "neutral" ? "grey" : color;
}
