// Deferred Meta Pixel queue.
//
// WHY THIS EXISTS. The Meta Pixel is only allowed to LOAD on parent-facing
// surfaces (landing / signup / dashboard / report) — never on the child
// assessment route. But `assessment_start` fires at the parent->child handoff,
// which happens on the assessment route. Rather than load the pixel there (and
// have it linger in the document once the child's item screens render), the
// event is queued and flushed by the next parent surface that does load the
// pixel.
//
// SECOND REASON, added with the page-context redaction: the Meta Pixel offers no
// supported way to override the URL it reports, so it must not send at all while
// the document URL carries a child identifier (the report route). Those events
// queue here too and flush from the next parent surface with a clean URL. See
// redact.ts for the boundary and meta-pixel-script.tsx for the gate.
//
// Consequence, stated plainly: a queued event reaches Meta with the flushing
// page's timestamp, not the original moment.
//
// The mechanics (TTL, cap, fail-soft parse, drain-before-send) live in
// event-queue.ts and are shared with the GA4 queue. The pure helpers are
// re-exported here so existing call sites and tests keep their import path.

import {
  appendToQueue,
  drainFrom,
  enqueueTo,
  parseQueue,
  pruneQueue,
  QUEUE_MAX,
  QUEUE_TTL_MS,
  type QueuedEvent,
} from "./event-queue";

export const META_QUEUE_KEY = "atlas:meta_queue";

export const META_QUEUE_TTL_MS = QUEUE_TTL_MS;
export const META_QUEUE_MAX = QUEUE_MAX;

export type QueuedMetaEvent = QueuedEvent;

export { appendToQueue, parseQueue, pruneQueue };

export function enqueueMetaEvent(event: QueuedMetaEvent): void {
  enqueueTo(META_QUEUE_KEY, event);
}

export function drainMetaQueue(
  send: (event: QueuedMetaEvent) => void,
  nowMs: number,
): number {
  return drainFrom(META_QUEUE_KEY, send, nowMs);
}
