import { describe, expect, it, vi } from "vitest";

// End-to-end walk of the attribution path with the browser edges stubbed:
//
//   tagged landing URL
//     -> first-touch cookie on .samnewyork.com
//       -> internal navigation (untagged) keeps it
//         -> assessment_start at the handoff  (no pixel -> GA4 sent, Meta queued)
//           -> assessment_complete on the report (pixel live -> both sent,
//              queue drained)
//
// This is the "a test with a tagged URL shows UTMs flowing through to both
// event payloads" check from the brief.

import { resolveFirstTouch } from "./attribution";
import { attributionFromCookieString, buildAttributionCookie } from "./cookie";
import { buildEventPayload, MARKETING_EVENTS } from "./events";
import { appendToQueue, pruneQueue, type QueuedMetaEvent } from "./meta-queue";
import { dispatchMarketingEvent, type DispatchHandles } from "./track";

const LANDING =
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=sam_ny_fall" +
  "&utm_content=carousel_a&utm_term=singapore%20math";

const EXPECTED_UTMS = {
  utm_source: "facebook",
  utm_medium: "paid_social",
  utm_campaign: "sam_ny_fall",
  utm_content: "carousel_a",
  utm_term: "singapore math",
};

const NOW_MS = 1_770_000_000_000;
const NOW_ISO = "2026-08-03T12:00:00.000Z";

describe("tagged visit -> both event payloads", () => {
  it("carries the UTMs from the landing URL through to GA4 and Meta", () => {
    // 1. Landing on app.samnewyork.com with a tagged URL, no cookie yet.
    const capture = resolveFirstTouch(undefined, LANDING, NOW_ISO);
    expect(capture.shouldWrite).toBe(true);

    const setCookie = buildAttributionCookie(
      capture.attribution,
      "app.samnewyork.com",
      true,
    );
    // Shared across www + app — the cross-subdomain requirement.
    expect(setCookie).toContain("Domain=.samnewyork.com");

    // 2. The jar as later pages see it (plus unrelated cookies).
    const jar = `sb-access-token=abc; ${setCookie.split(";")[0]}; theme=light`;
    const stored = attributionFromCookieString(jar);
    expect(stored).toMatchObject(EXPECTED_UTMS);

    // 3. Internal navigation to an untagged page does not clear or rewrite it.
    const onSignup = resolveFirstTouch(
      setCookie.split(";")[0].split("=").slice(1).join("="),
      "",
      NOW_ISO,
    );
    expect(onSignup.shouldWrite).toBe(false);
    expect(onSignup.attribution).toMatchObject(EXPECTED_UTMS);

    // 4. assessment_start at the handoff — child route, so no pixel.
    let queue: QueuedMetaEvent[] = [];
    const gtag = vi.fn();
    const childRouteHandles: DispatchHandles = {
      gtag,
      fbq: null,
      enqueueGa4: () => {
        throw new Error("GA4 should not queue when the tag is loaded");
      },
      enqueueMeta: (event) => {
        queue = appendToQueue(queue, event, NOW_MS);
      },
      nowMs: NOW_MS,
    };
    const startPayload = buildEventPayload(stored, {
      assessment_type: "short",
    });
    const startResult = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_START,
      startPayload,
      childRouteHandles,
    );

    expect(startResult).toEqual({ ga4: "sent", meta: "queued" });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "assessment_start",
      expect.objectContaining(EXPECTED_UTMS),
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toMatchObject(EXPECTED_UTMS);

    // 5. assessment_complete on the parent report — pixel is live.
    const fbq = vi.fn();
    const reportHandles: DispatchHandles = {
      gtag,
      fbq,
      enqueueGa4: () => {
        throw new Error("GA4 should not queue when the tag is loaded");
      },
      enqueueMeta: () => {
        throw new Error("should not queue when the pixel is loaded");
      },
      nowMs: NOW_MS + 900_000,
    };
    const completePayload = buildEventPayload(stored, {
      assessment_type: "short",
    });
    const completeResult = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      completePayload,
      reportHandles,
    );

    expect(completeResult).toEqual({ ga4: "sent", meta: "sent" });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "assessment_complete",
      expect.objectContaining(EXPECTED_UTMS),
    );
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      "assessment_complete",
      expect.objectContaining(EXPECTED_UTMS),
    );

    // 6. The deferred assessment_start is still fresh and flushes here.
    const drained = pruneQueue(queue, reportHandles.nowMs);
    expect(drained).toHaveLength(1);
    for (const event of drained) {
      fbq("trackCustom", event.name, event.payload);
    }
    expect(fbq).toHaveBeenCalledWith(
      "trackCustom",
      "assessment_start",
      expect.objectContaining(EXPECTED_UTMS),
    );

    // 7. Nothing about the child rode along on either event.
    for (const call of [...gtag.mock.calls, ...fbq.mock.calls]) {
      expect(Object.keys(call[2] as object).sort()).toEqual([
        "assessment_type",
        "first_seen",
        "utm_campaign",
        "utm_content",
        "utm_medium",
        "utm_source",
        "utm_term",
      ]);
    }
  });

  it("an untagged visitor converts with an empty payload, not a broken one", () => {
    const capture = resolveFirstTouch(undefined, "?child=abc", NOW_ISO);
    expect(capture.shouldWrite).toBe(false);

    const gtag = vi.fn();
    const fbq = vi.fn();
    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      buildEventPayload(capture.attribution),
      {
        gtag,
        fbq,
        enqueueGa4: () => {},
        enqueueMeta: () => {},
        nowMs: NOW_MS,
      },
    );

    expect(result).toEqual({ ga4: "sent", meta: "sent" });
    expect(gtag).toHaveBeenCalledWith("event", "assessment_complete", {});
  });
});
