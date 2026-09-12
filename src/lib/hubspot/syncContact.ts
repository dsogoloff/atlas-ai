import "server-only";

// HubSpot Contract A — account-level parent contact sync, fired once on the
// FIRST email confirmation (src/app/auth/confirm/route.ts). Structural sibling
// of src/lib/staffAlerts/notify.ts: typed allowlist, fail-soft, after()-wrapped
// by the caller, never throws.
//
// ---------------------------------------------------------------------------
// COPPA / ZERO-CHILD-DATA PAYLOAD DISCIPLINE (mirrors staffAlerts/notify.ts).
// This module is ACCOUNT-LEVEL ONLY. `AccountCreatedContact` below is the
// entire allowlist — it has no child field of any kind (no name, no grade, no
// DOB) and MUST NEVER grow one. The payload builders below hand-copy exactly
// the HubSpot property names in the field contract; nothing is ever
// serialized wholesale, and nothing assessment/placement/level-shaped is
// reachable from this module's inputs. See CLAUDE.md guardrails 1-3.
//
// Do not add a "just in case" runtime filter for child data — the type is
// structurally incapable of carrying it, and that IS the guarantee.
// ---------------------------------------------------------------------------

import type { Attribution } from "@/lib/marketing/attribution";
import { UTM_KEYS } from "@/lib/marketing/attribution";
import {
  getHubspotAtlasSyncToken,
  isHubspotAttemptPropertiesLive,
} from "@/lib/env";

export const HUBSPOT_API_BASE = "https://api.hubapi.com";

/** Real delay in ms before the single 5xx retry. Runs inside after() — never
 *  on the request path — so a real wait is fine (see env.ts docblock). */
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Public contract
// =============================================================================

/**
 * The ONLY fields this module may hold or forward. Structural guarantee, not
 * a runtime filter: this type has no child field of any kind, and none must
 * ever be added.
 */
export interface AccountCreatedContact {
  email: string;
  /** Split into firstname/lastname (first-space rule) when building the payload. */
  fullName: string;
  /** parents.id (uuid). */
  accountId: string;
  /** parents.created_at, ISO string in — converted to epoch millis on write. */
  createdAt: string;
  /** From src/lib/marketing/attribution.ts — utm_* + first_seen. Only the
   *  five utm_* keys are ever forwarded; first_seen never leaves this module. */
  attribution?: Attribution | null;
}

/** Which assessment lifecycle timestamp is being recorded. */
export type AssessmentMilestone = "started" | "completed";

/**
 * D-0061 — assessment lifecycle TIMESTAMPS on an existing parent contact.
 *
 * D-0055 permits child first name + grade in HubSpot; D-0061 amends it to also
 * permit these two timestamps and NOTHING else from the assessment. The
 * assessed LEVEL, band, score, strand mastery and raw responses stay out —
 * that number is proprietary and HubSpot does not need it.
 *
 * The guarantee is structural, exactly as on AccountCreatedContact: this type
 * carries an account id, a milestone discriminator and an instant. There is no
 * field a level could travel in, and none must ever be added. A "just in case"
 * runtime filter would be weaker than the type.
 */
export interface AssessmentMilestoneUpdate {
  /** parents.id (uuid). The ONLY key used to match an existing contact. */
  accountId: string;
  milestone: AssessmentMilestone;
  /** ISO instant of the milestone — converted to epoch millis on write. */
  occurredAt: string;
  /**
   * Attempt-history summary for this child's parent. OPTIONAL: omitted, the
   * write behaves exactly as before (latest-attempt dates only).
   *
   * COUNTS AND TIMESTAMPS ONLY. `AttemptCrmSummary` from
   * src/lib/assessmentHistory/attempts.ts is assignable to this, and that is
   * the intended producer. There is no field an assessed level, band or score
   * could travel in, and none must ever be added (D-0055 / D-0061).
   */
  attempt?: {
    /** Number of COMPLETED attempts. */
    attemptCount: number;
    firstStartedAt: string | null;
    firstCompletedAt: string | null;
  };
}

/**
 * Env-gated, fail-soft upsert of one account-level HubSpot contact. No-ops
 * immediately (no fetch at all) when HUBSPOT_ATLAS_SYNC_TOKEN is unset/blank.
 * Never throws or rejects under ANY code path — every fetch is wrapped in its
 * own try/catch, and failures dead-letter via console.error, matching
 * staffAlerts/notify.ts. Callers additionally `.catch(() => undefined)` this
 * as belt-and-suspenders, but must not need to.
 */
