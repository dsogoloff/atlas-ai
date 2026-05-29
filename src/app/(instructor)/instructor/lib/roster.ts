// Instructor roster assembly.
//
// SCOPING IS RLS-ENFORCED. fetchRoster takes the instructor's RLS-scoped
// client (the anon client carrying the instructor's session cookie) and
// NOTHING ELSE — it has no access to a service-role client, so it cannot
// bypass row-level security by construction. The `children` and
// `assessment_sessions` SELECT policies (children_instructor_select /
// assessment_sessions_instructor_select) restrict every row this function
// can see to children at the instructor's own center (home center, plus a
// 30-day read-only grace window for a prior center). No cross-center or
// cross-tenant rows are ever returned, so the roster cannot leak another
// center's students.
//
// Data minimisation (compliance §6.2 / §10.3): the roster reads only
// child-level fields the instructor needs — name, grade, assessment
// status, completion date, recommended placement. It deliberately does
// NOT touch the `parents` table, so no parent PII enters this surface.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatGradeLevel } from "@/lib/format/gradeLevel";
import { samLevelLabel } from "@/lib/report/assemble";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
} from "@/lib/responseSubmit/types";
import type { Database } from "@/lib/supabase/database.types";

export type RosterStatus = "completed" | "in_progress" | "not_started";

export interface RosterRow {
  childId: string;
  name: string;
  gradeLabel: string | null;
  status: RosterStatus;
  /** Localised completion date of the latest COMPLETED session, else null. */
  completedAtDisplay: string | null;
  /** Canonical S.A.M-level label from the completed session's placement
   *  estimate, e.g. "S.A.M Level 3A". Null until a completed session with a
   *  valid placement exists. */
  placementLabel: string | null;
}

type SessionRow = Pick<
  Database["public"]["Tables"]["assessment_sessions"]["Row"],
  "child_id" | "status" | "completed_at" | "current_estimate"
>;

/** Builds the instructor's roster. Returns rows sorted by child name.
 *  Children with no assessment session yet appear with status
 *  "not_started" and a null placement — the instructor sees the full
 *  assigned roster, not only assessed children. */
export async function fetchRoster(
  client: SupabaseClient<Database>,
): Promise<RosterRow[]> {
  const { data: children, error: childrenErr } = await client
    .from("children")
    .select("id, name, grade_level")
    .order("name", { ascending: true });

  if (childrenErr || !children || children.length === 0) return [];

  const childIds = children.map((c) => c.id);
  const { data: sessions } = await client
    .from("assessment_sessions")
    .select("child_id, status, completed_at, current_estimate")
    .in("child_id", childIds);

  const sessionsByChild = groupSessions(sessions ?? []);

  return children.map((child) => {
    const childSessions = sessionsByChild.get(child.id) ?? [];
    const latestCompleted = pickLatestCompleted(childSessions);

    let status: RosterStatus = "not_started";
    if (latestCompleted) status = "completed";
    else if (childSessions.some((s) => s.status === "IN_PROGRESS")) {
      status = "in_progress";
    }

    return {
      childId: child.id,
      name: child.name,
      gradeLabel: child.grade_level
        ? formatGradeLevel(child.grade_level)
        : null,
      status,
      completedAtDisplay: latestCompleted
        ? formatDate(latestCompleted.completed_at)
        : null,
      placementLabel: latestCompleted
        ? placementLabelFor(latestCompleted.current_estimate)
        : null,
    };
  });
}

function groupSessions(rows: SessionRow[]): Map<string, SessionRow[]> {
  const map = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const list = map.get(row.child_id) ?? [];
    list.push(row);
    map.set(row.child_id, list);
  }
  return map;
}

/** Latest COMPLETED session by completed_at (desc). Sessions with a null
 *  completed_at sort last. Returns null when none are completed. */
function pickLatestCompleted(rows: SessionRow[]): SessionRow | null {
  const completed = rows.filter((r) => r.status === "COMPLETED");
  if (completed.length === 0) return null;
  return completed.reduce((best, cur) => {
    const bestT = best.completed_at ? Date.parse(best.completed_at) : -Infinity;
    const curT = cur.completed_at ? Date.parse(cur.completed_at) : -Infinity;
    return curT > bestT ? cur : best;
  });
}

function placementLabelFor(
  estimate: SessionRow["current_estimate"],
): string | null {
  if (!isPlacementEstimateJson(estimate)) return null;
  return samLevelLabel(fromPlacementEstimateJson(estimate).overallLevel);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
