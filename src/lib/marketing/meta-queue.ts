// Deferred Meta Pixel queue.
//
// WHY THIS EXISTS. The Meta Pixel is only allowed to LOAD on parent-facing
// surfaces (landing / signup / dashboard / report) — never on the child
// assessment route. But `assessment_start` fires at the parent->child handoff,
// which happens on the assessment route. Rather than load the pixel there (and
// have it linger in the document once the child's item screens render), the
// event is queued and flushed by the next parent surface that does load the
// pixel — in practice the report, which the parent always reaches.
//
// Consequence, stated plainly: a queued assessment_start reaches Meta with the
// report's timestamp, not the handoff's. assessment_complete is the priority
// conversion and always fires with the pixel already live, so it is unaffected.
//
// Storage is localStorage (survives the full-page nav from /assessment to
// /report), TTL-bounded and capped so a queue can never grow unbounded or
// replay stale events into a later campaign.

import type { EventPayload, MarketingEventName } from "./events";

export const META_QUEUE_KEY = "atlas:meta_queue";

/** Older than this and the event is dropped rather than replayed. */
export const META_QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

/** Hard cap. Oldest entries are dropped first. */
export const META_QUEUE_MAX = 10;

export interface QueuedMetaEvent {
  name: MarketingEventName;
  payload: EventPayload;
  /** epoch ms at enqueue time */
  at: number;
}

/** Fail-soft parse of the stored queue. Anything malformed reads as empty. */
export function parseQueue(raw: string | null | undefined): QueuedMetaEvent[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isQueuedEvent);
}

function isQueuedEvent(value: unknown): value is QueuedMetaEvent {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    typeof entry.at === "number" &&
    Number.isFinite(entry.at) &&
    typeof entry.payload === "object" &&
    entry.payload !== null &&
    !Array.isArray(entry.payload)
  );
}

/** Append with TTL prune + cap. Pure. */
export function appendToQueue(
  queue: QueuedMetaEvent[],
  event: QueuedMetaEvent,
  nowMs: number,
): QueuedMetaEvent[] {
  const fresh = pruneQueue(queue, nowMs);
  return [...fresh, event].slice(-META_QUEUE_MAX);
}

/** Drop anything past its TTL (and anything with a future timestamp, which can
 *  only come from a clock change or a hand-edited store). Pure. */
export function pruneQueue(
  queue: QueuedMetaEvent[],
  nowMs: number,
): QueuedMetaEvent[] {
  return queue.filter(
    (entry) => entry.at <= nowMs && nowMs - entry.at < META_QUEUE_TTL_MS,
  );
}

// =============================================================================
// Browser side effects (no-ops outside the browser)
// =============================================================================

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null; // blocked (private mode / cookie policy)
  }
}

export function enqueueMetaEvent(event: QueuedMetaEvent): void {
  const store = storage();
  if (!store) return;
  try {
    const next = appendToQueue(
      parseQueue(store.getItem(META_QUEUE_KEY)),
      event,
      event.at,
    );
    store.setItem(META_QUEUE_KEY, JSON.stringify(next));
  } catch {
    // Quota or serialization failure — drop the deferred event silently.
  }
}

/** Drain the queue and hand each fresh entry to `send`. Clears the store
 *  BEFORE sending so a throwing sink cannot cause an infinite replay. */
export function drainMetaQueue(
  send: (event: QueuedMetaEvent) => void,
  nowMs: number,
): number {
  const store = storage();
  if (!store) return 0;
  let pending: QueuedMetaEvent[];
  try {
    pending = pruneQueue(parseQueue(store.getItem(META_QUEUE_KEY)), nowMs);
    store.removeItem(META_QUEUE_KEY);
  } catch {
    return 0;
  }
  for (const event of pending) {
    try {
      send(event);
    } catch {
      // One bad send must not block the rest of the drain.
    }
  }
  return pending.length;
}
