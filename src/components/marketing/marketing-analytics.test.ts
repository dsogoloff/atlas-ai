import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

/** Drop comments so a header (or a JSX `{/* … *\/}` block) that DESCRIBES the
 *  rule is not mistaken for code that implements — or violates — it. Block
 *  comments go first, then whole-line `//` comments. Both forms matter here:
 *  the (child) layout carries a long JSX comment explaining exactly which tags
 *  must never be mounted, and it names them. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
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

  it("the (child) layout mounts NO analytics island at all (ATLAS-006)", () => {
    const source = stripComments(read(CHILD_LAYOUT));
    expect(source).not.toContain("MarketingAnalytics");
    expect(source).not.toContain("Ga4Script");
    expect(source).not.toContain("MetaPixelScript");
    // First-party UTM continuity stays — it makes no network request and
    // contacts no third party.
    expect(source).toContain("<UtmCapture />");
  });

  it("MarketingAnalytics gates the pixel on the prop and defaults it off", () => {
    const source = read("src/components/marketing/marketing-analytics.tsx");
    expect(source).toContain("pixel = false");
    expect(source).toContain("{pixel ? <MetaPixelScript /> : null}");
    // GA4 + UTM capture are unconditional WHERE THE ISLAND IS MOUNTED — which,
    // since ATLAS-006, is parent-facing surfaces only.
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

// ===========================================================================
// ATLAS-006 — no third-party tag is REACHABLE from the child assessment tree
// ===========================================================================
//
// A per-file grep only catches a direct import. This walks the whole static
// import graph from the (child) segment, so re-mounting GA4 anywhere in that
// subtree — or behind a helper two hops away — fails here.

const CHILD_SEGMENT = "src/app/(child)";

/** Every .ts/.tsx file under a directory, tests excluded. */
function sourceFilesUnder(relativeDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(path.join(ROOT, relativeDir));
  return out;
}

