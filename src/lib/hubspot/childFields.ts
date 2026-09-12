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

import { getHubspotAtlasSyncToken } from "@/lib/env";

import { findContactIdByAtlasAccountId, requestWithRetry } from "./syncContact";

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
 * NOTE the asymmetry, verified live 2026-09-12 and NOT an oversight here:
 * `child_1_name` and `child_2_name` exist, `child_1/2/3_grade` exist, but
 * **`child_3_name` DOES NOT EXIST** in the portal. Slot 3 therefore carries a
 * grade and no name. Creating that property is a portal schema change and is
 * pending founder approval — do not add it to this table until it exists, or
 * every write that includes a third child will 400.
 */
export const CHILD_SLOTS: readonly { name: string | null; grade: string }[] = [
  { name: "child_1_name", grade: "child_1_grade" },
  { name: "child_2_name", grade: "child_2_grade" },
  { name: null, grade: "child_3_grade" },
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

export interface ChildFieldsUpdate {
  /** parents.id — the `atlas_account_id` on the HubSpot contact. */
  accountId: string;
  /** The account's children, OLDEST FIRST (by children.created_at), so slot 1
   *  is stable across runs and a new sibling never renumbers an existing one. */
  children: readonly ChildCrmRecord[];
}

/**
 * Env-gated, fail-soft PATCH of one contact's child fields. UPDATE-ONLY: when
 * no contact bears this atlas_account_id it logs and returns without creating
 * one, so an account-less session can never mint a CRM record. Never throws.
 */
export async function syncHubSpotChildFields(
  update: ChildFieldsUpdate,
): Promise<void> {
  const token = getHubspotAtlasSyncToken();
  if (!token) return; // gated off — no fetch, no spend, no call

  const properties = buildChildProperties(update.children);
  if (Object.keys(properties).length === 0) return; // nothing Atlas can assert

  const contactId = await findContactIdByAtlasAccountId(token, update.accountId);
  if (!contactId) {
    console.error(`[hubspot] ${LOG}: no contact for atlas_account_id`);
    return;
  }

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
