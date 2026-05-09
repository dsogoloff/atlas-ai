// Atlas Assessment — static distractor → misconception lookup.
//
// Pure function, no DB. For MULTIPLE_CHOICE questions whose content
// includes a distractor_misconceptions map (option-index → code), this
// finds the index of the child's answer and returns the mapped code.
//
// Return shape: string[] (never throws). Possible outcomes:
//   * format !== MULTIPLE_CHOICE                     → []
//   * content is not an object                       → []
//   * options array missing / malformed              → []
//   * answerGiven not found in options               → []
//   * distractor_misconceptions missing / malformed  → []
//   * answerGiven's index has no mapped code         → []
//   * answerGiven's index has a code                 → [code]
//
// Defensive-by-design: this is a write-path helper inside the response
// submit pipeline. A throw here would force the classifier into the
// 'failed' branch over a content-authoring oversight; returning []
// degrades gracefully into "no signal from this path, try haiku next."
//
// Distinct from src/lib/responseSubmit/correctness.ts which DOES throw
// on malformed content — correctness is a contract violation worth
// surfacing as a 500; misconception classification is best-effort.

import type { QuestionFormat } from "@/lib/engine/types";
import type { Json } from "@/lib/supabase/database.types";

export function extractFromContent(
  format: QuestionFormat,
  content: Json,
  answerGiven: string,
): string[] {
  if (format !== "MULTIPLE_CHOICE") return [];

  if (
    content === null ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    return [];
  }
  const obj = content as Record<string, Json>;

  const options = obj.options;
  if (!Array.isArray(options)) return [];

  const answer = answerGiven.trim();
  let index = -1;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (typeof opt === "string" && opt.trim() === answer) {
      index = i;
      break;
    }
  }
  if (index < 0) return [];

  const map = obj.distractor_misconceptions;
  if (map === null || typeof map !== "object" || Array.isArray(map)) {
    return [];
  }
  const code = (map as Record<string, Json>)[String(index)];
  if (typeof code !== "string" || code.length === 0) return [];

  return [code];
}
