import "server-only";

// One seam, called from both assessment handlers, that turns an Atlas
// start/complete into its three HubSpot effects:
//
//   1. the milestone DATE PROPERTIES (latest-wins) + first-attempt dates and
//      attempt count (schema-gated),
//   2. the ACTIVITY entry for this attempt (a note engagement),
//   3. the child FIRST NAME + GRADE fields.
//
// Why one function instead of three calls per handler: the attempt number and
// the attempt summary must be derived from the SAME history read, or a start
// and its completion could disagree about which attempt they belong to.
//
// TIMESTAMPS ARE READ BACK, NOT INVENTED. The handlers used to pass
// `new Date().toISOString()`. This reads `started_at` / `completed_at` off the
// session row instead, so every event carries the attempt's TRUE time. That is
// what makes a late-delivered or backfilled event land in the right place on
// the timeline, and it is why a re-take never rewrites an earlier attempt's
// history — each attempt keeps its own instants.
//
// ---------------------------------------------------------------------------
// COMPLIANCE (D-0055 / D-0061). Assessment level, band, score and responses
// NEVER reach HubSpot; results live only in Atlas. This module reads attempt
// history — which DOES carry the assessed level for the Atlas-only staff view —
// and narrows it through `toCrmSummary()` BEFORE anything crosses into a
// src/lib/hubspot module. Never hand an `AssessmentAttempt` to a sync.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchAttemptHistory,
  toCrmSummary,
  type AssessmentAttempt,
} from "@/lib/assessmentHistory/attempts";
import type { Database } from "@/lib/supabase/database.types";

import { syncHubSpotAssessmentActivity } from "./assessmentActivity";
import { syncHubSpotChildFields, type ChildCrmRecord } from "./childFields";
import { syncHubSpotAssessmentMilestone } from "./syncContact";

const LOG = "assessment event";

export interface AssessmentEventInput {
  serviceClient: SupabaseClient<Database>;
  /** parents.id — becomes `atlas_account_id`. */
  parentId: string;
  childId: string;
  /** The session this event belongs to; fixes the attempt number. */
  sessionId: string;
  event: "started" | "completed";
}

/** Reads the account's children for the child-field sync, OLDEST FIRST so slot
 *  1 is stable and a new sibling never renumbers an existing one. Grade and
 *  first name only — no birth year, no DOB. */
async function readChildren(
  client: SupabaseClient<Database>,
  parentId: string,
): Promise<ChildCrmRecord[]> {
  const { data, error } = await client
    .from("children")
    .select("name, grade_level, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({ firstName: row.name, grade: row.grade_level }));
}

/** The attempt's own true instant for this event. */
function occurredAtFor(
  attempt: AssessmentAttempt,
  event: AssessmentEventInput["event"],
): string | null {
  return event === "started" ? attempt.startedAt : attempt.completedAt;
}

/**
 * Fail-soft end to end: every sync already swallows its own failures, and this
 * wrapper additionally never throws, so a HubSpot outage can never affect a
 * child's ability to start or finish an assessment. Intended to be called
 * inside `after()`.
 */
export async function emitAssessmentEvent(
  input: AssessmentEventInput,
): Promise<void> {
  const { serviceClient, parentId, childId, sessionId, event } = input;

  let attempts: AssessmentAttempt[];
  try {
    attempts = await fetchAttemptHistory(serviceClient, childId);
  } catch (e) {
    console.error(`[hubspot] ${LOG}: attempt history read threw`, {
      err: e instanceof Error ? e.message : "unknown",
    });
    return;
  }

  const attempt = attempts.find((a) => a.sessionId === sessionId);
  if (!attempt) {
    // Unknown attempt number. Deliberately emit NOTHING rather than guess "1":
    // a mislabelled attempt number is worse than a missing event, because a
    // consumer cannot tell it is wrong.
    console.error(`[hubspot] ${LOG}: session not found in attempt history`);
    return;
  }

  const occurredAt = occurredAtFor(attempt, event);
  if (occurredAt === null) {
    console.error(`[hubspot] ${LOG}: attempt has no timestamp for event`, {
      event,
    });
    return;
  }

  // Narrowed HERE — counts and timestamps only from this point on.
  const summary = toCrmSummary(attempts);
  const children = await readChildren(serviceClient, parentId);

  await Promise.all([
    syncHubSpotAssessmentMilestone({
      accountId: parentId,
      milestone: event,
      occurredAt,
      attempt: {
        attemptCount: summary.attemptCount,
        firstStartedAt: summary.firstStartedAt,
        firstCompletedAt: summary.firstCompletedAt,
      },
    }).catch(() => undefined),
    syncHubSpotAssessmentActivity({
      accountId: parentId,
      event,
      attemptNumber: attempt.attemptNumber,
      occurredAt,
    }).catch(() => undefined),
    syncHubSpotChildFields({ accountId: parentId, children }).catch(
      () => undefined,
    ),
  ]);
}
