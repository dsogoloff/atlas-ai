// renderToString smoke tests for ParentIntro. node env, no jsdom — initial
// render per mode, no event simulation. Asserts the right mode's copy renders
// and the about-this-check section + Start button are present.

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ParentIntro } from "./ParentIntro";
import { PARENT_INTRO_COPY } from "@/lib/proctoring/copy";

// renderToString HTML-escapes apostrophes (' → &#x27;), double quotes
// (" → &quot;), and ampersands; decode them back so assertions can compare
// against the verbatim copy strings.
function render(mode: "read-aloud" | "no-assistance", tier: "K_4" | "G5_8") {
  return renderToString(
    <ParentIntro mode={mode} tier={tier} onStart={() => {}} />,
  )
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
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

  it("renders the concept-help point (verbatim, incl. the quoted example)", () => {
    // The metric-conversion point carries an embedded double-quoted example —
    // guards that the approved wording renders intact through HTML escaping.
    const conceptPoint = PARENT_INTRO_COPY.modes["no-assistance"].points!.find(
      (p) => p.includes("metric measures"),
    );
    expect(conceptPoint).toBeDefined();
    expect(html).toContain(conceptPoint!);
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

  it("places 'About this test' ABOVE the age-variant section, in both modes", () => {
    for (const mode of ["read-aloud", "no-assistance"] as const) {
      const html = render(mode, "K_4");
      const aboutIdx = html.indexOf(PARENT_INTRO_COPY.about.heading);
      const variantIdx = html.indexOf(PARENT_INTRO_COPY.modes[mode].heading);
      expect(aboutIdx).toBeGreaterThanOrEqual(0);
      expect(variantIdx).toBeGreaterThanOrEqual(0);
      expect(aboutIdx).toBeLessThan(variantIdx);
    }
  });

  it("renders body/list text at the larger text-base size (no text-sm left)", () => {
    const html = render("read-aloud", "K_4");
    expect(html).toContain("text-base text-sam-gray-dark");
    expect(html).not.toContain("text-sm");
  });

  it("renders the Start button", () => {
    const html = render("read-aloud", "K_4");
    expect(html).toContain(PARENT_INTRO_COPY.startButton);
  });
});
