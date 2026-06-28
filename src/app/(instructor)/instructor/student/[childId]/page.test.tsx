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
