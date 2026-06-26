// Parent answer-log humanizers.
//
// Turn the raw stored answer shapes into parent-readable strings. Two surfaces:
//   * the child's `answer_given` wire string (AnswerValue JSON for the
//     structured inputs; plain text for MC / numeric / text), and
//   * the question's correct-answer model (per-format, in questions.content).
//
// For the tap/id-set/ordering/matching formats the wire value is JSON like
// {"type":"id-set","ids":["t1"]} and the correct answer is a set of ids — neither
// is parent-readable on its own. We resolve every tile/option id to its display
// label using the SAME id→label model the answer-input components and serializer
// read (content.tiles / content.options / content.left|right with {id,label}),
// so the log shows "Square" / "Apple, Banana" instead of raw JSON.
//
// Posture: display-only and DEFENSIVE. Unlike serialize.ts / correctness.ts
// (which throw on malformed content so authoring bugs surface as 500s), this
// runs at render time over already-graded rows and must never throw and never
// fall back to dumping raw JSON. Unresolvable shapes degrade to "—"; an id with
// no matching label degrades to the id itself.

import type { Database, Json } from "@/lib/supabase/database.types";

type QuestionFormat = Database["public"]["Enums"]["question_format"];

const DASH = "—";

// ---------------------------------------------------------------------------
// Child answer
// ---------------------------------------------------------------------------

export function humanizeChildAnswer(
  format: QuestionFormat,
  content: Json,
  answerGiven: string,
): string {
  const obj = asObject(content);

  switch (format) {
    case "MULTIPLE_CHOICE":
    case "NUMERIC_ENTRY":
    case "TEXT_ENTRY":
      // Stored as the plain display string the child chose/typed.
      return answerGiven;

    case "DRAG_DROP": {
      // JSON-encoded array of string tokens.
      const arr = parseStringArray(answerGiven);
      return arr && arr.length > 0 ? arr.join(" → ") : DASH;
    }

    case "CLICK_IMAGE_SINGLE":
    case "CLICK_IMAGE_MULTI": {
      const ids = parseIdSet(answerGiven);
      return joinLabels(ids, tileLabelMap(obj), ", ");
    }

    case "SELECT_MULTIPLE": {
      const ids = parseIdSet(answerGiven);
      return joinLabels(ids, optionLabelMap(obj), ", ");
    }

    case "IMAGE_ORDERING": {
      const ids = parseOrderedIds(answerGiven);
      return joinLabels(ids, tileLabelMap(obj), " → ");
    }

    case "VISUAL_MATCHING": {
      const pairs = parsePairs(answerGiven);
      if (!pairs) return DASH;
      return formatPairs(pairs, leftLabelMap(obj), rightLabelMap(obj));
    }

    case "MULTI_BLANK": {
      const values = parseBlanks(answerGiven);
      if (!values) return DASH;
      const order = blankIdOrder(obj);
      const ordered = order.length > 0 ? order : Object.keys(values);
      const out = ordered
        .map((id) => values[id])
        .filter((v): v is string => typeof v === "string" && v.length > 0);
      return out.length > 0 ? out.join(", ") : DASH;
    }

    case "EQUATION_SET": {
      const equations = parseEquationSet(answerGiven);
      if (!equations || equations.length === 0) return DASH;
      return equations.map(formatEquation).join(", ");
    }
  }
}

// ---------------------------------------------------------------------------
// Correct answer
// ---------------------------------------------------------------------------

