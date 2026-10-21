import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffAal2, createServiceClient, fetchFollowUpLeads } = vi.hoisted(() => ({
  requireStaffAal2: vi.fn(),
  createServiceClient: vi.fn(),
  fetchFollowUpLeads: vi.fn(),
}));

vi.mock("@/lib/auth/requireStaffAal2", () => ({ requireStaffAal2 }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient }));
vi.mock("./leads", () => ({ fetchFollowUpLeads, ageLabel: () => "today" }));
vi.mock("@/app/(instructor)/instructor/_components/shell", () => ({
  InstructorShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  InstructorNotice: ({ title }: { title: string }) => <p>{title}</p>,
}));

import AdminLeadsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  createServiceClient.mockReturnValue({});
});

describe("/admin/leads", () => {
  it("gates on AAL2 for this path", async () => {
    requireStaffAal2.mockResolvedValue({ staff: { kind: "admin", name: "A", tenant_id: "t" } });
    fetchFollowUpLeads.mockResolvedValue({ ok: true, rows: [] });
    await AdminLeadsPage();
    expect(requireStaffAal2).toHaveBeenCalledWith("/admin/leads");
  });

  it("never builds the service client for a non-admin", async () => {
    requireStaffAal2.mockResolvedValue({
      staff: { kind: "instructor", name: "I", tenant_id: "t", center_id: "c" },
    });
    const html = renderToStaticMarkup(await AdminLeadsPage());
    expect(html).toContain("Admin access required");
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(fetchFollowUpLeads).not.toHaveBeenCalled();
  });

  it("queries with the caller's tenant and renders contact fields", async () => {
    requireStaffAal2.mockResolvedValue({ staff: { kind: "admin", name: "A", tenant_id: "t-9" } });
    fetchFollowUpLeads.mockResolvedValue({
      ok: true,
      rows: [
        {
          id: "l1",
          createdAt: "2026-08-26T12:12:00Z",
          parentName: "Pat Parent",
          parentEmail: "pat@example.com",
          parentPhone: "555-0100",
          zip: "07030",
          schoolName: null,
          optedIn: true,
        },
      ],
    });
    const html = renderToStaticMarkup(await AdminLeadsPage());
    expect(fetchFollowUpLeads.mock.calls[0][1]).toBe("t-9");
    expect(html).toContain("Pat Parent");
    expect(html).toContain("tel:555-0100");
    expect(html).toContain("07030");
  });

  it("shows an error, not 'No follow-up leads yet', when the read fails", async () => {
    requireStaffAal2.mockResolvedValue({ staff: { kind: "admin", name: "A", tenant_id: "t" } });
    fetchFollowUpLeads.mockResolvedValue({ ok: false, error: "boom" });
    const html = renderToStaticMarkup(await AdminLeadsPage());
    expect(html).toContain("Couldn");
    expect(html).not.toContain("No follow-up leads yet");
  });
});
