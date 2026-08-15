// Admin portal — tenant-wide roster (home).
//
// Lists EVERY child in the calling admin's tenant, across all centers — the
// instructor roster at tenant scope. Scoping is RLS-enforced end to end:
// resolveStaff reads the caller's own admin row, and fetchRoster reads
// `children` / `assessment_sessions` through the same RLS-scoped client, which
// the children_admin_select policy restricts to the admin's tenant. Rows carry
// their center (children.home_center_id → centers.name) so the table can show
// which center each student belongs to. No parent PII is read here
// (compliance §6.2 / §10.3). Rows link to the SHARED student detail under
// /instructor/student/[childId] — never a duplicated detail page.

import { RosterStats, RosterTable } from "@/app/(instructor)/instructor/_components/roster-view";
import {
  InstructorNotice,
  InstructorShell,
} from "@/app/(instructor)/instructor/_components/shell";
import { requireStaffAal2 } from "@/lib/auth/requireStaffAal2";
import { fetchRoster } from "@/app/(instructor)/instructor/lib/roster";
import { createClient } from "@/lib/supabase/server";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();

  // ATLAS-007: authoritative staff gate. Resolves the caller, then REFUSES to
  // proceed unless the session is AAL2 (a TOTP factor verified this session),
  // redirecting to enrolment or challenge as appropriate. Replaces the previous
  // getUser() + resolveStaff() preamble; ?next=/admin survives the round trip.
  const { staff } = await requireStaffAal2("/admin");

  if (staff.kind !== "admin") {
    return (
      <InstructorNotice
        roleLabel="Admin"
        homeHref="/admin"
        title="Admin access required"
        body="This portal is for S.A.M tenant administrators. Your account doesn't have an active admin profile."
      />
    );
  }

  // Admin dashboard: sort by most-recent assessment (un-assessed children last)
  // and surface a Last assessment column.
  const roster = await fetchRoster(supabase, { sort: "last_assessment" });

  return (
    <InstructorShell instructorName={staff.name} roleLabel="Admin" homeHref="/admin">
      <div className="mb-6">
        <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
          All students
        </h1>
        <p className="font-headline-adult text-sam-navy/60 mt-2">
          {roster.length === 0
            ? "No students are enrolled in this tenant yet."
            : roster.length === 1
              ? "1 student across all centers"
              : `${roster.length} students across all centers`}
        </p>
      </div>

      {roster.length > 0 && (
        <>
          <RosterStats rows={roster} />
          <RosterTable rows={roster} showCenter showLastAssessment />
        </>
      )}
    </InstructorShell>
  );
}
