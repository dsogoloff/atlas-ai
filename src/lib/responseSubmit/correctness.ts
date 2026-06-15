// Atlas Assessment — server-side answer judging.
//
// Per compliance.md §8 the correct answer never crosses to the client,
// so the submit route reads questions.content here and judges. Each
// format stores its correct answer under a different key (see seed.sql,
// serialize.ts, and the compliance comment on ClientQuestion):
//
//   * MULTIPLE_CHOICE — content.correct_index (integer, valid index into
//     content.options). Client submits the option's display text; we
//     compare options[correct_index].trim() to answerGiven.trim(). The
//     index-keyed schema lets distractor_misconceptions co-index with
//     options without a parallel migration to text-keyed maps.
//   * NUMERIC_ENTRY   — content.correct_answer (string). Both sides pass
//     through normalizeAnswer() first (case/whitespace/separator/unit-spacing
//     tolerance — see its comment). A key shaped like ONE number (incl.
//     S.A.M. thousands grouping, "42 800") compares with all grouping
//     stripped from both sides; list-shaped keys keep separator semantics.
//     Then numeric coercion when both sides parse as numbers (handles
//     "007" === "7", "7.0" === "7"); otherwise normalized exact match.
//     An optional content.accepted_answers (string array) marks an
//     any-of key — questions like "Name one number that divides both 54
//     and 72" accept several values; the child's answer is judged against
//     each entry with the same per-key logic and any match grades correct.
//   * TEXT_ENTRY      — content.correct_answer (string). Word/phrase
//     answers ("cylinder", "smaller than", "Ninety-six", "9:25 am").
//     Both sides pass through normalizeTextAnswer() — normalizeAnswer()
//     plus dash canonicalization (the bank's en-dash "8 – 2" matches a
//     keyboard hyphen), letter-joining-hyphen → space ("ninety-six" ===
//     "ninety six"), and operator spacing ("6+2=8" === "6 + 2 = 8") —
//     then exact equality.
//   * DRAG_DROP       — content.correct_order (array). JSON.stringify
//     equality after normalizeAnswer() on each string token of both sides.
//     Works for arrays of primitives because JSON.stringify is order-stable
//     on arrays. Object answers would require canonical key ordering — out
//     of scope until a real DD seed lands with that shape. A non-JSON
//     answerGiven falls back to the raw exact compare (always false for a
//     well-formed correct_order — kept so malformed clients grade wrong
//     instead of throwing).
//
// `judgeAnswer` throws on malformed content (missing per-format key, wrong
// type, out-of-range index) — those are content-authoring bugs and the
// route surfaces them as 500s rather than silently scoring a wrong-answer.

import type { Enums, Json } from "@/lib/supabase/database.types";
import { grade } from "@/lib/grading/grade";
import type {
  AnswerValue,
  BlankKey,
  CorrectAnswerModel,
  Equation,
  Op,
} from "@/lib/grading/types";

export type QuestionFormat = Enums<"question_format">;

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

// A stored key shaped like ONE number: plain digits ("1000") or S.A.M.
// thousands grouping — groups of exactly 3 after the first ("42 800",
// "1 234 567"). Applied to the normalized key, where commas have already
// become spaces. The KEY's shape selects the comparison mode, never the
// child's input: list keys like "10 17 20" (groups that are not exactly
// 3 digits) keep list semantics. Inherently ambiguous keys such as
// "10 170 200" read as one grouped number — S.A.M. notation makes that
// the right default.
const SINGLE_NUMBER_KEY_RE = /^-?(?:\d+|\d{1,3}(?: \d{3})+)(?:\.\d+)?$/;

/**
 * Mode selector for NUMERIC_ENTRY grading, exported so tests can pin the
 * partition directly. Takes the NORMALIZED stored key; returns true for
 * single-number mode (strip grouping from both sides), false for list
 * mode (separators significant, digits never join). Because judgeAnswer
 * branches if/else on this one boolean of the key alone, exactly one
 * mode ever runs for a given question — the paths cannot cross.
 */
export function isSingleNumberKey(normalizedKey: string): boolean {
  return SINGLE_NUMBER_KEY_RE.test(normalizedKey);
}

