// Supabase Auth code-exchange callback.
//
// Email-link verification flow (compliance.md §2 "email plus"):
//   1. Parent clicks the verification link in their email.
//   2. Supabase Auth verifies the OTP server-side, then redirects the
//      parent here with `?code=<auth_code>&next=<destination>`.
//   3. We exchange the code for a real session (sets the auth cookie —
//      only Route Handlers can write cookies in App Router).
//   4. We write `verification_clicked` and `verification_succeeded` to
//      vpc_audit_log (compliance.md §2 audit trail).
//   5. Redirect to the requested `next` page (defaults to /coppa).
//
// Failure modes:
//   * Missing or invalid code -> redirect to /signup?error=verify_failed.
//   * Code valid but no parents row found for the user (orphan auth user)
//     -> still redirect to next, but no audit row written. Surface in
//     monitoring later.

import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/coppa";

  // Only allow same-origin paths in `next` to prevent open-redirect.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/coppa";

  if (!code) {
    return NextResponse.redirect(`${url.origin}/signup?error=verify_missing_code`);
  }

  const auth = await createClient();
  const { data: exchange, error: exchangeErr } = await auth.auth.exchangeCodeForSession(code);

  if (exchangeErr || !exchange.user) {
    return NextResponse.redirect(`${url.origin}/signup?error=verify_failed`);
  }

  // Write the two audit rows that complete the VPC trail.
  // Service role used here because the parents row + audit log are
  // tenant-scoped and we want this to succeed even if RLS would otherwise
  // restrict reads.
  const admin = createServiceClient();
  const { data: parent } = await admin
    .from("parents")
    .select("id, tenant_id, home_center_id")
    .eq("auth_user_id", exchange.user.id)
    .maybeSingle();

  if (parent) {
    const h = await headers();
    const ipRaw = h.get("x-forwarded-for") ?? h.get("x-real-ip");
    const ip = ipRaw?.split(",")[0]?.trim() ?? null;
    const userAgent = h.get("user-agent") ?? null;

    await admin.from("vpc_audit_log").insert([
      {
        tenant_id: parent.tenant_id,
        parent_id: parent.id,
        event_type: "verification_clicked",
        center_id: parent.home_center_id,
        ip_address: ip,
        user_agent: userAgent,
        metadata: null,
      },
      {
        tenant_id: parent.tenant_id,
        parent_id: parent.id,
        event_type: "verification_succeeded",
        center_id: parent.home_center_id,
        ip_address: ip,
        user_agent: userAgent,
        metadata: null,
      },
    ]);
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
