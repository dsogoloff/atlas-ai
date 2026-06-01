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
  it("surfaces the band plus the half-level as a plain entry point", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 2B" />,
    );
    expect(html).toContain("S.A.M Level 2, second half");
  });

  it("renders the forward CTA and never a pacing number", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 3A" />,
    );
    expect(html).toContain("S.A.M Level 3, first half");
    expect(html).toContain(
      "estimate how quickly your child progresses once classes begin",
    );
    // No fabricated time-to-advance: no "week(s)" claim in the output.
    expect(html.toLowerCase()).not.toContain("week");
  });

  it("omits the half phrase when the label has no trailing A/B", () => {
    const html = renderToString(
      <PlacementRecommendation samLevel="S.A.M Level 2" />,
    );
    expect(html).toContain("S.A.M Level 2");
    expect(html).not.toContain("second half");
    expect(html).not.toContain("first half");
  });
});
