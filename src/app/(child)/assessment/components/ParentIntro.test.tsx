// renderToString smoke tests for ParentIntro. node env, no jsdom — initial
// render per mode, no event simulation. Asserts the right mode's copy renders
// and the about-this-check section + Start button are present.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ParentIntro } from "./ParentIntro";
import { PARENT_INTRO_COPY } from "@/lib/proctoring/copy";

// renderToString HTML-escapes apostrophes (' → &#x27;) and ampersands; decode
// them back so assertions can compare against the verbatim copy strings.
function render(mode: "read-aloud" | "no-assistance", tier: "K_4" | "G5_8") {
  return renderToString(
    <ParentIntro mode={mode} tier={tier} onStart={() => {}} />,
  )
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("ParentIntro / read-aloud mode", () => {
  const html = render("read-aloud", "K_4");

  it("renders the read-aloud heading and the can/don't lists", () => {
    const m = PARENT_INTRO_COPY.modes["read-aloud"];
    expect(html).toContain(m.heading);
    expect(html).toContain(m.canTitle!);
    expect(html).toContain(m.canPoints![0]);
    expect(html).toContain(m.dontTitle!);
    expect(html).toContain(m.dontPoints![0]);
  });

  it("renders the clean-line summary (words OK / math not OK)", () => {
    expect(html).toContain(PARENT_INTRO_COPY.modes["read-aloud"].summary);
  });

  it("does NOT render the no-assistance summary", () => {
    expect(html).not.toContain(
      PARENT_INTRO_COPY.modes["no-assistance"].summary,
    );
  });
});

describe("ParentIntro / no-assistance mode", () => {
  const html = render("no-assistance", "G5_8");

  it("renders the no-assistance heading, points, and summary", () => {
    const m = PARENT_INTRO_COPY.modes["no-assistance"];
    expect(html).toContain(m.heading);
    expect(html).toContain(m.points![0]);
    expect(html).toContain(m.summary);
  });

  it("does NOT render the read-aloud 'It's okay to' list", () => {
    expect(html).not.toContain(PARENT_INTRO_COPY.modes["read-aloud"].canTitle!);
  });
});

describe("ParentIntro / common chrome", () => {
  it("renders the about-this-check section in both modes", () => {
    for (const mode of ["read-aloud", "no-assistance"] as const) {
      const html = render(mode, "K_4");
      expect(html).toContain(PARENT_INTRO_COPY.about.heading);
      expect(html).toContain(PARENT_INTRO_COPY.about.points[0]);
    }
  });

  it("renders the Start button", () => {
    const html = render("read-aloud", "K_4");
    expect(html).toContain(PARENT_INTRO_COPY.startButton);
  });
});
