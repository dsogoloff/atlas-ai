import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { extractClientIp, logQuestionServe } from "./log";

// ---------------------------------------------------------------------------
// Mock infrastructure
// ---------------------------------------------------------------------------

interface InsertCapture {
  table: string;
  row: unknown;
}

function makeClient(insertResult: { error: { message: string } | null }): {
  client: SupabaseClient<Database>;
  inserts: InsertCapture[];
} {
  const inserts: InsertCapture[] = [];
  const client = {
    from(table: string) {
      return {
        insert(row: unknown) {
          inserts.push({ table, row });
          return Promise.resolve(insertResult);
        },
      };
    },
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    inserts,
  };
}

// ===========================================================================
// logQuestionServe
// ===========================================================================

describe("logQuestionServe", () => {
  it("inserts a row into question_access_log with all fields", async () => {
    const { client, inserts } = makeClient({ error: null });

    await logQuestionServe(client, {
      tenantId: "tenant-1",
      sessionId: "session-1",
      childId: "child-1",
      questionId: "question-1",
      ip: "203.0.113.7",
    });

    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("question_access_log");
    expect(inserts[0].row).toEqual({
      tenant_id: "tenant-1",
      session_id: "session-1",
      child_id: "child-1",
      question_id: "question-1",
      ip_address: "203.0.113.7",
    });
  });

  it("passes null ip through unchanged (audit retains 'unknown' rather than failing the serve)", async () => {
    const { client, inserts } = makeClient({ error: null });

    await logQuestionServe(client, {
      tenantId: "t",
      sessionId: "s",
      childId: "c",
      questionId: "q",
      ip: null,
    });

    expect(inserts[0].row).toMatchObject({ ip_address: null });
  });

  it("throws on supabase insert error (orchestrator maps to 500)", async () => {
    const { client } = makeClient({
      error: { message: "constraint violation" },
    });

    await expect(
      logQuestionServe(client, {
        tenantId: "t",
        sessionId: "s",
        childId: "c",
        questionId: "q",
        ip: null,
      }),
    ).rejects.toThrow(/constraint violation/);
  });
});

// ===========================================================================
// extractClientIp
// ===========================================================================

describe("extractClientIp", () => {
  it("returns the first entry of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("trims whitespace from x-forwarded-for entries", () => {
    const h = new Headers({ "x-forwarded-for": "  203.0.113.7  , 10.0.0.1" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.42" });
    expect(extractClientIp(h)).toBe("198.51.100.42");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.7",
      "x-real-ip": "198.51.100.42",
    });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("returns null when no trusted header is present", () => {
    const h = new Headers();
    expect(extractClientIp(h)).toBeNull();
  });

  it("returns null when x-forwarded-for is empty string", () => {
    // An empty XFF should fall through to x-real-ip rather than yielding
    // the empty string — the column is `inet`; an empty string would
    // be rejected by Postgres on insert.
    const h = new Headers({ "x-forwarded-for": "" });
    expect(extractClientIp(h)).toBeNull();
  });

  it("falls through to x-real-ip when XFF first entry is whitespace-only", () => {
    const h = new Headers({
      "x-forwarded-for": "   , 10.0.0.1",
      "x-real-ip": "198.51.100.42",
    });
    expect(extractClientIp(h)).toBe("198.51.100.42");
  });
});
