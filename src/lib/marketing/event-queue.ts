// Deferred event queue — shared core for the GA4 and Meta queues.
//
// Extracted from meta-queue.ts, which originally owned this logic alone. Both
// destinations now need the same behaviour: an event raised while its sink is
// unavailable must be held and replayed, not dropped. The pure functions are
// identical for both; only the storage key differs.
//
// Storage is localStorage so a queued event survives the full-page navigation
// between route groups. TTL-bounded and capped, so a queue can never grow
// unbounded or replay stale events into a later campaign.

import type { EventPayload, MarketingEventName } from "./events";

export interface QueuedEvent {
  name: MarketingEventName;
  payload: EventPayload;
  /** epoch ms at enqueue time */
  at: number;
}

/** Older than this and the event is dropped rather than replayed. */
export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

/** Hard cap. Oldest entries are dropped first. */
export const QUEUE_MAX = 10;

/** Fail-soft parse of a stored queue. Anything malformed reads as empty. */
export function parseQueue(raw: string | null | undefined): QueuedEvent[] {
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

function isQueuedEvent(value: unknown): value is QueuedEvent {
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
  queue: QueuedEvent[],
  event: QueuedEvent,
  nowMs: number,
): QueuedEvent[] {
  const fresh = pruneQueue(queue, nowMs);
  return [...fresh, event].slice(-QUEUE_MAX);
}

/** Drop anything past its TTL (and anything with a future timestamp, which can
 *  only come from a clock change or a hand-edited store). Pure. */
export function pruneQueue(
  queue: QueuedEvent[],
  nowMs: number,
): QueuedEvent[] {
  return queue.filter(
    (entry) => entry.at <= nowMs && nowMs - entry.at < QUEUE_TTL_MS,
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

export function enqueueTo(storageKey: string, event: QueuedEvent): void {
  const store = storage();
  if (!store) return;
  try {
    const next = appendToQueue(
      parseQueue(store.getItem(storageKey)),
      event,
      event.at,
    );
    store.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Quota or serialization failure — drop the deferred event silently.
  }
}

/** Drain a queue and hand each fresh entry to `send`. Clears the store BEFORE
 *  sending so a throwing sink cannot cause an infinite replay. */
export function drainFrom(
  storageKey: string,
  send: (event: QueuedEvent) => void,
  nowMs: number,
): number {
  const store = storage();
  if (!store) return 0;
  let pending: QueuedEvent[];
  try {
    pending = pruneQueue(parseQueue(store.getItem(storageKey)), nowMs);
    store.removeItem(storageKey);
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
