import "server-only";

// Self-heal for orphaned auth users.
//
// An "orphan" is an authenticated user with NO parents row: signup created the
// auth user but the parents insert failed, so the user can log in yet has no
// profile and used to dead-end on the dashboard with "Account profile not
// found". This rebuilds the missing parents row from the user's auth identity,
// attaching it to the SAME single ACTIVE tenant/center the signup flow uses.
//
// Service-role client: a parents INSERT is normally server-only (RLS has no
// self-insert policy), exactly as in the signup action. Mirrors that action's
// tenant/center resolution so a recovered profile is indistinguishable from a
// cleanly-created one.
//
// Deliberately writes NO vpc_audit_log row: consent was given at signup time;
// fabricating a consent event here with a recovery-time timestamp would corrupt
// the COPPA trail. Recovery restores access only.

import type { User } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/server";

const TENANT_SLUG = "inspirea_singapore_math";

export type RecoveredParent = { id: string; name: string };

/** Best-effort display name from the auth identity. Signup stores
 *  full_name / first_name / last_name in user_metadata; fall back to the email
 *  local-part, then a generic label, so a name is always present. */
function deriveName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  if (full) return full;
  const first = typeof meta.first_name === "string" ? meta.first_name : "";
  const last = typeof meta.last_name === "string" ? meta.last_name : "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const local = user.email?.split("@")[0]?.trim();
  return local || "Parent";
}

export async function recoverParentProfile(
  user: User,
): Promise<RecoveredParent | null> {
  const admin = createServiceClient();

  const { data: tenant, error: tenantErr } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();
  if (tenantErr || !tenant) {
    console.error("[dashboard] recovery: tenant unavailable", {
      authUserId: user.id,
      err: tenantErr,
    });
    return null;
  }

  // Single-center attach (mirrors signup). Recover only when exactly one
  // ACTIVE center exists — with zero or many we can't safely pick, so bail to
  // the graceful message rather than guess (signup throws loudly on >1; on a
  // GET page we degrade instead).
  const { data: activeCenters, error: centerErr } = await admin
    .from("centers")
    .select("id, status, tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("status", "ACTIVE");
  if (centerErr || !activeCenters || activeCenters.length !== 1) {
    console.error("[dashboard] recovery: center unresolved", {
      authUserId: user.id,
      count: activeCenters?.length ?? 0,
      err: centerErr,
    });
    return null;
  }
  const center = activeCenters[0];

  const { data: parent, error: insertErr } = await admin
    .from("parents")
    .insert({
      auth_user_id: user.id,
      tenant_id: tenant.id,
      home_center_id: center.id,
      email: user.email ?? "",
      name: deriveName(user),
    })
    .select("id, name")
    .single();

  if (insertErr || !parent) {
    // Likely a race: the row was created concurrently (auth_user_id is unique).
    // Re-read before giving up so a parallel recovery still lands the user on a
    // working dashboard.
    const { data: existing } = await admin
      .from("parents")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (existing) return existing;

    console.error("[dashboard] recovery: parents insert failed", {
      authUserId: user.id,
      err: insertErr,
    });
    return null;
  }

  console.warn("[dashboard] recovered orphaned parent profile", {
    authUserId: user.id,
    parentId: parent.id,
  });
  return parent;
}
