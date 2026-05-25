// Render tests for the narration prose props added in Piece 4.
//
// Uses renderToString from react-dom/server — no jsdom, no testing-library;
// just turn the component into an HTML string and grep for the lede text.
// This keeps the test surface narrow: prop in → text out, fallback when
// prop absent. The brief's "narration absent → renders as before" case is
// implicitly proven because the optional prop defaults to no-extra-output;
// existing test runs against unchanged JSX paths still pass.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MisconceptionList } from "./misconception-list";
import { PlacementCard } from "./placement-card";
import { RecommendationsCard } from "./recommendations-card";

// renderToString HTML-entity-encodes apostrophes (' → &#x27;), so test
// fixtures use apostrophe-free copy. Substring grep stays straightforward.
const NARRATION_LINE = "Steady fit at Level 3A based on the responses.";
const MISCONCEPTIONS_LEDE = "Two patterns came up across the responses.";
const RECOMMENDATIONS_LEDE = "A short plan based on placement and patterns.";

describe("PlacementCard narrationLine", () => {
  it("renders narrationLine in the warm-sentence slot when present", () => {
    const html = renderToString(
      <PlacementCard
        childName="Aiden"
        samLevel="S.A.M. Level 3A"
        overallPercentage={70}
        tier="K_4"
        narrationLine={NARRATION_LINE}
      />,
    );
    expect(html).toContain(NARRATION_LINE);
    // Tier-aware hardcoded flavor must NOT also appear — replacement, not
    // addition (the slot is "one warm sentence under the level," singular).
    expect(html).not.toContain("strong conceptual understanding");
  });

  it("falls back to the hardcoded flavor sentence when narrationLine is absent", () => {
    const html = renderToString(
      <PlacementCard
        childName="Aiden"
        samLevel="S.A.M. Level 3A"
        overallPercentage={70}
        tier="K_4"
      />,
    );
    expect(html).toContain("strong conceptual understanding");
  });
});

describe("MisconceptionList narrationLede", () => {
  it("renders narrationLede above the cards when present", () => {
    const html = renderToString(
      <MisconceptionList
        childName="Aiden"
        rows={[]}
        narrationLede={MISCONCEPTIONS_LEDE}
      />,
    );
    expect(html).toContain(MISCONCEPTIONS_LEDE);
  });

  it("renders without the lede when absent", () => {
    const html = renderToString(
      <MisconceptionList childName="Aiden" rows={[]} />,
    );
    expect(html).not.toContain(MISCONCEPTIONS_LEDE);
  });
});

describe("RecommendationsCard narrationLede", () => {
  it("renders narrationLede above the recommendations list when present", () => {
    const html = renderToString(
      <RecommendationsCard
        childName="Aiden"
        recommendations={[]}
        narrationLede={RECOMMENDATIONS_LEDE}
      />,
    );
    expect(html).toContain(RECOMMENDATIONS_LEDE);
  });

  it("renders without the lede when absent", () => {
    const html = renderToString(
      <RecommendationsCard childName="Aiden" recommendations={[]} />,
    );
    expect(html).not.toContain(RECOMMENDATIONS_LEDE);
  });
});
