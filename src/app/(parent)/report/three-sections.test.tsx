// Render tests for the three-section split: Strengths / Areas-to-confirm /
// Placement recommendation. renderToString → grep output text (same approach
// as narration-render.test.tsx). renderToString HTML-encodes apostrophes, so
// assertions use apostrophe-free substrings.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FindingsList } from "./findings-list";
import { PlacementRecommendation } from "./placement-recommendation";

describe("FindingsList", () => {
  it("renders every item as a list entry", () => {
    const html = renderToString(
      <FindingsList items={["Solid number sense to 100.", "Reads bar models."]} />,
    );
    expect(html).toContain("Solid number sense to 100.");
    expect(html).toContain("Reads bar models.");
    expect(html).toContain("<ul");
  });

  it("renders nothing when there are no items", () => {
    const html = renderToString(<FindingsList items={[]} />);
    expect(html).toBe("");
  });
});

describe("PlacementRecommendation", () => {
  // Founder decision 2026-06-18 (D3): the "first half / second half" entry-point
  // framing is dropped — parents see the S.A.M booklet level verbatim.
  it("shows the S.A.M booklet level verbatim as the starting point", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 3" />,
    );
    expect(html).toContain("S.A.M Level 3");
  });

  it("renders the forward CTA and never a pacing number or half-level phrase", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 3" />,
    );
    expect(html).toContain(
      "estimate how quickly your child progresses once classes begin",
    );
    expect(html).not.toContain("first half");
    expect(html).not.toContain("second half");
    // No fabricated time-to-advance: no "week(s)" claim in the output.
    expect(html.toLowerCase()).not.toContain("week");
  });

  it("shows a 0-band booklet level verbatim (e.g. 0C, no half-level)", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 0C" />,
    );
    expect(html).toContain("S.A.M Level 0C");
    expect(html).not.toContain("first half");
  });
});
