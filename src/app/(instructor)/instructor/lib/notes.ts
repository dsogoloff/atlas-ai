// Pedagogical notes — read + insert-shape helpers for the instructor portal.
//
// Writes are double-gated: the RLS policy
// `pedagogical_notes_instructor_insert` requires the row's instructor_id to
// equal `app_current_instructor_id()` AND the child to be at the
// instructor's CURRENT center (no writes during prior-center grace). This
// module's job is to shape a correct insert from the resolved instructor
// identity so the author and tenant/center scoping can never be forged by
// client input — the body is the only caller-supplied field.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { InstructorIdentity } from "./instructor";

export type NoteInsert =
  Database["public"]["Tables"]["pedagogical_notes"]["Insert"];

export interface NoteView {
  id: string;
  body: string;
  createdAtDisplay: string;
  /** True when the calling instructor authored this note (and may edit it).
   *  Notes by other instructors at the center are visible read-only. */
  mine: boolean;
}

/** Shapes a pedagogical_notes insert from the resolved instructor identity.
 *  instructor_id / tenant_id / authored_at_center_id are taken from the
 *  trusted server-resolved identity, never from client input; only `body`
 *  comes from the form. */
export function buildNoteInsert(
  instructor: InstructorIdentity,
  childId: string,
  body: string,
): NoteInsert {
  return {
    instructor_id: instructor.id,
    child_id: childId,
    tenant_id: instructor.tenant_id,
    authored_at_center_id: instructor.center_id,
    body: body.trim(),
  };
}

/** Fetches the notes for a child, newest first. RLS
 *  (pedagogical_notes_instructor_select) scopes this to notes for children
 *  the instructor can access; we tag each row `mine` so the UI offers
 *  editing only on the caller's own notes. */
export async function fetchNotesForChild(
  client: SupabaseClient<Database>,
  childId: string,
  instructorId: string,
): Promise<NoteView[]> {
  const { data, error } = await client
    .from("pedagogical_notes")
    .select("id, body, created_at, instructor_id")
    .eq("child_id", childId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    body: row.body,
    createdAtDisplay: formatTimestamp(row.created_at),
    mine: row.instructor_id === instructorId,
  }));
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
