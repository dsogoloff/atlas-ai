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
//
// key_findings shape: strengths + growth_areas, each 0-3 short items
// (pattern + description for growth_areas; sub-strand + warm phrase for
// strengths). Empty arrays are valid — strengths empty when there's no
// measured strand data (thin-bank case), growth_areas empty when neither
// misconceptions nor mastery data surfaced anything.

import { z } from "zod";

const MAX_PROSE_LENGTH = 600;
const MAX_FINDINGS_PER_LIST = 3;

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

/** Per-item rule for key_findings lists: same shape as proseField (non-empty
 *  after trim, under MAX_PROSE_LENGTH). */
const findingItem = proseField;

/** key_findings list: 0-3 items, each a valid finding item. Empty array
 *  is allowed — see header. */
const findingsList = z.array(findingItem).max(MAX_FINDINGS_PER_LIST);

const keyFindingsSchema = z.object({
  strengths: findingsList,
  growth_areas: findingsList,
});

export const narrationProseSchema = z.object({
  placement_line: proseField,
  strand_lede: proseField,
  key_findings: keyFindingsSchema,
  recommendations_lede: proseField,
});

export type NarrationProse = z.infer<typeof narrationProseSchema>;

export type ValidateNarrationResult =
  | { valid: true; prose: NarrationProse }
  | { valid: false };

/** Strict validation — the happy path. All four fields present, valid, and
 *  within bounds → valid. Any failure falls through to salvageNarration so a
 *  single bad field no longer discards the whole narration (see below). */
export function validateNarration(parsed: unknown): ValidateNarrationResult {
  const result = narrationProseSchema.safeParse(parsed);
  return result.success ? { valid: true, prose: result.data } : { valid: false };
}

/** A field-by-field salvage of partially-valid model output. Earlier this
 *  layer was all-or-nothing: one over-long item or a 4th findings item set
 *  `status='failed'` and the report rendered with NO narrative at all. But the
 *  report already degrades PER SURFACE (resolve.ts maps each field
 *  independently; the page renders each section only when its field is
 *  present), so dropping the whole narration on one bad field is strictly
 *  worse than keeping the good ones. salvageNarration keeps every field that
 *  validates on its own and drops only what doesn't: each prose field
 *  independently, and findings lists clamped to the first MAX_FINDINGS_PER_LIST
 *  items after dropping empty / over-length entries. `kept` is empty only when
 *  nothing usable survived (then the caller writes status='failed'). */
export interface SalvageResult {
  prose: Partial<NarrationProse>;
  /** Field names that survived (empty ⇒ nothing usable). */
  kept: string[];
  /** Human-readable notes on what was dropped (for diagnostic logging). */
  dropped: string[];
}

function validProse(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= MAX_PROSE_LENGTH ? v : null;
}

function salvageList(v: unknown): { list: string[]; droppedCount: number } {
  if (!Array.isArray(v)) return { list: [], droppedCount: 0 };
  const valid = v.filter((x): x is string => validProse(x) !== null);
  const clamped = valid.slice(0, MAX_FINDINGS_PER_LIST);
  return { list: clamped, droppedCount: v.length - clamped.length };
}

export function salvageNarration(parsed: unknown): SalvageResult {
  const prose: Partial<NarrationProse> = {};
  const kept: string[] = [];
  const dropped: string[] = [];

  if (typeof parsed !== "object" || parsed === null) {
    return { prose, kept, dropped: ["output was not a JSON object"] };
  }
  const o = parsed as Record<string, unknown>;

  for (const field of ["placement_line", "strand_lede", "recommendations_lede"] as const) {
    const v = validProse(o[field]);
    if (v !== null) {
      prose[field] = v;
      kept.push(field);
    } else if (o[field] !== undefined) {
      dropped.push(field);
    }
  }

  if (typeof o.key_findings === "object" && o.key_findings !== null) {
    const kf = o.key_findings as Record<string, unknown>;
    const strengths = salvageList(kf.strengths);
    const growth = salvageList(kf.growth_areas);
    prose.key_findings = {
      strengths: strengths.list,
      growth_areas: growth.list,
    };
    kept.push("key_findings");
    const droppedItems = strengths.droppedCount + growth.droppedCount;
    if (droppedItems > 0) dropped.push(`${droppedItems} findings item(s)`);
  } else if (o.key_findings !== undefined) {
    dropped.push("key_findings");
  }

  return { prose, kept, dropped };
}
