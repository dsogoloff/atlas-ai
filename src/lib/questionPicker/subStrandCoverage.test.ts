import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import {
  discoverServedSubStrands,
  discoverSubStrandByContentId,
} from "./subStrandCoverage";

// ---------------------------------------------------------------------------
// Per-table chainable mock: from(table) selects a staged row set for that
// table, applies .eq()/.in() predicates, and resolves to { data, error }.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function makeClient(
  tables: Record<string, ReadonlyArray<Row>>,
): SupabaseClient<Database> {
  return {
    from(table: string) {
      let filtered: Row[] = (tables[table] ?? []).slice();
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (col: string, val: unknown) => {
        filtered = filtered.filter((r) => r[col] === val);
        return chain;
      };
      chain.in = (col: string, vals: unknown[]) => {
        filtered = filtered.filter((r) => vals.includes(r[col]));
        return chain;
      };
      chain.then = (
        onFulfilled?: ((r: unknown) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) =>
        Promise.resolve({ data: filtered, error: null }).then(
          onFulfilled,
          onRejected,
        );
      return chain;
    },
  } as unknown as SupabaseClient<Database>;
}

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const SESSION = "00000000-0000-0000-0000-0000000000bb";

describe("discoverSubStrandByContentId", () => {
  it("joins tax_content → tax_sub_strands to map content_id → sub-strand code", async () => {
    const client = makeClient({
      tax_sub_strands: [
        { id: "ss-geo", code: "geometry", tenant_id: TENANT },
        { id: "ss-ratio", code: "ratio", tenant_id: TENANT },
      ],
      tax_content: [
        { id: "c-1", sub_strand_id: "ss-geo", tenant_id: TENANT },
        { id: "c-2", sub_strand_id: "ss-ratio", tenant_id: TENANT },
        { id: "c-3", sub_strand_id: "ss-geo", tenant_id: TENANT },
      ],
    });
    const map = await discoverSubStrandByContentId(client, TENANT);
    expect(map.get("c-1")).toBe("geometry");
    expect(map.get("c-2")).toBe("ratio");
    expect(map.get("c-3")).toBe("geometry");
    expect(map.size).toBe(3);
  });

  it("drops content whose sub_strand_id has no matching sub-strand row", async () => {
    const client = makeClient({
      tax_sub_strands: [{ id: "ss-geo", code: "geometry", tenant_id: TENANT }],
      tax_content: [
        { id: "c-1", sub_strand_id: "ss-geo", tenant_id: TENANT },
        { id: "c-2", sub_strand_id: "ss-missing", tenant_id: TENANT },
      ],
    });
    const map = await discoverSubStrandByContentId(client, TENANT);
    expect(map.get("c-1")).toBe("geometry");
    expect(map.has("c-2")).toBe(false);
  });

  it("returns an empty map when the taxonomy isn't seeded", async () => {
    const map = await discoverSubStrandByContentId(
      makeClient({ tax_sub_strands: [], tax_content: [] }),
      TENANT,
    );
    expect(map.size).toBe(0);
  });
});

describe("discoverServedSubStrands", () => {
  const subStrandByContentId = new Map([
    ["c-geo", "geometry"],
    ["c-ratio", "ratio"],
  ]);

  it("resolves answered questions' content_ids to served sub-strand codes", async () => {
    const client = makeClient({
      responses: [
        { question_id: "q1", session_id: SESSION },
        { question_id: "q2", session_id: SESSION },
      ],
      questions: [
        { id: "q1", content_id: "c-geo" },
        { id: "q2", content_id: "c-ratio" },
      ],
    });
    const served = await discoverServedSubStrands(
      client,
      SESSION,
      subStrandByContentId,
    );
    expect(served).toEqual(new Set(["geometry", "ratio"]));
  });

  it("ignores answered questions with NULL or unresolvable content_id", async () => {
    const client = makeClient({
      responses: [
        { question_id: "q1", session_id: SESSION },
        { question_id: "q2", session_id: SESSION },
        { question_id: "q3", session_id: SESSION },
      ],
      questions: [
        { id: "q1", content_id: "c-geo" },
        { id: "q2", content_id: null },
        { id: "q3", content_id: "c-unknown" },
      ],
    });
    const served = await discoverServedSubStrands(
      client,
      SESSION,
      subStrandByContentId,
    );
    expect(served).toEqual(new Set(["geometry"]));
  });

  it("short-circuits to an empty set when the resolver map is empty", async () => {
    const served = await discoverServedSubStrands(
      makeClient({}),
      SESSION,
      new Map(),
    );
    expect(served.size).toBe(0);
  });

  it("returns an empty set when the session has no responses yet", async () => {
    const served = await discoverServedSubStrands(
      makeClient({ responses: [], questions: [] }),
      SESSION,
      subStrandByContentId,
    );
    expect(served.size).toBe(0);
  });
});
