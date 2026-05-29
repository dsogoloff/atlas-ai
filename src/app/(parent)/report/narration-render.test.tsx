// Render tests for the narration prose props.
//
// Uses renderToString from react-dom/server — no jsdom, no testing-library;
// just turn the component into an HTML string and grep for output text.
// This keeps the test surface narrow: prop in → text out, fallback when
// prop absent.
//
// Editorial reskin: section titles ("What We Noticed", recommendation
// chrome) now live in the page chrome rather than inside the leaf
// components, so the tests only assert each component's own surface.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KeyFindings } from "./key-findings";
import { PlacementCard } from "./placement-card";
import { RecommendationsCard } from "./recommendations-card";

// renderToString HTML-entity-encodes apostrophes (' → &#x27;), so test
// fixtures use apostrophe-free copy. Substring grep stays straightforward.
const NARRATION_LINE = "Steady fit at Level 3A based on the responses.";
const RECOMMENDATIONS_LEDE = "A short plan based on placement and patterns.";

describe("PlacementCard narrationLine", () => {
  it("renders narrationLine below the placement box when present", () => {
    const html = renderToString(
      <PlacementCard
        childName="Aiden"
        samLevel="S.A.M Level 3A"
        overallPercentage={70}
        tier="K_4"
        narrationLine={NARRATION_LINE}
      />,
    );
    expect(html).toContain(NARRATION_LINE);
  });

  it("renders only the placement label when narrationLine is absent", () => {
    const html = renderToString(
      <PlacementCard
        childName="Aiden"
        samLevel="S.A.M Level 3A"
        overallPercentage={70}
        tier="K_4"
      />,
    );
    // Half-level letter is stripped for parent-facing display (R2).
    expect(html).toContain("S.A.M Level 3");
    expect(html).not.toContain(NARRATION_LINE);
  });
});

describe("KeyFindings", () => {
  const STRENGTH_ONE = "Whole Numbers consistent mastery across these items.";
  const STRENGTH_TWO = "Measurement solid command of the measurement items.";
  const GROWTH_ONE = "Fraction comparison followed denominator size only.";
  const GROWTH_TWO = "Keyword-driven operation choice in word problems.";

  it("renders all strengths then all growth areas in a numbered list", () => {
    const html = renderToString(
      <KeyFindings
        strengths={[STRENGTH_ONE, STRENGTH_TWO]}
        growthAreas={[GROWTH_ONE, GROWTH_TWO]}
      />,
    );
    expect(html).toContain(STRENGTH_ONE);
    expect(html).toContain(STRENGTH_TWO);
    expect(html).toContain(GROWTH_ONE);
    expect(html).toContain(GROWTH_TWO);
    // <ol> drives the numbering — keeps the renderer in charge of the
    // visible numbers (the brief: items must not include numbers themselves).
    expect(html).toContain("<ol");
    // Numbered eyebrow per card — strengths first, then growth areas.
    expect(html).toContain("Finding 01");
    expect(html).toContain("Finding 04");
  });

  it("renders strengths-only when growth areas are empty", () => {
    const html = renderToString(
      <KeyFindings strengths={[STRENGTH_ONE]} growthAreas={[]} />,
    );
    expect(html).toContain(STRENGTH_ONE);
    expect(html).not.toContain(GROWTH_ONE);
  });

  it("renders growth-areas-only when strengths are empty (thin-bank case)", () => {
    const html = renderToString(
      <KeyFindings strengths={[]} growthAreas={[GROWTH_ONE]} />,
    );
    expect(html).toContain(GROWTH_ONE);
    expect(html).not.toContain(STRENGTH_ONE);
  });

  it("renders an empty-state message when both arrays are empty", () => {
    const html = renderToString(<KeyFindings strengths={[]} growthAreas={[]} />);
    expect(html).toContain("No specific findings to surface");
    expect(html).not.toContain("<ol");
  });
});

describe("RecommendationsCard narrationLede", () => {
  it("renders narrationLede above the recommendations box when present", () => {
    const html = renderToString(
      <RecommendationsCard
        recommendations={[]}
        narrationLede={RECOMMENDATIONS_LEDE}
        childName="Aiden"
        placementLabel="S.A.M Level 3"
      />,
    );
    expect(html).toContain(RECOMMENDATIONS_LEDE);
  });

  it("renders without the lede when absent", () => {
    const html = renderToString(
      <RecommendationsCard
        recommendations={[]}
        childName="Aiden"
        placementLabel="S.A.M Level 3"
      />,
    );
    expect(html).not.toContain(RECOMMENDATIONS_LEDE);
  });
});