export async function syncHubSpotContact(
  contact: AccountCreatedContact,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend, no call

  const email = contact.email.toLowerCase();
  const createProperties = buildCreateProperties(contact);

  const createRes = await requestWithRetry(token, "POST", "/crm/v3/objects/contacts", {
    properties: createProperties,
  });

  if (!createRes) return; // already logged by requestWithRetry
  if (createRes.status === 201) return; // created — done

  if (createRes.status === 409) {
    await upsertExisting(token, email, contact);
    return;
  }

  // Any other 4xx (or an already-exhausted-retry 5xx) — log and give up.
  console.error("[hubspot] contact create failed", { status: createRes.status });
}

// =============================================================================
// D-0061 — assessment milestone timestamps. UPDATE-ONLY, NEVER CREATE.
// =============================================================================

/**
 * Write one assessment timestamp onto an ALREADY-EXISTING parent contact.
 *
 * NO CONSENT, NO RECORD. This function can only ever PATCH. It matches on
 * `atlas_account_id` and, when no contact carries that id, it logs and returns
 * — it has no create path at all. That matters because the contact is created
 * exclusively on first EMAIL CONFIRMATION (auth/confirm/route.ts), which is
 * the consent gate: "a contact with this atlas_account_id exists" IS the proof
 * that a consented parent account exists. An anonymous or account-less
 * assessment session therefore cannot produce a HubSpot record, because the
 * only branch that writes requires a contact to already be there.
 *
 * Matching is by `atlas_account_id`, never by email: email is mutable and a
 * shared/typo'd address could collide onto the wrong family's record.
 *
 * Env-gated and fail-soft like syncHubSpotContact — no fetch at all when
 * HUBSPOT_ATLAS_SYNC_TOKEN is unset, and never throws under any path. Every
 * failure dead-letters through a `[hubspot]`-prefixed console.error.
 */
export async function syncHubSpotAssessmentMilestone(
  update: AssessmentMilestoneUpdate,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend, no call

  const contactId = await findContactIdByAtlasAccountId(token, update.accountId);
  if (!contactId) return; // already logged — and DELIBERATELY no create path

  const property = MILESTONE_PROPERTY[update.milestone];
  const patchRes = await requestWithRetry(
    token,
    "PATCH",
    `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`,
    { properties: buildMilestoneProperties(update, property) },
  );

  if (!patchRes) return; // already logged
  if (!patchRes.ok) {
    console.error("[hubspot] assessment milestone update failed", {
      milestone: update.milestone,
      status: patchRes.status,
    });
  }
}

/**
 * Resolve a contact id from `atlas_account_id` via the v3 search endpoint.
 * Returns undefined — after logging — when there is no match, when the match
 * is ambiguous, or on any transport/parse failure. Undefined always means
 * "do not write", never "create one".
 */
export async function findContactIdByAtlasAccountId(
  token: string,
  accountId: string,
): Promise<string | undefined> {
  const res = await requestWithRetry(token, "POST", "/crm/v3/objects/contacts/search", {
    filterGroups: [
      {
        filters: [
          { propertyName: "atlas_account_id", operator: "EQ", value: accountId },
        ],
      },
    ],
    properties: ["atlas_account_id"],
    limit: 2, // 2 is enough to detect ambiguity without paging
  });

  if (!res) return undefined; // threw — already logged
  if (!res.ok) {
    console.error("[hubspot] assessment milestone contact search failed", {
      status: res.status,
    });
    return undefined;
  }

  let results: Array<{ id?: string }>;
  try {
    const body = (await res.json()) as { results?: Array<{ id?: string }> };
    results = body.results ?? [];
  } catch (e) {
    console.error("[hubspot] assessment milestone search returned malformed JSON", {
      err: e instanceof Error ? e.message : "unknown",
    });
    return undefined;
  }

  if (results.length === 0) {
    // The expected, healthy no-op: no consented parent contact for this
    // account, so nothing is written and nothing is created.
    console.error("[hubspot] assessment milestone skipped — no contact for atlas_account_id");
    return undefined;
  }
  if (results.length > 1) {
    console.error("[hubspot] assessment milestone skipped — atlas_account_id is ambiguous", {
      matches: results.length,
    });
    return undefined;
  }

  const id = results[0]?.id;
  if (typeof id !== "string" || id === "") {
    console.error("[hubspot] assessment milestone search returned no id");
    return undefined;
  }
  return id;
}

