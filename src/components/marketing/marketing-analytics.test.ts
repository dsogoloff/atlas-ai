import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Placement guard for the trackers. These are STATIC SOURCE assertions rather
// than renders: next/script needs the Next runtime, and what actually matters
// here is which layouts mount the pixel — a wiring fact, not a render result.
//
// The rule being enforced (COPPA / task brief): the Meta Pixel loads on
// parent-facing surfaces ONLY. It must never be mounted anywhere under the
// (child) assessment route, where a child is answering items.

const ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

/** Drop `//` comment lines so a header that DESCRIBES the rule is not mistaken
 *  for code that implements (or violates) it. */
function stripComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const PARENT_FACING_LAYOUTS = [
  "src/app/(marketing)/layout.tsx",
  "src/app/(auth)/layout.tsx",
  "src/app/(parent)/layout.tsx",
];

const CHILD_LAYOUT = "src/app/(child)/layout.tsx";

describe("tracker placement", () => {
  it.each(PARENT_FACING_LAYOUTS)(
    "%s mounts the analytics island WITH the Meta Pixel",
    (file) => {
      const source = read(file);
      expect(source).toContain("MarketingAnalytics");
      expect(source).toMatch(/<MarketingAnalytics\s+pixel\s*\/>/);
    },
  );

  it("the (child) layout mounts GA4 + UTM capture but NOT the pixel", () => {
    const source = read(CHILD_LAYOUT);
    expect(source).toContain("MarketingAnalytics");
    expect(source).toMatch(/<MarketingAnalytics\s*\/>/);
    expect(source).not.toMatch(/<MarketingAnalytics\s+pixel/);
  });

  it("no file under the (child) route imports the Meta Pixel component", () => {
    // The pixel may only ever be reached through MarketingAnalytics(pixel).
    for (const file of [
      CHILD_LAYOUT,
      "src/app/(child)/assessment/page.tsx",
      "src/app/(child)/assessment/assessment-client.tsx",
    ]) {
      expect(read(file)).not.toContain("meta-pixel-script");
    }
  });

  it("MarketingAnalytics gates the pixel on the prop and defaults it off", () => {
    const source = read("src/components/marketing/marketing-analytics.tsx");
    expect(source).toContain("pixel = false");
    expect(source).toContain("{pixel ? <MetaPixelScript /> : null}");
    // GA4 + UTM capture are unconditional — measurement runs everywhere the
    // island is mounted, including the child route.
    expect(source).toContain("<Ga4Script />");
    expect(source).toContain("<UtmCapture />");
  });

  it("is not mounted in the staff (admin / instructor) groups", () => {
    for (const file of [
      "src/app/(admin)/layout.tsx",
      "src/app/(instructor)/layout.tsx",
    ]) {
      expect(read(file)).not.toContain("MarketingAnalytics");
    }
  });
});

describe("GA4 configuration", () => {
  const source = read("src/components/marketing/ga4-script.tsx");

  it("uses cookie_domain 'auto' so the cookie lands on the registrable domain", () => {
    expect(source).toContain("cookie_domain: 'auto'");
  });

  it("does NOT scope the cookie to the app subdomain", () => {
    // Any cookie_domain other than 'auto' — a pinned host, a subdomain — would
    // break the www <-> app session stitch.
    const assignments = stripComments(source).match(/cookie_domain:\s*[^,\n]+/g) ?? [];
    expect(assignments).toEqual(["cookie_domain: 'auto'"]);
  });

  it("disables Google Signals and ads personalization (COPPA)", () => {
    expect(source).toContain("allow_google_signals: false");
    expect(source).toContain("allow_ad_personalization_signals: false");
  });

  it("renders nothing when the measurement id is unset (fail safe)", () => {
    expect(source).toContain("if (!measurementId) return null;");
  });
});

describe("Meta Pixel configuration", () => {
  const source = read("src/components/marketing/meta-pixel-script.tsx");

  it("renders nothing when the pixel id is unset (fail safe)", () => {
    expect(source).toContain("if (!pixelId) return null;");
  });

  it("ships no <noscript> fallback image (it would evade the surface gate)", () => {
    expect(source).not.toMatch(/<noscript/);
    expect(source).not.toContain("facebook.com/tr?");
  });

  it("drains the deferred queue so queued events still reach Meta", () => {
    expect(source).toContain("drainMetaQueue");
  });
});

describe("conversion call sites", () => {
  it("assessment_start fires at the parent handoff, not from an item screen", () => {
    const source = read("src/app/(child)/assessment/assessment-client.tsx");
    expect(source).toContain("MARKETING_EVENTS.ASSESSMENT_START");
    // Wired to the handoff gate (ChildHandoff / DevTestModeChooser), which is
    // the last parent-context screen before the child's Welcome.
    expect(source).toContain("onContinue={confirmHandoff}");
    expect(source).toContain("onStart={confirmHandoff}");
    // Not wired to answer submission.
    expect(source).not.toMatch(/handleSubmit[\s\S]{0,400}ASSESSMENT_START/);
  });

  it("assessment_complete fires on the parent report, suppressed for staff", () => {
    const source = read("src/app/(parent)/report/report-article.tsx");
    expect(source).toContain("<ReportConversion");
    expect(source).toMatch(/!staffView && \(\s*<ReportConversion/);
  });

  it("neither call site passes child performance data", () => {
    const sources = [
      read("src/app/(child)/assessment/assessment-client.tsx"),
      read("src/app/(parent)/report/report-conversion.tsx"),
    ].join("\n");
    for (const forbidden of [
      "sam_level",
      "strand",
      "misconception",
      "score",
      "is_correct",
      "answer_given",
    ]) {
      expect(sources).not.toContain(`${forbidden}:`);
    }
  });
});