// Unit tokens that appear (or plausibly appear) after a number in bank
// answers — seed.sql today uses km / m / am ("1 km 750 m", "9:25 am");
// the rest are the S.A.M. measurement set so future questions normalize
// the same way. Longest tokens first so "km" wins over "m", "min" over "m".
const UNIT_TOKENS = "km|cm|mm|kg|ml|min|am|pm|m|g|l|h|s";
const UNIT_SPACING_RE = new RegExp(`(\\d) ?(${UNIT_TOKENS})\\b`, "g");

/**
 * Canonicalize a free-text answer before equality so trivially-equivalent
 * child input grades correct:
 *
 *   1. lowercase;
 *   2. collapse every run of separators (whitespace and/or commas) to a
 *      single space — comma and space are equivalent LIST separators, but
 *      order stays significant and separators are only ever replaced,
 *      never deleted, so digit groups can never merge ("10 17 20" stays
 *      distinct from "1017 20");
 *   3. canonical unit spacing — a digit followed (with or without a space)
 *      by a known unit token becomes "digit unit": "1km" → "1 km",
 *      "9:25am" → "9:25 am".
 */
export function normalizeAnswer(raw: string): string {
  const collapsed = raw.toLowerCase().replace(/[\s,]+/g, " ").trim();
  return collapsed.replace(UNIT_SPACING_RE, "$1 $2");
}

/**
 * TEXT_ENTRY canonicalization — normalizeAnswer() plus the tolerances a
 * typed word/phrase answer needs (applied to BOTH sides, so equality is
 * preserved under the transform):
 *
 *   1. unicode dashes (hyphen variants, en/em dash, minus sign) become
 *      the ASCII hyphen the child's keyboard produces — the bank stores
 *      "8 – 2 = 6" (en-dash) but a child types "8 - 2 = 6";
 *   2. a hyphen JOINING two letters becomes a space, so "ninety-six",
 *      "ninety six" and "Ninety-Six" all converge ("8-2" is digit-
 *      adjacent and is NOT touched by this rule);
 *   3. the math operators + = - / get canonical single-space padding, so
 *      "6+2=8" matches "6 + 2 = 8" (fact-family answers) and "4/6"
 *      matches "4 / 6" (fraction answers);
 *   4. re-collapse any space runs the padding introduced.
 */
