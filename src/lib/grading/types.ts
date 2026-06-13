// Answer-structure + correct-answer-model + grading-rule contract (grades 1–3).
//
// THIS FILE IS THE CONTRACT for auto-grading. A question record carries a
// `correctAnswer: CorrectAnswerModel`; at submit time the child's structured
// response is shaped as an `AnswerValue`; `grade(answer, model)` returns a
// clean correct/incorrect signal.
//
// HARD CONSTRAINT (documented in docs/answer-model-spec.md): every ACTIVE
// assessment item MUST yield a clean correct/incorrect signal — the adaptive
// engine needs it to place. Non-auto-gradeable answer types (free drawing,
// open production) therefore CANNOT be active assessment items.
//
// This module is intentionally standalone and pure. It does NOT touch the
// responseSubmit served-question gate (that is its own well-tested concern);
// it is the scoring primitive the submit path can call once it has a served,
// de-duplicated response.

/** Binary arithmetic operators a grade-1–3 item can use. */
export type Op = "+" | "-" | "x" | "/";

/** One number sentence, e.g. {a:6, op:"+", b:2, result:8} = "6 + 2 = 8". */
export interface Equation {
  a: number;
  op: Op;
  b: number;
  result: number;
}

// ---------------------------------------------------------------------------
// AnswerValue — the structured shape the child's response takes.
// ---------------------------------------------------------------------------
export type AnswerValue =
  /** Single numeric/text entry (one box). */
  | { type: "scalar"; value: string }
  /** Multiple-choice selection (0-based option index). */
  | { type: "mc-index"; index: number }
  /** Multi-blank / equation-fill: blank id → entered string. */
  | { type: "blanks"; values: Record<string, string> }
  /** Set of equations: fact families and equation-set inputs. */
  | { type: "equation-set"; equations: Equation[] };

// ---------------------------------------------------------------------------
// CorrectAnswerModel — what the record author stores per question.
// ---------------------------------------------------------------------------
/** Key for one blank in a `per-blank` model. */
export interface BlankKey {
  /** Canonical correct entry. */
  value: string;
  /** Extra accepted spellings/forms (matched after normalization). */
  accepted?: string[];
  /** Compare numerically rather than as text (e.g. "07" == "7"). */
  numeric?: boolean;
  /** Numeric tolerance (only with numeric: true). Default 0. */
  tolerance?: number;
}

export type CorrectAnswerModel =
  /** Exact numeric match within optional tolerance. */
  | { rule: "exact-numeric"; value: number; tolerance?: number }
  /** Exact text match (normalized; optional alternates). */
  | {
      rule: "exact-text";
      value: string;
      accepted?: string[];
      caseSensitive?: boolean;
    }
  /** Multiple-choice index match. */
  | { rule: "mc-index"; index: number }
  /** Every blank must match its key. */
  | { rule: "per-blank"; blanks: Record<string, BlankKey> }
  /** Produced equation set must equal the canonical set (order-irrelevant;
   *  with allowCommutative the operands of + and × may be swapped, and the
   *  canonical sentences are de-duplicated to their distinct facts). */
  | {
      rule: "set-equality";
      canonical: Equation[];
      allowCommutative?: boolean;
    }
  /** Each produced line must be a TRUE equation built only from allowedNumbers
   *  (using the permitted ops); exactly requireCount lines, optionally distinct. */
  | {
      rule: "equation-validity";
      allowedNumbers: number[];
      ops?: Op[];
      requireCount: number;
      requireDistinct?: boolean;
    };

// ---------------------------------------------------------------------------
// GradeResult.
// ---------------------------------------------------------------------------
export interface GradeResult {
  correct: boolean;
  /** Human-readable rationale for logs/debug. NEVER surfaced to the child
   *  client (per-question correctness must not reach the child by design). */
  reason: string;
  /** Per-blank breakdown for the `per-blank` rule. */
  perBlank?: Record<string, boolean>;
}
