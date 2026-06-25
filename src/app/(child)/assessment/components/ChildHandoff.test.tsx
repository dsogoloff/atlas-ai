// renderToString smoke tests for the production ChildHandoff screen. node env,
// no jsdom — initial render only, no event simulation. Covers the handoff copy
// and the single Continue control; asserts it carries no test-type chooser.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChildHandoff } from "./ChildHandoff";

function render(tier: "K_4" | "G5_8") {
  return renderToString(
    <ChildHandoff tier={tier} onContinue={() => {}} />,
  )
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'");
}

describe("ChildHandoff", () => {
  it("renders the parent-facing handoff message and a single continue control", () => {
    const html = render("K_4");
    expect(html).toContain("Pass the screen to your child");
    expect(html).toContain("Hand the device to your child to begin.");
    expect(html).toContain("<button");
    // Single primary control — no type chooser.
    expect(html.match(/<button/g)?.length).toBe(1);
  });

  it("does NOT offer a test-type choice (short is the only production path)", () => {
    const html = render("K_4");
    expect(html).not.toContain("Choose test type");
    expect(html).not.toContain("Comprehensive");
    expect(html).not.toContain('type="radio"');
  });

  it("renders for the G5-8 tier too", () => {
    const html = render("G5_8");
    expect(html).toContain("Pass the screen to your child");
    expect(html).toContain("<button");
  });
});
