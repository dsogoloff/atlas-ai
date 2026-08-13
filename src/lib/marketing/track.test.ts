import { describe, expect, it, vi } from "vitest";

import { parseUtmParams } from "./attribution";
import { buildEventPayload, MARKETING_EVENTS } from "./events";
import type { QueuedMetaEvent } from "./meta-queue";
import { dispatchMarketingEvent, type DispatchHandles } from "./track";

const TAGGED = parseUtmParams(
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=sam_ny_fall",
);

function handles(over: Partial<DispatchHandles> = {}) {
  const queued: QueuedMetaEvent[] = [];
  const ga4Queued: QueuedMetaEvent[] = [];
  const base: DispatchHandles = {
    gtag: vi.fn(),
    fbq: vi.fn(),
    enqueueGa4: (event) => ga4Queued.push(event),
    enqueueMeta: (event) => queued.push(event),
    nowMs: 1_770_000_000_000,
    ...over,
  };
  return { handles: base, queued, ga4Queued };
}

describe("dispatchMarketingEvent", () => {
  it("sends the SAME event name and payload to GA4 and Meta", () => {
    const { handles: h } = handles();
    const payload = buildEventPayload(TAGGED, { assessment_type: "short" });

    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      payload,
      h,
    );

    expect(result).toEqual({ ga4: "sent", meta: "sent" });
    expect(h.gtag).toHaveBeenCalledWith(
      "event",
      "assessment_complete",
      payload,
    );
    expect(h.fbq).toHaveBeenCalledWith(
      "trackCustom",
      "assessment_complete",
      payload,
    );
  });

  it("a tagged visit shows the UTMs in BOTH payloads", () => {
    const { handles: h } = handles();
    const payload = buildEventPayload(TAGGED);

    dispatchMarketingEvent(MARKETING_EVENTS.ASSESSMENT_START, payload, h);

    const gaParams = vi.mocked(h.gtag!).mock.calls[0][2];
    const metaParams = vi.mocked(h.fbq!).mock.calls[0][2];
    for (const params of [gaParams, metaParams]) {
      expect(params).toMatchObject({
        utm_source: "facebook",
        utm_medium: "paid_social",
        utm_campaign: "sam_ny_fall",
      });
    }
  });

  it("QUEUES the Meta half when no pixel is loaded (the child route)", () => {
    const { handles: h, queued } = handles({ fbq: null });
    const payload = buildEventPayload(TAGGED, { assessment_type: "short" });

    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_START,
      payload,
      h,
    );

    expect(result).toEqual({ ga4: "sent", meta: "queued" });
    expect(queued).toEqual([
      { name: "assessment_start", payload, at: h.nowMs },
    ]);
  });

  it("QUEUES the GA4 half when the tag has not loaded, without disturbing Meta", () => {
    // Regression guard for Finding 1: this used to return "skipped" and the
    // event was lost permanently, while Meta queued and replayed.
    const { handles: h, ga4Queued } = handles({ gtag: null });
    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      {},
      h,
    );
    expect(result).toEqual({ ga4: "queued", meta: "sent" });
    expect(ga4Queued).toEqual([
      { name: "assessment_complete", payload: {}, at: h.nowMs },
    ]);
    expect(h.fbq).toHaveBeenCalledOnce();
  });

  it("never throws when a sink throws, and still tries the other", () => {
    const { handles: h, queued, ga4Queued } = handles({
      gtag: vi.fn(() => {
        throw new Error("blocked by extension");
      }),
    });
    const result = dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      {},
      h,
    );
    expect(result.ga4).toBe("queued");
    expect(result.meta).toBe("sent");
    // A throwing gtag queues for replay instead of dropping the conversion.
    expect(ga4Queued).toHaveLength(1);
    expect(queued).toEqual([]);
  });

  it("survives a GA4 enqueue that throws", () => {
    const { handles: h } = handles({
      gtag: null,
      enqueueGa4: () => {
        throw new Error("quota exceeded");
      },
    });
    expect(() =>
      dispatchMarketingEvent(MARKETING_EVENTS.ASSESSMENT_COMPLETE, {}, h),
    ).not.toThrow();
  });

  it("queues for retry when the Meta sink throws", () => {
    const { handles: h, queued } = handles({
      fbq: vi.fn(() => {
        throw new Error("pixel not ready");
      }),
    });
    dispatchMarketingEvent(MARKETING_EVENTS.ASSESSMENT_COMPLETE, {}, h);
    expect(queued).toHaveLength(1);
  });

  it("survives an enqueue that throws", () => {
    const { handles: h } = handles({
      fbq: null,
      enqueueMeta: () => {
        throw new Error("quota exceeded");
      },
    });
    expect(() =>
      dispatchMarketingEvent(MARKETING_EVENTS.ASSESSMENT_START, {}, h),
    ).not.toThrow();
  });

  // ---- Privacy guard at the transmission boundary. ------------------------
  it("transmits NOTHING when handed a payload with a non-allowlisted key", () => {
    const { handles: h } = handles();
    dispatchMarketingEvent(
      MARKETING_EVENTS.ASSESSMENT_COMPLETE,
      // @ts-expect-error — deliberately violating the type to prove the
      // runtime guard holds if a future call site bypasses buildEventPayload.
      { utm_source: "facebook", sam_level: "L3" },
      h,
    );
    expect(h.gtag).toHaveBeenCalledWith("event", "assessment_complete", {});
    expect(h.fbq).toHaveBeenCalledWith("trackCustom", "assessment_complete", {});
  });
});
