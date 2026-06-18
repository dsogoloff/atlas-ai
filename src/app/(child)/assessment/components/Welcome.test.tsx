// renderToString smoke tests for the child Welcome screen. node env, no jsdom —
// initial render only, no event simulation. The Mascot is stubbed because it
// imports PNG modules + framer-motion that the node test env doesn't transform;
// this test covers Welcome's own layout (greeting lettering + Start button).
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./Mascot", () => ({
  Mascot: () => null,
}));

import { Welcome } from "./Welcome";

function render(childName: string, tier: "K_4" | "G5_8") {
  // Strip the SSR comment markers React inserts around interpolated text
  // ({firstName}) so assertions compare against the visible string.
  return renderToString(
    <Welcome childName={childName} tier={tier} onStart={() => {}} />,
  )
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'");
}

describe("Welcome", () => {
  it("renders the playful welcome lettering and a Start button", () => {
    const html = render("Maya Chen", "K_4");
    expect(html).toContain("Welcome!");
    expect(html).toContain("go!"); // the "Let's go!" tap button
    expect(html).toContain("<button");
  });

  it("greets the child by first name only", () => {
    const html = render("Maya Chen", "K_4");
    expect(html).toContain("Ready, Maya?");
    expect(html).not.toContain("Chen");
  });

  it("omits the name greeting when no name is provided", () => {
    const html = render("   ", "K_4");
    expect(html).toContain("Welcome!");
    expect(html).not.toContain("Ready,");
  });

  it("renders for the G5-8 tier too", () => {
    const html = render("Sam", "G5_8");
    expect(html).toContain("Welcome!");
    expect(html).toContain("Ready, Sam?");
  });
});
