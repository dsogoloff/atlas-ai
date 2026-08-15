import "server-only";

// ATLAS-007 — the AUTHORITATIVE staff MFA gate.
//
// The middleware prefix gate in src/proxy.ts is an outer layer and cannot be
// the control: it sees only paths, so it cannot protect server actions (which
// POST to the page's own path) and cannot sit between a page and the
// service-role reads inside it. THIS is the gate. Everything privileged calls
// it — every staff page, all four staff server actions, and every
// createServiceClient() on a staff path.
//
// WHY IT MUST WRAP THE SERVICE-ROLE READS. The instructor student-detail page
// assembles its report through createServiceClient(), which BYPASSES RLS
// entirely. No database-side AAL policy can cover that path, so the check has
// to happen in application code before the client is constructed. That read is
// the richest cross-family child data in the product; it is the thing ATLAS-007
// exists to protect.
//
// AAL IS READ LOCALLY. This project signs JWTs with ES256 (verified against the
// project's JWKS endpoint on 2026-08-14), so getClaims() verifies against a
// cached key set with no network round-trip. mfa.getAuthenticatorAssuranceLevel()
// is likewise local when called without a JWT argument — documented as
// "microseconds, rarely uses the network". We use the latter because it also
// reports nextLevel, which is what distinguishes "needs to enrol" from "needs
// to challenge"; the aal claim alone cannot tell those apart.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  resolveStaff,
  type StaffIdentity,
} from "@/app/(instructor)/instructor/lib/instructor";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  decideStaffMfaStep,
  mfaStepPath,
  type AalReading,
  type StaffMfaDecision,
} from "./staffMfa";

export type StaffGateResult =
  | { ok: true; user: User; staff: StaffIdentity }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "not-staff"; user: User }
  | {
      ok: false;
      reason: "mfa-required";
      user: User;
      staff: StaffIdentity;
      decision: Exclude<StaffMfaDecision, "allow">;
      redirectTo: string;
    };

/**
 * Read the session's assurance level. Returns null on ANY failure, which
 * decideStaffMfaStep treats as a denial — an unreadable assurance level is not
 * a reason to let someone through.
 */
export async function readAal(
  client: SupabaseClient<Database>,
): Promise<AalReading | null> {
  try {
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return null;
    return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
  } catch {
    return null;
  }
}

/**
 * Evaluate the gate WITHOUT redirecting. Used by callers that need to render a
 * notice instead of navigating (the student-detail page does this mid-tree) and
 * by the server actions, which must return a failure rather than redirect.
 */
export async function checkStaffAal2(
  client: SupabaseClient<Database>,
  next?: string | null,
): Promise<StaffGateResult> {
  let user: User | null = null;
  try {
    const { data } = await client.auth.getUser();
    user = data.user ?? null;
  } catch {
    user = null;
  }
  if (!user) return { ok: false, reason: "unauthenticated" };

  let staff: StaffIdentity | null = null;
  try {
    staff = await resolveStaff(client);
  } catch {
    // A failed staff lookup is not "not staff" — we genuinely do not know. But
    // an unknown identity cannot be granted privileged access either, and the
    // non-staff branch grants nothing, so this is safe to fold together.
    staff = null;
  }
  if (!staff) return { ok: false, reason: "not-staff", user };

  const aal = await readAal(client);
  const decision = decideStaffMfaStep({ isStaff: true, aal });

  if (decision === "allow") return { ok: true, user, staff };

  return {
    ok: false,
    reason: "mfa-required",
    user,
    staff,
    decision,
    redirectTo: mfaStepPath(decision, next),
  };
}

/**
 * The redirecting form, for staff pages.
 *
 * Returns the staff identity on success; otherwise redirects and never returns.
 * `next` is carried through the MFA round-trip so `?next=/admin` still lands
 * correctly after the code is verified.
 */
export async function requireStaffAal2(
  next: string,
): Promise<{ user: User; staff: StaffIdentity }> {
  const client = await createClient();
  const result = await checkStaffAal2(client, next);

  if (result.ok) return { user: result.user, staff: result.staff };

  if (result.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (result.reason === "not-staff") {
    // Not a privilege failure to explain — a parent who wandered in. Send them
    // to their own surface rather than an MFA prompt.
    redirect("/dashboard");
  }
  redirect(result.redirectTo);
}