export function humanizeCorrectAnswer(
  format: QuestionFormat,
  content: Json,
): string {
  const obj = asObject(content);

  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = obj.options;
      const idx = obj.correct_index;
      if (
        Array.isArray(options) &&
        typeof idx === "number" &&
        Number.isInteger(idx) &&
        idx >= 0 &&
        idx < options.length
      ) {
        const opt = options[idx];
        return typeof opt === "string" ? opt : DASH;
      }
      return DASH;
    }

    case "NUMERIC_ENTRY":
    case "TEXT_ENTRY": {
      const ans = obj.correct_answer;
      return typeof ans === "string" ? ans : DASH;
    }

    case "DRAG_DROP": {
      const order = obj.correct_order;
      if (Array.isArray(order)) {
        const tokens = order.filter((x): x is string => typeof x === "string");
        return tokens.length > 0 ? tokens.join(" → ") : DASH;
      }
      return DASH;
    }

    case "CLICK_IMAGE_SINGLE": {
      const id = authoringModelField(obj, "correct");
      return typeof id === "string"
        ? resolveLabel(id, tileLabelMap(obj))
        : DASH;
    }

    case "CLICK_IMAGE_MULTI": {
      const ids = asStringArray(authoringModelField(obj, "correct"));
      return joinLabels(ids, tileLabelMap(obj), ", ");
    }

    case "IMAGE_ORDERING": {
      const ids = asStringArray(authoringModelField(obj, "order"));
      return joinLabels(ids, tileLabelMap(obj), " → ");
    }

    case "SELECT_MULTIPLE": {
      if (obj.select_rule === "count") {
        const count = obj.count;
        return typeof count === "number"
          ? `Any ${count} of the options`
          : DASH;
      }
      const ids = asStringArray(obj.correct);
      return joinLabels(ids, optionLabelMap(obj), ", ");
    }

    case "VISUAL_MATCHING": {
      const pairs = asStringRecord(obj.pairs);
      if (!pairs) return DASH;
      return formatPairs(pairs, leftLabelMap(obj), rightLabelMap(obj));
    }

    case "MULTI_BLANK": {
      const blanks = obj.blanks;
      if (blanks === null || typeof blanks !== "object" || Array.isArray(blanks)) {
        return DASH;
      }
      const blanksObj = blanks as Record<string, Json>;
      const order = blankIdOrder(obj);
      const ids = order.length > 0 ? order : Object.keys(blanksObj);
      const out = ids
        .map((id) => blankValue(blanksObj[id]))
        .filter((v): v is string => v !== null);
      return out.length > 0 ? out.join(", ") : DASH;
    }

    case "EQUATION_SET": {
      const canonical = obj.canonical;
      if (Array.isArray(canonical)) {
        const eqs = canonical
          .map(parseEquationObject)
          .filter((e): e is Equation => e !== null);
        if (eqs.length > 0) return eqs.map(formatEquation).join(", ");
      }
      // equation-validity rule: no canonical set — describe the constraint.
      if (obj.answer_rule === "equation-validity") {
        const allowed = asNumberArray(obj.allowedNumbers);
        const count = obj.requireCount;
        if (allowed.length > 0 && typeof count === "number") {
          return `Any ${count} true number sentence${count === 1 ? "" : "s"} using ${allowed.join(", ")}`;
        }
      }
      return DASH;
    }
  }
}

// ---------------------------------------------------------------------------
// id → label maps (read the same {id,label} models serialize.ts reads)
// ---------------------------------------------------------------------------

function tileLabelMap(obj: Record<string, Json>): Map<string, string> {
  return labelMap(obj.tiles);
}
function optionLabelMap(obj: Record<string, Json>): Map<string, string> {
  return labelMap(obj.options);
}
function leftLabelMap(obj: Record<string, Json>): Map<string, string> {
  return labelMap(obj.left);
}
function rightLabelMap(obj: Record<string, Json>): Map<string, string> {
  return labelMap(obj.right);
}

/** Build an id→label map from a {id,label}[] array, tolerating malformed
 *  entries (skipped rather than thrown). */
function labelMap(v: Json | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(v)) return map;
  for (const item of v) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, Json>;
    if (typeof o.id === "string" && typeof o.label === "string") {
      map.set(o.id, o.label);
    }
  }
  return map;
}

/** Resolve a single id to its label, falling back to the id itself (never JSON). */
function resolveLabel(id: string, map: Map<string, string>): string {
  return map.get(id) ?? id;
}

/** Resolve a list of ids to labels and join; "—" when empty. */
function joinLabels(
  ids: string[] | null,
  map: Map<string, string>,
  sep: string,
): string {
  if (!ids || ids.length === 0) return DASH;
  return ids.map((id) => resolveLabel(id, map)).join(sep);
}

/** leftId→rightId map → "leftLabel → rightLabel, …" in left-map order. */
function formatPairs(
  pairs: Record<string, string>,
  left: Map<string, string>,
  right: Map<string, string>,
): string {
  // Prefer the authored left order (stable, matches the rendered question);
  // fall back to the pairs' own key order for any left id not in the map.
  const leftIds = left.size > 0 ? Array.from(left.keys()) : Object.keys(pairs);
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const leftId of leftIds) {
    if (!(leftId in pairs)) continue;
    seen.add(leftId);
    parts.push(`${resolveLabel(leftId, left)} → ${resolveLabel(pairs[leftId], right)}`);
  }
  // Any pair whose left id wasn't in the label map (defensive).
  for (const [leftId, rightId] of Object.entries(pairs)) {
    if (seen.has(leftId)) continue;
    parts.push(`${resolveLabel(leftId, left)} → ${resolveLabel(rightId, right)}`);
  }
  return parts.length > 0 ? parts.join(", ") : DASH;
}

