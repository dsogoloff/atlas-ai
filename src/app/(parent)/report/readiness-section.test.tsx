// renderToString tests for ReadinessSection — both report branches.
// node env, no jsdom.

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Stub the server action so importing FollowUpCta doesn't pull the server-only
// Supabase/Resend chain into this node-env render test.
vi.mock("./feedback-actions", () => ({ submitFollowUpLead: vi.fn() }));

import { ReadinessSection } from "./readiness-section";
import { READINESS_COPY } from "@/lib/report/readiness";

const SID = "00000000-0000-4000-8000-00000a1de003";

// Words that would indicate shaming / "not ready" framing — must NEVER appear.
const NEGATIVE_WORDS = [
  "not ready",
  "not yet ready",
  "isn't ready",
  "fail",
  "behind",
  "below",
  "struggl",
];

describe("ReadinessSection — clean pass (ready)", () => {
  const html = renderToString(
    <ReadinessSection
      readiness={{ ready: true, currentLevelLabel: "Grade 5" }}
      sessionId={SID}
      schoolFieldEnabled={false}
    />,
  );

  it("renders the upside-only readiness line with the current level", () => {
    expect(html).toContain(READINESS_COPY.readyLine("Grade 5"));
  });

  it("renders the comprehensive CTA", () => {
    expect(html).toContain(READINESS_COPY.comprehensiveCtaButton);
    expect(html).toContain(READINESS_COPY.comprehensiveCtaHeading);
  });
});

describe("ReadinessSection — not a clean pass (line absent, no negativity)", () => {
  const html = renderToString(
    <ReadinessSection
      readiness={{ ready: false, currentLevelLabel: "Grade 5" }}
      sessionId={SID}
      schoolFieldEnabled={false}
    />,
  );

  it("does NOT render the readiness line", () => {
    expect(html).not.toContain(READINESS_COPY.readyLine("Grade 5"));
    expect(html).not.toContain("appears ready for");
  });

  it("contains NO negative / shaming language", () => {
    const lower = html.toLowerCase();
    for (const word of NEGATIVE_WORDS) {
      expect(lower).not.toContain(word);
    }
  });

  it("still renders the SAME comprehensive CTA", () => {
    expect(html).toContain(READINESS_COPY.comprehensiveCtaButton);
    expect(html).toContain(READINESS_COPY.comprehensiveCtaHeading);
  });
});

describe("ReadinessSection — comprehensive session (null readiness)", () => {
  it("renders nothing (no readiness UI for comprehensive)", () => {
    const html = renderToString(
      <ReadinessSection readiness={null} sessionId={SID} schoolFieldEnabled={false} />,
    );
    expect(html).toBe("");
  });
});
