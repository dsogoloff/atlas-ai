import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import type { Strand } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/database.types";

import { loadTaxonomy, resetTaxonomyCacheForTest } from "./taxonomy";

interface MockResult {
  data:
    | { code: string; strand: Strand; label: string; description: string }[]
    | null;
  error: { message: string } | null;
}

interface StubClient {
  client: SupabaseClient<Database>;
  queryCount: { value: number };
  lastTenantId: { value: string | null };
}

function makeStub(result: MockResult | (() => MockResult)): StubClient {
  const queryCount = { value: 0 };
  const lastTenantId = { value: null as string | null };

  const client = {
    from(table: string) {
      if (table !== "misconceptions") {
        throw new Error(`[stub] unexpected table: ${table}`);
      }
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            if (col !== "tenant_id") {
              throw new Error(`[stub] unexpected eq column: ${col}`);
            }
            queryCount.value += 1;
            lastTenantId.value = val;
            return Promise.resolve(
              typeof result === "function" ? result() : result,
            );
          },
        }),
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    queryCount,
    lastTenantId,
  };
}

const TENANT_A = "tenant-a-uuid";
const TENANT_B = "tenant-b-uuid";

const ROWS: MockResult["data"] = [
  {
    code: "OP_NO_REGROUPING",
    strand: "OPERATIONS",
    label: "No regrouping",
    description: "Takes the smaller from the larger.",
  },
  {
    code: "OP_SUBTRACTION_DIRECTION",
    strand: "OPERATIONS",
    label: "Subtraction direction",
    description: "Subtracts in the wrong direction.",
  },
  {
    code: "NS_PLACE_VALUE_CONFUSION",
    strand: "NUMBER_SENSE",
    label: "Place value",
    description: "Treats digits as independent values.",
  },
];

afterEach(() => {
  resetTaxonomyCacheForTest();
});

describe("loadTaxonomy", () => {
  it("populates the cache on first call", async () => {
    const { client, queryCount, lastTenantId } = makeStub({
      data: ROWS,
      error: null,
    });
    const map = await loadTaxonomy(client, TENANT_A);

    expect(queryCount.value).toBe(1);
    expect(lastTenantId.value).toBe(TENANT_A);
    expect(map.get("OPERATIONS")).toHaveLength(2);
    expect(map.get("NUMBER_SENSE")).toHaveLength(1);
  });

  it("groups entries by strand correctly with preserved order", async () => {
    const { client } = makeStub({ data: ROWS, error: null });
    const map = await loadTaxonomy(client, TENANT_A);

    const ops = map.get("OPERATIONS")!;
    expect(ops.map((e) => e.code)).toEqual([
      "OP_NO_REGROUPING",
      "OP_SUBTRACTION_DIRECTION",
    ]);
    expect(ops[0].label).toBe("No regrouping");
  });

  it("reuses the cached promise on subsequent calls with the same tenantId", async () => {
    const { client, queryCount } = makeStub({ data: ROWS, error: null });
    const map1 = await loadTaxonomy(client, TENANT_A);
    const map2 = await loadTaxonomy(client, TENANT_A);

    expect(queryCount.value).toBe(1);
    expect(map1).toBe(map2);
  });

  it("refetches when the tenantId changes", async () => {
    const { client, queryCount, lastTenantId } = makeStub({
      data: ROWS,
      error: null,
    });
    await loadTaxonomy(client, TENANT_A);
    await loadTaxonomy(client, TENANT_B);

    expect(queryCount.value).toBe(2);
    expect(lastTenantId.value).toBe(TENANT_B);
  });

  it("refetches after resetTaxonomyCacheForTest", async () => {
    const { client, queryCount } = makeStub({ data: ROWS, error: null });
    await loadTaxonomy(client, TENANT_A);
    resetTaxonomyCacheForTest();
    await loadTaxonomy(client, TENANT_A);

    expect(queryCount.value).toBe(2);
  });

  it("propagates the error message when the SELECT fails", async () => {
    const { client } = makeStub({
      data: null,
      error: { message: "boom" },
    });
    await expect(loadTaxonomy(client, TENANT_A)).rejects.toThrow(/boom/);
  });

  it("evicts the cache after a failed load so the next call retries", async () => {
    let callIndex = 0;
    const { client, queryCount } = makeStub(() => {
      callIndex += 1;
      if (callIndex === 1) {
        return { data: null, error: { message: "transient" } };
      }
      return { data: ROWS, error: null };
    });

    await expect(loadTaxonomy(client, TENANT_A)).rejects.toThrow(/transient/);
    const map = await loadTaxonomy(client, TENANT_A);

    expect(queryCount.value).toBe(2);
    expect(map.get("OPERATIONS")).toHaveLength(2);
  });

  it("returns an empty Map when there are no rows for the tenant", async () => {
    const { client } = makeStub({ data: [], error: null });
    const map = await loadTaxonomy(client, TENANT_A);
    expect(map.size).toBe(0);
  });
});
