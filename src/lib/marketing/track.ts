// Client-side conversion dispatch: one call, both destinations.
//
// track() is the only thing feature code should import. It reads the persisted
// attribution, builds an allowlisted payload, and fans out to GA4 (gtag) and
// Meta (fbq). Every failure mode degrades to "the event is queued or not sent" —
// an unconfigured environment, a blocked script, an ad blocker, or SSR must
// never throw into a render path.
//
// The pure core is dispatchMarketingEvent(): handles are injected, so the
// fan-out (including "sink absent here -> queue it") is unit-testable without a
// DOM.
//
// SYMMETRY. Both destinations queue-and-replay when their sink is unavailable.
// GA4 used to be the exception — it returned "skipped" and the event was gone.
// See ga4-queue.ts for why that mattered and what it silently cost.
//
// PRIVACY (COPPA). The Meta Pixel gives no supported way to override the URL it
// reports, and it reads the live document URL at send time — so on a route whose
// URL carries a child identifier (`/report?child=<uuid>`) the pixel must not be
// called at all, even via a client-side navigation that left an initialised
// `fbq` behind. browserHandles() therefore treats `fbq` as ABSENT on such a
// document, which routes the event into the existing queue to be flushed from a
// clean URL. GA4 needs no such gate: its page context is overridable and is
// redacted globally in ga4-script.tsx.

import { readAttributionCookie } from "./cookie";
import {
  buildEventPayload,
  isCleanPayload,
  type EventPayload,
  type MarketingEventName,
} from "./events";
import { enqueueGa4Event } from "./ga4-queue";
import { enqueueMetaEvent } from "./meta-queue";
import type { QueuedEvent } from "./event-queue";
import { carriesChildIdentifier } from "./redact";

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
  /** null when GA4 is unconfigured or its script has not loaded yet. */
  gtag: GtagFn | null;
  /** null on surfaces where the pixel is deliberately not loaded, and on any
   *  document whose URL would leak a child identifier to Meta. */
  fbq: FbqFn | null;
  /** Called with the event when `gtag` is null or throws, so nothing is lost. */
  enqueueGa4: (event: QueuedEvent) => void;
  /** Called with the event when `fbq` is null or throws, so nothing is lost. */
  enqueueMeta: (event: QueuedEvent) => void;
  nowMs: number;
}

export interface DispatchResult {
  ga4: "sent" | "queued";
  meta: "sent" | "queued";
}

/**
 * Pure fan-out. Throwing sinks are contained: a broken gtag must not prevent
 * the Meta send, and vice versa. Whichever sink could not take the event gets
 * it queued for replay.
 */
export function dispatchMarketingEvent(
  name: MarketingEventName,
  payload: EventPayload,
  handles: DispatchHandles,
): DispatchResult {
  // Belt and braces: buildEventPayload already allowlists, but a payload that
  // somehow carries an unexpected key is dropped rather than transmitted.
  const safe: EventPayload = isCleanPayload(payload) ? payload : {};
  const queued: QueuedEvent = { name, payload: safe, at: handles.nowMs };

  let ga4: DispatchResult["ga4"] = "queued";
  if (handles.gtag) {
    try {
      handles.gtag("event", name, safe);
      ga4 = "sent";
    } catch {
      ga4 = "queued";
    }
  }
  if (ga4 === "queued") {
    try {
      handles.enqueueGa4(queued);
    } catch {
      // Deferred delivery is best-effort.
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
      handles.enqueueMeta(queued);
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

/**
 * True iff this document may call the Meta Pixel. Fail-CLOSED: if the URL
 * cannot be read, assume it identifies a child and queue instead of sending.
 */
export function metaMaySendFrom(href: string | null | undefined): boolean {
  return !carriesChildIdentifier(href);
}

function browserHandles(): DispatchHandles {
  const w = window as unknown as TrackerWindow;
  let href: string | null;
  try {
    href = window.location.href;
  } catch {
    href = null;
  }
  const metaAllowed = href !== null && metaMaySendFrom(href);
  return {
    gtag: typeof w.gtag === "function" ? w.gtag : null,
    fbq: metaAllowed && typeof w.fbq === "function" ? w.fbq : null,
    enqueueGa4: enqueueGa4Event,
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