// ---------------------------------------------------------------------------
// Equation formatting
// ---------------------------------------------------------------------------

interface Equation {
  a: number;
  op: string;
  b: number;
  result: number;
}

const OP_SYMBOL: Record<string, string> = { "+": "+", "-": "-", x: "×", "/": "÷" };

function formatEquation(eq: Equation): string {
  const op = OP_SYMBOL[eq.op] ?? eq.op;
  return `${eq.a} ${op} ${eq.b} = ${eq.result}`;
}

function parseEquationObject(raw: Json): Equation | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, Json>;
  if (
    typeof o.a === "number" &&
    typeof o.b === "number" &&
    typeof o.result === "number" &&
    typeof o.op === "string"
  ) {
    return { a: o.a, op: o.op, b: o.b, result: o.result };
  }
  return null;
}

// ---------------------------------------------------------------------------
// answer_given (AnswerValue) parsers — tolerant, return null on any mismatch.
// ---------------------------------------------------------------------------

function parseAnswerValue(raw: string): Record<string, Json> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, Json>;
}

function parseIdSet(raw: string): string[] | null {
  const v = parseAnswerValue(raw);
  if (!v || v.type !== "id-set") return null;
  return asStringArray(v.ids);
}

function parseOrderedIds(raw: string): string[] | null {
  const v = parseAnswerValue(raw);
  if (!v || v.type !== "ordered-ids") return null;
  return asStringArray(v.ids);
}

function parsePairs(raw: string): Record<string, string> | null {
  const v = parseAnswerValue(raw);
  if (!v || v.type !== "pairs") return null;
  return asStringRecord(v.pairs);
}

function parseBlanks(raw: string): Record<string, string> | null {
  const v = parseAnswerValue(raw);
  if (!v || v.type !== "blanks") return null;
  return asStringRecord(v.values);
}

function parseEquationSet(raw: string): Equation[] | null {
  const v = parseAnswerValue(raw);
  if (!v || v.type !== "equation-set" || !Array.isArray(v.equations)) return null;
  return v.equations
    .map(parseEquationObject)
    .filter((e): e is Equation => e !== null);
}

/** JSON-encoded array of strings (DRAG_DROP answer_given). */
function parseStringArray(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// content shape helpers
// ---------------------------------------------------------------------------

/** content._authoring.answer_model[field] (image-input correct models). */
function authoringModelField(obj: Record<string, Json>, field: string): Json | undefined {
  const a = obj["_authoring"];
  if (a === null || typeof a !== "object" || Array.isArray(a)) return undefined;
  const m = (a as Record<string, Json>)["answer_model"];
  if (m === null || typeof m !== "object" || Array.isArray(m)) return undefined;
  return (m as Record<string, Json>)[field];
}

/** Ordered blank ids from content.tokens (the rendered token sequence). */
function blankIdOrder(obj: Record<string, Json>): string[] {
  const tokens = obj.tokens;
  if (!Array.isArray(tokens)) return [];
  const ids: string[] = [];
  for (const tok of tokens) {
    if (tok === null || typeof tok !== "object" || Array.isArray(tok)) continue;
    const o = tok as Record<string, Json>;
    if (o.t === "blank" && typeof o.id === "string") ids.push(o.id);
  }
  return ids;
}

/** content.blanks[id] → its canonical `value` string, or null. */
function blankValue(raw: Json | undefined): string | null {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const v = (raw as Record<string, Json>).value;
  return typeof v === "string" ? v : null;
}

function asObject(content: Json): Record<string, Json> {
  if (content === null || typeof content !== "object" || Array.isArray(content)) {
    return {};
  }
  return content as Record<string, Json>;
}

function asStringArray(v: Json | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asNumberArray(v: Json | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}

function asStringRecord(v: Json | undefined): Record<string, string> | null {
  if (v === null || v === undefined || typeof v !== "object" || Array.isArray(v)) {
    return null;
  }
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}
