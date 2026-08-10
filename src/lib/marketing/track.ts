// Client-side conversion dispatch: one call, both destinations.
//
// track() is the only thing feature code should import. It reads the persisted
// attribution, builds an allowlisted payload, and fans out to GA4 (gtag) and
// Meta (fbq). Every failure mode degrades to "the event is not sent" — an
// unconfigured environment, a blocked script, an ad blocker, or SSR must never
// throw into a render path.
//
// The pure core is dispatchMarketingEvent(): handles are injected, so the
// fan-out (including "pixel absent here -> queue it") is unit-testable without
// a DOM.

import { readAttributionCookie } from "./cookie";
import {
  buildEventPayload,
  isCleanPayload,
  type EventPayload,
  type MarketingEventName,
} from "./events";
import { enqueueMetaEvent, type QueuedMetaEvent } from "./meta-queue";

export type GtagFn = (
  command: "event",
  name: string,
  params?: Record<string, unknown>,
) => void;

export type FbqFn = (
  command: "trackCustom",
  name: string,
  params?: Record<string, unknown>,
) => void;

export interface DispatchHandles {
  /** null when GA4 is unconfigured or its script has not loaded. */
  gtag: GtagFn | null;
  /** null on surfaces where the pixel is deliberately not loaded. */
  fbq: FbqFn | null;
  /** Called with the event when `fbq` is null, so nothing is lost. */
  enqueueMeta: (event: QueuedMetaEvent) => void;
  nowMs: number;
}

export interface DispatchResult {
  ga4: "sent" | "skipped";
  meta: "sent" | "queued";
}

/**
 * Pure fan-out. Throwing sinks are contained: a broken gtag must not prevent
 * the Meta send, and vice versa.
 */
export function dispatchMarketingEvent(
  name: MarketingEventName,
  payload: EventPayload,
  handles: DispatchHandles,
): DispatchResult {
  // Belt and braces: buildEventPayload already allowlists, but a payload that
  // somehow carries an unexpected key is dropped rather than transmitted.
  const safe: EventPayload = isCleanPayload(payload) ? payload : {};

  let ga4: DispatchResult["ga4"] = "skipped";
  if (handles.gtag) {
    try {
      handles.gtag("event", name, safe);
      ga4 = "sent";
    } catch {
      ga4 = "skipped";
    }
  }

  let meta: DispatchResult["meta"] = "queued";
  if (handles.fbq) {
    try {
      handles.fbq("trackCustom", name, safe);
      meta = "sent";
    } catch {
      meta = "queued";
    }
  }
  if (meta === "queued") {
    try {
      handles.enqueueMeta({ name, payload: safe, at: handles.nowMs });
    } catch {
      // Deferred delivery is best-effort.
    }
  }

  return { ga4, meta };
}

// =============================================================================
// Browser entry point
// =============================================================================

interface TrackerWindow {
  gtag?: GtagFn;
  fbq?: FbqFn;
}

function browserHandles(): DispatchHandles {
  const w = window as unknown as TrackerWindow;
  return {
    gtag: typeof w.gtag === "function" ? w.gtag : null,
    fbq: typeof w.fbq === "function" ? w.fbq : null,
    enqueueMeta: enqueueMetaEvent,
    nowMs: Date.now(),
  };
}

/**
 * Fire a marketing conversion event to GA4 + Meta with the persisted UTMs
 * attached. Safe to call from any client component; a no-op during SSR.
 *
 * `extra` is allowlist-filtered — passing a score or a child id has no effect
 * beyond being discarded.
 */
export function track(
  name: MarketingEventName,
  extra: Record<string, unknown> = {},
): DispatchResult | null {
  if (typeof window === "undefined") return null;
  try {
    const payload = buildEventPayload(readAttributionCookie(), extra);
    return dispatchMarketingEvent(name, payload, browserHandles());
  } catch {
    // Analytics never breaks a flow.
    return null;
  }
}

/**
 * Fire `name` at most once per `dedupeKey` per tab. Used by the two conversion
 * call sites so React Strict Mode's double effect, an in-tab remount, or a
 * back-navigation cannot double-count a conversion.
 */
export function trackOnce(
  name: MarketingEventName,
  dedupeKey: string,
  extra: Record<string, unknown> = {},
): DispatchResult | null {
  if (typeof window === "undefined") return null;
  const key = `atlas:mkt:${name}:${dedupeKey}`;
  try {
    if (sessionStorage.getItem(key)) return null;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage unavailable — fire anyway rather than lose the conversion.
  }
  return track(name, extra);
}
