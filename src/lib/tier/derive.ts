// Tier derivation for child-facing assessment chrome.
//
// Two tiers — K_4 and G5_8 — drive which visual chrome AssessmentClient
// renders. The FSM, engine, picker, and API are tier-blind; this module
// exists purely to translate the open-text `children.grade_level` (with
// `children.birth_year` as fallback) into a runtime enum the UI can
// switch on.
//
// Schema reality (verified against
// supabase/migrations/20260426000000_initial_schema.sql:120-122 and
// src/lib/supabase/database.types.ts:85-110):
//   - children.grade_level is nullable text. NO check constraint, NO enum
//     binding. Operator-entered. Could be "K", "5A", "5th", "fifth grade",
//     "Honors", or empty. Anything unrecognised falls through to birth_year.
//   - children.birth_year is smallint NOT NULL, range 2000-2030.
//
// All paths terminate. parseGradeLevel returns null on garbage; deriveTier
// always returns a Tier (the birth_year fallback is total). No throws.

// =============================================================================
// CALENDAR TODO — bump in fall 2026
// =============================================================================
// CURRENT_ACADEMIC_YEAR_START is the calendar year of the most recent
// fall-semester start. Hardcoded (rather than computed from Date.now())
// so tier derivation is a pure function — predictable in tests, no
// time-mocking required.
//
// derive.test.ts contains a trip-wire test that fails when this constant
// drifts from the active academic year. When that test breaks (around
// September 2026), bump to 2026, then 2027, etc.
// =============================================================================
export const CURRENT_ACADEMIC_YEAR_START = 2025;

export type Tier = "K_4" | "G5_8";

interface DeriveTierInput {
  grade_level: string | null;
  birth_year: number;
}

export function deriveTier(child: DeriveTierInput): Tier {
  const fromGrade = parseGradeLevel(child.grade_level);
  if (fromGrade !== null) return fromGrade;
  return tierFromBirthYear(child.birth_year);
}

// US K-8 grade-name variants. Recognises bare digits, half-grade enum
// values (KA/1B/...), ordinals (1st/5th), word forms (first/fifth), and
// Pre-K variants. Case-insensitive after .trim(). Optional leading
// "grade " or trailing " grade" is stripped before matching, so "Grade 5"
// and "5th grade" both normalise. Anything unrecognised → null.
export function parseGradeLevel(text: string | null): Tier | null {
  if (text === null) return null;
  const normalised = text
    .trim()
    .toLowerCase()
    .replace(/^grade\s+/, "")
    .replace(/\s+grade\s*$/, "");
  if (normalised === "") return null;

  if (K_4_PATTERNS.has(normalised)) return "K_4";
  if (G5_8_PATTERNS.has(normalised)) return "G5_8";
  return null;
}

export function tierFromBirthYear(birthYear: number): Tier {
  // ageAtStart = years old at the start of the current academic year.
  // Approximate grade ≈ ageAtStart - 5 (KA = age 5, 5th grade = age 10).
  // Boundary at age 10 → 5th grade → G5_8.
  const ageAtStart = CURRENT_ACADEMIC_YEAR_START - birthYear;
  return ageAtStart >= 10 ? "G5_8" : "K_4";
}

// -----------------------------------------------------------------------------
// Internal: pattern sets
// -----------------------------------------------------------------------------

const K_4_PATTERNS = new Set<string>([
  // Pre-K
  "pre-k",
  "prek",
  "pre k",
  "pre-kindergarten",
  "pre kindergarten",
  // Kindergarten (KA / KB are the half_grade_level enum values)
  "k",
  "ka",
  "kb",
  "kindergarten",
  // 1st
  "1",
  "1a",
  "1b",
  "1st",
  "first",
  // 2nd
  "2",
  "2a",
  "2b",
  "2nd",
  "second",
  // 3rd
  "3",
  "3a",
  "3b",
  "3rd",
  "third",
  // 4th
  "4",
  "4a",
  "4b",
  "4th",
  "fourth",
]);

const G5_8_PATTERNS = new Set<string>([
  // 5th
  "5",
  "5a",
  "5b",
  "5th",
  "fifth",
  // 6th
  "6",
  "6a",
  "6b",
  "6th",
  "sixth",
  // 7th
  "7",
  "7a",
  "7b",
  "7th",
  "seventh",
  // 8th
  "8",
  "8a",
  "8b",
  "8th",
  "eighth",
]);
