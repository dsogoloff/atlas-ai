// Pure planning logic for the HubSpot child + attempt-history backfill.
//
// Extracted from backfill-child-and-attempts.ts for the same reason
// src/lib/responseSubmit/clampPlacement.ts was extracted from its handler: the
// CLI entrypoint runs `main()` on import, so the decision logic has to live in
// a module that can be imported (by backfillPlan.test.ts) WITHOUT running the
// script. Nothing in here reads argv, env, the network or the database.
//
// ---------------------------------------------------------------------------
// COMPLIANCE SEAM (D-0055 / D-0061) — read before adding a field.
//
// The ONLY things this planner may put on a HubSpot property bag are:
//   * child FIRST NAME + GRADE, and only via buildChildProperties() in
//     src/lib/hubspot/childFields.ts — this module never names a child_* key
//     itself, so the portal's slot layout has exactly one definition;
//   * assessment DATES and an attempt COUNT, from `AttemptCrmSummary`.
//
// `AttemptCrmSummary` is the only attempt-derived shape allowed across the
// boundary, and it is structurally incapable of carrying a level, band, score
// or response. An `AssessmentAttempt` (which DOES carry the assessed level, for
// the Atlas-only staff view) must never be passed into this module — the input
// types below have no field one could travel in, and that IS the guarantee.
// Do not add a runtime filter, and do not widen `BackfillAccountInput`.
// ---------------------------------------------------------------------------

import type { AttemptCrmSummary } from "../../src/lib/assessmentHistory/attempts";
import {
  buildChildProperties,
  CHILD_SLOTS,
  toHubspotGrade,
  type ChildCrmRecord,
} from "../../src/lib/hubspot/childFields";

// ---------------------------------------------------------------------------
// The property-name contract
// ---------------------------------------------------------------------------

/**
 * THE ONE PLACE the three attempt-history property names are written down.
 *
 * These three properties DO NOT EXIST in the connected portal (245446396) yet —
 * creating them is a founder-approved portal schema change. They are named here
 * so that renaming them is a one-line edit in a single object, and so that a
 * reviewer can see the complete set of non-child keys this backfill can emit.
 *
 * The child properties are deliberately NOT listed here: they are owned by
 * CHILD_SLOTS in src/lib/hubspot/childFields.ts, and duplicating them would let
 * the two drift.
 *
 * HubSpot rejects an ENTIRE PATCH when it contains one unknown property, so
 * until the properties exist these keys must stay off the wire — see
 * `attemptPropertiesLive` on BackfillAccountInput.
 */
import {
  ATTEMPT_PROPERTIES,
  ATTEMPT_PROPERTY_TYPES,
  toHubspotDateValue,
} from "@/lib/hubspot/syncContact";

// Re-exported so the CLI and its tests have one import site for the names.
export { ATTEMPT_PROPERTIES };

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

export interface BackfillArgs {
  target: "local" | "prod";
  apply: boolean;
  confirm: boolean;
  /** Max parent accounts to scan. null = no cap. */
  limit: number | null;
  /** Single-account pilot mode: parents.id (uuid). null = all accounts. */
  accountId: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads ONLY argv. Deliberately never touches process.env: there must be no
 * environment variable, anywhere, that can silently turn a dry run into a
 * write. The only way to write is to type both flags on the command line.
 */
export function parseArgs(argv: readonly string[]): BackfillArgs {
  const rawTarget = flagValue(argv, "target") ?? "local";
  if (rawTarget !== "local" && rawTarget !== "prod") {
    throw new Error(`--target must be 'local' or 'prod' (got '${rawTarget}')`);
  }

  const rawLimit = flagValue(argv, "limit");
  let limit: number | null = null;
  if (rawLimit !== null) {
    limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`--limit must be a positive integer (got '${rawLimit}')`);
    }
  }

  const accountId = flagValue(argv, "account");
  if (accountId !== null && !UUID_RE.test(accountId)) {
    throw new Error(`--account must be a uuid (got '${accountId}')`);
  }

  return {
    target: rawTarget,
    apply: argv.includes("--apply"),
    confirm: argv.includes("--confirm"),
    limit,
    accountId,
  };
}

/**
 * Accepts both `--name=value` (this repo's existing script convention, see
 * scripts/backfill/reclamp-railed-placements.ts) and `--name value`. Returns
 * null when the flag is absent, and "" when it is present with no value — which
 * every caller above rejects, so `--account --apply` cannot swallow a flag.
 */
function flagValue(argv: readonly string[], name: string): string | null {
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline !== undefined) return inline.slice(name.length + 3);

  const index = argv.indexOf(`--${name}`);
  if (index === -1) return null;
  const next = argv[index + 1];
  return next !== undefined && !next.startsWith("--") ? next : "";
}

export type Mode =
  | { kind: "dry-run" }
  | { kind: "apply" }
  | { kind: "refused"; reason: string };

