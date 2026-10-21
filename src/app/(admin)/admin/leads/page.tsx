// Admin portal — follow-up leads.
//
// A parent who ticks "have my local S.A.M center contact me" exists, until this
// page, only as a row in `follow_up_leads`. The email alert is a single point of
// failure; this list means a missed alert costs a delay rather than a lead.
//
// Gate order matters: requireStaffAal2 and the admin check run BEFORE the
// service client is constructed (it bypasses RLS). Parent contact data only —
// no child fields (see ./leads.ts).

import {
  InstructorNotice,
  InstructorShell,
} from "@/app/(instructor)/instructor/_components/shell";
import { requireStaffAal2 } from "@/lib/auth/requireStaffAal2";
import { createServiceClient } from "@/lib/supabase/server";

import { ageLabel, fetchFollowUpLeads } from "./leads";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function AdminLeadsPage() {
  const { staff } = await requireStaffAal2("/admin/leads");

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

  const result = await fetchFollowUpLeads(createServiceClient(), staff.tenant_id);

  return (
    <InstructorShell instructorName={staff.name} roleLabel="Admin" homeHref="/admin">
      <div className="mb-6">
        <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
          Follow-up leads
        </h1>
        <p className="font-headline-adult text-sam-navy/60 mt-2">
          Parents who asked a local S.A.M center to contact them, newest first.
        </p>
      </div>

      {!result.ok ? (
        <p role="alert" className="font-headline-adult text-sam-red">
          Couldn&rsquo;t load leads. Try again, and tell the Atlas team if it
          keeps failing.
        </p>
      ) : result.rows.length === 0 ? (
        <p className="font-headline-adult text-sam-navy/60">
          No follow-up leads yet.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-sam-gray-light/40 shadow-[0px_4px_12px_rgba(27,58,107,0.06)]">
          <table className="w-full text-left text-sm font-headline-adult">
            <thead className="text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Zip</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Opted in</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.id} className="border-t border-sam-gray-light/40">
                  <td className="px-4 py-3 whitespace-nowrap text-sam-navy">
                    {formatDate(r.createdAt)}
                    <span className="block text-xs text-sam-gray-mid">
                      {ageLabel(r.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sam-navy">{r.parentName}</td>
                  <td className="px-4 py-3">
                    <a className="text-sam-navy underline" href={`mailto:${r.parentEmail}`}>
                      {r.parentEmail}
                    </a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.parentPhone ? (
                      <a className="text-sam-navy underline" href={`tel:${r.parentPhone}`}>
                        {r.parentPhone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{r.zip ?? "—"}</td>
                  <td className="px-4 py-3">{r.schoolName ?? "—"}</td>
                  <td className="px-4 py-3">{r.optedIn ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </InstructorShell>
  );
}
