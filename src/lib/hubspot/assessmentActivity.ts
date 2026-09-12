import "server-only";

// Assessment START / COMPLETE as first-class HubSpot ACTIVITY entries.
//
// Why this module exists: the milestone sync in syncContact.ts writes
// `assessment_started_date` / `assessment_completed_date`, and a PROPERTY WRITE
// CREATES NO TIMELINE ACTIVITY. Completion was therefore stored but invisible
// in the Activity feed, which is what stage placement is read from. This emits
// the event itself; the date properties keep being written alongside it.
//
// REPRESENTATION: a NOTE engagement associated to the parent contact.
// Deliberately not the alternatives:
//   * CUSTOM TIMELINE EVENTS (/integrators/timeline/v3) require a HubSpot
//     DEVELOPER APP id and per-app event templates. Atlas authenticates with a
//     PRIVATE APP token, which cannot create them.
//   * CUSTOM BEHAVIORAL EVENTS (/events/v3/send) are Marketing Hub Enterprise
//     only; portal 245446396 is accountType STANDARD (verified live).
// A note works on this portal's tier with the token we already hold, renders in
// Activity, and is queryable through the normal CRM search API.
//
// ONE NOTE PER ATTEMPT PER EVENT. Attempts are NOT collapsed: a re-take is a
// retained event in its own right (founder decision 2026-09-12), so attempt 3's
// START is a separate note from attempt 1's, and nothing here dedupes them.
//
// ---------------------------------------------------------------------------
// PAYLOAD DISCIPLINE (D-0055 / D-0061) — event, time, attempt number. Nothing else.
// `AssessmentActivityEvent` is the entire allowlist: an account id, an event
// discriminator, an attempt number and a timestamp. There is NO field an
// assessed level, band, score or response could travel in, and none must ever
// be added. The note body is hand-built from those four values below — nothing
// is ever serialized wholesale into it.
// ---------------------------------------------------------------------------

import { getHubspotAtlasSyncToken } from "@/lib/env";

import { findContactIdByAtlasAccountId, requestWithRetry } from "./syncContact";

const LOG = "assessment activity";

/**
 * Stable machine-readable markers. A separate CRM agent keys on these to detect
 * an attempt in the Activity feed, so they are a CONTRACT: changing a string
 * here breaks that consumer. See the note in the PR about preferring the
 * `assessment_completed_date` property as the primary queryable signal.
 */
export const ACTIVITY_MARKER = {
  started: "[atlas] assessment_started",
  completed: "[atlas] assessment_completed",
} as const;

export interface AssessmentActivityEvent {
  /** parents.id — the `atlas_account_id` on the HubSpot contact. */
  accountId: string;
  event: "started" | "completed";
  /** 1-based attempt number from the Atlas attempt history. */
  attemptNumber: number;
  /** The TRUE time this attempt started/completed, ISO. Not "now" — a backfilled
   *  or late-delivered event must land on the timeline where it belongs. */
  occurredAt: string;
}

/** Body text. Event, timestamp, attempt number — and an explicit statement that
 *  no result is included, so a human reading the timeline is not left looking
 *  for one. */
export function buildNoteBody(event: AssessmentActivityEvent): string {
  const verb = event.event === "started" ? "started" : "completed";
  return [
    `${ACTIVITY_MARKER[event.event]} · attempt ${event.attemptNumber}`,
    `Atlas assessment attempt ${event.attemptNumber} ${verb}: ${event.occurredAt}`,
    "Assessment results are held in Atlas and are deliberately not included here.",
  ].join("\n");
}

/**
 * Env-gated, fail-soft. UPDATE-ONLY in spirit: when no contact bears this
 * atlas_account_id it logs and returns without creating one. Never throws.
 *
 * Two calls by design — create the note, then associate it. The association
 * uses the v4 DEFAULT endpoint
 * (`/crm/v4/objects/notes/{id}/associations/default/contacts/{id}`), which
 * resolves the note→contact association type SERVER-SIDE. The v3 alternative
 * needs a hardcoded numeric associationTypeId, and an unverified magic number
 * silently producing orphan notes is exactly the failure this repo keeps
 * hitting. An orphan note here is logged, not silent.
 */
export async function syncHubSpotAssessmentActivity(
  event: AssessmentActivityEvent,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend, no call

  const contactId = await findContactIdByAtlasAccountId(token, event.accountId);
  if (!contactId) {
    console.error(`[hubspot] ${LOG}: no contact for atlas_account_id`);
    return;
  }

  const createRes = await requestWithRetry(
    token,
    "POST",
    "/crm/v3/objects/notes",
    {
      properties: {
        // hs_timestamp places the note on the timeline at the TRUE event time.
        hs_timestamp: event.occurredAt,
        hs_note_body: buildNoteBody(event),
      },
    },
    LOG,
  );

  if (!createRes) return; // threw — already logged
  if (!createRes.ok) {
    console.error(`[hubspot] ${LOG}: note create failed`, {
      status: createRes.status,
    });
    return;
  }

  let noteId: string | undefined;
  try {
    const body = (await createRes.json()) as { id?: string };
    noteId = typeof body.id === "string" ? body.id : undefined;
  } catch (e) {
    console.error(`[hubspot] ${LOG}: note create returned malformed JSON`, {
      err: e instanceof Error ? e.message : "unknown",
    });
    return;
  }

  if (!noteId) {
    console.error(`[hubspot] ${LOG}: note create returned no id`);
    return;
  }

  const assocRes = await requestWithRetry(
    token,
    "PUT",
    `/crm/v4/objects/notes/${encodeURIComponent(noteId)}/associations/default/contacts/${encodeURIComponent(contactId)}`,
    undefined,
    LOG,
  );

  if (assocRes && !assocRes.ok) {
    // The note exists but is not on the contact's timeline — the one outcome
    // worth shouting about, because it looks like "nothing happened".
    console.error(`[hubspot] ${LOG}: note created but NOT associated`, {
      status: assocRes.status,
      noteId,
    });
  }
}
