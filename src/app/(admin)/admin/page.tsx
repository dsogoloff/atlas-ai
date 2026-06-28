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

import { redirect } from "next/navigation";

import { RosterStats, RosterTable } from "@/app/(instructor)/instructor/_components/roster-view";
import {
  InstructorNotice,
  InstructorShell,
} from "@/app/(instructor)/instructor/_components/shell";
import { resolveStaff } from "@/app/(instructor)/instructor/lib/instructor";
import { fetchRoster } from "@/app/(instructor)/instructor/lib/roster";
import { createClient } from "@/lib/supabase/server";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const staff = await resolveStaff(supabase);
  if (!staff || staff.kind !== "admin") {
    return (
      <InstructorNotice
        roleLabel="Admin"
        homeHref="/admin"
        title="Admin access required"
        body="This portal is for S.A.M tenant administrators. Your account doesn't have an active admin profile."
      />
    );
  }

  const roster = await fetchRoster(supabase);

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
          <RosterTable rows={roster} showCenter />
        </>
      )}
    </InstructorShell>
  );
}
