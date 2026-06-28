// Atlas Assessment — narration trigger fired on session completion
// (Item #16 Piece 5).
//
// closeSession (in @/lib/responseSubmit/handler) invokes attemptNarration
// AFTER (c1) status=COMPLETED + completed_at and (c2) persistSessionSummary
// have both succeeded. Calling this function:
//
//   1. Fetches the just-completed session row + the child row (service
//      role; we're post-completion server-side).
//   2. Calls assembleReportContent to produce the ReportContent the
//      narrator consumes.
//   3. Calls generateReportNarration, which either resolves to a 'ok' /
//      'failed' ReportNarration (via the Piece 3 schema gate) or throws
//      on a network/parse failure.
//   4. Upserts the ReportNarration into report_narrations on the session_id
//      PK so a re-completion or retry overwrites cleanly.
//
// FAILURE ISOLATION — attemptNarration NEVER throws. Every step is wrapped
// in try/catch:
//   * Assembly throw → log + return.
//   * generateReportNarration throw (network / JSON.parse) → log + return.
//   * Upsert failure → log + return.
//   * Validation-failed ReportNarration (status:'failed') → still upserted
//     so the audit row exists; no log.
//
// The handler awaits this call and the awaited promise resolves regardless,
// so the (c1)+(c2) success path returns to the route handler cleanly. A
// failed narration leaves the report to render data-only (per the Piece 4
// resolver), which is the existing graceful fallback.
//
// Stub mode (REPORT_NARRATION_LIVE != 'true'): callSonnet returns the stub
// JSON; this trigger still writes a row containing the stub prose so the
// end-to-end wiring is exercisable locally without a live spend.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { assembleReportContent } from "@/lib/report/assemble";
import { generateReportNarration } from "@/lib/report/narration/generate";
import { upsertNarration } from "@/lib/report/narration/persist";
import type { Database } from "@/lib/supabase/database.types";

export async function attemptNarration(
  serviceClient: SupabaseClient<Database>,
  sessionId: string,
): Promise<void> {
  try {
    // 1. Fetch session — needs everything assembleReportContent needs.
    const { data: session, error: sessionErr } = await serviceClient
      .from("assessment_sessions")
      .select(
        "id, tenant_id, child_id, started_at, completed_at, current_estimate, session_time_flag, test_type",
      )
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionErr || !session) {
      console.error("[narration] session lookup failed", {
        sessionId,
        err: sessionErr,
      });
      return;
    }

    // 2. Fetch child.
    const { data: child, error: childErr } = await serviceClient
      .from("children")
      .select("name, birth_year, grade_level")
      .eq("id", session.child_id)
      .maybeSingle();
    if (childErr || !child) {
      console.error("[narration] child lookup failed", {
        sessionId,
        err: childErr,
      });
      return;
    }

    // 3. Assemble + generate.
    const content = await assembleReportContent({
      readClient: serviceClient,
      serviceClient,
      session,
      child,
    });
    const narration = await generateReportNarration(content);

    // 4. Upsert into report_narrations keyed on session_id (PK). On
    // conflict, overwrite — re-completion or retry produces a fresh row
    // rather than erroring. Shared with the report-page self-heal via
    // upsertNarration so the column mapping stays in one place.
    const { error: upsertErr } = await upsertNarration(serviceClient, narration);
    if (upsertErr) {
      console.error("[narration] upsert failed", {
        sessionId,
        err: upsertErr,
      });
      return;
    }

    // 5. Funnel signal: the parent report has been produced for this
    // completed session (data-only render is available even when narration
    // status === "failed", so this fires regardless of narration outcome).
    // Fail-soft and PII-free — emit() never throws; ids only, no names.
    await emit(serviceClient, ANALYTICS_EVENTS.PARENT_REPORT_GENERATED, {
      tenantId: narration.tenant_id,
      childId: session.child_id,
      sessionId: narration.session_id,
    });
  } catch (err) {
    // Catch-all: assembleReportContent throws, generateReportNarration's
    // JSON.parse / callSonnet network error, or anything else. Narration
    // failures must never propagate to the caller (the brief: completion
    // is the critical path; this is a non-critical follow-on).
    console.error("[narration] trigger threw — completion unaffected", {
      sessionId,
      err: err instanceof Error ? err.message : "unknown",
    });
  }
}
