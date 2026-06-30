"use server";

// Parent dashboard server actions.
//
// archiveChildAction — SOFT delete. Sets children.archived_at (and archived_by
// = the parent's id) so the child disappears from the parent's dashboard while
// the row, its assessment sessions, and its report are RETAINED for staff
// (admin) oversight. Scoping is RLS-enforced: createClient() carries the
// parent's session and children_parent_all (parent_id = app_current_parent_id())
// limits the UPDATE to the parent's own rows. Keyed on `archived_at IS NULL` so
// re-archiving a child is a harmless no-op (idempotent).

import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArchiveChildResult = { ok: true } | { ok: false; error: string };

export async function archiveChildAction(
  childId: string,
): Promise<ArchiveChildResult> {
  if (!UUID_RE.test(childId)) {
    return { ok: false, error: "Invalid child." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in. Please sign in and try again." };
  }

  // Resolve the parent row (RLS → own row) for the archived_by audit pointer.
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .maybeSingle();
  if (!parent) {
    return { ok: false, error: "Account profile not found. Contact support." };
  }

  // RLS scopes to the parent's own children; archived_at IS NULL makes a repeat
  // archive a no-op. .select() detects "nothing updated" (already archived /
  // wrong owner / missing) so we don't report success for a row we didn't touch.
  const { data: archived, error } = await supabase
    .from("children")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: parent.id,
    })
    .eq("id", childId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[dashboard] archive child failed", { childId, err: error });
    return { ok: false, error: "Could not remove this child. Please try again." };
  }
  if (!archived) {
    return { ok: false, error: "This child is no longer on your dashboard." };
  }

  return { ok: true };
}
