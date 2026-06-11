// Atlas Assessment — instructor usefulness persistence core.
//
// Mirrors src/lib/analytics/satisfaction.ts (the parent-side equivalent) but
// instructor-scoped: the "was this report useful for placement?" capture on
// the instructor student view. Lives outside the "use server" action so it's
// testable with injected mock clients (same DI seam as the assessment
// handlers).
//
// Access chain: rlsClient resolves the calling ACTIVE instructor, reads the
// session (RLS-scoped) for its child_id, and verifies the child is accessible
// to the instructor via an RLS-scoped children read (the same boundary the
// student page relies on — a child outside the instructor's center returns
// no row). The write + analytics emit use the service-role client
// (instructor_usefulness has no client insert policy reachable from a plain
// service write; the RLS insert policy is the production authority, and the
// service client bypasses RLS, so the access check above is the gate).

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { emit } from "./emit";
import { ANALYTICS_EVENTS } from "./events";

export interface InstructorUsefulnessInput {
  sessionId: string;
  rating: number;
  comment?: string | null;
}

export type InstructorUsefulnessResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_COMMENT_LEN = 2000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolved ACTIVE-instructor identity, narrowed to the ids this core needs.
 *  Resolution happens in the thin server action (resolveInstructor); the core
 *  takes it as an argument so it stays testable without the auth seam. */
export interface InstructorUsefulnessIdentity {
  id: string;
  tenant_id: string;
}

export async function submitInstructorUsefulnessCore({
  rlsClient,
  serviceClient,
  instructor,
  input,
}: {
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  instructor: InstructorUsefulnessIdentity;
  input: InstructorUsefulnessInput;
}): Promise<InstructorUsefulnessResult> {
  // --- Validate before any I/O. rating must be an integer 1..5.
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    return { ok: false, error: "Please choose a rating from 1 to 5." };
  }
  if (!UUID_RE.test(input.sessionId)) {
    return { ok: false, error: "Could not save your feedback." };
  }
  const comment = normalizeComment(input.comment);

  // --- Access: read the session (RLS-scoped) for its child, then verify the
  //     child is accessible to this instructor (RLS scopes children to the
  //     instructor's center). A child outside the center returns no row.
  const { data: session, error: sessionErr } = await rlsClient
    .from("assessment_sessions")
    .select("id, child_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return { ok: false, error: "Could not save your feedback." };
  }

  const { data: child, error: childErr } = await rlsClient
    .from("children")
    .select("id")
    .eq("id", session.child_id)
    .maybeSingle();
  if (childErr || !child) {
    return { ok: false, error: "Could not save your feedback." };
  }

  // --- Persist (service role). Upsert on (session_id, instructor_id) so a
  //     resubmit replaces this instructor's current rating rather than
  //     erroring on the unique constraint.
  const { error: upsertErr } = await serviceClient
    .from("instructor_usefulness")
    .upsert(
      {
        tenant_id: instructor.tenant_id,
        instructor_id: instructor.id,
        child_id: session.child_id,
        session_id: session.id,
        rating: input.rating,
        comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,instructor_id" },
    );
  if (upsertErr) {
    console.error("[instructorUsefulness] upsert failed", {
      sessionId: session.id,
      err: upsertErr.message,
    });
    return { ok: false, error: "Could not save your feedback." };
  }

  // --- Emit (fail-soft, never throws). Comment text is PII-bearing free text
  //     and is intentionally NOT in props — only the rating and a boolean.
  await emit(serviceClient, ANALYTICS_EVENTS.INSTRUCTOR_USEFULNESS_SUBMITTED, {
    tenantId: instructor.tenant_id,
    childId: session.child_id,
    sessionId: session.id,
    props: { rating: input.rating, has_comment: comment !== null },
  });

  return { ok: true };
}

function normalizeComment(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_COMMENT_LEN);
}
