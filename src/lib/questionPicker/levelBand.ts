// Atlas Assessment — S.A.M. booklet level band for the question pickers.
//
// QA Issue 2 fix (CONVERSION decision #14): the pickers must serve only items
// within ±1 S.A.M. BOOKLET LEVEL of the child's grade, HOLD HARD — no widening,
// no multi-level jumps. "Booklet level" is the S.A.M. curriculum unit
// (0A, 0B, 0C, then Grade 1 … Grade 8); one booklet = one level for the band.
// Booklet-ramp overlap between adjacent booklets justifies ±1.
//
// Substrate: each question's booklet level is derived from `questions.level`
// (the half_grade_level enum, ALWAYS populated) — NOT from `content_id` (which
// is nullable/sparse and would starve the band). A whole grade is two
// half-grades (1A + 1B → Grade 1 booklet); kindergarten half-grades (KA/KB)
// fold into the 0C booklet (the signup intake floor).
//
// This is a picker-local axis: it deliberately does NOT touch the engine's
// LEVELS / θ calibration (src/lib/engine/levels.ts), and it tolerates level
// strings the engine type doesn't know yet (0A/0B/0C were added to the DB enum
// in migration 20260616120000 but not to the generated HalfGradeLevel union).

import { gradeFromBirthYear, parseGradeNumber } from "@/lib/proctoring/mode";

/** Ordered S.A.M. booklet levels — index is the booklet ordinal used by the
 *  band arithmetic. 0A/0B/0C are the sub-grade-1 booklets; 1..8 are grades. */
export const BOOKLET_LEVELS = [
  "0A", "0B", "0C", "1", "2", "3", "4", "5", "6", "7", "8",
] as const;

/** Band radius in booklet levels. ±1, hold hard (CONVERSION decision #14). */
export const LEVEL_BAND_RADIUS = 1;

/** half_grade_level (questions.level) → booklet ordinal (index into
 *  BOOKLET_LEVELS). KA/KB fold into the 0C booklet. */
const BOOKLET_ORDINAL_BY_HALF_GRADE: Readonly<Record<string, number>> = {
  "0A": 0, "0B": 1, "0C": 2,
  KA: 2, KB: 2, // kindergarten → 0C booklet (intake floor)
  "1A": 3, "1B": 3,
  "2A": 4, "2B": 4,
  "3A": 5, "3B": 5,
  "4A": 6, "4B": 6,
  "5A": 7, "5B": 7,
  "6A": 8, "6B": 8,
  "7A": 9, "7B": 9,
  "8A": 10, "8B": 10,
};

/** Booklet ordinal for a question's half_grade level, or null if unrecognized
 *  (caller treats unknown levels as out-of-band). */
export function bookletOrdinalForHalfGrade(level: string): number | null {
  return BOOKLET_ORDINAL_BY_HALF_GRADE[level] ?? null;
}

/** Every half_grade_level value that belongs to any of the given booklet
 *  ordinals. This is what the picker filters `questions.level` against. */
export function halfGradesForBooklets(ordinals: readonly number[]): string[] {
  const want = new Set(ordinals);
  return Object.keys(BOOKLET_ORDINAL_BY_HALF_GRADE).filter((lvl) =>
    want.has(BOOKLET_ORDINAL_BY_HALF_GRADE[lvl]),
  );
}

/** The clamped ±radius booklet ordinals around an anchor. */
export function bookletBand(
  anchor: number,
  radius: number = LEVEL_BAND_RADIUS,
): number[] {
  const lo = Math.max(0, anchor - radius);
  const hi = Math.min(BOOKLET_LEVELS.length - 1, anchor + radius);
  const out: number[] = [];
  for (let o = lo; o <= hi; o++) out.push(o);
  return out;
}

/** The half_grade_level set allowed for a child anchored at `anchor` booklet,
 *  ±radius. Pass this to the picker as its level allow-list. */
export function levelLockHalfGrades(
  anchor: number,
  radius: number = LEVEL_BAND_RADIUS,
): string[] {
  return halfGradesForBooklets(bookletBand(anchor, radius));
}

/** Child's anchor booklet ordinal from grade_level text (birth_year fallback).
 *  Kindergarten (grade 0) anchors at the 0C booklet (ordinal 2); grade N
 *  anchors at booklet N (ordinal 2 + N). Sub-K never anchors below 0C — 0A/0B
 *  are reachable only via the band (a 0C child reaches 0B), matching the rule
 *  that 0A/0B aren't selectable signup grades but are servable below the floor. */
export function anchorBookletForChild(
  gradeLevel: string | null,
  birthYear: number,
): number {
  const grade = parseGradeNumber(gradeLevel) ?? gradeFromBirthYear(birthYear);
  const ordinal = 2 + Math.max(0, grade);
  return Math.min(BOOKLET_LEVELS.length - 1, ordinal);
}

/** The booklet ordinal one level BELOW the anchor (short test samples the
 *  previous booklet — a grade-5 child is sampled from grade 4, a 0C child from
 *  0B). Clamped at the bottom of the axis. */
export function previousBookletOrdinal(anchor: number): number {
  return Math.max(0, anchor - 1);
}

/** The half_grade_level set for the single booklet one level below the anchor
 *  (the short-test sampling pool's level filter). */
export function previousBookletHalfGrades(anchor: number): string[] {
  return halfGradesForBooklets([previousBookletOrdinal(anchor)]);
}
