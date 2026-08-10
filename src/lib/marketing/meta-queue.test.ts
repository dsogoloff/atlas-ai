import { describe, expect, it } from "vitest";

import {
  appendToQueue,
  META_QUEUE_MAX,
  META_QUEUE_TTL_MS,
  parseQueue,
  pruneQueue,
  type QueuedMetaEvent,
} from "./meta-queue";

const NOW = 1_770_000_000_000;

function event(at: number, name = "assessment_start"): QueuedMetaEvent {
  return {
    name: name as QueuedMetaEvent["name"],
    payload: { utm_source: "facebook" },
    at,
  };
}

describe("parseQueue", () => {
  it("round-trips a stored queue", () => {
    const queue = [event(NOW)];
    expect(parseQueue(JSON.stringify(queue))).toEqual(queue);
  });

  it("fails soft on absent, malformed or wrong-shaped storage", () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue("")).toEqual([]);
    expect(parseQueue("not-json")).toEqual([]);
    expect(parseQueue('{"a":1}')).toEqual([]);
  });

  it("drops entries that are not well-formed queued events", () => {
    const raw = JSON.stringify([
      event(NOW),
      { name: "assessment_start" },
      { name: 1, payload: {}, at: NOW },
      { name: "x", payload: [], at: NOW },
      null,
    ]);
    expect(parseQueue(raw)).toEqual([event(NOW)]);
  });
});

describe("pruneQueue", () => {
  it("keeps fresh entries", () => {
    const fresh = event(NOW - 60_000);
    expect(pruneQueue([fresh], NOW)).toEqual([fresh]);
  });

  it("drops entries past the TTL", () => {
    expect(pruneQueue([event(NOW - META_QUEUE_TTL_MS - 1)], NOW)).toEqual([]);
  });

  it("drops future-dated entries (clock change / hand-edited store)", () => {
    expect(pruneQueue([event(NOW + 60_000)], NOW)).toEqual([]);
  });
});

describe("appendToQueue", () => {
  it("appends and prunes in one step", () => {
    const stale = event(NOW - META_QUEUE_TTL_MS - 1);
    const fresh = event(NOW);
    expect(appendToQueue([stale], fresh, NOW)).toEqual([fresh]);
  });

  it("caps the queue, dropping the oldest first", () => {
    let queue: QueuedMetaEvent[] = [];
    for (let i = 0; i < META_QUEUE_MAX + 5; i += 1) {
      queue = appendToQueue(queue, event(NOW, `e${i}`), NOW);
    }
    expect(queue).toHaveLength(META_QUEUE_MAX);
    expect(queue[0].name).toBe("e5");
    expect(queue[queue.length - 1].name).toBe(`e${META_QUEUE_MAX + 4}`);
  });
});
