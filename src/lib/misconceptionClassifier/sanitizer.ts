// Atlas Assessment — math-safe sanitizer for free-text classifier input.
//
// Data-minimization guard (external-audit Lane 3). The misconception
// classifier only ever needs to see a math-shaped answer. TEXT_ENTRY is the
// one free-text format where a child could type arbitrary characters, so a
// stray name, email, or sentence could otherwise be carried into the
// Anthropic prompt. This module decides, BEFORE any LLM call, whether a
// free-text answer is math-shaped enough to forward.
//
// Allowlist (everything else is rejected):
//   * digits 0-9
//   * whitespace
//   * the operator/grouping set: + - × x * / ÷ = . , : ( )
//     (covers fraction slashes, decimals, coordinate pairs, ratios)
// Max length: 40 characters (a math answer is short; longer = not an answer).
//
// A non-conforming answer (letters/words, punctuation outside the set, or
// over length) is REJECTED — the classifier then skips Haiku and returns an
// unclassified result with no API call. Conforming answers follow the normal
// classify path unchanged.

/** Max characters a free-text math answer may contain before it is treated
 *  as non-math (and thus never forwarded to the model). */
export const MATH_ANSWER_MAX_LENGTH = 40;

/** The only characters allowed in a forwardable free-text answer: digits,
 *  whitespace, and the operator/grouping set + - × x * / ÷ = . , : ( ).
 *  Anchored and global so the whole string must conform. */
const MATH_SAFE_PATTERN = /^[0-9\s+\-×x*/÷=.,:()]*$/u;

/**
 * True when a free-text answer is math-shaped and safe to forward to the
 * LLM: within the length cap AND composed only of allowlisted characters.
 * Names, emails, and any other free text fail and must be filtered out
 * before the Anthropic call.
 */
export function isMathSafeAnswer(answer: string): boolean {
  if (answer.length > MATH_ANSWER_MAX_LENGTH) {
    return false;
  }
  return MATH_SAFE_PATTERN.test(answer);
}
