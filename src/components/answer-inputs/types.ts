// Answer-input component param contract (grades 1–3).
//
// These are the STRUCTURED-INPUT counterparts to the stem visual primitives.
// A question record carries an `answerInput` shaped as one of the `*Spec` types
// below; the matching client component renders the input and emits an
// `AnswerValue` (see @/lib/grading/types) which `grade()` scores.
//
// JSON-serializable, like the visual-primitive contract. Worked examples live
// in docs/answer-model-spec.md.

import type { Op } from "@/lib/grading/types";
import type { VisualPrimitiveSpec } from "../visual-primitives/types";

/** One cell in an equation-fill template: a fixed token or a fillable blank. */
export type FillToken =
  | { t: "text"; value: string }
  | { t: "blank"; id: string; placeholder?: string };

/**
 * Multi-blank / equation-fill: a linear template such as
 * `[blank a] + [blank b] = [blank sum]`. Emits AnswerValue
 * `{ type:"blanks", values:{ id: entered } }`; grade with `per-blank`.
 */
export interface EquationFillSpec {
  kind: "equation-fill";
  tokens: FillToken[];
  ariaLabel?: string;
}

/**
 * Set-of-equations / fact-family: `rows` editable lines, each
 * `[a] [op] [b] = [result]`. The child fills the numbers and picks the
 * operator per line. Emits AnswerValue `{ type:"equation-set", equations }`;
 * grade with `set-equality` (fact families) or `equation-validity`.
 */
export interface EquationSetSpec {
  kind: "equation-set";
  rows: number;
  /** Operators selectable per line. Default ["+","-"]. */
  ops?: Op[];
  ariaLabel?: string;
}

/**
 * Multiple-choice whose options are rendered by stem visual primitives
 * (e.g. "which ten-frame shows 7?"). Single-select; emits AnswerValue
 * `{ type:"mc-index", index }`; grade with `mc-index`.
 */
export interface VisualMCSpec {
  kind: "visual-mc";
  options: { id: string; visual: VisualPrimitiveSpec }[];
  ariaLabel?: string;
}

export type AnswerInputSpec = EquationFillSpec | EquationSetSpec | VisualMCSpec;
export type AnswerInputKind = AnswerInputSpec["kind"];