export function normalizeTextAnswer(raw: string): string {
  return normalizeAnswer(raw)
    .replace(/[‐-―−]/g, "-")
    .replace(/([a-z])-(?=[a-z])/g, "$1 ")
    .replace(/[+=/-]/g, " $& ")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function judgeAnswer(
  format: QuestionFormat,
  contentJson: Json,
  answerGiven: string,
): boolean {
  const obj = asObject(contentJson);

  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = readStringArray(obj, "options", format);
      const correctIndex = readInteger(obj, "correct_index", format);
      if (correctIndex < 0 || correctIndex >= options.length) {
        throw new Error(
          `[correctness] correct_index ${correctIndex} out of range for ${options.length} options`,
        );
      }
      return options[correctIndex].trim() === answerGiven.trim();
    }

    case "NUMERIC_ENTRY": {
      // Any-of keys: content.accepted_answers lists every value that
      // grades correct ("Name one number that divides both 54 and 72"
      // accepts 1/2/3/6/9/18). Each entry is judged with the same
      // per-key logic as a plain correct_answer. content.correct_answer
      // stays present as the human-readable key (report + classifier).
      if ("accepted_answers" in obj) {
        const accepted = readStringArray(obj, "accepted_answers", format);
        if (accepted.length === 0) {
          throw new Error(
            "[correctness] accepted_answers is empty on NUMERIC_ENTRY content",
          );
        }
        return accepted.some((key) => numericKeyMatches(key, answerGiven));
      }
      const correct = readString(obj, "correct_answer", format);
      return numericKeyMatches(correct, answerGiven);
    }

    case "TEXT_ENTRY": {
      const correct = readString(obj, "correct_answer", format);
      return normalizeTextAnswer(answerGiven) === normalizeTextAnswer(correct);
    }

    case "DRAG_DROP": {
      const correctOrder = readArray(obj, "correct_order", format);
      const given = parseJsonArray(answerGiven);
      if (given === null) {
        return JSON.stringify(correctOrder) === answerGiven;
      }
      return (
        JSON.stringify(correctOrder.map(normalizeJsonToken)) ===
        JSON.stringify(given.map(normalizeJsonToken))
      );
    }

    case "SELECT_MULTIPLE": {
      // content.select_rule: "all" → set-equality against content.correct;
      // "count" → distinct count of valid option ids === content.count.
      const answer = parseAnswerValue(answerGiven);
      const rule = readString(obj, "select_rule", format);
      let model: CorrectAnswerModel;
      if (rule === "all") {
        model = { rule: "select-all", correct: readStringArray(obj, "correct", format) };
      } else if (rule === "count") {
        model = {
          rule: "select-count",
          count: readInteger(obj, "count", format),
          optionIds: readOptionIds(obj, format),
        };
      } else {
        throw new Error(
          `[correctness] select_rule "${rule}" is not "all" or "count" on ${format} content`,
        );
      }
      return grade(answer, model).correct;
    }

    case "VISUAL_MATCHING": {
      const answer = parseAnswerValue(answerGiven);
      const model: CorrectAnswerModel = {
        rule: "match-pairs",
        pairs: readStringRecord(obj, "pairs", format),
      };
      return grade(answer, model).correct;
    }

    case "MULTI_BLANK": {
      const answer = parseAnswerValue(answerGiven);
      const model: CorrectAnswerModel = {
        rule: "per-blank",
        blanks: readBlanks(obj, format),
      };
      return grade(answer, model).correct;
    }

    case "EQUATION_SET": {
      // content.answer_rule: "set-equality" reads content.canonical (+
      // allowCommutative); "equation-validity" reads allowedNumbers /
      // requireCount (+ requireDistinct, validityOps).
      const answer = parseAnswerValue(answerGiven);
      const rule = readString(obj, "answer_rule", format);
      let model: CorrectAnswerModel;
      if (rule === "set-equality") {
        model = {
          rule: "set-equality",
          canonical: readEquations(obj, "canonical", format),
          allowCommutative: readOptionalBoolean(obj, "allowCommutative", format),
        };
      } else if (rule === "equation-validity") {
        model = {
          rule: "equation-validity",
          allowedNumbers: readNumberArray(obj, "allowedNumbers", format),
          requireCount: readInteger(obj, "requireCount", format),
          requireDistinct: readOptionalBoolean(obj, "requireDistinct", format),
          ops: readOptionalOps(obj, "validityOps", format),
        };
      } else {
        throw new Error(
          `[correctness] answer_rule "${rule}" is not "set-equality" or "equation-validity" on ${format} content`,
        );
      }
      return grade(answer, model).correct;
    }

    // Image-input formats (image-answer-inputs lane). UNLIKE the L1 formats
    // above, these read the authored answer model from
    // content._authoring.answer_model rather than top-level content: the rows
    // stay HELD (is_active=false, _authoring.requires_format_swap=true) until
    // CONVERSION activates them, and the model lives in _authoring throughout
    // (the activation step clears requires_format_swap and sets is_active but
    // keeps the model where this reader looks). The renderable tiles are
    // top-level content.tiles and are NEVER read here. See the
    // 20260615120000 migration header for the activation contract.
    case "CLICK_IMAGE_SINGLE": {
      const answer = parseAnswerValue(answerGiven);
      const model: CorrectAnswerModel = {
        rule: "select-one",
        correct: readString(
          requireAuthoringModel(obj, format, "select-one"),
          "correct",
          format,
        ),
      };
      return grade(answer, model).correct;
    }

    case "CLICK_IMAGE_MULTI": {
      const answer = parseAnswerValue(answerGiven);
      const model: CorrectAnswerModel = {
        rule: "select-all",
        correct: readStringArray(
          requireAuthoringModel(obj, format, "select-all"),
          "correct",
          format,
        ),
      };
      return grade(answer, model).correct;
    }

    case "IMAGE_ORDERING": {
      const answer = parseAnswerValue(answerGiven);
      const model: CorrectAnswerModel = {
        rule: "order-equality",
        order: readStringArray(
          requireAuthoringModel(obj, format, "order-equality"),
          "order",
          format,
        ),
      };
      return grade(answer, model).correct;
    }
  }
}

// ---------------------------------------------------------------------------
// _authoring answer-model reader (image-input formats only)
// ---------------------------------------------------------------------------

/**
 * Read content._authoring.answer_model for a held image-input row and assert
 * its `rule` is the one expected for `format`. Throws on a missing/malformed
 * _authoring block, a missing answer_model, or a rule that does not match —
 * those are content-authoring bugs, surfaced as 500s like the rest of
 * judgeAnswer. Returns the answer_model object so the caller reads its fields
 * with the same per-format readers used everywhere else.
 */
