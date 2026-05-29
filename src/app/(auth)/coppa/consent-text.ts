// Atlas Assessment — canonical consent text + version recorded at /coppa.
//
// The string the parent agrees to is persisted verbatim on the
// consent_records row (compliance.md §12 version-on-row), so a later wording
// change stays provable against what each parent actually saw. Bump
// CONSENT_TEXT_VERSION whenever CONSENT_TEXT changes.
//
// NOTE (pre-existing, carried over from the original /coppa port): the
// disclosure wording below is the placeholder copy from the Stitch export and
// MUST be finalized against compliance.md §2 (school-operator consent
// extension + 30-day revocation grace) and reviewed by counsel before launch.
// This file does not change that obligation — it only ensures whatever text is
// shown is the text we persist.

export const CONSENT_TYPE = "coppa_vpc" as const;

export const CONSENT_TEXT_VERSION = "2026-05-28.v1" as const;

export const CONSENT_TEXT =
  "I verify that I am the parent/legal guardian and I give permission for " +
  "Atlas Assessment to collect and use my child's diagnostic data as " +
  "described in the COPPA Disclosure & Parental Consent. I understand that " +
  "my child's responses are processed by an automated (AI) system to identify " +
  "learning patterns, that my child never interacts with that system directly, " +
  "and that data is not shared beyond the assessment except with my child's " +
  "instructors.";

// Data uses the parent authorizes by consenting. Persisted on the consent
// record; the AI classification use is disclosed in the consent flow (the
// AI-interaction safeguard) and matches what the misconception classifier
// actually does (structured response data only — see
// src/lib/misconceptionClassifier/*).
export const DATA_USES = [
  "diagnostic_assessment",
  "progress_reporting_to_parent",
  "progress_reporting_to_instructor",
  "ai_misconception_classification",
] as const;

// Sharing permissions. Default: none beyond the assessment. Instructor
// visibility is part of the assessment service itself (RLS-scoped), not
// third-party sharing.
export const SHARING_PERMISSIONS = {
  third_party: false,
  marketing: false,
  beyond_assessment: false,
} as const;
