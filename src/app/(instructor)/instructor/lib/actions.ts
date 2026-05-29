"use server";

// Server actions for pedagogical notes. Every action re-runs the auth +
// instructor-identity gate server-side — it never trusts an instructor id
// from the client. Writes go through the RLS-scoped client, so the
// pedagogical_notes insert/update policies are the final authority: a forged
// child id or a child outside the instructor's current center is rejected at
// the database regardless of what reaches this function.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { resolveInstructor } from "./instructor";
import { buildNoteInsert } from "./notes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NoteActionResult = { ok: true } | { ok: false; error: string };

export async function createNote(
  childId: string,
  body: string,
): Promise<NoteActionResult> {
  if (!UUID_RE.test(childId)) return { ok: false, error: "Invalid student." };
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const supabase = await createClient();
  const instructor = await resolveInstructor(supabase);
  if (!instructor) return { ok: false, error: "Not authorised." };

  const { error } = await supabase
    .from("pedagogical_notes")
    .insert(buildNoteInsert(instructor, childId, trimmed));

  if (error) {
    // The most likely cause is the RLS write check failing (child not at
    // the instructor's current center, e.g. during prior-center grace).
    return {
      ok: false,
      error: "Could not save the note for this student.",
    };
  }

  revalidatePath(`/instructor/student/${childId}`);
  return { ok: true };
}

export async function updateNote(
  noteId: string,
  childId: string,
  body: string,
): Promise<NoteActionResult> {
  if (!UUID_RE.test(noteId) || !UUID_RE.test(childId)) {
    return { ok: false, error: "Invalid note." };
  }
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const supabase = await createClient();
  const instructor = await resolveInstructor(supabase);
  if (!instructor) return { ok: false, error: "Not authorised." };

  // The pedagogical_notes_author_update policy restricts UPDATE to the
  // author (instructor_id = app_current_instructor_id()); a non-author's
  // update simply matches zero rows.
  const { error } = await supabase
    .from("pedagogical_notes")
    .update({ body: trimmed })
    .eq("id", noteId);

  if (error) return { ok: false, error: "Could not update the note." };

  revalidatePath(`/instructor/student/${childId}`);
  return { ok: true };
}