/**
 * DRY RUN IS THE DEFAULT AND CANNOT BE REACHED PAST BY ACCIDENT.
 *
 * Writing needs TWO flags together — `--apply --confirm`. One is a typo; two is
 * a decision. `--confirm` on its own is still a dry run, and `--apply` on its
 * own is REFUSED rather than downgraded, so a half-typed write command stops
 * loudly instead of quietly reading.
 */
export function resolveMode(args: BackfillArgs): Mode {
  if (args.apply && !args.confirm) {
    return {
      kind: "refused",
      reason:
        "--apply requires --confirm. Re-run with both flags once the founder has " +
        "reviewed the dry-run table.",
    };
  }
  return args.apply && args.confirm ? { kind: "apply" } : { kind: "dry-run" };
}

// ---------------------------------------------------------------------------
// Per-account planning
// ---------------------------------------------------------------------------

/** Everything the planner is allowed to know about one parent account. */
export interface BackfillAccountInput {
  /** parents.id. */
  accountId: string;
  /** Resolved HubSpot contact id, or null when there is no unambiguous match.
   *  null ALWAYS means "do not write", never "create one" — this backfill has
   *  no create path, for the same consent reason as syncContact.ts. */
  contactId: string | null;
  /** ACTIVE (archived_at IS NULL) children, OLDEST FIRST, so slot numbering is
   *  stable across runs and matches the live sync. */
  children: readonly ChildCrmRecord[];
  /** Archived children excluded from `children` — reported, never written. */
  archivedChildCount: number;
  /** One summary per entry of `children`, same order. Counts and timestamps
   *  only — see the compliance seam at the top of this file. */
  childSummaries: readonly AttemptCrmSummary[];
  /** Whether the three ATTEMPT_PROPERTIES exist in the portal yet (mirrors
   *  isHubspotAttemptPropertiesLive() in src/lib/env.ts). When false the keys
   *  are withheld, because one unknown property fails the WHOLE patch and would
   *  take the child fields down with it. */
  attemptPropertiesLive: boolean;
}

export type SkipReason =
  | "no-hubspot-contact"
  | "no-children"
  | "nothing-to-write";

export const SKIP_EXPLANATION: Record<SkipReason, string> = {
  "no-hubspot-contact":
    "no unambiguous HubSpot contact carries this atlas_account_id (this backfill never creates one)",
  "no-children": "the account has no active children in Atlas",
  "nothing-to-write":
    "nothing Atlas can assert: no child name, no mappable grade, and no completed attempt",
};

export interface BackfillPlanRow {
  accountId: string;
  contactId: string | null;
  verdict: "would-write" | "skipped";
  skipReason: SkipReason | null;
  /** The exact PATCH body properties. Empty on a skipped row. */
  properties: Record<string, string | number>;
  /** Account-level fold of every active child's summary. Reported even on a
   *  skipped row so the dry run shows why the row was empty. */
  summary: AttemptCrmSummary;
  archivedChildCount: number;
  /** Non-fatal observations for the dry-run table (unmapped grades, withheld
   *  attempt properties, children past the last slot). */
  notes: string[];
}

/** Pure: one account in, one decision out. No IO, no throwing. */
export function planAccount(input: BackfillAccountInput): BackfillPlanRow {
  const summary = mergeCrmSummaries(input.childSummaries);
  const notes: string[] = [];

  if (input.archivedChildCount > 0) {
    notes.push(
      `${input.archivedChildCount} archived child(ren) excluded from both the child slots and the attempt totals`,
    );
  }

  const skip = (reason: SkipReason): BackfillPlanRow => ({
    accountId: input.accountId,
    contactId: input.contactId,
    verdict: "skipped",
    skipReason: reason,
    properties: {},
    summary,
    archivedChildCount: input.archivedChildCount,
    notes,
  });

  // Checked FIRST: without a contact nothing can be written whatever else is
  // true, and reporting the richer reason is more useful than "nothing to write".
  if (input.contactId === null) return skip("no-hubspot-contact");
  if (input.children.length === 0) return skip("no-children");

  // Child first name + grade. Never assembled here — CHILD_SLOTS owns the
  // property names and the portal's missing child_3_name.
  // Spread rather than mutate the returned object: the attempt keys below are
  // numbers, and widening someone else's Record<string, string> in place is the
  // kind of unsoundness that only bites later.
  const properties: Record<string, string | number> = {
    ...buildChildProperties(input.children),
  };

  notes.push(...childSlotNotes(input.children));

  if (input.attemptPropertiesLive) {
    // Coerced to each property's ACTUAL portal type. first_assessment_completed_date
    // is a `date`, not a `datetime`: it accepts ONLY midnight-UTC epoch millis, and
    // a raw instant would 400 the whole PATCH. Same rule the live emit follows.
    const firstStarted =
      summary.firstStartedAt === null
        ? null
        : toHubspotDateValue(
            summary.firstStartedAt,
            ATTEMPT_PROPERTY_TYPES[ATTEMPT_PROPERTIES.firstStartedAt],
          );
    const firstCompleted =
      summary.firstCompletedAt === null
        ? null
        : toHubspotDateValue(
            summary.firstCompletedAt,
            ATTEMPT_PROPERTY_TYPES[ATTEMPT_PROPERTIES.firstCompletedAt],
          );
    if (firstStarted !== null) {
      properties[ATTEMPT_PROPERTIES.firstStartedAt] = firstStarted;
    }
    if (firstCompleted !== null) {
      properties[ATTEMPT_PROPERTIES.firstCompletedAt] = firstCompleted;
    }
    if (summary.attemptCount > 0) {
      properties[ATTEMPT_PROPERTIES.attemptCount] = summary.attemptCount;
    }
  } else if (summary.firstStartedAt !== null || summary.attemptCount > 0) {
    notes.push(
      "attempt properties WITHHELD — the three first_assessment_* / " +
        "assessment_attempt_count properties do not exist in the portal yet " +
        "(set HUBSPOT_ATTEMPT_PROPERTIES_LIVE=true once the founder creates them)",
    );
  }

  if (Object.keys(properties).length === 0) return skip("nothing-to-write");

  return {
    accountId: input.accountId,
    contactId: input.contactId,
    verdict: "would-write",
    skipReason: null,
    properties,
    summary,
    archivedChildCount: input.archivedChildCount,
    notes,
  };
}

