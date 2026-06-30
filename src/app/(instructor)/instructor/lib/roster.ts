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
  /** Display name of the child's home center, joined via children.home_center_id.
   *  Null when the child has no home center. The instructor roster is a single
   *  center (so this is constant); the admin roster spans the tenant, so the
   *  Center column distinguishes rows. */
  centerName: string | null;
  /** Localised date the parent soft-deleted (archived) this child, else null.
   *  Archived children stay visible to staff with an "Archived" badge — the
   *  row, its sessions, and its report are retained for oversight. */
  archivedAtDisplay: string | null;
}

type SessionRow = Pick<
  Database["public"]["Tables"]["assessment_sessions"]["Row"],
  "child_id" | "status" | "completed_at" | "current_estimate"
>;

/** Builds the staff roster. Returns rows sorted by center, then child name.
 *  Children with no assessment session yet appear with status
 *  "not_started" and a null placement — staff see the full assigned roster,
 *  not only assessed children. SCOPE is RLS's job, not this function's: an
 *  instructor's client returns only their center's children, an admin's
 *  client returns the whole tenant — the same code, narrower or wider input.
 *  fetchRoster never filters by center, so it can't narrow (or widen) what
 *  RLS exposed. */
export async function fetchRoster(
  client: SupabaseClient<Database>,
): Promise<RosterRow[]> {
  // No archived filter: staff (admin) retain visibility of soft-deleted
  // children (badged in the view). RLS still scopes rows to the caller's center
  // / tenant. archived_at drives the "Archived" badge.
  const { data: children, error: childrenErr } = await client
    .from("children")
    .select("id, name, grade_level, home_center_id, archived_at")
    .order("name", { ascending: true });

  if (childrenErr || !children || children.length === 0) return [];

  const childIds = children.map((c) => c.id);
  const { data: sessions } = await client
    .from("assessment_sessions")
    .select("child_id, status, completed_at, current_estimate")
    .in("child_id", childIds);

  const sessionsByChild = groupSessions(sessions ?? []);
  const centerNameById = await fetchCenterNames(client, children);

  const rows = children.map((child) => {
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
      centerName: child.home_center_id
        ? (centerNameById.get(child.home_center_id) ?? null)
        : null,
      archivedAtDisplay: child.archived_at
        ? formatDate(child.archived_at)
        : null,
    };
  });

  // Sort by center, then name. Children with no center sort last (sentinel).
  return rows.sort((a, b) => {
    const ca = a.centerName ?? "￿";
    const cb = b.centerName ?? "￿";
    const byCenter = ca.localeCompare(cb);
    return byCenter !== 0 ? byCenter : a.name.localeCompare(b.name);
  });
}

type ChildCenterRef = { home_center_id: string | null };

/** Resolves home_center_id → center display name for the roster's children
 *  via the same RLS-scoped client (centers_tenant_select makes centers
 *  readable to any tenant member). Returns an empty map when no child has a
 *  home center. */
async function fetchCenterNames(
  client: SupabaseClient<Database>,
  children: ChildCenterRef[],
): Promise<Map<string, string>> {
  const centerIds = Array.from(
    new Set(
      children
        .map((c) => c.home_center_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (centerIds.length === 0) return new Map();

  const { data: centers } = await client
    .from("centers")
    .select("id, name")
    .in("id", centerIds);

  return new Map((centers ?? []).map((c) => [c.id, c.name]));
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
