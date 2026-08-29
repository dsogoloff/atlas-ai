import "server-only";

// HubSpot "SAM NY Enrollment" deal upsert, driven by Atlas funnel events.
// Sibling of syncContact.ts: env-gated, fail-soft, after()-wrapped by the
// caller, never throws, every failure dead-letters on a [hubspot] line.
//
// ---------------------------------------------------------------------------
// CHILD DATA (D-0055 / D-0061) — hard rule
// Only the derived dealstage and assessment_status are written. NEVER the
// assessed level, band, score, strand mastery or any child result, on the deal
// or on any other HubSpot property. `assessment_status` is a STATUS FLAG
// (Not Started / Started / Completed), not a result — permitted.
//
// As on syncContact.ts the guarantee is structural: DealEventInput carries an
// account id, a full name and an event discriminator. There is no field a
// level could travel in, and none must ever be added.
// ---------------------------------------------------------------------------
//
// ===========================================================================
// ⚠️  READ THIS BEFORE CHANGING THE STAGE CONSTANTS  ⚠️
// ===========================================================================
// This portal REUSED HubSpot's default stage ids under new labels. Two of them
// are actively misleading, and they were verified against the live portal
// (245446396) rather than assumed:
//
//     label                    internal id
//     -----------------------  --------------------
//     New Lead                 appointmentscheduled
//     Atlas Account Created    qualifiedtobuy
//     Assessment Started       presentationscheduled
//     Assessment Completed     decisionmakerboughtin
//     In Conversation          contractsent
//     Class Requested          closedlost        <-- NOT a closed/lost stage
//     Registered iClassPro     closedwon         <-- NOT a closed/won stage
//     Enrolled                 4219340482        <-- the real terminal "won"
//     Not Proceeding           4219340483        <-- the real terminal "lost"
//
// Consequence: "exclude closed-won/closed-lost when looking for an open deal"
// — the natural HubSpot phrasing — would here exclude *Class Requested* and
// *Registered iClassPro*, which are mid-funnel and very much open. It would
// also make the brief's own acceptance case fail: an enroll-first family at
// "Registered iClassPro" who later assesses would not be found, and a SECOND
// deal would be created for them. The terminal stages are Enrolled and Not
// Proceeding, and those are the ONLY two treated as closed here.
// ===========================================================================

import { getHubspotAtlasSyncToken } from "@/lib/env";

import {
  findContactIdByAtlasAccountId,
  requestWithRetry,
  splitName,
} from "./syncContact";

const LOG = "deal sync";

/** The one pipeline this module ever touches ("SAM NY Enrollment Pipeline"). */
const PIPELINE_ID = "default";

/** Stage ids, read from the live portal. Never labels — labels are editable
 *  in the HubSpot UI and would silently stop matching. */
export const STAGE = {
  newLead: "appointmentscheduled",
  atlasAccountCreated: "qualifiedtobuy",
  assessmentStarted: "presentationscheduled",
  assessmentCompleted: "decisionmakerboughtin",
  inConversation: "contractsent",
  classRequested: "closedlost",
  registeredIClassPro: "closedwon",
  enrolled: "4219340482",
  notProceeding: "4219340483",
} as const;

/**
 * Canonical funnel order, low to high. Used ONLY for the forward-only check.
 * A stage absent from this list (including "Not Proceeding") has no rank and
 * is never advanced past — see `shouldAdvance`.
 */
const STAGE_ORDER: readonly string[] = [
  STAGE.newLead,
  STAGE.atlasAccountCreated,
  STAGE.assessmentStarted,
  STAGE.assessmentCompleted,
  STAGE.inConversation,
  STAGE.classRequested,
  STAGE.registeredIClassPro,
  STAGE.enrolled,
];

/** The only genuinely finished stages. See the banner above — NOT the ids
 *  literally named closedwon/closedlost. */
const TERMINAL_STAGES: ReadonlySet<string> = new Set([
  STAGE.enrolled,
  STAGE.notProceeding,
]);

/** The three events Atlas can observe. */
export type DealEvent =
  | "account_created"
  | "assessment_started"
  | "assessment_completed";

const EVENT_STAGE: Record<DealEvent, string> = {
  account_created: STAGE.atlasAccountCreated,
  assessment_started: STAGE.assessmentStarted,
  assessment_completed: STAGE.assessmentCompleted,
};

/**
 * assessment_status per event. `account_created` leaves it UNCHANGED (null) —
 * an enroll-first family may already be Started/Completed and account creation
 * must not reset that.
 */
const EVENT_STATUS: Record<DealEvent, "Started" | "Completed" | null> = {
  account_created: null,
  assessment_started: "Started",
  assessment_completed: "Completed",
};

/** Deal→Contact association (HubSpot-defined type id 3). */
const DEAL_TO_CONTACT_TYPE_ID = 3;

/**
 * Everything this module may hold. No child field of any kind; no level, band
 * or score can be expressed here.
 */
export interface DealEventInput {
  /** parents.id (uuid) — the key used to find the parent's contact. */
  accountId: string;
  /** parents.name; the deal is named "<last name> family". */
  parentFullName: string;
  event: DealEvent;
}

interface OpenDeal {
  id: string;
  stage: string;
}

/**
 * Create or advance the family's Enrollment deal for one Atlas event.
 *
 * Requires an existing consented parent CONTACT (matched on atlas_account_id,
 * created only at email confirmation). If no contact exists, nothing is
 * written and no deal is created — same "no consent, no record" rule as the
 * milestone sync.
 *
 * Never throws. Env-gated: no fetch at all when HUBSPOT_ATLAS_SYNC_TOKEN is
 * unset.
 */
