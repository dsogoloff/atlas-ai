"use server";

// Edit-child server action.
//
// Updates an existing child's editable fields (name, grade, birth year) for the
// calling parent. Scoping is RLS-enforced: createClient() carries the parent's
// session and the children_parent_all policy (parent_id = app_current_parent_id())
// limits the UPDATE to the parent's own rows. We additionally key the update on
// `archived_at IS NULL` so a soft-deleted child can't be edited back into use.
//
// No consent re-capture: consent was bound at add-child time (Model B /
// COPPA Gate-B) and isn't re-collected on an edit.

import { createClient } from "@/lib/supabase/server";

import { EditChildSchema, type EditChildInput } from "./schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EditChildResult = { ok: true } | { ok: false; error: string };

export async function updateChildAction(
  childId: string,
  input: EditChildInput,
): Promise<EditChildResult> {
  if (!UUID_RE.test(childId)) {
    return { ok: false, error: "Invalid child." };
  }

  const parsed = EditChildSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Form validation failed. Refresh and try again." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in. Please sign in and try again." };
  }

  // RLS scopes this to the parent's own children; archived_at IS NULL prevents
  // editing a soft-deleted child. .select() lets us detect "no row updated"
  // (wrong owner / archived / missing) and report it rather than silently no-op.
  const { data: updated, error } = await supabase
    .from("children")
    .update({
      name: data.name,
      birth_year: data.birthYear,
      grade_level: data.gradeLevel,
    })
    .eq("id", childId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[edit-child] update failed", { childId, err: error });
    return { ok: false, error: "Could not save changes. Please try again." };
  }
  if (!updated) {
    return { ok: false, error: "This child is no longer available." };
  }

  return { ok: true };
}