// =============================================================================
// 409 path — read current values, PATCH with set-if-empty / advance-only rules
// =============================================================================

async function upsertExisting(
  token: string,
  email: string,
  contact: AccountCreatedContact,
): Promise<void> {
  let getRes: Response;
  try {
    // Single-object GET (/crm/v3/objects/{objectType}/{objectId}) takes a
    // single comma-separated `properties` value, NOT repeated `properties=`
    // params — that repeated-param form is the v3 SEARCH endpoint's
    // convention. Every property buildPatchProperties() inspects below must
    // be listed here, or HubSpot's DEFAULT property set silently omits it
    // and the set-if-empty logic mistakes "not requested" for "empty",
    // clobbering real values (e.g. a live utm_content placement tag).
    const params = new URLSearchParams({
      idProperty: "email",
      properties: GET_PROPERTIES.join(","),
    });
    getRes = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${encodeURIComponent(email)}?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  } catch (e) {
    console.error("[hubspot] contact lookup threw", {
      err: e instanceof Error ? e.message : "unknown",
    });
    return;
  }

  if (!getRes.ok) {
    console.error("[hubspot] contact lookup failed", { status: getRes.status });
    return;
  }

  let existing: Record<string, unknown> = {};
  let contactId: string | undefined;
  try {
    const body = (await getRes.json()) as {
      id?: string;
      properties?: Record<string, unknown>;
    };
    existing = body.properties ?? {};
    contactId = typeof body.id === "string" ? body.id : undefined;
  } catch (e) {
    console.error("[hubspot] contact lookup returned malformed JSON", {
      err: e instanceof Error ? e.message : "unknown",
    });
    return;
  }

  if (!contactId) {
    console.error("[hubspot] contact lookup returned no id", { email });
    return;
  }

  const patchProperties = buildPatchProperties(contact, existing);

  const patchRes = await requestWithRetry(
    token,
    "PATCH",
    `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`,
    { properties: patchProperties },
  );

  if (!patchRes) return; // already logged
  if (!patchRes.ok) {
    console.error("[hubspot] contact update failed", { status: patchRes.status });
  }
}

// =============================================================================
// HTTP — single 5xx retry, never throws
// =============================================================================

/**
 * POST/PATCH/PUT with exactly one retry on a 5xx (after RETRY_DELAY_MS), and no
 * retry on anything else. Returns the final Response, or undefined when every
 * attempt threw (already logged) — callers must check for undefined before
 * reading `.status`.
 *
 * PUT is here for the v4 default-association endpoint used by
 * assessmentActivity.ts, which takes no request body.
 */
