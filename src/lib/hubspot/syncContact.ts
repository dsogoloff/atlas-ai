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
import { getHubspotAtlasSyncToken } from "@/lib/env";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

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
// 409 path — read current values, PATCH with set-if-empty / advance-only rules
// =============================================================================

async function upsertExisting(
  token: string,
  email: string,
  contact: AccountCreatedContact,
): Promise<void> {
  let getRes: Response;
  try {
    getRes = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
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
 * POST/PATCH with exactly one retry on a 5xx (after RETRY_DELAY_MS), and no
 * retry on anything else. Returns the final Response, or undefined when every
 * attempt threw (already logged) — callers must check for undefined before
 * reading `.status`.
 */
async function requestWithRetry(
  token: string,
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
): Promise<Response | undefined> {
  const attempt = async (): Promise<Response | undefined> => {
    try {
      return await fetch(`${HUBSPOT_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error("[hubspot] contact sync request threw", {
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
    console.error("[hubspot] contact sync failed after retry", {
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

/** HubSpot's standard lifecycle-stage order, low to high. Unrecognized /
 *  missing values rank 0 — a known value always "advances" over them, and a
 *  HubSpot-only custom stage outside this ladder is never downgraded because
 *  it never enters this map. */
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

function lifecycleRank(value: unknown): number {
  if (typeof value !== "string" || value === "") return 0;
  return LIFECYCLE_STAGE_RANK[value] ?? 0;
}

function splitName(fullName: string): { firstname: string; lastname: string } {
  const trimmed = fullName.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return { firstname: trimmed, lastname: "" };
  return {
    firstname: trimmed.slice(0, spaceIdx),
    lastname: trimmed.slice(spaceIdx + 1),
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

  // Advance-only.
  if (lifecycleRank(existing.lifecyclestage) < lifecycleRank(NEW_LIFECYCLE_STAGE)) {
    properties.lifecyclestage = NEW_LIFECYCLE_STAGE;
  }

  return properties;
}
