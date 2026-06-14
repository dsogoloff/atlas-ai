// Atlas Assessment — Haiku prompt builder for misconception classification.
//
// Produces (system, prompt) strings for the AI SDK's generateObject call,
// plus the Zod schema that enforces structured output. Taxonomy-filtered
// to input.strand per P1 lock — the LLM only sees codes that could
// plausibly apply to the question's strand. Zero-shot per P2 lock.
//
// Compliance constraints honored (compliance.md §6):
//   * No child name in the prompt (ClassifierInput type structurally
//     excludes it).
//   * No persistent identifiers — session_id, child_id, parent_id,
//     tenant_id are not part of ClassifierInput.
//   * Only the question stem, correct answer, child's answer, and the
//     strand-filtered taxonomy cross to the LLM.
//
// Throws on malformed content (missing stem, missing correct answer for
// the format, or DRAG_DROP slipping past the router). The classifier
// wraps this whole branch in try/catch (S2 lock); a throw here resolves
// to method='failed' on the response row.
//
// This is the OPPOSITE posture from src/lib/misconceptionClassifier/
// distractorMap.ts, which returns [] on malformed content. The reason:
// distractorMap is a fall-through branch of the router (its [] means
// "try haiku next"); prompt.ts is the entry point of the haiku branch
// itself, with no further fallback within that branch.

import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

import type { ClassifierInput, TaxonomyMap } from "./types";

/** Stamped onto responses.misconception_classifier_version when the
 *  Haiku branch produces codes. P4 lock. Bump on prompt-template
 *  changes; historical rows keep their stamped value (compliance §12
 *  no-silent-recompute). */
export const PROMPT_VERSION = "v1" as const;

/** Structured-output schema for the AI SDK's generateObject call (P3
 *  lock — Anthropic tool-use under the hood, abstracted by the SDK).
 *  D1 lock: at most one code returned. Empty array means "none of the
 *  listed codes plausibly explains the error." */
export const classifierResponseSchema = z.object({
  codes: z.array(z.string()).max(1),
});

export function buildClassifierPrompt(
  input: ClassifierInput,
  taxonomy: TaxonomyMap,
): { system: string; prompt: string } {
  const stem = readStem(input.content);
  const correctAnswer = readCorrectAnswer(input.format, input.content);
  const strandTaxonomy = taxonomy.get(input.strand) ?? [];

  const taxonomyLines = strandTaxonomy
    .map((e) => `- ${e.code}: ${e.label}. ${e.description}`)
    .join("\n");

  const system = [
    "You are a math-misconception classifier for a K-8 Singapore Math",
    "assessment. Given a question, the correct answer, and the child's",
    "incorrect answer, identify which (if any) of the listed misconception",
    "codes best explains the error.",
    "",
    "Rules:",
    "- Return at most ONE code, drawn ONLY from the provided list.",
    "- If none of the codes plausibly explains the error, return an empty list.",
    "- Do NOT invent new codes or paraphrase the labels.",
  ].join("\n");

  const prompt = [
    `Question: ${stem}`,
    `Correct answer: ${correctAnswer}`,
    `Child's answer: ${input.answerGiven}`,
    "",
    "Misconception codes for this strand:",
    taxonomyLines || "(none provided)",
  ].join("\n");

  return { system, prompt };
}

// ---------------------------------------------------------------------------
// Content readers — throw on malformed shape. Mirror the per-format keys
// documented on src/lib/responseSubmit/correctness.ts (correct_index for
// MC, correct_answer for NE, correct_order for DD; DD never reaches here).
// ---------------------------------------------------------------------------

function readStem(content: Json): string {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("[prompt] content is not an object");
  }
  const stem = (content as Record<string, Json>).stem;
  if (typeof stem !== "string" || stem.length === 0) {
    throw new Error("[prompt] content.stem missing or not a string");
  }
  return stem;
}

function readCorrectAnswer(
  format: ClassifierInput["format"],
  content: Json,
): string {
  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new Error("[prompt] content is not an object");
  }
  const obj = content as Record<string, Json>;

  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = obj.options;
      const correctIndex = obj.correct_index;
      if (
        !Array.isArray(options) ||
        typeof correctIndex !== "number" ||
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= options.length
      ) {
        throw new Error("[prompt] MULTIPLE_CHOICE content malformed");
      }
      const opt = options[correctIndex];
      if (typeof opt !== "string") {
        throw new Error("[prompt] MULTIPLE_CHOICE correct option not a string");
      }
      return opt;
    }
    case "NUMERIC_ENTRY":
    case "TEXT_ENTRY": {
      // Same content key for both typed-entry formats. For any-of
      // NUMERIC_ENTRY keys, correct_answer is the human-readable form
      // ("1, 2, 3, 6, 9 or 18") — exactly what the LLM should see.
      const correct = obj.correct_answer;
      if (typeof correct !== "string") {
        throw new Error(`[prompt] ${format} correct_answer not a string`);
      }
      return correct;
    }
    case "DRAG_DROP":
      // The router (classifier.ts) filters DRAG_DROP before this point.
      // Reaching here is a router bug; surface it loudly.
      throw new Error(
        "[prompt] DRAG_DROP not supported by the LLM classifier path (R1 lock)",
      );
    // L1 structured-input formats are not on the LLM classifier path (like
    // DRAG_DROP): their correct answers are multi-field/id-keyed, not a
    // single human-readable string. The router must filter them out before
    // this point; reaching here is a router bug.
    case "SELECT_MULTIPLE":
    case "VISUAL_MATCHING":
    case "MULTI_BLANK":
    case "EQUATION_SET":
      throw new Error(
        `[prompt] ${format} not supported by the LLM classifier path`,
      );
  }
}