export async function syncHubSpotEnrollmentDeal(
  input: DealEventInput,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend

  const contactId = await findContactIdByAtlasAccountId(token, input.accountId);
  if (!contactId) return; // logged; no contact => no consent => no deal

  const existing = await findOpenDeal(token, contactId);
  if (existing === "error") return; // logged — do NOT create on an error path

  if (existing === undefined) {
    await createDeal(token, contactId, input);
    return;
  }
  await advanceDeal(token, existing, input);
}

// ===========================================================================
// FIND — the parent's open deal in this pipeline
// ===========================================================================

/**
 * Returns the single open deal, `undefined` when there is genuinely none, or
 * the sentinel `"error"` when we could not tell. The sentinel matters: on a
 * transport failure we must NOT fall through and create a duplicate deal.
 */
async function findOpenDeal(
  token: string,
  contactId: string,
): Promise<OpenDeal | undefined | "error"> {
  const res = await requestWithRetry(
    token,
    "POST",
    "/crm/v3/objects/deals/search",
    {
      filterGroups: [
        {
          filters: [{ propertyName: "pipeline", operator: "EQ", value: PIPELINE_ID }],
          // Association filter — the deal must belong to THIS parent.
          associations: [{ objectType: "contacts", operator: "EQUAL", objectIds: [contactId] }],
        },
      ],
      properties: ["dealstage", "pipeline"],
      limit: 100,
    },
    LOG,
  );

  if (!res) return "error"; // threw — already logged
  if (!res.ok) {
    console.error("[hubspot] deal search failed", { status: res.status });
    return "error";
  }

  let results: Array<{ id?: string; properties?: Record<string, unknown> }>;
  try {
    const body = (await res.json()) as {
      results?: Array<{ id?: string; properties?: Record<string, unknown> }>;
    };
    results = body.results ?? [];
  } catch (e) {
    console.error("[hubspot] deal search returned malformed JSON", {
      err: e instanceof Error ? e.message : "unknown",
    });
    return "error";
  }

  const open: OpenDeal[] = [];
  for (const row of results) {
    const id = typeof row.id === "string" ? row.id : undefined;
    const stage = row.properties?.dealstage;
    if (!id || typeof stage !== "string") continue;
    if (TERMINAL_STAGES.has(stage)) continue; // Enrolled / Not Proceeding only
    open.push({ id, stage });
  }

  if (open.length === 0) return undefined;
  if (open.length > 1) {
    // Exactly one open deal per family is the invariant. Two means someone
    // created one by hand; advancing an arbitrary one would be a guess, and
    // creating another would compound it.
    console.error("[hubspot] multiple open deals for one contact — skipping", {
      count: open.length,
    });
    return "error";
  }
  return open[0];
}

// ===========================================================================
// CREATE
// ===========================================================================

/** "<last name> family", per the brief. Falls back to the first name, then a
 *  neutral label, so a single-token or blank name never yields " family". */
export function dealNameFor(parentFullName: string): string {
  const { firstname, lastname } = splitName(parentFullName);
  const base = lastname || firstname;
  return base ? `${base} family` : "Atlas family";
}

async function createDeal(
  token: string,
  contactId: string,
  input: DealEventInput,
): Promise<void> {
  const status = EVENT_STATUS[input.event];
  const properties: Record<string, string> = {
    dealname: dealNameFor(input.parentFullName),
    pipeline: PIPELINE_ID,
    dealstage: EVENT_STAGE[input.event],
    entry_path: "Assessment",
  };
  // A brand-new assessment-path deal has not started an assessment yet when
  // the trigger is account creation.
  properties.assessment_status = status ?? "Not Started";

  const res = await requestWithRetry(
    token,
    "POST",
    "/crm/v3/objects/deals",
    {
      properties,
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: DEAL_TO_CONTACT_TYPE_ID,
            },
          ],
        },
      ],
    },
    LOG,
  );

  if (!res) return; // already logged
  if (!res.ok) {
    console.error("[hubspot] deal create failed", {
      status: res.status,
      event: input.event,
    });
  }
}

// ===========================================================================
// ADVANCE — forward-only on stage, always-set on status
// ===========================================================================

/**
 * Forward-only. Advance only when BOTH stages are ranked and the current rank
 * is strictly lower. An unranked current stage (a manual/custom stage, or
 * "Not Proceeding") is never moved — we cannot tell advance from downgrade,
 * so we leave it alone. This is what keeps In Conversation / Class Requested /
 * Registered iClassPro / Enrolled — the manual stages Atlas has no signal for
 * — safe from being dragged backward.
 */
export function shouldAdvance(currentStage: string, targetStage: string): boolean {
  const from = STAGE_ORDER.indexOf(currentStage);
  const to = STAGE_ORDER.indexOf(targetStage);
  if (from === -1 || to === -1) return false;
  return from < to;
}

async function advanceDeal(
  token: string,
  deal: OpenDeal,
  input: DealEventInput,
): Promise<void> {
  const properties: Record<string, string> = {};

  // assessment_status is set on EVERY event that carries one, regardless of
  // stage — it is the cross-path dimension that must always stay accurate.
  const status = EVENT_STATUS[input.event];
  if (status) properties.assessment_status = status;

  const target = EVENT_STAGE[input.event];
  if (shouldAdvance(deal.stage, target)) properties.dealstage = target;

  if (Object.keys(properties).length === 0) return; // nothing to do — no call

  const res = await requestWithRetry(
    token,
    "PATCH",
    `/crm/v3/objects/deals/${encodeURIComponent(deal.id)}`,
    { properties },
    LOG,
  );

  if (!res) return; // already logged
  if (!res.ok) {
    console.error("[hubspot] deal update failed", {
      status: res.status,
      event: input.event,
    });
  }
}
