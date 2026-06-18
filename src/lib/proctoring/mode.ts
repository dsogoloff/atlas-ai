// Proctoring-mode derivation for the parent intro / instructions screen.
//
// The short-assessment intro shows AGE-DEPENDENT proctoring instructions to
// the supervising parent. The split is at GRADE 2:
//   * Grade 2 and below  → "read-aloud"   (parent may read/clarify the WORDS,
//                                           but must NOT help with the math)
//   * Grade 3 and above  → "no-assistance" (child works independently)
//
// The cutoff is a SINGLE named constant (READ_ALOUD_MAX_GRADE) so it can move
// in one edit. Routing reads children.grade_level (operator-entered free text,
// nullable — same field deriveTier() parses) and falls back to children.
// birth_year when the text is unparseable. Pure + total: always returns a mode.

import { CURRENT_ACADEMIC_YEAR_START } from "@/lib/tier/derive";

/** Highest school grade that gets READ-ALOUD proctoring. Grades at or below
 *  this are read-aloud; grades above are no-assistance. Move this one value to
 *  shift the cutoff. */
export const READ_ALOUD_MAX_GRADE = 2;

export type ProctoringMode = "read-aloud" | "no-assistance";

interface DeriveProctoringInput {
  /** children.grade_level — free text, nullable. */
  grade_level: string | null;
  /** children.birth_year — smallint NOT NULL (fallback when grade_level is
   *  unparseable). */
  birth_year: number;
}

/** The proctoring mode for a numeric school grade (K = 0). */
export function proctoringModeForGrade(grade: number): ProctoringMode {
  return grade <= READ_ALOUD_MAX_GRADE ? "read-aloud" : "no-assistance";
}

/**
 * Parse children.grade_level free text into a numeric US grade (K = 0).
 * Recognises the same variants as tier/derive.ts parseGradeLevel — bare
 * digits, half-grade enum values (KA/1B/…), ordinals (1st/5th), word forms
 * (first/fifth), Pre-K — but returns the grade NUMBER (the proctoring cutoff
 * is at grade 2/3, finer than the K_4/G5_8 tier split). Anything unrecognised
 * → null (caller falls back to birth_year). Pre-K maps to 0: it is well below
 * the cutoff, so its exact value never affects the read-aloud/no-assist line.
 */
export function parseGradeNumber(text: string | null): number | null {
  if (text == null) return null; // tolerate undefined as well as null
  const normalised = text
    .trim()
    .toLowerCase()
    .replace(/^grade\s+/, "")
    .replace(/\s+grade\s*$/, "");
  if (normalised === "") return null;

  return GRADE_NUMBER_BY_TEXT.get(normalised) ?? null;
}

/** Approximate US grade from birth year (K = age 5 at the academic-year
 *  start; grade ≈ ageAtStart − 5). Mirrors tier/derive.ts tierFromBirthYear,
 *  sharing CURRENT_ACADEMIC_YEAR_START as the single calendar anchor. */
export function gradeFromBirthYear(birthYear: number): number {
  return CURRENT_ACADEMIC_YEAR_START - birthYear - 5;
}

/** Derive the proctoring mode for a child: grade_level first, birth_year
 *  fallback. Total — always returns a mode. */
export function deriveProctoringMode(child: DeriveProctoringInput): ProctoringMode {
  const grade = parseGradeNumber(child.grade_level) ?? gradeFromBirthYear(child.birth_year);
  return proctoringModeForGrade(grade);
}

// -----------------------------------------------------------------------------
// Grade-text → number lookup. Covers the US K-8 variants tier/derive.ts
// recognises; values are the school grade (K = 0). Pre-K → 0 (see
// parseGradeNumber).
// -----------------------------------------------------------------------------

const GRADE_NUMBER_BY_TEXT = new Map<string, number>([
  // Pre-K → treated as 0 (kindergarten-and-below; read-aloud regardless).
  ["pre-k", 0],
  ["prek", 0],
  ["pre k", 0],
  ["pre-kindergarten", 0],
  ["pre kindergarten", 0],
  // Kindergarten (KA / KB are the half_grade_level enum values).
  ["k", 0],
  ["ka", 0],
  ["kb", 0],
  ["kindergarten", 0],
  // 1st
  ["1", 1], ["1a", 1], ["1b", 1], ["1st", 1], ["first", 1],
  // 2nd
  ["2", 2], ["2a", 2], ["2b", 2], ["2nd", 2], ["second", 2],
  // 3rd
  ["3", 3], ["3a", 3], ["3b", 3], ["3rd", 3], ["third", 3],
  // 4th
  ["4", 4], ["4a", 4], ["4b", 4], ["4th", 4], ["fourth", 4],
  // 5th
  ["5", 5], ["5a", 5], ["5b", 5], ["5th", 5], ["fifth", 5],
  // 6th
  ["6", 6], ["6a", 6], ["6b", 6], ["6th", 6], ["sixth", 6],
  // 7th
  ["7", 7], ["7a", 7], ["7b", 7], ["7th", 7], ["seventh", 7],
  // 8th
  ["8", 8], ["8a", 8], ["8b", 8], ["8th", 8], ["eighth", 8],
]);