/**
 * Explains, per slot, everything buildChildProperties() silently drops — so the
 * dry run says WHY a child's name or grade is missing from the patch instead of
 * leaving the reviewer to diff two lists.
 *
 * Slot-indexed, never value-matched: two siblings can legitimately share a
 * grade, so "is this grade string in the patch?" is not a sound question.
 * `toHubspotGrade` is imported rather than reimplemented — the mapping has one
 * definition, in src/lib/hubspot/childFields.ts.
 */
export function childSlotNotes(children: readonly ChildCrmRecord[]): string[] {
  const notes: string[] = [];

  children.slice(0, CHILD_SLOTS.length).forEach((child, i) => {
    const label = child.firstName.trim() === "" ? `child ${i + 1}` : child.firstName.trim();
    if (CHILD_SLOTS[i].name === null && child.firstName.trim() !== "") {
      notes.push(
        `${label}: first name NOT written — slot ${i + 1} has no name property in the portal`,
      );
    }
    const hasGradeText = child.grade !== null && child.grade.trim() !== "";
    if (hasGradeText && toHubspotGrade(child.grade) === undefined) {
      notes.push(
        `${label}: grade omitted — "${child.grade ?? ""}" does not map to the HubSpot enum`,
      );
    }
  });

  const overflow = children.length - CHILD_SLOTS.length;
  if (overflow > 0) {
    notes.push(
      `${overflow} child(ren) beyond slot ${CHILD_SLOTS.length} ignored — the portal has no slot for them`,
    );
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Account-level fold
// ---------------------------------------------------------------------------

/**
 * Fold every child's summary into the ONE set of values a parent contact can
 * hold. `AttemptCrmSummary` in, `AttemptCrmSummary` out — the fold cannot
 * introduce a field the type does not already have.
 *
 * JUDGEMENT CALL, flagged for review: `attemptCount` is SUMMED across siblings,
 * so the contact-level number means "assessments this FAMILY has completed",
 * not "…this child". There is one contact per parent and three child slots, so
 * a per-child count has nowhere to live; a family total is the only honest
 * reading of a single contact-level number.
 *
 * The dates are the earliest FIRSTs, never the latest — that is the whole point
 * of the backfill. HubSpot's existing assessment_started_date /
 * assessment_completed_date are latest-wins, so a re-taker's original dates
 * cannot be recovered from HubSpot and must come from Atlas session history.
 */
export function mergeCrmSummaries(
  summaries: readonly AttemptCrmSummary[],
): AttemptCrmSummary {
  return {
    attemptCount: summaries.reduce((n, s) => n + s.attemptCount, 0),
    firstStartedAt: extremum(summaries.map((s) => s.firstStartedAt), "earliest"),
    firstCompletedAt: extremum(summaries.map((s) => s.firstCompletedAt), "earliest"),
    latestStartedAt: extremum(summaries.map((s) => s.latestStartedAt), "latest"),
    latestCompletedAt: extremum(summaries.map((s) => s.latestCompletedAt), "latest"),
  };
}

/** Earliest/latest parseable instant, or null. Unparseable strings are ignored
 *  rather than coerced — a NaN date must never win a comparison. */
function extremum(
  values: readonly (string | null)[],
  which: "earliest" | "latest",
): string | null {
  let best: string | null = null;
  let bestMs = 0;
  for (const value of values) {
    if (value === null) continue;
    const ms = new Date(value).getTime();
    if (Number.isNaN(ms)) continue;
    if (best === null || (which === "earliest" ? ms < bestMs : ms > bestMs)) {
      best = value;
      bestMs = ms;
    }
  }
  return best;
}

/** HubSpot date properties take epoch millis (same as syncContact.ts). An
 *  unparseable instant yields null so the property is OMITTED — never written
 *  as NaN, which HubSpot would reject for the whole patch. */
export function toEpochMillis(iso: string | null): number | null {
  if (iso === null) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}