export async function requestWithRetry(
  token: string,
  method: "POST" | "PATCH" | "PUT",
  path: string,
  body: unknown,
  /** Log context, so the deal sync's failures are distinguishable from the
   *  contact sync's in the Vercel logs. Default preserves the original
   *  strings exactly. */
  label = "contact sync",
): Promise<Response | undefined> {
  const attempt = async (): Promise<Response | undefined> => {
    try {
      return await fetch(`${HUBSPOT_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // The v4 association endpoint is a bodyless PUT; sending "undefined"
        // as a literal body string would 400 it.
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      console.error(`[hubspot] ${label} request threw`, {
        method,
        err: e instanceof Error ? e.message : "unknown",
      });
      return undefined;
    }
  };

  const first = await attempt();
  if (!first) return undefined; // threw — already logged, no retry
  if (first.status < 500) return first; // 2xx/3xx/4xx — no retry

  // 5xx — retry once after a short delay.
  await delay(RETRY_DELAY_MS);
  const second = await attempt();
  if (!second) return undefined; // threw on retry — already logged
  if (second.status >= 500) {
    console.error(`[hubspot] ${label} failed after retry`, {
      method,
      status: second.status,
    });
  }
  return second;
}

// =============================================================================
// Payload builders — the field contract, in full. Every key written to
// HubSpot is enumerated here; nothing else can ever reach the wire.
// =============================================================================

const SAM_SOURCE = "atlas_assessment";
const CONTACT_CATEGORY = "prospect_parent";
const NEW_LIFECYCLE_STAGE = "lead";

/**
 * D-0061 typed whitelist: the ONLY two HubSpot properties the assessment
 * milestone path may write, and the complete mapping from milestone to
 * property. `satisfies` pins the value type so a property name cannot be
 * mistyped, and the Record<AssessmentMilestone, …> key type means adding a
 * third milestone is a compile error until it is deliberately mapped here.
 *
 * Nothing level-, band- or score-shaped appears in this map, and nothing may
 * be added to it without amending D-0061.
 */
/**
 * The milestone patch body.
 *
 * `assessment_started_date` / `assessment_completed_date` stay LATEST-WINS by
 * design: a re-take legitimately restamps them, and staff asked for the most
 * recent attempt to be what the CRM shows (founder decision 2026-09-12). The
 * FIRST-attempt values are carried separately so nothing is lost.
 *
 * The three attempt properties are withheld unless
 * HUBSPOT_ATTEMPT_PROPERTIES_LIVE === 'true', because they do not exist in the
 * portal yet and ONE unknown property rejects the WHOLE patch — which would
 * break the latest-date writes that work today. See the env docblock.
 */
/**
 * The three attempt-history contact properties, PENDING FOUNDER APPROVAL and
 * not yet created in portal 245446396. Single source of truth: the backfill
 * script imports this rather than redeclaring the names, so approving a
 * different name is a one-line change in one place.
 */
export const ATTEMPT_PROPERTIES = {
  firstStartedAt: "first_assessment_started_date",
  firstCompletedAt: "first_assessment_completed_date",
  attemptCount: "assessment_attempt_count",
} as const satisfies Record<string, string>;

export function buildMilestoneProperties(
  update: AssessmentMilestoneUpdate,
  property: string,
): Record<string, string | number> {
  const properties: Record<string, string | number> = {
    [property]: toEpochMillis(update.occurredAt),
  };

  const { attempt } = update;
  if (!attempt || !isHubspotAttemptPropertiesLive()) return properties;

  properties[ATTEMPT_PROPERTIES.attemptCount] = attempt.attemptCount;
  if (attempt.firstStartedAt !== null) {
    properties[ATTEMPT_PROPERTIES.firstStartedAt] = toEpochMillis(
      attempt.firstStartedAt,
    );
  }
  if (attempt.firstCompletedAt !== null) {
    properties[ATTEMPT_PROPERTIES.firstCompletedAt] = toEpochMillis(
      attempt.firstCompletedAt,
    );
  }
  return properties;
}

const MILESTONE_PROPERTY = {
  started: "assessment_started_date",
  completed: "assessment_completed_date",
} as const satisfies Record<AssessmentMilestone, string>;

/** Every property the set-if-empty / advance-only logic in
 *  buildPatchProperties() inspects on the existing contact. Passed as the
 *  409-lookup GET's `properties` query param — HubSpot's single-object GET
 *  only returns its small DEFAULT set otherwise, and a property missing from
 *  the response (never requested) is indistinguishable from one that's
 *  genuinely empty in HubSpot, which would make set-if-empty overwrite it. */
const GET_PROPERTIES = [
  "firstname",
  "lastname",
  "contact_category",
  "lifecyclestage",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/** HubSpot's standard lifecycle-stage order, low to high. `lifecycleRank`
 *  returns `undefined` for any value outside this ladder (including a real,
 *  populated HubSpot-only custom stage) — callers must treat "unrecognized"
 *  as its own case, never coerce it to a rank, or an unknown-but-real
 *  existing stage gets silently overwritten (that coercion was the bug). */
const LIFECYCLE_STAGE_RANK: Record<string, number> = {
  subscriber: 1,
  lead: 2,
  marketingqualifiedlead: 3,
  salesqualifiedlead: 4,
  opportunity: 5,
  customer: 6,
  evangelist: 7,
  other: 8,
};

function lifecycleRank(value: string): number | undefined {
  return LIFECYCLE_STAGE_RANK[value];
}

/**
 * Split a stored full name into HubSpot's firstname/lastname.
 *
 * Trimming the WHOLE string is not enough: `parents.name` is built as
 * `${firstName} ${lastName}`.trim(), which strips only the ends. A trailing
 * space typed into the signup first-name box survives as an INTERIOR double
 * space — "Yara  Kasovitz" — and splitting on the first space then yields
 * `lastname: " Kasovitz"`. That exact value is live on a real contact today.
 *
 * Splitting on a whitespace RUN, and trimming each part, makes the output
 * insensitive to leading, trailing, doubled and tab whitespace alike.
 */
export function splitName(fullName: string): { firstname: string; lastname: string } {
  const trimmed = fullName.trim();
  const match = /\s+/.exec(trimmed);
  if (!match) return { firstname: trimmed, lastname: "" };
  return {
    firstname: trimmed.slice(0, match.index).trim(),
    lastname: trimmed.slice(match.index + match[0].length).trim(),
  };
}

function toEpochMillis(isoCreatedAt: string): number {
  return new Date(isoCreatedAt).getTime();
}

function isEmptyExisting(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function presentUtmEntries(
  attribution: Attribution | null | undefined,
): Array<[(typeof UTM_KEYS)[number], string]> {
  if (!attribution) return [];
  const entries: Array<[(typeof UTM_KEYS)[number], string]> = [];
  for (const key of UTM_KEYS) {
    const value = attribution[key];
    if (typeof value === "string" && value !== "") entries.push([key, value]);
  }
  return entries;
}

/** Full payload for a fresh POST create. */
function buildCreateProperties(
  contact: AccountCreatedContact,
): Record<string, string | number> {
  const { firstname, lastname } = splitName(contact.fullName);
  const properties: Record<string, string | number> = {
    email: contact.email.toLowerCase(),
    firstname,
    lastname,
    lifecyclestage: NEW_LIFECYCLE_STAGE,
    sam_source: SAM_SOURCE,
    contact_category: CONTACT_CATEGORY,
    atlas_account_created_date: toEpochMillis(contact.createdAt),
    atlas_account_id: contact.accountId,
  };
  for (const [key, value] of presentUtmEntries(contact.attribution)) {
    properties[key] = value;
  }
  return properties;
}

/**
 * Reduced payload for the 409-upsert PATCH. `sam_source` is NEVER
 * constructed here under any input — first-touch-only is enforced by this
 * builder simply never having a code path that adds the key, not by a
 * conditional that could be gotten wrong.
 */
function buildPatchProperties(
  contact: AccountCreatedContact,
  existing: Record<string, unknown>,
): Record<string, string | number> {
  const { firstname, lastname } = splitName(contact.fullName);

  // Always included.
  const properties: Record<string, string | number> = {
    atlas_account_created_date: toEpochMillis(contact.createdAt),
    atlas_account_id: contact.accountId,
  };

  // Set-if-empty.
  if (isEmptyExisting(existing.firstname)) properties.firstname = firstname;
  if (isEmptyExisting(existing.lastname)) properties.lastname = lastname;
  if (isEmptyExisting(existing.contact_category)) {
    properties.contact_category = CONTACT_CATEGORY;
  }
  for (const [key, value] of presentUtmEntries(contact.attribution)) {
    if (isEmptyExisting(existing[key])) properties[key] = value;
  }

  // Advance-only, three-way on the existing value:
  //  - missing/empty                    -> write NEW_LIFECYCLE_STAGE
  //  - known stage, rank < new stage     -> write NEW_LIFECYCLE_STAGE
  //  - known stage, rank >= new stage    -> leave alone (already advanced)
  //  - non-empty but NOT in the ladder   -> leave alone (unrecognized custom
  //                                         stage; we can't tell advance from
  //                                         downgrade, so never touch it)
  const existingLifecycle = existing.lifecyclestage;
  if (isEmptyExisting(existingLifecycle)) {
    properties.lifecyclestage = NEW_LIFECYCLE_STAGE;
  } else if (typeof existingLifecycle === "string") {
    const existingRank = lifecycleRank(existingLifecycle);
    const newRank = lifecycleRank(NEW_LIFECYCLE_STAGE);
    if (existingRank !== undefined && newRank !== undefined && existingRank < newRank) {
      properties.lifecyclestage = NEW_LIFECYCLE_STAGE;
    }
  }

  return properties;
}
