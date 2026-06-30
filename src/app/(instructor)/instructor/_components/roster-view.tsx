// Shared roster presentation — the at-a-glance stat cards and the roster
// table. Used by BOTH the instructor portal (single center) and the
// tenant-wide admin view. The admin view passes `showCenter` to add a Center
// column; everything else is identical, so the two surfaces stay in lockstep.
//
// Rows always link to the SHARED student detail at /instructor/student/[childId]
// (resolveStaff gates it for instructor OR admin) — the detail is never
// duplicated.

import Link from "next/link";

import type { RosterRow, RosterStatus } from "../lib/roster";

// Honest at-a-glance counts of the loaded roster — derived from the rows
// already in hand. Deliberately NOT cohort analytics (no cross-student
// aggregates, trends, or averages): that surface is deferred.
export function RosterStats({ rows }: { rows: RosterRow[] }) {
  const completed = rows.filter((r) => r.status === "completed").length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const notStarted = rows.length - completed - inProgress;
  const cards: { label: string; value: number; cls: string }[] = [
    { label: "Total students", value: rows.length, cls: "text-sam-navy" },
    { label: "Completed", value: completed, cls: "text-sam-teal" },
    { label: "In progress", value: inProgress, cls: "text-[#b45309]" },
    { label: "Not started", value: notStarted, cls: "text-sam-gray-mid" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-white rounded-2xl border border-sam-gray-light/40 p-5 shadow-[0px_4px_12px_rgba(27,58,107,0.06)]"
        >
          <p className="text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider">
            {c.label}
          </p>
          <p className={`font-display-child text-3xl mt-1 ${c.cls}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** First-letter initials from a display name (max 2), for the roster avatar
 *  tile. Mirrors wireframe 06's avatar treatment. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RosterTable({
  rows,
  showCenter = false,
  showLastAssessment = false,
}: {
  rows: RosterRow[];
  showCenter?: boolean;
  /** Admin dashboard: add a "Last assessment" column (between Status and
   *  Recommended placement). The rows are expected pre-sorted by that date. */
  showLastAssessment?: boolean;
}) {
  // Column set varies by surface: the admin adds a Center column (tenant-wide
  // roster) and/or a Last assessment column. Grid templates are written as full
  // literal class strings — one per combination — so Tailwind's scanner emits
  // them (a runtime-built arbitrary value would never be generated).
  const gridCls =
    showCenter && showLastAssessment
      ? "md:grid-cols-[2fr_1fr_1.2fr_1.1fr_1.1fr_1.3fr]"
      : showCenter
        ? "md:grid-cols-[2fr_1fr_1.3fr_1.2fr_1.4fr]"
        : showLastAssessment
          ? "md:grid-cols-[2fr_1fr_1.2fr_1.1fr_1.4fr]"
          : "md:grid-cols-[2fr_1fr_1.2fr_1.4fr]";
  return (
    <div className="bg-white rounded-2xl border border-sam-gray-light/40 overflow-hidden">
      {/* Header row — hidden on mobile where cards stack. */}
      <div
        className={`hidden md:grid ${gridCls} gap-4 px-6 py-3 border-b border-sam-gray-light/40 text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider`}
      >
        <span>Student</span>
        <span>Grade</span>
        {showCenter && <span>Center</span>}
        <span>Status</span>
        {showLastAssessment && <span>Last assessment</span>}
        <span>Recommended placement</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li
            key={row.childId}
            className="border-b border-sam-gray-light/30 last:border-b-0"
          >
            <Link
              href={`/instructor/student/${row.childId}`}
              className={`grid grid-cols-1 ${gridCls} gap-1 md:gap-4 px-6 py-4 hover:bg-sam-cream/60 transition-colors`}
            >
              <span className="flex items-center gap-3">
                <span
                  className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sam-navy/10 text-sam-navy text-xs font-bold"
                  aria-hidden="true"
                >
                  {initials(row.name)}
                </span>
                <span className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-headline-adult text-sam-navy font-bold">
                    {row.name}
                  </span>
                  {row.archivedAtDisplay && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sam-gray-light text-sam-gray-mid">
                      <span
                        className="material-symbols-outlined text-[12px]"
                        aria-hidden="true"
                      >
                        archive
                      </span>
                      Archived {row.archivedAtDisplay}
                    </span>
                  )}
                </span>
              </span>
              <span className="text-sm text-sam-navy/70">
                {row.gradeLabel ?? "—"}
              </span>
              {showCenter && (
                <span className="text-sm text-sam-navy/70">
                  {row.centerName ?? "—"}
                </span>
              )}
              <span>
                <StatusBadge status={row.status} date={row.completedAtDisplay} />
              </span>
              {showLastAssessment && (
                <span className="text-sm text-sam-navy/70">
                  {row.lastAssessmentDisplay ?? (
                    <span className="text-sam-gray-mid">Never</span>
                  )}
                </span>
              )}
              <span className="text-sm font-bold text-sam-navy">
                {row.placementLabel ?? (
                  <span className="font-normal text-sam-gray-mid">
                    Pending assessment
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({
  status,
  date,
}: {
  status: RosterStatus;
  date: string | null;
}) {
  const config: Record<RosterStatus, { label: string; cls: string }> = {
    completed: {
      label: "Completed",
      cls: "bg-sam-teal/10 text-sam-teal",
    },
    in_progress: {
      label: "In progress",
      cls: "bg-sam-orange/15 text-[#b45309]",
    },
    not_started: {
      label: "Not started",
      cls: "bg-sam-gray-light text-sam-gray-mid",
    },
  };
  const { label, cls } = config[status];
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center px-3 py-1 rounded-full text-xs font-bold ${cls}`}
      >
        {label}
      </span>
      {status === "completed" && date && (
        <span className="text-[11px] text-sam-gray-mid">{date}</span>
      )}
    </span>
  );
}
