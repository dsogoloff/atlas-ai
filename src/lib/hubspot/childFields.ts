import "server-only";

// HubSpot child-field sync — child FIRST NAME + GRADE only.
//
// Sibling of syncContact.ts / syncDeal.ts: env-gated, fail-soft, after()-wrapped
// by the caller, never throws, every failure dead-letters on a [hubspot] line.
//
// ---------------------------------------------------------------------------
// COPPA / CHILD-DATA ALLOWLIST (CLAUDE.md guardrail 2, D-0055 / D-0061).
// Permitted child data in HubSpot is EXACTLY: child first name + grade.
//
// `ChildCrmRecord` below is the entire allowlist. It has no level, band, score,
// response, DOB or birth year, and MUST NEVER grow one. As in syncContact.ts
// the guarantee is STRUCTURAL, not a runtime filter: there is no field a result
// could travel in. Never pass an `AssessmentAttempt` (which does carry the
// assessed level, for the Atlas-only staff view) into this module.
//
// `children.name` is already FIRST-NAME-ONLY by product design — the add-child
// form collects a first name or nickname and never a last name
// (src/app/(auth)/add-child/schema.ts, compliance.md §3). So no name splitting
// happens here; splitting would risk turning a two-word first name into a
// surname.
// ---------------------------------------------------------------------------
//
// FILL-ONLY-WHEN-EMPTY (founder decision 2026-09-12).
// This module used to PATCH child fields authoritatively from Atlas. It no
// longer does: a non-empty value in HubSpot is treated as staff-owned and is
// NEVER overwritten. Atlas only FILLS BLANKS.
//
// Two consequences worth understanding before changing anything here:
//
//   1. The read is mandatory. We cannot know a slot is empty without asking, so
//      every write is now preceded by a GET, and that GET must request EXACTLY
//      the properties we intend to inspect — HubSpot returns only a small
//      DEFAULT set otherwise, and a property missing from the response is
//      indistinguishable from one that is genuinely empty. That mistake would
//      turn this guard into the very clobbering it exists to prevent. Same
//      trap, same fix, as the 409-upsert lookup in syncContact.ts.
//
//   2. It FAILS CLOSED. If the read fails, or returns something unparseable,
//      we write NOTHING. "Could not tell whether it was empty" must never
//      degrade into "assume empty and overwrite".
//
// `assessment_attempt_count` is deliberately NOT subject to this rule: it lives
// in syncContact.ts, is family-level, and is Atlas-derived rather than
// staff-typed.
// ---------------------------------------------------------------------------

import { getHubspotAtlasSyncToken } from "@/lib/env";

import {
  HUBSPOT_API_BASE,
  findContactIdByAtlasAccountId,
  requestWithRetry,
} from "./syncContact";

const LOG = "child fields";

/**
 * The grade values the HubSpot `child_N_grade` ENUM accepts, read from the live
 * portal (245446396) this cycle. Writing anything outside this set makes
 * HubSpot reject the whole PATCH, so unmapped grades are OMITTED, never guessed.
 */
export const HUBSPOT_GRADE_VALUES = [
  "pre_k",
  "k",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
] as const;

export type HubspotGrade = (typeof HUBSPOT_GRADE_VALUES)[number];

/**
 * Atlas stores grade as FREE TEXT ("K", "3rd", "Grade 5", "Pre-K (age 4)",
 * word forms) — see the add-child schema. This maps it onto the HubSpot enum.
 *
 * Normalisation matches parseGradeLevel() in src/lib/tier/derive.ts (trim,
 * lowercase, strip a leading "grade " or trailing " grade"). That function is
 * NOT reusable here: it collapses to a K_4/G5_8 BAND, and a band is exactly the
 * kind of derived level that must never reach HubSpot.
 *
 * Returns undefined for anything unrecognised — the caller then omits the
 * property rather than writing a wrong grade.
 */
