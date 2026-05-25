// Atlas Assessment — narration validation gate (Piece 3 of the narration
// feature).
//
// Pure Zod validation over the parsed Sonnet output. Mirrors the classifier's
// schema convention (zod, exported schema, .safeParse at the call site).
//
// All-or-nothing policy: any failure invalidates the whole narration. A
// partial narration (some prose populated, some absent) would read as a bug
// to a parent — the radar would carry a lede but the misconception card
// wouldn't, looking like a render glitch. Cleaner to fall through to a
// data-only render across the board than to ship a Frankenstein report.
//
// Max prose length: brief calls for "enough for 1-2 sentences plus headroom"
// while rejecting multi-paragraph hallucinations. A typical parent-readable
// 1-2 sentence lede sits around 120-220 characters; doubling that gives
// headroom for variations without admitting runaway output. Multi-paragraph
// runaway typically blows past 800-1200 chars, so 600 sits comfortably
// between "comfortable headroom" and "clear hallucination floor."

import { z } from "zod";

const MAX_PROSE_LENGTH = 600;

/** Per-field rule: a non-empty (after trim) string within MAX_PROSE_LENGTH.
 *  Two refines instead of one so failure messages distinguish "blank" from
 *  "too long" in any future structured logging — same parse-fail outcome
 *  either way, but cheaper to diagnose. */
const proseField = z
  .string()
  .refine((s) => s.trim().length > 0, "must be non-empty after trim")
  .refine(
    (s) => s.trim().length <= MAX_PROSE_LENGTH,
    `exceeds max prose length of ${MAX_PROSE_LENGTH} chars`,
  );

export const narrationProseSchema = z.object({
  placement_line: proseField,
  strand_lede: proseField,
  misconceptions_lede: proseField,
  recommendations_lede: proseField,
});

export type NarrationProse = z.infer<typeof narrationProseSchema>;

export type ValidateNarrationResult =
  | { valid: true; prose: NarrationProse }
  | { valid: false };

/** All-or-nothing validation. Any failure (missing field, wrong type, empty
 *  after trim, over-length) invalidates the whole narration. Callers should
 *  fall back to status='failed' / data-only render per surface. */
export function validateNarration(parsed: unknown): ValidateNarrationResult {
  const result = narrationProseSchema.safeParse(parsed);
  return result.success ? { valid: true, prose: result.data } : { valid: false };
}
