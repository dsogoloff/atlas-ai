// Instructor portal — roster (home).
//
// Lists the children assigned to the calling instructor's center. Scoping
// is RLS-enforced end to end: resolveInstructor reads the caller's own
// instructor row, and fetchRoster reads `children` / `assessment_sessions`
// through the same RLS-scoped client, which the children_instructor_select
// policy restricts to the instructor's center (+ 30-day prior-center
// grace). No parent PII is read here (compliance §6.2 / §10.3).

import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { InstructorNotice, InstructorShell } from "./_components/shell";
import { resolveInstructor } from "./lib/instructor";
import { fetchRoster, type RosterRow, type RosterStatus } from "./lib/roster";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

export default async function InstructorHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/instructor");
  }

  const instructor = await resolveInstructor(supabase);
  if (!instructor) {
    return (
      <InstructorNotice
        title="Instructor access required"
        body="This portal is for S.A.M. center instructors. Your account doesn't have an active instructor profile at a center."
      />
    );
  }

  const roster = await fetchRoster(supabase);

  return (
    <InstructorShell instructorName={instructor.name}>
      <div className="mb-6">
        <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
          Your students
        </h1>
        <p className="font-headline-adult text-sam-navy/60 mt-2">
          {roster.length === 0
            ? "No students are assigned to your center yet."
            : roster.length === 1
              ? "1 student"
              : `${roster.length} students`}
        </p>
      </div>

      {roster.length > 0 && <RosterTable rows={roster} />}
    </InstructorShell>
  );
}

function RosterTable({ rows }: { rows: RosterRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-sam-gray-light/40 overflow-hidden">
      {/* Header row — hidden on mobile where cards stack. */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_1.2fr_1.4fr] gap-4 px-6 py-3 border-b border-sam-gray-light/40 text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider">
        <span>Student</span>
        <span>Grade</span>
        <span>Status</span>
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
              className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.2fr_1.4fr] gap-1 md:gap-4 px-6 py-4 hover:bg-sam-cream/60 transition-colors"
            >
              <span className="font-headline-adult text-sam-navy font-bold">
                {row.name}
              </span>
              <span className="text-sm text-sam-navy/70">
                {row.gradeLabel ?? "—"}
              </span>
              <span>
                <StatusBadge status={row.status} date={row.completedAtDisplay} />
              </span>
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
