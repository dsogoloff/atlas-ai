import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// LOAD-ORDER GUARD (Finding 1 from the #208 live trace).
//
// The GA4 tag is wired up by <MarketingAnalytics/>'s effect. React runs effects
// in tree order, so the island must be rendered BEFORE {children} for the tag to
// exist by the time a conversion call site inside the page fires its own mount
// effect — `assessment_complete` in report-article.tsx is exactly that case.
//
// The GA4 config is injected client-side after hydration; it is NOT in the SSR
// HTML. Before the GA4 queue existed, a swap of these two lines silently dropped
// every report conversion — no error, no failing test, just a missing key event.
//
// ga4-queue.ts now makes that survivable (an event raised too early is queued and
// flushed when the tag appears). This test keeps the ordering correct anyway, so
// the queue stays a safety net rather than the normal path.

const ROOT = process.cwd();

const LAYOUTS_WITH_ANALYTICS = [
  "src/app/(marketing)/layout.tsx",
  "src/app/(auth)/layout.tsx",
  "src/app/(parent)/layout.tsx",
  "src/app/(child)/layout.tsx",
];

describe("analytics island is mounted before the page tree", () => {
  it.each(LAYOUTS_WITH_ANALYTICS)(
    "%s renders <MarketingAnalytics/> before {children}",
    (file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");

      const islandIndex = source.indexOf("<MarketingAnalytics");
      const childrenIndex = source.indexOf("{children}");

      expect(islandIndex, "MarketingAnalytics is not mounted").toBeGreaterThan(
        -1,
      );
      expect(childrenIndex, "{children} is not rendered").toBeGreaterThan(-1);
      expect(
        islandIndex,
        "MarketingAnalytics must render BEFORE {children} so the GA4 tag is " +
          "wired before a page-level conversion effect fires",
      ).toBeLessThan(childrenIndex);
    },
  );
});

describe("the GA4 half has the same durability as the Meta half", () => {
  const trackSource = readFileSync(
    path.join(ROOT, "src/lib/marketing/track.ts"),
    "utf8",
  );

  it("queues the GA4 event when gtag is unavailable", () => {
    expect(trackSource).toContain("enqueueGa4");
  });

  it("has no path where a GA4 event is silently discarded", () => {
    // The old failure mode was a literal "skipped" outcome that dropped the
    // event. Both destinations are now "sent" | "queued". Comments are stripped
    // so the header EXPLAINING the old behaviour is not read as code.
    const code = trackSource
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    expect(code).not.toContain('"skipped"');
  });

  it("the GA4 queue is drained when the tag comes up", () => {
    const ga4Source = readFileSync(
      path.join(ROOT, "src/components/marketing/ga4-script.tsx"),
      "utf8",
    );
    expect(ga4Source).toContain("drainGa4Queue");
  });
});