function requireAuthoringModel(
  obj: Record<string, Json>,
  format: QuestionFormat,
  expectedRule: string,
): Record<string, Json> {
  const authoring = obj["_authoring"];
  if (authoring === null || typeof authoring !== "object" || Array.isArray(authoring)) {
    throw new Error(
      `[correctness] _authoring missing or not an object on ${format} content`,
    );
  }
  const model = (authoring as Record<string, Json>)["answer_model"];
  if (model === null || typeof model !== "object" || Array.isArray(model)) {
    throw new Error(
      `[correctness] _authoring.answer_model missing or not an object on ${format} content`,
    );
  }
  const modelObj = model as Record<string, Json>;
  if (modelObj.rule !== expectedRule) {
    throw new Error(
      `[correctness] _authoring.answer_model.rule must be "${expectedRule}" on ${format} content`,
    );
  }
  return modelObj;
}

// ---------------------------------------------------------------------------
// Wire-string → AnswerValue (new structured inputs)
// ---------------------------------------------------------------------------

const ANSWER_VALUE_TYPES = new Set<AnswerValue["type"]>([
  "scalar",
  "mc-index",
  "blanks",
  "equation-set",
  "id-set",
  "ordered-ids",
  "pairs",
]);

/**
 * Parse a client-submitted `answer_given` wire string (the new structured
 * inputs submit `JSON.stringify(answerValue)`) back into an AnswerValue.
 * Throws on malformed JSON or an unrecognized discriminator — mirrors the
 * throws-on-malformed posture of judgeAnswer for content. The grading
 * primitive itself handles a shape that mismatches the rule (clean wrong),
 * so this only guards the parse + the type tag.
 */
export function parseAnswerValue(raw: string): AnswerValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("[correctness] answer_given is not valid JSON");
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    typeof (parsed as { type?: unknown }).type !== "string" ||
    !ANSWER_VALUE_TYPES.has((parsed as { type: string }).type as AnswerValue["type"])
  ) {
    throw new Error("[correctness] answer_given is not a recognized AnswerValue");
  }
  return parsed as AnswerValue;
}

// ---------------------------------------------------------------------------
// NUMERIC_ENTRY helpers
// ---------------------------------------------------------------------------

/**
 * Judge a single NUMERIC_ENTRY key against the child's answer — the P1
 * normalization pipeline: normalizeAnswer() both sides, then the key's
 * shape selects single-number mode (grouping stripped) or list mode
 * (separators significant), then numeric coercion where both sides
 * parse as numbers, else normalized exact match.
 */
function numericKeyMatches(correct: string, answerGiven: string): boolean {
  const a = normalizeAnswer(answerGiven);
  const c = normalizeAnswer(correct);
  // Single-number keys: strip all grouping from both sides so
  // "42 800", "42,800" and "42800" all match a key of "42 800".
  if (isSingleNumberKey(c)) {
    const aStripped = a.replace(/ /g, "");
    if (NUMERIC_RE.test(aStripped)) {
      return Number(aStripped) === Number(c.replace(/ /g, ""));
    }
    return a === c;
  }
  if (NUMERIC_RE.test(a) && NUMERIC_RE.test(c)) {
    return Number(a) === Number(c);
  }
  return a === c;
}

// ---------------------------------------------------------------------------
// DRAG_DROP helpers
// ---------------------------------------------------------------------------

function normalizeJsonToken(v: Json): Json {
  return typeof v === "string" ? normalizeAnswer(v) : v;
}

function parseJsonArray(raw: string): Json[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Json[]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Json-shape narrowing helpers (per-format error messages)
// ---------------------------------------------------------------------------

function asObject(content: Json): Record<string, Json> {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("[correctness] questions.content is not an object");
  }
  return content as Record<string, Json>;
}

function readString(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): string {
  const v = obj[key];
  if (typeof v !== "string") {
    throw new Error(
      `[correctness] ${key} missing or not a string on ${format} content`,
    );
  }
  return v;
}

function readInteger(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an integer on ${format} content`,
    );
  }
  return v;
}

function readStringArray(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an array on ${format} content`,
    );
  }
  for (const item of v) {
    if (typeof item !== "string") {
      throw new Error(
        `[correctness] ${key} on ${format} content contains non-string entries`,
      );
    }
  }
  return v as string[];
}

