// Canonical placement level — the FRANCHISE §4.2 contract value.
//
// TWO STRINGS DESCRIBE ONE PLACEMENT, AND THEY ARE NOT INTERCHANGEABLE:
//   • samLevelLabel()    -> "S.A.M Level 3"  parent-facing copy. Unchanged by
//     this module's introduction; parents keep reading exactly what they read
//     before.
//   • toCanonicalLevel() -> "L3"             the contract value a director
//     copy-pastes into iClassPro and the app byte-checks against.
//
// SINGLE SOURCE OF TRUTH. Both are derived HERE, from the SAME booklet ordinal
// (levelBand.ts), so the label and the contract value cannot drift apart. The
// two derivations that were explicitly rejected:
//   • from halfGradeToTaxLevelCode (assemble.ts) — that path carries the known
//     K-seam defect (KA/KB -> l0a/l0b instead of the 0C booklet), and a frozen
//     external contract must not inherit it. Logged as a separate defect.
//   • by string-parsing samLevelLabel's output — that would make a change to
//     parent-facing copy silently break the franchise handoff.
//
// FAIL LOUD, NEVER CLAMP. The engine's argmax axis runs to 8B (engine.ts,
// placementEstimate over the full 0A..8B LEVELS array), but the canonical set
// stops at L7. A half-grade with no canonical target THROWS rather than
// resolving to L6: a wrong-but-plausible level string entering a franchise
// system is materially worse than a report that fails. That >L6 is unreachable
// today (bank has zero content above 6B, grades 7/8 are non-selectable at
// intake, and both served-ceiling clamps bound the estimate) makes this a
// structural guarantee rather than a live code path — which is precisely why it
// must be enforced by construction and not by assumption.

import {
  BOOKLET_LEVELS,
  bookletOrdinalForHalfGrade,
} from "@/lib/questionPicker/levelBand";
import type { Database } from "@/lib/supabase/database.types";

type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];

/** The frozen canonical set (FRANCHISE §4.2). L0A..L6 are bookable; L7 is
 *  catalog-only "coming soon" and currently unreachable. L8 is out of scope and
 *  deliberately absent — it can never be produced by toCanonicalLevel(). */
export const CANONICAL_LEVELS = [
  "L0A",
  "L0B",
  "L0C",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
  "L7",
] as const;

export type CanonicalLevel = (typeof CANONICAL_LEVELS)[number];

/** The subset a child can actually be booked into today. L7 is excluded: its
 *  booklets are not converted, so it is a catalog placeholder, not a
 *  destination. Kept separate from CANONICAL_LEVELS so the contract can name
 *  L7 as a valid value while the funnel refuses to book it. */
export const BOOKABLE_CANONICAL_LEVELS = [
  "L0A",
  "L0B",
  "L0C",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
] as const;

export type BookableCanonicalLevel = (typeof BOOKABLE_CANONICAL_LEVELS)[number];

/** Raised when a half-grade has no canonical target. Typed (not a bare Error)
 *  so a caller that legitimately wants to degrade — a staff list view, say —
 *  can distinguish "outside the contract" from an unexpected failure. */
export class CanonicalLevelError extends Error {
  /** The offending half-grade, for logging. Not child data. */
  readonly halfGrade: string;

  constructor(halfGrade: string, reason: string) {
    super(`no canonical level for half-grade "${halfGrade}": ${reason}`);
    this.name = "CanonicalLevelError";
    this.halfGrade = halfGrade;
  }
}

/** Type guard against the frozen set — the byte-check primitive. */
export function isCanonicalLevel(value: string): value is CanonicalLevel {
  return (CANONICAL_LEVELS as readonly string[]).includes(value);
}

/** True iff a canonical level can be booked today (i.e. is not L7). */
export function isBookableCanonicalLevel(
  value: CanonicalLevel,
): value is BookableCanonicalLevel {
  return (BOOKABLE_CANONICAL_LEVELS as readonly string[]).includes(value);
}

/**
 * Parent-facing booklet label. Moved here verbatim from assemble.ts so it sits
 * beside the canonical derivation and shares its input.
 *
 * S.A.M-LEVEL (booklet) naming — the parent/placement axis (0A, 0B, 0C, 1, 2 …
 * 8), derived from the row's half_grade via levelBand's booklet axis. The
 * internal half-grade code (KA/KB/3A/3B) is NEVER surfaced — KA/KB fold into
 * the 0C booklet, 3A/3B into "3", etc. No trailing dot ("S.A.M Level 3", not
 * "S.A.M. Level 3"), matching the voice-locked narration prompt.
 */
export function samLevelLabel(level: HalfGradeLevel): string {
  const ordinal = bookletOrdinalForHalfGrade(level);
  const booklet = ordinal === null ? level : BOOKLET_LEVELS[ordinal];
  return `S.A.M Level ${booklet}`;
}

/**
 * Map a CLAMPED placement level to exactly one canonical contract value.
 *
 * The input must already be bounded by the session's served ceiling — see
 * clampPlacementToServedCeiling (finalization, at source) and
 * clampLevelToServedCeiling (report, defensive). Canonicalizing a raw engine
 * argmax would hand the contract a railed level.
 *
 * @throws {CanonicalLevelError} when the level has no canonical target — an
 * unrecognised half-grade, or booklet 8 (8A/8B). Never returns a clamped
 * substitute and never returns a bare string.
 */
export function toCanonicalLevel(clampedLevel: HalfGradeLevel): CanonicalLevel {
  const ordinal = bookletOrdinalForHalfGrade(clampedLevel);
  if (ordinal === null) {
    throw new CanonicalLevelError(
      clampedLevel,
      "not a recognised S.A.M booklet level",
    );
  }

  const booklet = BOOKLET_LEVELS[ordinal];
  const candidate = `L${booklet}`;
  if (!isCanonicalLevel(candidate)) {
    // Booklet 8 lands here. Deliberately NOT clamped down to L6.
    throw new CanonicalLevelError(
      clampedLevel,
      `booklet ${booklet} is outside the canonical set`,
    );
  }
  return candidate;
}

/** The two strings for one placement, always derived together. */
export interface PlacementStrings {
  /** Parent-facing copy. Never send this to a franchise system. */
  samLevel: string;
  /** FRANCHISE §4.2 contract value. Never show this to a parent. */
  canonicalLevel: CanonicalLevel;
}

/**
 * THE CHOKEPOINT. Every producer of a placement string goes through here, so
 * the label and the canonical value are guaranteed to describe the same
 * clamped level. Call sites: assemble.ts (parent report) and the instructor
 * roster. Adding a third producer that calls samLevelLabel() alone would emit a
 * label with no contract value — use this instead.
 *
 * @throws {CanonicalLevelError} — see toCanonicalLevel.
 */
export function placementStrings(
  clampedLevel: HalfGradeLevel,
): PlacementStrings {
  return {
    samLevel: samLevelLabel(clampedLevel),
    canonicalLevel: toCanonicalLevel(clampedLevel),
  };
}
