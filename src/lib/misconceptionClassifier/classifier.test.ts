// vi.mock is hoisted; declare before importing the unit under test.
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./llmClient", () => ({
  callHaiku: vi.fn(),
}));

vi.mock("./taxonomy", () => ({
  loadTaxonomy: vi.fn(),
}));

import type { Database } from "@/lib/supabase/database.types";

import { classify } from "./classifier";
import { callHaiku } from "./llmClient";
import { loadTaxonomy } from "./taxonomy";
import type { ClassifierInput, TaxonomyMap } from "./types";

const mockCallHaiku = vi.mocked(callHaiku);
const mockLoadTaxonomy = vi.mocked(loadTaxonomy);

const TAXONOMY: TaxonomyMap = new Map();

const SERVICE_CLIENT = {} as SupabaseClient<Database>;
const TENANT_ID = "tenant-uuid";

const MC_INPUT_WITH_MAP: ClassifierInput = {
  format: "MULTIPLE_CHOICE",
  strand: "operations_algorithms",
  content: {
    stem: "47-19=?",
    options: ["28", "38", "26", "32"],
    correct_index: 0,
    distractor_misconceptions: { "1": "OP_NO_REGROUPING" },
  },
  answerGiven: "38",
  isCorrect: false,
};

const MC_INPUT_NO_MAP: ClassifierInput = {
  format: "MULTIPLE_CHOICE",
  strand: "operations_algorithms",
  content: {
    stem: "Q",
    options: ["A", "B"],
    correct_index: 0,
  },
  answerGiven: "B",
  isCorrect: false,
};

const NE_INPUT: ClassifierInput = {
  format: "NUMERIC_ENTRY",
  strand: "operations_algorithms",
  content: { stem: "Q", correct_answer: "X" },
  answerGiven: "Y",
  isCorrect: false,
};

const DD_INPUT: ClassifierInput = {
  format: "DRAG_DROP",
  strand: "fractions_decimals",
  content: {
    stem: "Order",
    items: ["1/2", "1/4"],
    correct_order: ["1/4", "1/2"],
  },
  answerGiven: JSON.stringify(["1/2", "1/4"]),
  isCorrect: false,
};

beforeEach(() => {
  mockCallHaiku.mockReset();
  mockLoadTaxonomy.mockReset();
  mockLoadTaxonomy.mockResolvedValue(TAXONOMY);
});

describe("classify", () => {
  it("returns method='none' when the response is correct (R2)", async () => {
    const result = await classify(
      { ...MC_INPUT_WITH_MAP, isCorrect: true },
      SERVICE_CLIENT,
      TENANT_ID,
    );
    expect(result).toEqual({ codes: [], method: "none", version: null });
    expect(mockCallHaiku).not.toHaveBeenCalled();
    expect(mockLoadTaxonomy).not.toHaveBeenCalled();
  });

  it("returns method='none' for DRAG_DROP (R1)", async () => {
    const result = await classify(DD_INPUT, SERVICE_CLIENT, TENANT_ID);
    expect(result).toEqual({ codes: [], method: "none", version: null });
    expect(mockCallHaiku).not.toHaveBeenCalled();
  });

  it("returns method='distractor-map' when MC distractor lookup hits", async () => {
    const result = await classify(MC_INPUT_WITH_MAP, SERVICE_CLIENT, TENANT_ID);
    expect(result).toEqual({
      codes: ["OP_NO_REGROUPING"],
      method: "distractor-map",
      version: "v1",
    });
    expect(mockCallHaiku).not.toHaveBeenCalled();
    expect(mockLoadTaxonomy).not.toHaveBeenCalled();
  });

  it("falls through to Haiku when MC has no distractor map", async () => {
    mockCallHaiku.mockResolvedValueOnce({
      codes: ["OP_FALLBACK"],
      method: "haiku",
      version: "v1",
      tokens: { input: 50, output: 5 },
      elapsedMs: 200,
    });

    const result = await classify(MC_INPUT_NO_MAP, SERVICE_CLIENT, TENANT_ID);
    expect(result.codes).toEqual(["OP_FALLBACK"]);
    expect(result.method).toBe("haiku");
    expect(mockLoadTaxonomy).toHaveBeenCalledWith(SERVICE_CLIENT, TENANT_ID);
    expect(mockCallHaiku).toHaveBeenCalledTimes(1);
  });

  it("calls Haiku for NUMERIC_ENTRY", async () => {
    mockCallHaiku.mockResolvedValueOnce({
      codes: ["NS_PLACE_VALUE_CONFUSION"],
      method: "haiku",
      version: "v1",
      tokens: { input: 60, output: 5 },
      elapsedMs: 250,
    });

    const result = await classify(NE_INPUT, SERVICE_CLIENT, TENANT_ID);
    expect(result.codes).toEqual(["NS_PLACE_VALUE_CONFUSION"]);
    expect(result.method).toBe("haiku");
  });

  it("returns method='failed' when callHaiku throws", async () => {
    mockCallHaiku.mockRejectedValueOnce(new Error("anthropic 503"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await classify(NE_INPUT, SERVICE_CLIENT, TENANT_ID);
      expect(result).toEqual({ codes: [], method: "failed", version: null });
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("returns method='failed' when loadTaxonomy throws", async () => {
    mockLoadTaxonomy.mockRejectedValueOnce(new Error("taxonomy boom"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await classify(NE_INPUT, SERVICE_CLIENT, TENANT_ID);
      expect(result).toEqual({ codes: [], method: "failed", version: null });
    } finally {
      errorSpy.mockRestore();
    }
    expect(mockCallHaiku).not.toHaveBeenCalled();
  });

  it("never throws to the caller, even on non-Error rejections", async () => {
    mockCallHaiku.mockRejectedValueOnce("not-an-error-object");

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await classify(NE_INPUT, SERVICE_CLIENT, TENANT_ID);
      expect(result.method).toBe("failed");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
