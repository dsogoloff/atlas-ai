// Staff top-bar sign-out control.
//
// InstructorTopBar is shared by the instructor portal and the admin view. A
// signed-in staff surface passes instructorName, so the bar shows the name +
// a Sign out control. The no-access InstructorNotice renders the bar WITHOUT a
// name (no session context) and must NOT show sign-out.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The action pulls in supabase server-only code; stub it to a plain function so
// the import chain stays test-clean. We assert the control renders, not the call.
vi.mock("@/lib/auth/sign-out", () => ({ signOutAction: async () => {} }));
vi.mock("next/link", () => ({
  default: ({ children }: { children?: unknown }) => children,
}));

import { InstructorNotice, InstructorTopBar } from "./shell";

describe("InstructorTopBar — Sign out control", () => {
  it("shows a Sign out control (in a form) for a signed-in staff user", () => {
    const html = renderToStaticMarkup(
      <InstructorTopBar instructorName="Dev Instructor" roleLabel="Admin" homeHref="/admin" />,
    );
    expect(html).toContain("Sign out");
    expect(html).toContain("Dev Instructor");
    expect(html).toContain("<form");
  });

  it("omits the Sign out control when there is no staff name", () => {
    const html = renderToStaticMarkup(<InstructorTopBar />);
    expect(html).not.toContain("Sign out");
  });
});

describe("InstructorNotice — no sign out (no session context)", () => {
  it("does not render a Sign out control", () => {
    const html = renderToStaticMarkup(
      <InstructorNotice title="Staff access required" body="No active profile." />,
    );
    expect(html).not.toContain("Sign out");
  });
});
