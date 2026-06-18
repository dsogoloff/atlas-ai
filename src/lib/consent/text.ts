// Atlas Assessment — canonical consent text + version recorded per child.
//
// SINGLE SOURCE OF TRUTH for the consent attestation. The /add-child form
// RENDERS CONSENT_TEXT (the checkbox label) and the /add-child server action
// PERSISTS the same CONSENT_TEXT verbatim on each consent_records row
// (compliance.md §12 version-on-row), so what each parent saw is provable
// against what we stored — the two must never drift. Bump CONSENT_TEXT_VERSION
// whenever CONSENT_TEXT changes.
//
// CONSENT_TEXT is the counsel-approved checkbox attestation from the COPPA
// Disclosure and Parental Consent (docs/legal/COPPA_Disclosure.docx, §10
// checkbox). The full disclosure the parent reviews is the served PDF asset
// (public/legal/coppa-disclosure-v1.pdf); DISCLOSURE_VERSION + the PDF's
// content hash are recorded on each consent row so the row is tied to the exact
// disclosure document version in force at grant time.

export const CONSENT_TYPE = "coppa_vpc" as const;

export const CONSENT_TEXT_VERSION = "2026-06-18.v2" as const;

export const CONSENT_TEXT =
  "I am the parent or legal guardian and I consent to the collection and use " +
  "of my child's information as described in this Parent Notice and Consent.";

// Identifier + content hash of the served disclosure PDF
// (public/legal/coppa-disclosure-v1.pdf). DISCLOSURE_CONTENT_SHA256 is the
// sha256 of the PDF bytes — regenerate via tools/legal/build_coppa_pdf.py and
// update both if the disclosure asset ever changes (and bump the version).
export const DISCLOSURE_VERSION = "coppa-disclosure-v1" as const;

export const DISCLOSURE_CONTENT_SHA256 =
  "a73fb63bc774b5f4221d81bd064cfd562696a214d17cad5232b95521aaf23aea" as const;

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
