import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { submitSatisfactionCore } from "./satisfaction";

// Persistence + ownership for the post-report rating. Uses injected mock
// clients (same DI seam as the assessment handlers) so no live DB is needed.

const SESSION = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Chainable query-builder stub: select/eq/order return `this`; the
 *  terminal maybeSingle resolves the configured result. */
function query(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

interface RlsOverrides {
  user?: { id: string } | null;
  parent?: { data: unknown; error: unknown };
  session?: { data: unknown; error: unknown };
  child?: { data: unknown; error: unknown };
}

function makeRls(o: RlsOverrides = {}): SupabaseClient<Database> {
  const user = o.user === undefined ? { id: "u1" } : o.user;
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn((table: string) => {
      if (table === "parents")
        return query(o.parent ?? { data: { id: "p1", tenant_id: "t1" }, error: null });
      if (table === "assessment_sessions")
        return query(o.session ?? { data: { id: SESSION, child_id: "c1" }, error: null });
      if (table === "children")
        return query(o.child ?? { data: { id: "c1" }, error: null });
      throw new Error(`unexpected rls table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;
}

function makeService() {
  // Typed params so `.mock.calls[n]` is a typed tuple (the repo runs
  // noUncheckedIndexedAccess) rather than an empty tuple.
  const upsert = vi.fn(
    async (row: Record<string, unknown>, opts: { onConflict: string }) => {
      void row;
      void opts;
      return { error: null as { message: string } | null };
    },
  );
  const insert = vi.fn(async (row: Record<string, unknown>) => {
    void row;
    return { error: null as { message: string } | null };
  });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "parent_satisfaction") return { upsert };
      if (table === "analytics_events") return { insert };
      throw new Error(`unexpected service table: ${table}`);
    }),
  } as unknown as SupabaseClient<Database>;
  return { client, upsert, insert };
}

describe("submitSatisfactionCore", () => {
  it("persists the rating and emits the event for a valid owned session", async () => {
    const { client, upsert, insert } = makeService();

    const result = await submitSatisfactionCore({
      rlsClient: makeRls(),
      serviceClient: client,
      input: { sessionId: SESSION, rating: 4, comment: "  great report  " },
    });

    expect(result).toEqual({ ok: true });

    expect(upsert).toHaveBeenCalledOnce();
    const [payload, opts] = upsert.mock.calls[0]!;
    expect(payload).toMatchObject({
      tenant_id: "t1",
      parent_id: "p1",
      child_id: "c1",
      session_id: SESSION,
      rating: 4,
      comment: "great report", // trimmed
    });
    expect(opts).toEqual({ onConflict: "session_id" });

    // Event fired with rating + has_comment only — never the comment text.
    expect(insert).toHaveBeenCalledOnce();
    const eventRow = insert.mock.calls[0]![0];
    expect(eventRow.event_name).toBe("parent_satisfaction_submitted");
    expect(eventRow.props).toEqual({ rating: 4, has_comment: true });
    expect(JSON.stringify(eventRow)).not.toContain("great report");
  });

  it("treats a blank comment as no comment", async () => {
    const { client, upsert, insert } = makeService();

    const result = await submitSatisfactionCore({
      rlsClient: makeRls(),
      serviceClient: client,
      input: { sessionId: SESSION, rating: 5, comment: "   " },
    });

    expect(result).toEqual({ ok: true });
    expect(upsert.mock.calls[0]![0].comment).toBeNull();
    expect(insert.mock.calls[0]![0].props).toEqual({
      rating: 5,
      has_comment: false,
    });
  });

  it.each([0, 6, 3.5, Number.NaN])(
    "rejects an out-of-range rating (%s) without writing",
    async (rating) => {
      const { client, upsert } = makeService();
      const result = await submitSatisfactionCore({
        rlsClient: makeRls(),
        serviceClient: client,
        input: { sessionId: SESSION, rating },
      });
      expect(result.ok).toBe(false);
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it("rejects when the session is not owned by the caller (dual-role guard)", async () => {
    const { client, upsert } = makeService();
    const result = await submitSatisfactionCore({
      rlsClient: makeRls({ child: { data: null, error: null } }),
      serviceClient: client,
      input: { sessionId: SESSION, rating: 3 },
    });
    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    const { client, upsert } = makeService();
    const result = await submitSatisfactionCore({
      rlsClient: makeRls({ user: null }),
      serviceClient: client,
      input: { sessionId: SESSION, rating: 3 },
    });
    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("surfaces a persistence failure as a soft error", async () => {
    const { client } = makeService();
    // Override upsert to fail.
    (client.from as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === "parent_satisfaction")
          return { upsert: vi.fn(async () => ({ error: { message: "boom" } })) };
        return { insert: vi.fn(async () => ({ error: null })) };
      },
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitSatisfactionCore({
      rlsClient: makeRls(),
      serviceClient: client,
      input: { sessionId: SESSION, rating: 2 },
    });
    expect(result.ok).toBe(false);
  });
});
