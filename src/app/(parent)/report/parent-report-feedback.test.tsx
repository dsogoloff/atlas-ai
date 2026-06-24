// renderToString smoke test for the report feedback island's email link.
// node env, no jsdom. The rating island itself is covered by feedback-actions
// + analytics tests; this guards the secondary mailto link only.

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Stub the server actions so importing the module doesn't pull the
// server-only Supabase/analytics chain into this node-env render test.
vi.mock("./feedback-actions", () => ({
  recordReportViewed: vi.fn(),
  submitSatisfaction: vi.fn(),
}));

import { ParentReportFeedback } from "./parent-report-feedback";

describe("ParentReportFeedback — email-us link", () => {
  it("offers a mailto with the URL-encoded subject and no body prefill", () => {
    const html = renderToString(
      <ParentReportFeedback sessionId="s1" childId="c1" />,
    );
    expect(html).toContain(
      'href="mailto:hello@samnewyork.com?subject=Assessment%20Feedback"',
    );
    expect(html).toContain("Email us your feedback");
    // No body prefill in the mailto.
    expect(html).not.toContain("body=");
  });

  it("keeps the structured rating control intact alongside the link", () => {
    const html = renderToString(
      <ParentReportFeedback sessionId="s1" childId="c1" />,
    );
    // The primary rating path is untouched.
    expect(html).toContain("Submit feedback");
    expect(html).toContain("Was this report helpful?");
  });
});
