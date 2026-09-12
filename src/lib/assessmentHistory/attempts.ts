import "server-only";

// Per-child assessment ATTEMPT HISTORY.
//
// A re-take is a first-class, RETAINED event, not a correction of the previous
// one (founder decision 2026-09-12). Every `assessment_sessions` row IS an
// attempt: the table already keeps one row per session with its own true
// `started_at` / `completed_at` and its own `current_estimate`. So history is
// DERIVED here, not stored again — there is no new table, and no attempt is
// ever deduped, merged, or overwritten.
//
// Attempts are numbered chronologically by `started_at`, 1-based, over ALL
// sessions (including IN_PROGRESS ones) so that a START event can be labelled
// with its attempt number before that attempt has finished.
//
// ---------------------------------------------------------------------------
// COMPLIANCE SEAM (D-0055 / D-0061) — read before adding a field.
// `AssessmentAttempt` carries the assessed level, because staff read it in the
// Atlas admin. That surface is ATLAS-ONLY.
//
// Nothing on `AssessmentAttempt` may be handed to HubSpot. The ONLY shape that
// crosses that boundary is `AttemptCrmSummary`, built by `toCrmSummary()`, and
// it is structurally incapable of carrying a level, band, score or response —
// it holds counts and timestamps and nothing else. That is the guarantee, not
// a runtime filter. Do not widen it, and do not pass an `AssessmentAttempt`
// into any module under src/lib/hubspot/.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CanonicalLevelError,
  placementStrings,
  samLevelLabel,
  type CanonicalLevel,
} from "@/lib/report/canonical-level";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
} from "@/lib/responseSubmit/types";
import type { Database } from "@/lib/supabase/database.types";

type SessionsRow = Database["public"]["Tables"]["assessment_sessions"]["Row"];

/** The session columns attempt history needs. Deliberately narrow — this is a
 *  staff/CRM surface, so it reads no responses and no parent PII. */
export type AttemptSessionRow = Pick<
  SessionsRow,
  "id" | "status" | "started_at" | "completed_at" | "current_estimate" | "test_type"
>;

/** One attempt. ATLAS-ONLY — see the compliance seam above. */
export interface AssessmentAttempt {
  /** 1-based, chronological by `started_at` across all of the child's sessions. */
  attemptNumber: number;
  sessionId: string;
  testType: SessionsRow["test_type"];
  status: SessionsRow["status"];
  /** True start time of THIS attempt. Never rewritten. */
  startedAt: string;
  /** True completion time of THIS attempt; null while in progress. */
  completedAt: string | null;
  /** Assessed level — ATLAS-ONLY, never forwarded to HubSpot. */
  samLevel: string | null;
  /** Canonical level — ATLAS-ONLY, never forwarded to HubSpot. */
  canonicalLevel: CanonicalLevel | null;
}

/**
 * The ONLY attempt-derived values permitted to leave Atlas for HubSpot.
 * Counts and timestamps. There is no field a level could travel in, and none
 * must ever be added (D-0055 / D-0061).
 */
export interface AttemptCrmSummary {
  /** Number of COMPLETED attempts. Pairs with the completed dates below. */
  attemptCount: number;
  firstStartedAt: string | null;
  firstCompletedAt: string | null;
  latestStartedAt: string | null;
  latestCompletedAt: string | null;
}

function startedAtMillis(row: AttemptSessionRow): number {
  const t = new Date(row.started_at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Chronological by `started_at`, tie-broken by id so the numbering of two
 *  sessions sharing a timestamp is stable across calls. */
function byStartedAt(a: AttemptSessionRow, b: AttemptSessionRow): number {
  const diff = startedAtMillis(a) - startedAtMillis(b);
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

/** DEGRADES, DOES NOT THROW — same contract as the roster's reader: one legacy
 *  row outside the canonical set must not 500 a staff view. Keeps the label and
 *  nulls the canonical value so the gap is visible as absent, not as a wrong
 *  string. */
function levelsFor(
  estimate: AttemptSessionRow["current_estimate"],
): Pick<AssessmentAttempt, "samLevel" | "canonicalLevel"> {
  if (!isPlacementEstimateJson(estimate)) {
    return { samLevel: null, canonicalLevel: null };
  }
  const clampedLevel = fromPlacementEstimateJson(estimate).overallLevel;
  try {
    const { samLevel, canonicalLevel } = placementStrings(clampedLevel);
    return { samLevel, canonicalLevel };
  } catch (err) {
    if (err instanceof CanonicalLevelError) {
      return { samLevel: samLevelLabel(clampedLevel), canonicalLevel: null };
    }
    throw err;
  }
}

/** Pure: sessions in, numbered attempts out (oldest first). */
export function buildAttemptHistory(
  sessions: readonly AttemptSessionRow[],
): AssessmentAttempt[] {
  return [...sessions].sort(byStartedAt).map((row, index) => ({
    attemptNumber: index + 1,
    sessionId: row.id,
    testType: row.test_type,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    ...levelsFor(row.current_estimate),
  }));
}

/**
 * The attempt number for one session id. Returns `undefined` when the session
 * is not in the list — callers must treat that as "unknown", never as 1: a
 * mislabelled attempt number is worse than an unlabelled one.
 */
export function attemptNumberForSession(
  sessions: readonly AttemptSessionRow[],
  sessionId: string,
): number | undefined {
  return buildAttemptHistory(sessions).find((a) => a.sessionId === sessionId)
    ?.attemptNumber;
}

/** Narrows attempt history to the counts + timestamps HubSpot may receive. */
export function toCrmSummary(
  attempts: readonly AssessmentAttempt[],
): AttemptCrmSummary {
  const ordered = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const completed = ordered.filter((a) => a.completedAt !== null);
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const firstDone = completed[0];
  const latestDone = completed[completed.length - 1];
  return {
    attemptCount: completed.length,
    firstStartedAt: first?.startedAt ?? null,
    firstCompletedAt: firstDone?.completedAt ?? null,
    latestStartedAt: latest?.startedAt ?? null,
    latestCompletedAt: latestDone?.completedAt ?? null,
  };
}

/** Reads one child's attempt history. SCOPE is RLS's job, not this function's —
 *  it never filters by center or tenant, so it cannot widen what RLS exposed. */
export async function fetchAttemptHistory(
  client: SupabaseClient<Database>,
  childId: string,
): Promise<AssessmentAttempt[]> {
  const { data, error } = await client
    .from("assessment_sessions")
    .select("id, status, started_at, completed_at, current_estimate, test_type")
    .eq("child_id", childId);

  if (error || !data) return [];
  return buildAttemptHistory(data);
}
