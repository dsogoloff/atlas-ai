// ATLAS-007 — recovery-code redemption.
//
// Redeeming a code does NOT sign anyone in at AAL2. Supabase elevates assurance
// only through mfa.verify against a real factor, and this flow does not try to
// work around that. Redemption authorises exactly one thing: dropping the lost
// factor so a new one can be enrolled, after which the normal enrolment path
// produces a genuine AAL2 session.

import { redirect } from "next/navigation";

import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { createClient } from "@/lib/supabase/server";

import { safeNext } from "../lib/next";
import { RecoveryForm } from "./recovery-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaRecoveryPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const next = safeNext(nextRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/mfa/recovery")}`);

  const staff = await resolveStaff(supabase);
  if (!staff) redirect("/dashboard");

  return <RecoveryForm next={next} />;
}
