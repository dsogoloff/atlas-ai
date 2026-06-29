// Shared student detail — admin-only "Parent / account" panel.
//
// The detail is reused by the instructor (center-scoped) and the admin
// (tenant-scoped) surfaces. Only the admin view exposes the parent account
// (name/email/created/center/plan); the instructor view stays parent-PII-free.
// These tests drive the no-report path (no completed session) so the heavy
// report-assembly pipeline never runs — the panel renders above it regardless.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assembleReportContent } from "@/lib/report/assemble";
import type { ReportContent } from "@/lib/report/types";
import type { Database } from "@/lib/supabase/database.types";

const mockCreateClient = vi.fn();
const mockCreateServiceClient = vi.fn();
const mockResolveStaff = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
  createServiceClient: () => mockCreateServiceClient(),
}));

vi.mock("../../lib/instructor", () => ({
  resolveStaff: () => mockResolveStaff(),
}));

// Keep the render hermetic — stub the children that pull client-only deps or
// the report pipeline. The branch assertions key off the panel's own text.
vi.mock("../../lib/notes", () => ({ fetchNotesForChild: async () => [] }));
vi.mock("./notes-panel", () => ({ NotesPanel: () => null }));
vi.mock("./report-view-tracker", () => ({ ReportViewTracker: () => null }));
vi.mock("./usefulness-panel", () => ({ UsefulnessPanel: () => null }));
vi.mock("../../_components/shell", () => ({
  InstructorTopBar: () => null,
  InstructorNotice: () => null,
}));
vi.mock("@/lib/report/assemble", () => ({ assembleReportContent: vi.fn() }));
vi.mock("next/link", () => ({ default: () => null }));

// current_estimate validity is driven by a `__valid` marker on the fixture so a
// single mock serves both the has-report and the no-placement (EmptyDiagnostic)
// cases.
vi.mock("@/lib/responseSubmit/types", () => ({
  isPlacementEstimateJson: (v: unknown) =>
    Boolean(v && typeof v === "object" && (v as { __valid?: boolean }).__valid),
}));

import StudentDiagnosticPage from "./page";

const CHILD_ID = "11111111-1111-4111-8111-111111111111";

const CHILD = {
  id: CHILD_ID,
  name: "Kid Name",
  grade_level: "Grade 3",
  birth_year: 2017,
  home_center_id: "ctr1",
  parent_id: "p1",
};

const PARENT = {
  name: "Pat Parent",
  email: "pat@example.com",
  created_at: "2026-01-15T00:00:00.000Z",
  subscription_tier: "PILOT",
  home_center_id: "ctr1",
};

/** Chainable query stub — every builder method returns itself; maybeSingle
 *  resolves the configured single-row shape. */
function chain(data: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in"]) b[m] = () => b;
  b.maybeSingle = async () => ({ data, error: null });
  // Awaiting the builder (list reads: responses, strand coverage) resolves the
  // list shape; the single-row call sites use maybeSingle. Both read `data`.
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(res, rej);
  return b;
}

