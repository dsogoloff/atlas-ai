// renderToString smoke tests for BetaWelcome. node env, no jsdom — initial
// render per tier, no event simulation. Asserts the founder-approved copy
// (heading, every body paragraph, the Continue button) renders, and that no
// mascot is present on this screen.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BetaWelcome, BETA_WELCOME_COPY } from "./BetaWelcome";

// renderToString HTML-escapes apostrophes (' → &#x27;) and ampersands; decode
// them back so assertions can compare against the verbatim copy strings.
function render(tier: "K_4" | "G5_8") {
  return renderToString(<BetaWelcome tier={tier} onContinue={() => {}} />)
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("BetaWelcome", () => {
  it("renders the heading, every body paragraph, and the Continue button", () => {
    const html = render("K_4");
    expect(html).toContain(BETA_WELCOME_COPY.heading);
    for (const paragraph of BETA_WELCOME_COPY.body) {
      expect(html).toContain(paragraph);
    }
    expect(html).toContain(BETA_WELCOME_COPY.continueButton);
    expect(html).toContain("<button");
  });

  it("renders for the G5-8 tier too", () => {
    const html = render("G5_8");
    expect(html).toContain(BETA_WELCOME_COPY.heading);
    expect(html).toContain(BETA_WELCOME_COPY.continueButton);
  });

  it("shows no mascot on this screen (plain/calm by design)", () => {
    const html = render("K_4");
    // The mascot renders an <img>; the beta welcome must not.
    expect(html).not.toContain("<img");
  });
});
