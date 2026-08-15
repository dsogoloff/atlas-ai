// Instructor portal — roster (home).
//
// Lists the children assigned to the calling instructor's center. Scoping
// is RLS-enforced end to end: resolveInstructor reads the caller's own
// instructor row, and fetchRoster reads `children` / `assessment_sessions`
// through the same RLS-scoped client, which the children_instructor_select
// policy restricts to the instructor's center (+ 30-day prior-center
// grace). No parent PII is read here (compliance §6.2 / §10.3).

import { createClient } from "@/lib/supabase/server";

import { RosterStats, RosterTable } from "./_components/roster-view";
import { InstructorNotice, InstructorShell } from "./_components/shell";
import { requireStaffAal2 } from "@/lib/auth/requireStaffAal2";
import { resolveInstructor } from "./lib/instructor";
import { fetchRoster } from "./lib/roster";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

export default async function InstructorHomePage() {
  const supabase = await createClient();

  // ATLAS-007: authoritative staff gate — AAL2 or nothing. See
  // lib/auth/requireStaffAal2.ts.
  await requireStaffAal2("/instructor");

  // Still resolve the INSTRUCTOR specifically: an admin is staff and clears the
  // gate, but this portal is center-scoped and needs an instructor row.
  const instructor = await resolveInstructor(supabase);
  if (!instructor) {
    return (
      <InstructorNotice
        title="Instructor access required"
        body="This portal is for S.A.M center instructors. Your account doesn't have an active instructor profile at a center."
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

      {roster.length > 0 && (
        <>
          <RosterStats rows={roster} />
          <RosterTable rows={roster} />
        </>
      )}
    </InstructorShell>
  );
}
