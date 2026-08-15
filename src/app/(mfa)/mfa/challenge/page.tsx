// ATLAS-007 — elevate an AAL1 staff session to AAL2 with a TOTP code.
//
// Exempt from the middleware staff-path gate (see MFA_EXEMPT_PREFIXES) so it is
// reachable while below AAL2 — otherwise the gate would bounce the very page
// that resolves it. Staff-only; a parent is sent to /dashboard.

import { redirect } from "next/navigation";

import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { readAal } from "@/lib/auth/requireStaffAal2";
import { decideStaffMfaStep } from "@/lib/auth/staffMfa";
import { createClient } from "@/lib/supabase/server";

import { safeNext } from "../lib/next";
import { ChallengeForm } from "./challenge-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaChallengePage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const next = safeNext(nextRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/mfa/challenge")}`);

  const staff = await resolveStaff(supabase);
  if (!staff) redirect("/dashboard");

  const decision = decideStaffMfaStep({
    isStaff: true,
    aal: await readAal(supabase),
  });
  // Already elevated — go where they were headed. Prevents a loop when the
  // middleware and the page disagree by a moment.
  if (decision === "allow") redirect(next);
  // No factor at all: challenging is impossible, enrol instead.
  if (decision === "enroll") {
    redirect(`/mfa/enroll?next=${encodeURIComponent(next)}`);
  }

  return <ChallengeForm next={next} />;
}
