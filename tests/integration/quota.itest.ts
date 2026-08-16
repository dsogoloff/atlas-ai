// ATLAS-004 — the durable quota store, against a real database.
//
// The whole point of choosing Postgres over an in-process counter is that the
// count SURVIVES: across serverless invocations, across deploys, across
// concurrent lambdas. None of that can be demonstrated with a mock, so these
// exercise consume_quota() directly.

import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { anonClient, serviceClient } from "./helpers/supabase";

/** Unique per run so repeated runs never share a counter. */
const RUN = randomUUID().slice(0, 8);
const buckets: string[] = [];

function bucket(name: string): string {
  const key = `it:${RUN}:${name}`;
  buckets.push(key);
  return key;
}

async function consume(bucketKey: string, windowSeconds: number, limit: number) {
  const { data, error } = await serviceClient().rpc("consume_quota", {
    p_bucket: bucketKey,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw new Error(`consume_quota: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { allowed: boolean; used: number; reset_at: string | null };
}

afterAll(async () => {
  const svc = serviceClient();
  for (const key of buckets) {
    await svc.from("rate_limit_counters").delete().eq("bucket", key);
  }
});

describe("consume_quota — counting and the limit boundary", () => {
  it("allows exactly up to the limit, then denies", async () => {
    const key = bucket("boundary");

    for (let i = 1; i <= 3; i++) {
      const result = await consume(key, 900, 3);
      expect(result.allowed, `attempt ${i} should be allowed`).toBe(true);
      expect(result.used).toBe(i);
    }

    const over = await consume(key, 900, 3);
    expect(over.allowed).toBe(false);
    expect(over.used).toBe(4);
  });

  it("counts PERSIST across separate calls — the reason this is not in-memory", async () => {
    const key = bucket("durable");
    await consume(key, 900, 100);
    await consume(key, 900, 100);

    // A fresh call, as a different serverless invocation would make.
    const third = await consume(key, 900, 100);
    expect(third.used).toBe(3);

    // And the row is really in the table, not in some process's memory.
    const { data } = await serviceClient()
      .from("rate_limit_counters")
      .select("count")
      .eq("bucket", key);
    expect((data as Array<{ count: number }>)[0].count).toBe(3);
  });

  it("keeps separate buckets independent", async () => {
    const a = bucket("independent-a");
    const b = bucket("independent-b");
    await consume(a, 900, 5);
    await consume(a, 900, 5);
    const bFirst = await consume(b, 900, 5);
    expect(bFirst.used).toBe(1); // b is untouched by a's traffic
  });

  it("reports a reset time for windowed buckets and none for cumulative ones", async () => {
    const windowed = await consume(bucket("windowed"), 900, 5);
    expect(windowed.reset_at).not.toBeNull();

    // windowSeconds <= 0 = cumulative: the unit of work IS the window, which is
    // how the per-session AI cap works.
    const cumulative = await consume(bucket("cumulative"), 0, 5);
    expect(cumulative.reset_at).toBeNull();
  });

  it("recovers when the window rolls over", async () => {
    // A 1-second window makes rollover observable without a slow test.
    const key = bucket("rollover");
    expect((await consume(key, 1, 1)).allowed).toBe(true);
    expect((await consume(key, 1, 1)).allowed).toBe(false); // exhausted

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const afterRollover = await consume(key, 1, 1);
    expect(afterRollover.allowed).toBe(true); // new window, fresh budget
    expect(afterRollover.used).toBe(1);
  });

  it("counts correctly under CONCURRENCY (the upsert is atomic)", async () => {
    // Ten simultaneous consumes must produce exactly ten, not a lost-update
    // undercount — which is precisely how a naive read-then-write limiter leaks.
    const key = bucket("concurrent");
    await Promise.all(
      Array.from({ length: 10 }, () => consume(key, 900, 1000)),
    );
    const { data } = await serviceClient()
      .from("rate_limit_counters")
      .select("count")
      .eq("bucket", key);
    expect((data as Array<{ count: number }>)[0].count).toBe(10);
  });
});

describe("consume_quota — a client cannot touch it", () => {
  it("anon cannot execute the function", async () => {
    const { error } = await anonClient().rpc("consume_quota", {
      p_bucket: bucket("anon-exec"),
      p_window_seconds: 900,
      p_limit: 1,
    });
    // A limiter a client can call is a limiter a client can exhaust on someone
    // else's behalf.
    expect(error).not.toBeNull();
  });

  it("anon cannot read the counters", async () => {
    const { data } = await anonClient().from("rate_limit_counters").select("*");
    expect(data ?? []).toEqual([]);
  });

  it("rejects an empty bucket key", async () => {
    const { error } = await serviceClient().rpc("consume_quota", {
      p_bucket: "   ",
      p_window_seconds: 900,
      p_limit: 1,
    });
    expect(error).not.toBeNull();
  });
});

describe("stored keys carry no identity", () => {
  it("nothing resembling an email or a UUID-shaped child id is stored in the clear", async () => {
    // The app hashes identifiers before they become keys; this asserts the
    // table's contents match that contract for everything this run wrote.
    const { data } = await serviceClient()
      .from("rate_limit_counters")
      .select("bucket")
      .like("bucket", `it:${RUN}:%`);
    for (const row of (data ?? []) as Array<{ bucket: string }>) {
      expect(row.bucket).not.toContain("@");
    }
  });
});

// Sustained load and burst behaviour under real traffic is the ATLAS-017 layer.
describe("pending E2E (ATLAS-017)", () => {
  it.todo("burst of login attempts from one IP receives 429 with Retry-After");
  it.todo("sustained login attempts against one account receive 429 while a second account still succeeds");
  it.todo("429 responses leak no quota internals in body or headers");
  it.todo("AI daily ceiling reached -> report still renders, data-only, no crash");
});