/** Resolve an import specifier to a file on disk, or null if it is external. */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = path.join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null; // node_modules / next / react — not ours to walk
  }

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Transitive closure of local modules reachable from `entries`. */
function importClosure(entries: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...entries];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, "utf8");
    const specifiers = [
      ...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g),
    ].map((m) => m[1]);

    for (const specifier of specifiers) {
      const resolved = resolveSpecifier(specifier, file);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

describe("ATLAS-006 — child assessment tree reaches no third-party tag", () => {
  const entries = sourceFilesUnder(CHILD_SEGMENT);
  const closure = importClosure(entries);

  it("the segment actually has files and a non-trivial closure (not vacuous)", () => {
    expect(entries.length).toBeGreaterThan(2);
    expect(closure.size).toBeGreaterThan(entries.length);
  });

  it.each(["ga4-script", "meta-pixel-script"])(
    "no module reachable from (child) is %s",
    (tagModule) => {
      const offenders = [...closure]
        .filter((f) => f.includes(path.join("components", "marketing", tagModule)))
        .map((f) => f.replace(ROOT, ""));
      expect(offenders).toEqual([]);
    },
  );

  it("no file under (child) references gtag, fbq or the measurement id", () => {
    for (const file of entries) {
      const source = stripComments(readFileSync(file, "utf8"));
      expect(source, `${file} references gtag`).not.toMatch(/\bgtag\b/);
      expect(source, `${file} references fbq`).not.toMatch(/\bfbq\b/);
      expect(source, `${file} hardcodes a GA4 id`).not.toMatch(/G-[A-Z0-9]{8,}/);
    }
  });
});

describe("ATLAS-006 — the child boundary is enforced outside the layout too", () => {
  it("every route under (child) is covered by CHILD_SURFACE_PREFIXES", () => {
    // Route groups are erased from the URL, so the runtime boundary has to be
    // stated as paths. If a new route is added under (child) without adding its
    // path here, track.ts would keep using gtag on it — so fail now.
    const routeDirs = sourceFilesUnder(CHILD_SEGMENT)
      .filter((f) => /[\\/]page\.tsx$/.test(f))
      .map((f) =>
        "/" +
        path
          .relative(path.join(ROOT, CHILD_SEGMENT), path.dirname(f))
          .split(path.sep)
          .filter((s) => !s.startsWith("(") && s !== ".")
          .join("/"),
      );

    const prefixes = read("src/lib/marketing/child-surface.ts");
    for (const route of routeDirs) {
      const top = "/" + route.split("/").filter(Boolean)[0];
      expect(prefixes, `${route} is not covered`).toContain(`"${top}"`);
    }
  });

  it("entry into the assessment is a HARD navigation, not next/link", () => {
    // next/link keeps the document — and any already-injected GA4 tag — alive
    // across the boundary. A plain <a> guarantees a fresh child document.
    for (const file of [
      "src/app/(parent)/dashboard/child-card.tsx",
      "src/app/(parent)/report/page.tsx",
      "src/app/(parent)/report/time-flag-banner.tsx",
    ]) {
      const source = read(file);
      const linkToAssessment = /<Link[^>]*href=\{`\/assessment/.test(source);
      expect(linkToAssessment, `${file} uses <Link> into /assessment`).toBe(false);
      expect(source).toMatch(/<a\s+href=\{`\/assessment/);
    }
  });

  it("track.ts refuses to use gtag on a child surface", () => {
    const source = stripComments(read("src/lib/marketing/track.ts"));
    expect(source).toContain("analyticsMaySendFrom");
    expect(source).toMatch(/gtag:\s*ga4Allowed\s*&&/);
  });

  it("the child-surface predicate fails CLOSED on an unreadable href", () => {
    const source = read("src/lib/marketing/child-surface.ts");
    expect(source).toContain("return true; // unreadable URL -> assume child surface");
    expect(source).toContain("if (!href) return false;");
  });
});

// Full fresh-browser network verification belongs to the ATLAS-017 Playwright
// layer, which does not exist yet. Listed here so the cases are not lost.
describe("ATLAS-006 — pending E2E (ATLAS-017 Playwright layer)", () => {
  it.todo("fresh browser -> /assessment with an INVALID child_id: zero GA/Meta requests, zero GA/Meta cookies");
  it.todo("fresh browser -> /assessment with an EXPIRED session: zero GA/Meta requests");
  it.todo("fresh browser -> /assessment with NO consent on file: zero GA/Meta requests");
  it.todo("fresh browser -> /assessment valid session, answer items: zero GA/Meta requests throughout");
  it.todo("fresh browser -> /assessment completed session: zero GA/Meta requests");
  it.todo("parent /dashboard -> click Start Assessment: document reloads and the child page carries no gtag");
  it.todo("assessment_start queued on the child route is flushed once the parent returns to a parent surface");
});

describe("GA4 configuration", () => {
  const source = read("src/components/marketing/ga4-script.tsx");

  it("uses cookie_domain 'auto' so the cookie lands on the registrable domain", () => {
    expect(stripComments(source)).toMatch(/cookie_domain:\s*["']auto["']/);
  });

  it("does NOT scope the cookie to the app subdomain", () => {
    // Any cookie_domain other than 'auto' — a pinned host, a subdomain — would
    // break the www <-> app session stitch.
    const assignments =
      stripComments(source).match(/cookie_domain:\s*[^,\n]+/g) ?? [];
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatch(/^cookie_domain:\s*["']auto["']$/);
  });

  it("disables Google Signals and ads personalization (COPPA)", () => {
    expect(source).toContain("allow_google_signals: false");
    expect(source).toContain("allow_ad_personalization_signals: false");
  });

  it("renders nothing when the measurement id is unset (fail safe)", () => {
    expect(source).toContain("if (!measurementId) return null;");
  });

  it("redacts page context so no child id reaches GA4 (COPPA)", () => {
    // Detail and ordering are pinned in lib/marketing/privacy-page-context.test.ts.
    expect(source).toContain("ga4PageContext");
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

  it("will not load from a document whose URL could identify a child (COPPA)", () => {
    // Meta gives no way to override the URL it reports, so the gate is
    // "do not send from here". Behaviour is pinned in
    // lib/marketing/privacy-page-context.test.ts.
    expect(source).toContain("documentIsSafeForPixel");
    expect(source).toContain("if (!documentSafe) return null;");
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
