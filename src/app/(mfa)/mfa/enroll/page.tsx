// ATLAS-007 — staff TOTP enrolment.
//
// Deliberately OUTSIDE the (admin)/(instructor) segments and exempt from the
// middleware staff-path gate: a staff user at AAL1 has to be able to reach
// exactly this page and nothing else privileged. That is the bootstrap, and it
// is why the exemption list in lib/supabase/middleware.ts is load-bearing.
//
// Staff-only all the same: a parent who wanders here is sent to /dashboard,
// never prompted for a factor.

import { redirect } from "next/navigation";

import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { readAal } from "@/lib/auth/requireStaffAal2";
import { decideStaffMfaStep } from "@/lib/auth/staffMfa";
import { createClient } from "@/lib/supabase/server";

import { safeNext } from "../lib/next";
import { EnrollForm } from "./enroll-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaEnrollPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const next = safeNext(nextRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/mfa/enroll`)}`);

  const staff = await resolveStaff(supabase);
  if (!staff) redirect("/dashboard");

  // Already at AAL2 with a verified factor — nothing to enrol. Send them on so
  // this page can never become a loop for someone who is already compliant.
  const decision = decideStaffMfaStep({
    isStaff: true,
    aal: await readAal(supabase),
  });
  if (decision === "allow") redirect(next);
  if (decision === "challenge") {
    redirect(`/mfa/challenge?next=${encodeURIComponent(next)}`);
  }

  return <EnrollForm next={next} staffName={staff.name} />;
}
