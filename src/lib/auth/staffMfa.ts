// ATLAS-007 — staff MFA / AAL2 decision core.
//
// Privileged staff (instructor, admin) must hold AAL2 — a session where a TOTP
// factor was actually verified — before they can open a privileged page, invoke
// a staff server action, or reach any cross-family child assessment data.
//
// This module is deliberately PURE where it matters. `decideStaffMfaStep` takes
// plain values and returns a decision, so the fail-closed behaviour is unit
// testable without a session, a database, or a browser. The impure parts (read
// the session, redirect) live in requireStaffAal2.ts and in the routes.
//
// FAIL-CLOSED, STATED PRECISELY
// -----------------------------
// The rule is `currentLevel !== "aal2"` denies — NOT `currentLevel === "aal1"`
// denies. The difference matters: if Supabase ever returns a level we do not
// recognise, a null, or the read throws, the negative form still denies. The
// positive form ("deny only what I recognise as bad") would let an unknown
// value through, which is exactly how these gates fail in practice.
//
// PARENTS ARE UNTOUCHED. The gate engages only once a user has already resolved
// as staff. A parent never sees an MFA prompt and never has a factor demanded.

/** What Supabase reports about the session's assurance. */
export interface AalReading {
  /** Assurance the session currently holds. */
  currentLevel: string | null | undefined;
  /** Highest assurance this user COULD reach — aal2 iff a verified factor exists. */
  nextLevel: string | null | undefined;
}

export type StaffMfaDecision =
  /** Not staff, or staff already at AAL2 — the caller proceeds. */
  | "allow"
  /** Staff with no verified factor — send to enrolment. */
  | "enroll"
  /** Staff with a factor they have not verified in this session. */
  | "challenge"
  /** Staff, and we cannot positively establish AAL2. Denied. */
  | "deny";

export const AAL2 = "aal2";
export const AAL1 = "aal1";

/**
 * The whole gate, as a pure function.
 *
 * `aal` is null when the assurance level could not be read at all (the call
 * threw, the session was unreadable, the claim was missing). That is a DENY for
 * staff — an unknown assurance level is not a reason to proceed.
 */
export function decideStaffMfaStep(input: {
  isStaff: boolean;
  aal: AalReading | null;
}): StaffMfaDecision {
  // The gate is staff-only by construction. A parent or an anonymous visitor is
  // not this function's business; their own route guards still apply.
  if (!input.isStaff) return "allow";

  if (input.aal === null || input.aal === undefined) return "deny";

  const { currentLevel, nextLevel } = input.aal;

  // The ONLY allow path for staff.
  if (currentLevel === AAL2) return "allow";

  // Below AAL2. Route to the step that can fix it — but only when Supabase
  // tells us something we actually recognise.
  //
  // Documented mapping:
  //   aal1 / aal1  -> no factors enrolled          -> enrol
  //   aal1 / aal2  -> factor enrolled, not verified -> challenge
  //   aal2 / aal2  -> verified                      -> handled above
  if (currentLevel === AAL1 && nextLevel === AAL2) return "challenge";
  if (currentLevel === AAL1 && nextLevel === AAL1) return "enroll";

  // Anything else — a null level, an unrecognised string, a nextLevel that
  // makes no sense next to currentLevel — denies rather than guesses.
  return "deny";
}

/** True iff this decision permits privileged work. Nothing else does. */
export function decisionAllows(decision: StaffMfaDecision): boolean {
  return decision === "allow";
}

/** Where a non-allow decision should send a staff user, preserving `next`. */
export function mfaStepPath(
  decision: Exclude<StaffMfaDecision, "allow">,
  next?: string | null,
): string {
  const base =
    decision === "enroll"
      ? "/mfa/enroll"
      : decision === "challenge"
        ? "/mfa/challenge"
        : "/mfa/challenge"; // "deny": offer the challenge; it re-evaluates server-side

  if (!next) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

// ---------------------------------------------------------------------------
// Recovery codes
// ---------------------------------------------------------------------------
//
// Supabase MFA vends no recovery codes (verified against the current docs), so
// these are ours. Redeeming one NEVER produces an AAL2 session — Supabase only
// elevates through mfa.verify against a real factor. It authorises exactly one
// thing: dropping a lost factor so a new one can be enrolled.

/** How many codes a staff member gets per enrolment. */
export const RECOVERY_CODE_COUNT = 10;

/**
 * Unambiguous alphabet — these codes get written down and retyped, so every
 * look-alike PAIR is broken by dropping one side: O/0 (drop O and 0), I/1 (drop
 * both), S/5 (drop both), B/8 (drop B). 8 is kept: with B gone there is nothing
 * left to confuse it with, and the extra symbol is free entropy.
 */
const CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXYZ2346789";
const CODE_GROUP = 5;
const CODE_GROUPS = 2;

/**
 * Generate one recovery code, e.g. `K7M2Q-XR94T`.
 *
 * ~10 chars from a 29-symbol alphabet is roughly 48 bits — far beyond guessing
 * over a network, which is why an unsalted digest is acceptable at rest.
 */
export function generateRecoveryCode(
  randomBytes: (n: number) => Uint8Array,
): string {
  const length = CODE_GROUP * CODE_GROUPS;
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % CODE_GROUP === 0) out += "-";
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Normalise a code the way a human might retype it — lowercase, missing or
 * extra dashes, stray spaces — so redemption is not defeated by formatting.
 */
export function normalizeRecoveryCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
