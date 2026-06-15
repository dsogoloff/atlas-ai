// Pure grading rules for grade-1–3 answer models. See ./types.ts for the
// contract and docs/answer-model-spec.md for the authored worked examples.
//
// Standalone and side-effect-free. Each rule returns a GradeResult; the
// top-level grade() dispatches on the model rule and rejects answers whose
// shape does not match the rule.

import type {
  AnswerValue,
  CorrectAnswerModel,
  Equation,
  GradeResult,
  Op,
} from "./types";

// --- shared normalizers -----------------------------------------------------

/** Trim + collapse internal whitespace; lowercase unless caseSensitive. */
export function normalizeText(s: string, caseSensitive = false): string {
  const collapsed = s.trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

/** Parse a numeric entry. Strips a leading "+"; returns NaN if not a number. */
export function parseNumber(s: string): number {
  const t = s.trim().replace(/^\+/, "");
  if (t === "" || !/^-?\d*\.?\d+$/.test(t)) return NaN;
  return Number(t);
}

function ok(reason: string): GradeResult {
  return { correct: true, reason };
}
function no(reason: string): GradeResult {
  return { correct: false, reason };
}

// --- individual rules -------------------------------------------------------

export function gradeExactNumeric(
  value: string,
  target: number,
  tolerance = 0,
): GradeResult {
  const n = parseNumber(value);
  if (Number.isNaN(n)) return no(`"${value}" is not numeric`);
  return Math.abs(n - target) <= tolerance
    ? ok(`${n} within ±${tolerance} of ${target}`)
    : no(`${n} ≠ ${target} (±${tolerance})`);
}

export function gradeExactText(
  value: string,
  target: string,
  accepted: string[] = [],
  caseSensitive = false,
): GradeResult {
  const got = normalizeText(value, caseSensitive);
  const candidates = [target, ...accepted].map((c) =>
    normalizeText(c, caseSensitive),
  );
  return candidates.includes(got)
    ? ok(`"${value}" matches`)
    : no(`"${value}" not in accepted set`);
}

export function gradeMcIndex(index: number, target: number): GradeResult {
  return index === target
    ? ok(`index ${index} matches`)
    : no(`index ${index} ≠ ${target}`);
}

// --- equation helpers -------------------------------------------------------

const COMMUTATIVE: ReadonlySet<Op> = new Set<Op>(["+", "x"]);

export function evalOp(a: number, op: Op, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "x":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}

/** True iff the equation is arithmetically correct. */
export function isValidEquation(eq: Equation): boolean {
  const lhs = evalOp(eq.a, eq.op, eq.b);
  return !Number.isNaN(lhs) && lhs === eq.result;
}

/** Stable canonical key. With allowCommutative, + and × operands are sorted so
 *  6+2 and 2+6 collapse to one key. */
export function canonicalKey(eq: Equation, allowCommutative: boolean): string {
  let { a, b } = eq;
  if (allowCommutative && COMMUTATIVE.has(eq.op) && a > b) {
    [a, b] = [b, a];
  }
  return `${a}${eq.op}${b}=${eq.result}`;
}

function keySet(eqs: Equation[], allowCommutative: boolean): Set<string> {
  return new Set(eqs.map((e) => canonicalKey(e, allowCommutative)));
}

export function gradeSetEquality(
  produced: Equation[],
  canonical: Equation[],
  allowCommutative = false,
): GradeResult {
  const want = keySet(canonical, allowCommutative);
  const got = keySet(produced, allowCommutative);
  if (want.size !== got.size) {
    return no(`produced ${got.size} distinct facts, expected ${want.size}`);
  }
  for (const k of want) {
    if (!got.has(k)) return no(`missing fact ${k}`);
  }
  return ok(`set of ${want.size} facts matches`);
}

export function gradeEquationValidity(
  produced: Equation[],
  allowedNumbers: number[],
  requireCount: number,
  ops: Op[] = ["+", "-", "x", "/"],
  requireDistinct = false,
): GradeResult {
  if (produced.length !== requireCount) {
    return no(`produced ${produced.length} lines, expected ${requireCount}`);
  }
  const allowed = new Set(allowedNumbers);
  const opSet = new Set(ops);
  for (const eq of produced) {
    if (!opSet.has(eq.op)) return no(`operator "${eq.op}" not allowed`);
    if (![eq.a, eq.b, eq.result].every((x) => allowed.has(x))) {
      return no(`equation ${eq.a}${eq.op}${eq.b}=${eq.result} uses a disallowed number`);
    }
    if (!isValidEquation(eq)) {
      return no(`equation ${eq.a}${eq.op}${eq.b}=${eq.result} is not true`);
    }
  }
  if (requireDistinct) {
    const keys = new Set(produced.map((e) => canonicalKey(e, true)));
    if (keys.size !== produced.length) return no("equations are not distinct");
  }
  return ok(`${requireCount} valid equations`);
}

// --- selection / matching rules ---------------------------------------------

/** Selected id set must equal `correct` exactly (dupes collapse; order is
 *  irrelevant; no extras, none missing). */
export function gradeSelectAll(ids: string[], correct: string[]): GradeResult {
  const got = new Set(ids);
  const want = new Set(correct);
  if (got.size !== want.size) {
    return no(`selected ${got.size} distinct, expected ${want.size}`);
  }
  for (const id of want) {
    if (!got.has(id)) return no(`missing selection ${id}`);
  }
  return ok(`selected set of ${want.size} matches`);
}

/** Exactly one id selected, equal to `correct` (click-image single-select).
 *  More than one selection — or none — is wrong: this is an exact single-id
 *  match, not set-equality. */
export function gradeSelectOne(ids: string[], correct: string): GradeResult {
  if (ids.length !== 1) {
    return no(`selected ${ids.length} tiles, expected exactly 1`);
  }
  return ids[0] === correct
    ? ok(`selected "${ids[0]}" matches`)
    : no(`selected "${ids[0]}" ≠ "${correct}"`);
}

/** Produced id list must equal `order` element-for-element, in sequence
 *  (image-ordering). Order is significant — same ids in a different order
 *  is wrong. */
export function gradeOrderEquality(
  ids: string[],
  order: string[],
): GradeResult {
  if (ids.length !== order.length) {
    return no(`produced ${ids.length} tiles, expected ${order.length}`);
  }
  for (let i = 0; i < order.length; i++) {
    if (ids[i] !== order[i]) {
      return no(`position ${i + 1}: "${ids[i]}" ≠ "${order[i]}"`);
    }
  }
  return ok(`order of ${order.length} tiles matches`);
}

/** Every selected id must be a valid option id, and the count of DISTINCT
 *  selected ids must equal `count` (Q26 "any N of M"). */
export function gradeSelectCount(
  ids: string[],
  count: number,
  optionIds: string[],
): GradeResult {
  const allowed = new Set(optionIds);
  for (const id of ids) {
    if (!allowed.has(id)) return no(`selection "${id}" is not an option`);
  }
  const distinct = new Set(ids);
  return distinct.size === count
    ? ok(`selected ${count} distinct valid options`)
    : no(`selected ${distinct.size} distinct, expected ${count}`);
}

/** Binary all-or-nothing match (correct iff every pair right and no extra/
 *  missing left ids), with a per-pair breakdown for diagnostics. */
export function gradeMatchPairs(
  answer: Record<string, string>,
  correct: Record<string, string>,
): GradeResult {
  const perPair: Record<string, boolean> = {};
  let allCorrect = true;
  for (const [leftId, rightId] of Object.entries(correct)) {
    const match = answer[leftId] === rightId;
    perPair[leftId] = match;
    if (!match) allCorrect = false;
  }
  // Extra left ids the model does not expect → wrong (not in perPair).
  for (const leftId of Object.keys(answer)) {
    if (!(leftId in correct)) allCorrect = false;
  }
  return {
    correct: allCorrect,
    reason: allCorrect ? "all pairs match" : "one or more pairs wrong",
    perPair,
  };
}

// --- dispatcher -------------------------------------------------------------

/** Grade a structured answer against an authored correct-answer model. */
export function grade(
  answer: AnswerValue,
  model: CorrectAnswerModel,
): GradeResult {
  switch (model.rule) {
    case "exact-numeric":
      if (answer.type !== "scalar") return shapeMismatch(answer, model.rule);
      return gradeExactNumeric(answer.value, model.value, model.tolerance);

    case "exact-text":
      if (answer.type !== "scalar") return shapeMismatch(answer, model.rule);
      return gradeExactText(
        answer.value,
        model.value,
        model.accepted,
        model.caseSensitive,
      );

    case "mc-index":
      if (answer.type !== "mc-index") return shapeMismatch(answer, model.rule);
      return gradeMcIndex(answer.index, model.index);

    case "per-blank": {
      if (answer.type !== "blanks") return shapeMismatch(answer, model.rule);
      const perBlank: Record<string, boolean> = {};
      let allCorrect = true;
      for (const [id, key] of Object.entries(model.blanks)) {
        const entered = answer.values[id] ?? "";
        const res = key.numeric
          ? gradeExactNumeric(entered, parseNumber(key.value), key.tolerance)
          : gradeExactText(entered, key.value, key.accepted);
        perBlank[id] = res.correct;
        if (!res.correct) allCorrect = false;
      }
      return {
        correct: allCorrect,
        reason: allCorrect ? "all blanks match" : "one or more blanks wrong",
        perBlank,
      };
    }

    case "set-equality":
      if (answer.type !== "equation-set") return shapeMismatch(answer, model.rule);
      return gradeSetEquality(
        answer.equations,
        model.canonical,
        model.allowCommutative,
      );

    case "equation-validity":
      if (answer.type !== "equation-set") return shapeMismatch(answer, model.rule);
      return gradeEquationValidity(
        answer.equations,
        model.allowedNumbers,
        model.requireCount,
        model.ops,
        model.requireDistinct,
      );

    case "select-one":
      if (answer.type !== "id-set") return shapeMismatch(answer, model.rule);
      return gradeSelectOne(answer.ids, model.correct);

    case "select-all":
      if (answer.type !== "id-set") return shapeMismatch(answer, model.rule);
      return gradeSelectAll(answer.ids, model.correct);

    case "order-equality":
      if (answer.type !== "ordered-ids")
        return shapeMismatch(answer, model.rule);
      return gradeOrderEquality(answer.ids, model.order);

    case "select-count":
      if (answer.type !== "id-set") return shapeMismatch(answer, model.rule);
      return gradeSelectCount(answer.ids, model.count, model.optionIds);

    case "match-pairs":
      if (answer.type !== "pairs") return shapeMismatch(answer, model.rule);
      return gradeMatchPairs(answer.pairs, model.pairs);

    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}

function shapeMismatch(
  answer: AnswerValue,
  rule: CorrectAnswerModel["rule"],
): GradeResult {
  return no(`answer shape "${answer.type}" cannot be graded by rule "${rule}"`);
}
