"use server";

// Server actions for pedagogical notes. Every action re-runs the auth +
// instructor-identity gate server-side — it never trusts an instructor id
// from the client. Writes go through the RLS-scoped client, so the
// pedagogical_notes insert/update policies are the final authority: a forged
// child id or a child outside the instructor's current center is rejected at
// the database regardless of what reaches this function.

import { revalidatePath } from "next/cache";

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  submitInstructorUsefulnessCore,
  type InstructorUsefulnessInput,
  type InstructorUsefulnessResult,
} from "@/lib/analytics/instructorUsefulness";
import { createClient, createServiceClient } from "@/lib/supabase/server";

import { requireStaffAal2Action } from "@/lib/auth/staffActionGate";
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
  // ATLAS-007: a POST must fail CLOSED. A server action is directly invokable,
  // so it can never rely on the page's redirect or the middleware prefix gate.
  if (!(await requireStaffAal2Action(supabase))) {
    return { ok: false, error: "Not authorised." };
  }
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
  // ATLAS-007: a POST must fail CLOSED. A server action is directly invokable,
  // so it can never rely on the page's redirect or the middleware prefix gate.
  if (!(await requireStaffAal2Action(supabase))) {
    return { ok: false, error: "Not authorised." };
  }
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

/**
 * Fire instructor_report_viewed when an instructor opens a student's report.
 * Best-effort and fail-soft (mirrors recordReportViewed on the parent side):
 * resolves the ACTIVE instructor, verifies the session is accessible to them
 * (RLS scopes the read to the instructor's center), and silently no-ops
 * otherwise. Never throws. PII-free.
 */
export async function recordInstructorReportViewed(
  sessionId: string,
): Promise<void> {
  try {
    if (!UUID_RE.test(sessionId)) return;

    const rls = await createClient();
    // ATLAS-007: fail closed before any service-client emit.
    if (!(await requireStaffAal2Action(rls))) return;
    const instructor = await resolveInstructor(rls);
    if (!instructor) return;

    // RLS scopes this read to sessions for children at the instructor's
    // center; a session outside that scope returns no row.
    const { data: session } = await rls
      .from("assessment_sessions")
      .select("id, child_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return;

    await emit(createServiceClient(), ANALYTICS_EVENTS.INSTRUCTOR_REPORT_VIEWED, {
      tenantId: instructor.tenant_id,
      childId: session.child_id,
      sessionId: session.id,
    });
  } catch (e) {
    console.error("[analytics] recordInstructorReportViewed threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}

/**
 * Persist an instructor's "was this report useful for placement?" rating and
 * emit instructor_usefulness_submitted. Thin shell over
 * submitInstructorUsefulnessCore (testable core in
 * src/lib/analytics/instructorUsefulness.ts): resolve the ACTIVE instructor,
 * then delegate validation + access check + upsert + emit.
 */
export async function submitInstructorUsefulness(
  input: InstructorUsefulnessInput,
): Promise<InstructorUsefulnessResult> {
  const rlsClient = await createClient();
  // ATLAS-007: fail closed before any service-client write.
  if (!(await requireStaffAal2Action(rlsClient))) {
    return { ok: false, error: "Not authorised." };
  }
  const instructor = await resolveInstructor(rlsClient);
  if (!instructor) return { ok: false, error: "Not authorised." };

  return submitInstructorUsefulnessCore({
    rlsClient,
    serviceClient: createServiceClient(),
    instructor: { id: instructor.id, tenant_id: instructor.tenant_id },
    input,
  });
}