function readArray(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): Json[] {
  const v = obj[key];
  if (!Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an array on ${format} content`,
    );
  }
  return v;
}

// ---------------------------------------------------------------------------
// L1-input content readers (SELECT_MULTIPLE / VISUAL_MATCHING / MULTI_BLANK
// / EQUATION_SET) — read REAL top-level content fields, never _authoring.
// ---------------------------------------------------------------------------

const VALID_OPS = new Set<Op>(["+", "-", "x", "/"]);

/** content.options is an array of { id }; return the option ids. */
function readOptionIds(
  obj: Record<string, Json>,
  format: QuestionFormat,
): string[] {
  const options = readArray(obj, "options", format);
  return options.map((opt) => {
    if (
      opt === null ||
      typeof opt !== "object" ||
      Array.isArray(opt) ||
      typeof (opt as Record<string, Json>).id !== "string"
    ) {
      throw new Error(
        `[correctness] options on ${format} content has an entry without a string id`,
      );
    }
    return (opt as Record<string, Json>).id as string;
  });
}

/** A plain string→string record (e.g. content.pairs). */
function readStringRecord(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): Record<string, string> {
  const v = obj[key];
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} missing or not an object on ${format} content`,
    );
  }
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== "string") {
      throw new Error(
        `[correctness] ${key} on ${format} content has a non-string value`,
      );
    }
    out[k] = val;
  }
  return out;
}

/** content.blanks: id → BlankKey (validated). */
function readBlanks(
  obj: Record<string, Json>,
  format: QuestionFormat,
): Record<string, BlankKey> {
  const v = obj["blanks"];
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(
      `[correctness] blanks missing or not an object on ${format} content`,
    );
  }
  const out: Record<string, BlankKey> = {};
  for (const [id, raw] of Object.entries(v)) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(
        `[correctness] blanks.${id} is not a BlankKey object on ${format} content`,
      );
    }
    const keyObj = raw as Record<string, Json>;
    if (typeof keyObj.value !== "string") {
      throw new Error(
        `[correctness] blanks.${id}.value missing or not a string on ${format} content`,
      );
    }
    const key: BlankKey = { value: keyObj.value };
    if (Array.isArray(keyObj.accepted)) {
      key.accepted = keyObj.accepted.map((a) => {
        if (typeof a !== "string") {
          throw new Error(
            `[correctness] blanks.${id}.accepted has a non-string entry on ${format} content`,
          );
        }
        return a;
      });
    }
    if (typeof keyObj.numeric === "boolean") key.numeric = keyObj.numeric;
    if (typeof keyObj.tolerance === "number") key.tolerance = keyObj.tolerance;
    out[id] = key;
  }
  return out;
}

/** An array of Equation objects (e.g. content.canonical). */
function readEquations(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): Equation[] {
  const arr = readArray(obj, key, format);
  return arr.map((raw) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(
        `[correctness] ${key} on ${format} content has a non-object equation`,
      );
    }
    const eq = raw as Record<string, Json>;
    if (
      typeof eq.a !== "number" ||
      typeof eq.b !== "number" ||
      typeof eq.result !== "number" ||
      typeof eq.op !== "string" ||
      !VALID_OPS.has(eq.op as Op)
    ) {
      throw new Error(
        `[correctness] ${key} on ${format} content has a malformed equation`,
      );
    }
    return { a: eq.a, op: eq.op as Op, b: eq.b, result: eq.result };
  });
}

/** An array of numbers (e.g. content.allowedNumbers). */
function readNumberArray(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): number[] {
  const arr = readArray(obj, key, format);
  return arr.map((n) => {
    if (typeof n !== "number") {
      throw new Error(
        `[correctness] ${key} on ${format} content has a non-number entry`,
      );
    }
    return n;
  });
}

/** Optional boolean field; undefined when absent. Throws if present but
 *  not a boolean. */
function readOptionalBoolean(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): boolean | undefined {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (typeof v !== "boolean") {
    throw new Error(
      `[correctness] ${key} on ${format} content is not a boolean`,
    );
  }
  return v;
}

/** Optional array-of-ops field; undefined when absent. */
function readOptionalOps(
  obj: Record<string, Json>,
  key: string,
  format: QuestionFormat,
): Op[] | undefined {
  const v = obj[key];
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) {
    throw new Error(
      `[correctness] ${key} on ${format} content is not an array`,
    );
  }
  return v.map((op) => {
    if (typeof op !== "string" || !VALID_OPS.has(op as Op)) {
      throw new Error(
        `[correctness] ${key} on ${format} content has an invalid operator`,
      );
    }
    return op as Op;
  });
}
