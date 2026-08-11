// Deferred GA4 queue.
//
// WHY THIS EXISTS. Until this module, the two destinations were asymmetric: if
// `window.gtag` was absent when a conversion fired, the GA4 half returned
// "skipped" and the event was lost PERMANENTLY, while the Meta half queued and
// replayed. That asymmetry was load-order-dependent and silent.
//
// It survived only because (parent)/layout.tsx renders <MarketingAnalytics/>
// before {children}, so the tag is wired before the report's mount effect runs.
// The GA4 config is injected client-side after hydration (it is NOT in the SSR
// HTML), so on a slow connection, behind an ad blocker that delays the tag, or
// if that JSX order were ever swapped, `assessment_complete` vanished with
// nothing to show it had. layout-order.test.ts now pins the ordering, and this
// queue removes the dependency on it being right.
//
// Same mechanics as the Meta queue (see event-queue.ts): localStorage, TTL,
// cap, drain-before-send. Flushed by ga4-script.tsx the moment gtag exists.

import {
  drainFrom,
  enqueueTo,
  QUEUE_MAX,
  QUEUE_TTL_MS,
  type QueuedEvent,
} from "./event-queue";

export const GA4_QUEUE_KEY = "atlas:ga4_queue";

export const GA4_QUEUE_TTL_MS = QUEUE_TTL_MS;
export const GA4_QUEUE_MAX = QUEUE_MAX;

export type QueuedGa4Event = QueuedEvent;

export function enqueueGa4Event(event: QueuedGa4Event): void {
  enqueueTo(GA4_QUEUE_KEY, event);
}

export function drainGa4Queue(
  send: (event: QueuedGa4Event) => void,
  nowMs: number,
): number {
  return drainFrom(GA4_QUEUE_KEY, send, nowMs);
}