function rlsClient(): SupabaseClient<Database> {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: (table: string) => {
      if (table === "children") return chain(CHILD);
      if (table === "assessment_sessions") return chain(null); // no report
      throw new Error(`unexpected RLS table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

function serviceClient(): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      if (table === "parents") return chain(PARENT);
      if (table === "centers") return chain({ name: "Singapore HQ" });
      throw new Error(`unexpected service table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

afterEach(() => {
  mockCreateClient.mockReset();
  mockCreateServiceClient.mockReset();
  mockResolveStaff.mockReset();
  vi.mocked(assembleReportContent).mockReset();
});

describe("StudentDiagnosticPage — admin-only Parent / account panel", () => {
  it("renders the parent panel with the parent's name and email for an admin", async () => {
    mockCreateClient.mockResolvedValue(rlsClient());
    mockCreateServiceClient.mockReturnValue(serviceClient());
    mockResolveStaff.mockResolvedValue({
      kind: "admin",
      id: "a1",
      tenant_id: "t1",
      name: "Dev Admin",
    });

    const html = renderToStaticMarkup(
      await StudentDiagnosticPage({ params: Promise.resolve({ childId: CHILD_ID }) }),
    );

    expect(html).toContain("Parent / account");
    expect(html).toContain("Pat Parent");
    expect(html).toContain("pat@example.com");
    expect(html).toContain("Singapore HQ");
    expect(html).toContain("PILOT");
  });

  it("does NOT render the parent panel for an instructor (parent-PII-free)", async () => {
    mockCreateClient.mockResolvedValue(rlsClient());
    mockCreateServiceClient.mockReturnValue(serviceClient());
    mockResolveStaff.mockResolvedValue({
      kind: "instructor",
      id: "i1",
      tenant_id: "t1",
      center_id: "ctr1",
      name: "Dev Instructor",
    });

    const html = renderToStaticMarkup(
      await StudentDiagnosticPage({ params: Promise.resolve({ childId: CHILD_ID }) }),
    );

    expect(html).not.toContain("Parent / account");
    expect(html).not.toContain("pat@example.com");
    // The student detail itself still renders.
    expect(html).toContain("Kid Name");
  });
});

// =============================================================================
// Admin = "master instructor": the FULL parent report (ReportArticle), with the
// parent-only action widgets suppressed.
// =============================================================================

const REPORT: ReportContent = {
  session_id: "sess-admin",
  tenant_id: "t1",
  generated_at: "2026-06-23T00:00:00.000Z",
  child: { display_name: "Kid Name", grade_label: "4th Grade" },
  metadata: {
    assessed_date_display: "June 23, 2026",
    duration_display: "3 minutes",
    report_id: "A-ADMIN",
  },
  time_flag: "normal",
  placement: { sam_level: "S.A.M Level 4", overall_percentage: 75, tier: "K_4" },
  strand_mastery: [
    { strand: "whole_numbers", correct: 6, total: 8, percentage: 75, band: "mastery" },
    { strand: "fractions", correct: 0, total: 0, percentage: 0, band: "no_data" },
    { strand: "measurement", correct: 1, total: 3, percentage: 33, band: "area_of_focus" },
  ],
  misconceptions: [],
  recommendations: [],
  readiness: null, // comprehensive → PlacementCard + Placement recommendation
};

const SESSION_OK = {
  id: "sess-admin",
  tenant_id: "t1",
  started_at: "2026-06-23T00:00:00.000Z",
  completed_at: "2026-06-23T00:05:00.000Z",
  current_estimate: { __valid: true },
  session_time_flag: "normal",
  test_type: "comprehensive",
};

function reportRlsClient(session: unknown): SupabaseClient<Database> {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: (table: string) => {
      if (table === "children") return chain(CHILD);
      if (table === "assessment_sessions") return chain(session);
      if (table === "report_narrations") return chain(null);
      if (table === "responses") return chain(null); // fetchItemReview → []
      throw new Error(`unexpected RLS table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

function reportServiceClient(): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      if (table === "parents") return chain(PARENT);
      if (table === "centers") return chain({ name: "Singapore HQ" });
      // The report read path (assembly, narration, item review, strand
      // coverage) runs on the SERVICE client now — see page.tsx reportService.
      if (table === "report_narrations") return chain(null);
      if (table === "responses") return chain(null);
      throw new Error(`unexpected service table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

describe("StudentDiagnosticPage — admin sees the full parent report", () => {
  it("renders ReportArticle (radar + strand lede) with parent-action widgets suppressed", async () => {
    const svc = reportServiceClient();
    mockCreateClient.mockResolvedValue(reportRlsClient(SESSION_OK));
    mockCreateServiceClient.mockReturnValue(svc);
    mockResolveStaff.mockResolvedValue({
      kind: "admin",
      id: "a1",
      tenant_id: "t1",
      name: "Dev Admin",
    });
    vi.mocked(assembleReportContent).mockResolvedValue(REPORT);

    const html = renderToStaticMarkup(
      await StudentDiagnosticPage({ params: Promise.resolve({ childId: CHILD_ID }) }),
    );

    // Regression guard: the report is assembled with the SERVICE client, not the
    // admin's RLS client (admin tenant-view policies don't cover responses /
    // taxonomy / narration, so an RLS read would return an empty report).
    const assembleArgs = vi.mocked(assembleReportContent).mock.calls[0][0];
    expect(assembleArgs.readClient).toBe(svc);
    expect(assembleArgs.serviceClient).toBe(svc);

    // Parent-report-only content (proves ReportArticle rendered).
    expect(html).toContain("Strand Performance");
    expect(html).toContain("Strand mastery:"); // StrandRadar aria-label
    expect(html).toContain("Placement recommendation");

    // Parent-only action widgets are NOT actionable (not rendered) for admin.
    expect(html).not.toContain("Was this report helpful?"); // feedback island
    expect(html).not.toContain(
      "Schedule a conversation with a S.A.M center director",
    ); // center follow-up CTA
    expect(html).not.toContain("Next Steps");

    // Admin-only affordances are kept around the report.
    expect(html).toContain("Parent / account");
    expect(html).toContain("Item-level review");
  });

  it("keeps the EmptyDiagnostic guard for a completed session with no placement", async () => {
    mockCreateClient.mockResolvedValue(
      reportRlsClient({ ...SESSION_OK, current_estimate: { __valid: false }, test_type: "short" }),
    );
    mockCreateServiceClient.mockReturnValue(reportServiceClient());
    mockResolveStaff.mockResolvedValue({
      kind: "admin",
      id: "a1",
      tenant_id: "t1",
      name: "Dev Admin",
    });

    const html = renderToStaticMarkup(
      await StudentDiagnosticPage({ params: Promise.resolve({ childId: CHILD_ID }) }),
    );

    // (renderToStaticMarkup HTML-escapes the apostrophe in "couldn't")
    expect(html).toContain("This assessment finished but a placement");
    expect(html).not.toContain("Strand Performance"); // no report rendered
    expect(vi.mocked(assembleReportContent)).not.toHaveBeenCalled();
  });
});
