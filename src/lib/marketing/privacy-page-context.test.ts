import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { buildEventPayload, MARKETING_EVENTS } from "./events";
import type { QueuedEvent } from "./event-queue";
import {
  containsUuid,
  documentIsSafeForPixel,
  ga4PageContext,
  redactPath,
  redactUrl,
} from "./redact";
import {
  dispatchMarketingEvent,
  metaMaySendFrom,
  type DispatchHandles,
} from "./track";

// THE PRIVACY BOUNDARY GUARD (COPPA — strategy §2.5, §6.3).
//
// "No child data leaves the box" has to hold for PAGE CONTEXT, not just the
// event payload. GA4 sends dl/dp/dr and Meta sends dl/rl on every hit, read
// from the document — the payload allowlist cannot see any of it. A child UUID
// in /report?child=<uuid> was reaching Google and Meta that way, confirmed on
// live prod.
//
// These tests are the thing that fails if that regresses.

const CHILD_UUID = "c284af8d-80bc-4c25-9894-04cd23510748";
const SESSION_UUID = "1d9d158e-184c-47d5-be47-4685dd420722";

/** Real identifier-bearing URLs from the live app. */
const IDENTIFYING_URLS = [
  `https://app.samnewyork.com/report?child=${CHILD_UUID}`,
  `https://app.samnewyork.com/report?child=${CHILD_UUID}&utm_source=facebook`,
  `https://app.samnewyork.com/assessment?child_id=${CHILD_UUID}`,
  `https://app.samnewyork.com/edit-child/${CHILD_UUID}`,
  `https://app.samnewyork.com/report?session=${SESSION_UUID}`,
];

describe("nothing sent to GA4 as page context can identify a child", () => {
  it.each(IDENTIFYING_URLS)("redacts %s", (url) => {
    const context = ga4PageContext(url, url);
    for (const [key, value] of Object.entries(context)) {
      expect(containsUuid(value), `${key} leaked a UUID`).toBe(false);
      expect(value).not.toContain(CHILD_UUID);
      expect(value).not.toContain(SESSION_UUID);
    }
  });

  it.each(IDENTIFYING_URLS)("page_location/page_path carry no id for %s", (url) => {
    expect(containsUuid(redactUrl(url))).toBe(false);
    expect(containsUuid(redactPath(url))).toBe(false);
  });
});

describe("the Meta Pixel never sends from an identifier-bearing document", () => {
  it.each(IDENTIFYING_URLS)("refuses to send from %s", (url) => {
    // Meta's URL cannot be overridden, so the only safe answer is "do not send".
    expect(metaMaySendFrom(url)).toBe(false);
    expect(documentIsSafeForPixel(url, "")).toBe(false);
  });

  it("refuses when only the REFERRER is identifying (Meta puts it in rl)", () => {
    expect(
      documentIsSafeForPixel(
        "https://app.samnewyork.com/dashboard",
        `https://app.samnewyork.com/report?child=${CHILD_UUID}`,
      ),
    ).toBe(false);
  });

  it("still sends from a clean parent surface", () => {
    expect(metaMaySendFrom("https://app.samnewyork.com/dashboard")).toBe(true);
    expect(
      documentIsSafeForPixel("https://app.samnewyork.com/dashboard", ""),
    ).toBe(true);
  });

  it("QUEUES rather than drops the conversion when Meta is gated off", () => {
    // The report route is exactly this case: GA4 still receives the event
    // (redacted), Meta gets it later from a clean URL. Nothing is lost.
    const queuedMeta: QueuedEvent[] = [];
    const handles: DispatchHandles = {
      gtag: vi.fn(),
      fbq: null, // what browserHandles() produces on an identifying document
      enqueueGa4: () => {
        throw new Error("GA4 should not need the queue here");
      },
      enqueueMeta: (event) => queuedMeta.push(event),
      nowMs: 1_770_000_000_000,
    };

    const payload = buildEventPayload({}, { assessment_type: "short" });
    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      payload,
      handles,
    );

    expect(result).toEqual({ ga4: "sent", meta: "queued" });
    expect(queuedMeta).toHaveLength(1);
  });
});

describe("page context never travels through the event payload", () => {
  it("buildEventPayload still drops page_location / page_path / referrer", () => {
    // Page context is set globally on the tag, NOT smuggled through the payload
    // allowlist — so the allowlist stays the narrow thing it was designed to be.
    const payload = buildEventPayload(
      {},
      {
        assessment_type: "short",
        page_location: `https://app.samnewyork.com/report?child=${CHILD_UUID}`,
        page_path: `/report?child=${CHILD_UUID}`,
        page_referrer: "https://example.com",
      },
    );
    expect(payload).toEqual({ assessment_type: "short" });
    expect(JSON.stringify(payload)).not.toContain(CHILD_UUID);
  });
});

describe("the GA4 wiring keeps the ordering that makes redaction work", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/marketing/ga4-script.tsx"),
    "utf8",
  );

  it("applies the redacted context with gtag('set', ...)", () => {
    // Verified against the live tag: a second gtag('config', ..) with
    // page_location does NOT take effect, so `set` is the only working API.
    expect(source).toContain('gtag("set", ga4PageContext(');
  });

  it("calls set BEFORE config, so the automatic page_view is redacted too", () => {
    const setIndex = source.indexOf('gtag("set"');
    const configIndex = source.indexOf('gtag("config"');
    expect(setIndex).toBeGreaterThan(-1);
    expect(configIndex).toBeGreaterThan(-1);
    expect(setIndex).toBeLessThan(configIndex);
  });

  it("derives the context from the real document, not a hardcoded value", () => {
    expect(source).toContain("window.location.href");
    expect(source).toContain("document.referrer");
  });
});
