// Atlas Assessment — parent satisfaction persistence core.
//
// Lives outside the "use server" action so it's testable with injected mock
// clients (same DI pattern as src/lib/sessionStart/handler.ts). The server
// action (src/app/(parent)/report/feedback-actions.ts) is a thin shell that
// builds the two Supabase clients and calls submitSatisfactionCore.
//
// Ownership chain (mirrors responseSubmit/handler.ts step 5): rlsClient reads
// the calling parent's row, the session, and verifies the session's child is
// owned by that parent via an explicit parent_id eq — closing the dual-role
// (parent-who-is-also-instructor) RLS-OR bypass. The write + analytics emit
// use the service-role client (parent_satisfaction has no client insert
// policy). The write is independent of the consent gate and report
// generation: it touches neither.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { emit } from "./emit";
import { ANALYTICS_EVENTS } from "./events";

export interface SatisfactionInput {
  sessionId: string;
  rating: number;
  comment?: string | null;
}

export type SatisfactionResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_COMMENT_LEN = 2000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitSatisfactionCore({
  rlsClient,
  serviceClient,
  input,
}: {
  rlsClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  input: SatisfactionInput;
}): Promise<SatisfactionResult> {
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

  // --- Auth + ownership.
  const {
    data: { user },
  } = await rlsClient.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in and try again." };
  }

  const { data: parent, error: parentErr } = await rlsClient
    .from("parents")
    .select("id, tenant_id")
    .maybeSingle();
  if (parentErr || !parent) {
    return { ok: false, error: "Could not save your feedback." };
  }

  const { data: session, error: sessionErr } = await rlsClient
    .from("assessment_sessions")
    .select("id, child_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return { ok: false, error: "Could not save your feedback." };
  }

  // Explicit parent_id eq closes the dual-role RLS-OR bypass: a parent who is
  // also an instructor must not rate another family's session.
  const { data: ownedChild, error: childErr } = await rlsClient
    .from("children")
    .select("id")
    .eq("id", session.child_id)
    .eq("parent_id", parent.id)
    .maybeSingle();
  if (childErr || !ownedChild) {
    return { ok: false, error: "Could not save your feedback." };
  }

  // --- Persist (service role). Upsert on session_id so a resubmit replaces
  //     the current rating rather than erroring on the unique constraint.
  const { error: upsertErr } = await serviceClient
    .from("parent_satisfaction")
    .upsert(
      {
        tenant_id: parent.tenant_id,
        parent_id: parent.id,
        child_id: session.child_id,
        session_id: session.id,
        rating: input.rating,
        comment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );
  if (upsertErr) {
    console.error("[satisfaction] upsert failed", {
      sessionId: session.id,
      err: upsertErr.message,
    });
    return { ok: false, error: "Could not save your feedback." };
  }

  // --- Emit (fail-soft, never throws). Comment text is PII-bearing free text
  //     and is intentionally NOT in props — only the rating and a boolean.
  await emit(serviceClient, ANALYTICS_EVENTS.PARENT_SATISFACTION_SUBMITTED, {
    tenantId: parent.tenant_id,
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
