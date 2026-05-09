"use server";

// Add-child server action.
//
// Flow:
//   1. Validate input (zod).
//   2. Resolve the calling parent via supabase.auth.getUser() + parents
//      lookup. The page-level auth gate (page.tsx) catches unauth users
//      before this point; this is defense-in-depth.
//   3. Insert into children with parent_id, tenant_id, and home_center_id
//      copied from the parent's row. RLS policy children_parent_all
//      accepts the insert when parent_id = app_current_parent_id().
//
// No audit row written — compliance.md §2 audit trail covers consent
// events only; child addition has no audit requirement.
//
// Why createClient() (not service role): the parent has an authenticated
// session at this point (post-verification), and RLS on children allows
// parent-scoped inserts via the children_parent_all policy. The service
// role would bypass that check unnecessarily.

import { createClient } from "@/lib/supabase/server";

import { AddChildSchema, type AddChildInput } from "./schema";

export type AddChildResult =
  | { ok: true; childId: string }
  | { ok: false; error: string };

export async function addChildAction(
  input: AddChildInput,
): Promise<AddChildResult> {
  const parsed = AddChildSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Form validation failed. Refresh and try again.",
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Not signed in. Please sign in and try again.",
    };
  }

  // Resolve the parent row for this auth user. RLS on parents restricts
  // selects to the parent's own row, so this returns at most one row.
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, tenant_id, home_center_id")
    .maybeSingle();
  if (parentErr || !parent) {
    // Orphan auth user — parents-row insert failed at signup time. Real
    // bug class; log server-side so dev catches it. User-facing message
    // stays generic.
    console.error("[add-child] parent lookup failed", {
      authUserId: user.id,
      err: parentErr,
    });
    return {
      ok: false,
      error: "Account profile not found. Contact support.",
    };
  }

  const { data: child, error: childErr } = await supabase
    .from("children")
    .insert({
      tenant_id: parent.tenant_id,
      parent_id: parent.id,
      home_center_id: parent.home_center_id,
      name: data.name,
      birth_year: data.birthYear,
      grade_level: data.gradeLevel ?? null,
    })
    .select("id")
    .single();
  if (childErr || !child) {
    console.error("[add-child] child insert failed", {
      parentId: parent.id,
      err: childErr,
    });
    return {
      ok: false,
      error: "Could not save child. Please try again.",
    };
  }

  return { ok: true, childId: child.id };
}
