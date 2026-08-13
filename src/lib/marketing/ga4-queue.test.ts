import { beforeEach, describe, expect, it } from "vitest";

import {
  drainGa4Queue,
  enqueueGa4Event,
  GA4_QUEUE_KEY,
  type QueuedGa4Event,
} from "./ga4-queue";
import { META_QUEUE_KEY } from "./meta-queue";

const NOW = 1_770_000_000_000;

function event(at = NOW, name = "assessment_complete"): QueuedGa4Event {
  return {
    name: name as QueuedGa4Event["name"],
    payload: { utm_source: "facebook" },
    at,
  };
}

// A minimal in-memory localStorage, since these tests run in the node env.
function installStorage(): void {
  const map = new Map<string, string>();
  const store: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: store,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  installStorage();
});

describe("the GA4 queue", () => {
  it("round-trips an event that could not be sent", () => {
    enqueueGa4Event(event());
    const drained: QueuedGa4Event[] = [];
    expect(drainGa4Queue((e) => drained.push(e), NOW)).toBe(1);
    expect(drained).toEqual([event()]);
  });

  it("clears the store so a drained event is not replayed", () => {
    enqueueGa4Event(event());
    drainGa4Queue(() => {}, NOW);
    const second: QueuedGa4Event[] = [];
    expect(drainGa4Queue((e) => second.push(e), NOW)).toBe(0);
    expect(second).toEqual([]);
  });

  it("does not replay a drained event even when the sink throws", () => {
    enqueueGa4Event(event());
    expect(() =>
      drainGa4Queue(() => {
        throw new Error("gtag blew up");
      }, NOW),
    ).not.toThrow();
    expect(drainGa4Queue(() => {}, NOW)).toBe(0);
  });

  it("uses its OWN storage key — the two queues never cross-feed", () => {
    expect(GA4_QUEUE_KEY).not.toBe(META_QUEUE_KEY);
    enqueueGa4Event(event());
    expect(localStorage.getItem(GA4_QUEUE_KEY)).not.toBeNull();
    expect(localStorage.getItem(META_QUEUE_KEY)).toBeNull();
  });

  it("is a no-op when storage is unavailable, rather than throwing", () => {
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("blocked by cookie policy");
      },
      configurable: true,
    });
    expect(() => enqueueGa4Event(event())).not.toThrow();
    expect(drainGa4Queue(() => {}, NOW)).toBe(0);
  });
});