export function toHubspotGrade(text: string | null | undefined): HubspotGrade | undefined {
  if (text === null || text === undefined) return undefined;
  const n = text
    .trim()
    .toLowerCase()
    .replace(/^grade\s+/, "")
    .replace(/\s+grade\s*$/, "");
  if (n === "") return undefined;
  return GRADE_ALIASES.get(n);
}

/** Every accepted spelling → enum value. Half-grade suffixes (ka/kb, 1a/1b) are
 *  the `half_grade_level` enum values and map to their whole grade. */
const GRADE_ALIASES: ReadonlyMap<string, HubspotGrade> = new Map([
  ["pre-k (age 4)", "pre_k"],
  ["pre-k (age 5)", "pre_k"],
  ["pre-k", "pre_k"],
  ["prek", "pre_k"],
  ["pre k", "pre_k"],
  ["pre_k", "pre_k"],
  ["pre-kindergarten", "pre_k"],
  ["pre kindergarten", "pre_k"],
  ["k", "k"],
  ["ka", "k"],
  ["kb", "k"],
  ["kindergarten", "k"],
  ["1", "1"], ["1a", "1"], ["1b", "1"], ["1st", "1"], ["first", "1"],
  ["2", "2"], ["2a", "2"], ["2b", "2"], ["2nd", "2"], ["second", "2"],
  ["3", "3"], ["3a", "3"], ["3b", "3"], ["3rd", "3"], ["third", "3"],
  ["4", "4"], ["4a", "4"], ["4b", "4"], ["4th", "4"], ["fourth", "4"],
  ["5", "5"], ["5a", "5"], ["5b", "5"], ["5th", "5"], ["fifth", "5"],
  ["6", "6"], ["6a", "6"], ["6b", "6"], ["6th", "6"], ["sixth", "6"],
  ["7", "7"], ["7a", "7"], ["7b", "7"], ["7th", "7"], ["seventh", "7"],
  ["8", "8"], ["8a", "8"], ["8b", "8"], ["8th", "8"], ["eighth", "8"],
]);

/**
 * The ONLY child attributes this module may hold or forward.
 * No level. No band. No score. No DOB. Never add one.
 */
export interface ChildCrmRecord {
  /** `children.name`, already first-name-only by product design. */
  firstName: string;
  /** `children.grade_level` free text; null when never captured. */
  grade: string | null;
}

/**
 * Slot → property names, as they exist in the LIVE portal.
 *
 * `child_3_name` was MISSING from the portal until 2026-09-12 and slot 3 was
 * name-less as a result. It has since been created (verified live, type
 * `string`, matching child_1_name / child_2_name), so slot 3 now carries a name
 * like its siblings.
 *
 * The `name: string | null` shape is kept rather than simplified: it is what
 * lets a slot exist with no name property, and re-deriving it later would mean
 * re-learning why it was there. A null name is still skipped by
 * buildChildProperties — writing a property this portal does not have would 400
 * the whole PATCH.
 */
export const CHILD_SLOTS: readonly { name: string | null; grade: string }[] = [
  { name: "child_1_name", grade: "child_1_grade" },
  { name: "child_2_name", grade: "child_2_grade" },
  { name: "child_3_name", grade: "child_3_grade" },
];

/**
 * Pure: children (oldest first) → the HubSpot property patch.
 *
 * Only slots Atlas actually has data for are written; a slot whose grade does
 * not map is omitted rather than guessed, and an absent child never blanks an
 * existing HubSpot slot. Children beyond the modelled slots are ignored.
 */
export function buildChildProperties(
  children: readonly ChildCrmRecord[],
): Record<string, string> {
  const properties: Record<string, string> = {};
  children.slice(0, CHILD_SLOTS.length).forEach((child, i) => {
    const slot = CHILD_SLOTS[i];
    const firstName = child.firstName.trim();
    if (slot.name !== null && firstName !== "") {
      properties[slot.name] = firstName;
    }
    const grade = toHubspotGrade(child.grade);
    if (grade !== undefined) properties[slot.grade] = grade;
  });
  return properties;
}

