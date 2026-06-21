// renderToString tests for the gated FollowUpForm. node env, no jsdom.

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Stub the server action so importing the module doesn't pull the server-only
// Supabase/Resend chain into this node-env render test.
vi.mock("./feedback-actions", () => ({ submitFollowUpLead: vi.fn() }));

import { FollowUpForm } from "./follow-up-cta";
import { READINESS_COPY } from "@/lib/report/readiness";

const noop = () => {};

// renderToString escapes apostrophes (' → &#x27;); decode so assertions match
// the verbatim copy strings (e.g. "Child's school").
function render(schoolFieldEnabled: boolean) {
  return renderToString(
    <FollowUpForm
      schoolFieldEnabled={schoolFieldEnabled}
      submitting={false}
      error={false}
      onSubmit={noop}
      schoolName=""
      setSchoolName={noop}
      parentName=""
      setParentName={noop}
      parentEmail=""
      setParentEmail={noop}
      parentPhone=""
      setParentPhone={noop}
      zip=""
      setZip={noop}
      optedIn={false}
      setOptedIn={noop}
    />,
  ).replace(/&#x27;/g, "'");
}

describe("FollowUpForm — school field gating", () => {
  it("flag OFF: does NOT render the child's-school field", () => {
    const html = render(false);
    expect(html).not.toContain(READINESS_COPY.form.schoolLabel);
    // the rest of the form still renders
    expect(html).toContain(READINESS_COPY.form.parentNameLabel);
    expect(html).toContain(READINESS_COPY.form.emailLabel);
    expect(html).toContain(READINESS_COPY.form.zipLabel);
    expect(html).toContain(READINESS_COPY.form.submitButton);
  });

  it("flag ON: renders the child's-school field (existing behavior)", () => {
    const html = render(true);
    expect(html).toContain(READINESS_COPY.form.schoolLabel);
    expect(html).toContain(READINESS_COPY.form.parentNameLabel);
  });
});

describe("FollowUpForm — required opt-in + zip", () => {
  it("renders the explicit opt-in as a required checkbox", () => {
    const html = render(true);
    expect(html).toContain(READINESS_COPY.form.optInLabel);
    expect(html).toContain('type="checkbox"');
    // The checkbox is required → renderToString emits the boolean attribute.
    expect(html).toMatch(/type="checkbox"[^>]*required/);
  });

  it("always renders the required zip field (both gate states)", () => {
    expect(render(false)).toContain(READINESS_COPY.form.zipLabel);
    expect(render(true)).toContain(READINESS_COPY.form.zipLabel);
  });
});
