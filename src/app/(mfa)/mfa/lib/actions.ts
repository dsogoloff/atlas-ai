"use server";

// ATLAS-007 — server actions backing the staff MFA flows.
//
// These live OUTSIDE the (admin)/(instructor) gated segments and outside the
// middleware staff-path gate, because a staff user at AAL1 has to be able to
// reach enrolment — that is the entire bootstrap. Every action below therefore
// enforces its own rule: STAFF ONLY, but AAL1 is acceptable here specifically.
//
// The one exception is unenrollFactor, which requires AAL2 like any other
// privileged operation — replacing a factor is not a recovery path, and the
// recovery path (redeemRecoveryCode) is separately gated on a single-use code.

import { createHash, randomBytes } from "node:crypto";

import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { readAal } from "@/lib/auth/requireStaffAal2";
import {
  RECOVERY_CODE_COUNT,
  decideStaffMfaStep,
  generateRecoveryCode,
  normalizeRecoveryCode,
} from "@/lib/auth/staffMfa";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type MfaResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

/** SHA-256 hex. The codes are high-entropy, so no per-row salt — see migration. */
function hashCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

/** Staff-only, AAL1 acceptable. Returns the auth user id, or null. */
async function requireStaffAnyAal(): Promise<{
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const staff = await resolveStaff(supabase);
  if (!staff) return null;
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function startEnrollment(): Promise<
  MfaResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const staff = await requireStaffAnyAal();
  if (!staff) return { ok: false, error: "Not authorised." };

  const supabase = await createClient();

  // A stale unverified factor from an abandoned attempt would block a new
  // enroll with "factor already exists", so clear those first. Only UNVERIFIED
  // ones — a verified factor is never removed here.
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const stale = (factors?.all ?? []).filter((f) => f.status !== "verified");
    for (const factor of stale) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  } catch {
    // Best effort — enroll below surfaces any real problem.
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `S.A.M staff ${Date.now()}`,
  });
  if (error || !data) {
    return { ok: false, error: "Could not start setup. Please try again." };
  }

  return {
    ok: true,
    data: {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    },
  };
}

export async function verifyEnrollment(
  factorId: string,
  code: string,
): Promise<MfaResult<{ recoveryCodes: string[] }>> {
  const staff = await requireStaffAnyAal();
  if (!staff) return { ok: false, error: "Not authorised." };

  const supabase = await createClient();

  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challenge) {
    return { ok: false, error: "Could not verify the code. Please try again." };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyErr) {
    return { ok: false, error: "That code didn't match. Try the next one." };
  }

  // Issue recovery codes. Plaintext is returned to the caller ONCE and never
  // stored; only the digests reach the database.
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    generateRecoveryCode((n) => new Uint8Array(randomBytes(n))),
  );
  const { error: issueErr } = await supabase.rpc("issue_staff_recovery_codes", {
    p_hashes: codes.map(hashCode),
  });
  if (issueErr) {
    // The factor IS enrolled and the account is now protected; only the backup
    // codes failed. Say so plainly rather than implying setup failed.
    return {
      ok: false,
      error:
        "Two-factor is active, but backup codes could not be saved. Open Manage two-factor to generate them.",
    };
  }

  return { ok: true, data: { recoveryCodes: codes } };
}

// ---------------------------------------------------------------------------
// Challenge (elevate an existing AAL1 session to AAL2)
// ---------------------------------------------------------------------------

export async function verifyChallenge(
  code: string,
): Promise<MfaResult<undefined>> {
  const staff = await requireStaffAnyAal();
  if (!staff) return { ok: false, error: "Not authorised." };

  const supabase = await createClient();

  const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr) return { ok: false, error: "Could not verify. Please try again." };

  const verified = (factors?.totp ?? []).find((f) => f.status === "verified");
  if (!verified) {
    return { ok: false, error: "No authenticator is set up on this account." };
  }

  const { data: challenge, error: challengeErr } =
    await supabase.auth.mfa.challenge({ factorId: verified.id });
  if (challengeErr || !challenge) {
    return { ok: false, error: "Could not verify. Please try again." };
  }

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId: verified.id,
    challengeId: challenge.id,
    code: code.trim(),
  });
  if (verifyErr) {
    return { ok: false, error: "That code didn't match. Try the next one." };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

/**
 * Redeem one single-use recovery code.
 *
 * This does NOT grant AAL2 — Supabase only elevates through mfa.verify against
 * a real factor, and there is deliberately no way around that. Redemption
 * authorises exactly one thing: deleting the lost factor so a new one can be
 * enrolled. The caller is then sent to /mfa/enroll.
 *
 * Deleting the factor needs the ADMIN API (a user cannot unenroll a verified
 * factor from an AAL1 session), so this is the one place the service role is
 * used — narrowly, on the caller's OWN user id, and only after the code was
 * atomically consumed.
 */
export async function redeemRecoveryCode(
  code: string,
): Promise<MfaResult<undefined>> {
  const staff = await requireStaffAnyAal();
  if (!staff) return { ok: false, error: "Not authorised." };

  const supabase = await createClient();

  const { data: redeemed, error } = await supabase.rpc(
    "redeem_staff_recovery_code",
    { p_code_hash: hashCode(code) },
  );
  if (error || redeemed !== true) {
    // One message for "wrong code" and "already used" — a valid-but-spent code
    // should not be distinguishable from an invalid one.
    return { ok: false, error: "That recovery code isn't valid." };
  }

  const admin = createServiceClient();
  try {
    const { data: factors } = await admin.auth.admin.mfa.listFactors({
      userId: staff.userId,
    });
    for (const factor of factors?.factors ?? []) {
      await admin.auth.admin.mfa.deleteFactor({
        userId: staff.userId,
        id: factor.id,
      });
    }
  } catch {
    return {
      ok: false,
      error: "Could not reset two-factor. Contact your administrator.",
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Factor removal / replacement — requires AAL2
// ---------------------------------------------------------------------------

export async function unenrollFactor(): Promise<MfaResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorised." };

  const staff = await resolveStaff(supabase);
  if (!staff) return { ok: false, error: "Not authorised." };

  // Replacing a factor is a privileged operation in its own right, so it takes
  // the full gate — not the AAL1 allowance the enrolment bootstrap needs.
  const decision = decideStaffMfaStep({
    isStaff: true,
    aal: await readAal(supabase),
  });
  if (decision !== "allow") {
    return { ok: false, error: "Enter your current code first." };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      return { ok: false, error: "Could not remove the authenticator." };
    }
  }

  return { ok: true };
}