/**
 * Every child property this module may write — and therefore the EXACT list the
 * pre-write GET must request. Derived from CHILD_SLOTS so the two cannot drift:
 * adding a slot automatically widens the read.
 */
export const CHILD_PROPERTY_NAMES: readonly string[] = CHILD_SLOTS.flatMap(
  (slot) => (slot.name === null ? [slot.grade] : [slot.name, slot.grade]),
);

/** Matches isEmptyExisting in syncContact.ts. A whitespace-only HubSpot value
 *  counts as FILLED: a human typed it, and this module fills blanks rather
 *  than tidying what staff wrote. */
function isEmptyExisting(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Pure: drop every candidate property that already holds a value in HubSpot.
 * What survives is only the genuinely empty slots.
 */
export function fillOnlyEmpty(
  candidate: Readonly<Record<string, string>>,
  existing: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (isEmptyExisting(existing[key])) out[key] = value;
  }
  return out;
}

/**
 * Current values of CHILD_PROPERTY_NAMES on one contact.
 *
 * Returns undefined on ANY failure — transport, non-2xx, or malformed JSON.
 * Undefined means "do not write", never "nothing is set": see the fail-closed
 * note in the header.
 */
async function readExistingChildProperties(
  token: string,
  contactId: string,
): Promise<Record<string, unknown> | undefined> {
  // Single-object GET takes ONE comma-separated `properties` value, not
  // repeated params (that is the SEARCH endpoint's convention).
  const params = new URLSearchParams({
    properties: CHILD_PROPERTY_NAMES.join(","),
  });
  try {
    const res = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}?${params.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      console.error(`[hubspot] ${LOG}: existing-value lookup failed`, {
        status: res.status,
      });
      return undefined;
    }
    const body = (await res.json()) as { properties?: Record<string, unknown> };
    return body.properties ?? {};
  } catch (e) {
    console.error(`[hubspot] ${LOG}: existing-value lookup threw`, {
      err: e instanceof Error ? e.message : "unknown",
    });
    return undefined;
  }
}

export interface ChildFieldsUpdate {
  /** parents.id — the `atlas_account_id` on the HubSpot contact. */
  accountId: string;
  /** The account's children, OLDEST FIRST (by children.created_at), so slot 1
   *  is stable across runs and a new sibling never renumbers an existing one. */
  children: readonly ChildCrmRecord[];
}

/**
 * Env-gated, fail-soft PATCH of one contact's child fields.
 *
 * FILL-ONLY-WHEN-EMPTY: reads the contact first and writes only the slots that
 * are blank. A staff-typed value is never overwritten, and a failed read means
 * nothing is written at all.
 *
 * UPDATE-ONLY: when no contact bears this atlas_account_id it logs and returns
 * without creating one, so an account-less session can never mint a CRM record.
 * Never throws.
 */
export async function syncHubSpotChildFields(
  update: ChildFieldsUpdate,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend, no call

  const candidate = buildChildProperties(update.children);
  if (Object.keys(candidate).length === 0) return; // nothing Atlas can assert

  const contactId = await findContactIdByAtlasAccountId(token, update.accountId);
  if (!contactId) {
    console.error(`[hubspot] ${LOG}: no contact for atlas_account_id`);
    return;
  }

  const existing = await readExistingChildProperties(token, contactId);
  if (existing === undefined) return; // fail closed — already logged

  const properties = fillOnlyEmpty(candidate, existing);
  if (Object.keys(properties).length === 0) return; // every slot staff-filled

  const res = await requestWithRetry(
    token,
    "PATCH",
    `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`,
    { properties },
    LOG,
  );
  if (res && !res.ok) {
    console.error(`[hubspot] ${LOG}: update failed`, { status: res.status });
  }
}
