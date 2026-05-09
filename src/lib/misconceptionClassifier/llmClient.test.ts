// vi.mock is hoisted; declare before importing the unit under test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from "ai";

import { callHaiku } from "./llmClient";
import { PROMPT_VERSION } from "./prompt";
import type { ClassifierInput, TaxonomyMap } from "./types";

const mockGenerateObject = vi.mocked(generateObject);

const TAXONOMY: TaxonomyMap = new Map([
  [
    "OPERATIONS",
    [
      {
        code: "OP_NO_REGROUPING",
        label: "No regrouping",
        description: "Takes the smaller from the larger.",
        strand: "OPERATIONS",
      },
    ],
  ],
]);

const INPUT: ClassifierInput = {
  format: "NUMERIC_ENTRY",
  strand: "OPERATIONS",
  content: { stem: "47-19=?", correct_answer: "28" },
  answerGiven: "38",
  isCorrect: false,
};

beforeEach(() => {
  // Explicit empty so a host-set ANTHROPIC_API_KEY in .env.local doesn't
  // bleed into env-validation tests. Tests that need the key restub.
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("MISCONCEPTION_CLASSIFIER_LIVE", "");
  mockGenerateObject.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("callHaiku — stub mode (default, flag off)", () => {
  it("returns the conservative-empty fixture without calling generateObject", async () => {
    const result = await callHaiku(INPUT, TAXONOMY);
    expect(result).toEqual({
      codes: [],
      method: "haiku",
      version: PROMPT_VERSION,
      tokens: { input: 0, output: 0 },
      elapsedMs: 0,
    });
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("returns the same fixture when the flag is the literal string 'false'", async () => {
    vi.stubEnv("MISCONCEPTION_CLASSIFIER_LIVE", "false");
    const result = await callHaiku(INPUT, TAXONOMY);
    expect(result.method).toBe("haiku");
    expect(result.codes).toEqual([]);
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("returns stub for any non-literal-'true' value (only literal 'true' enables live)", async () => {
    for (const value of ["0", "yes", "TRUE", " true ", "1"]) {
      vi.stubEnv("MISCONCEPTION_CLASSIFIER_LIVE", value);
      const result = await callHaiku(INPUT, TAXONOMY);
      expect(result.method).toBe("haiku");
      expect(result.codes).toEqual([]);
    }
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("is deterministic across calls", async () => {
    const a = await callHaiku(INPUT, TAXONOMY);
    const b = await callHaiku(INPUT, TAXONOMY);
    expect(a).toEqual(b);
  });

  it("does NOT require ANTHROPIC_API_KEY in stub mode", async () => {
    // ANTHROPIC_API_KEY is empty (set in beforeEach). If callHaiku tried
    // to read it, the env helper would throw. The stub path must not
    // touch it.
    await expect(callHaiku(INPUT, TAXONOMY)).resolves.toBeDefined();
  });
});

describe("callHaiku — live mode (flag = 'true', mocked AI SDK)", () => {
  beforeEach(() => {
    vi.stubEnv("MISCONCEPTION_CLASSIFIER_LIVE", "true");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
  });

  it("calls generateObject with the gateway model + abortSignal + maxRetries", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { codes: ["OP_NO_REGROUPING"] },
      usage: { inputTokens: 100, outputTokens: 5 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    await callHaiku(INPUT, TAXONOMY);

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    const call = mockGenerateObject.mock.calls[0][0];
    expect(call.model).toBe("anthropic/claude-haiku-4-5-20251001");
    expect(call.system).toContain("classifier");
    expect(call.prompt).toContain("47-19=?");
    expect(call.prompt).toContain("Correct answer: 28");
    expect(call.prompt).toContain("Child's answer: 38");
    expect(call.maxRetries).toBe(1);
    expect(call.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("returns codes from the AI response with method='haiku' and PROMPT_VERSION", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { codes: ["OP_NO_REGROUPING"] },
      usage: { inputTokens: 100, outputTokens: 5 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const result = await callHaiku(INPUT, TAXONOMY);

    expect(result.codes).toEqual(["OP_NO_REGROUPING"]);
    expect(result.method).toBe("haiku");
    expect(result.version).toBe(PROMPT_VERSION);
    expect(result.tokens).toEqual({ input: 100, output: 5 });
    expect(typeof result.elapsedMs).toBe("number");
  });

  it("emits structured cost telemetry on a live call", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { codes: [] },
      usage: { inputTokens: 50, outputTokens: 0 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    // Direct property replacement, not vi.spyOn(console, "log") — vitest
    // 4.1.5 in this project's config does not reliably intercept console.log
    // via vi.spyOn (the spy records 0 calls even when the runtime IS
    // calling console.log inline at the call site, no captured reference
    // at module load). Direct mutation of the console object bypasses
    // whatever the reporter does to console internally. Useful pattern
    // for any future test in this repo that asserts on log CONTENT
    // rather than just suppressing output — vi.spyOn still works fine
    // for suppression (see classifier.test.ts).
    const logs: unknown[][] = [];
    const originalLog = console.log;
    console.log = ((...args: unknown[]) => {
      logs.push(args);
    }) as typeof console.log;

    try {
      await callHaiku(INPUT, TAXONOMY);
    } finally {
      console.log = originalLog;
    }

    expect(logs).toHaveLength(1);
    expect(logs[0][0]).toBe("[classifier] haiku");
    expect(logs[0][1]).toMatchObject({
      tokens: { input: 50, output: 0 },
      strand: "OPERATIONS",
      format: "NUMERIC_ENTRY",
    });
    expect(
      typeof (logs[0][1] as { elapsedMs: number }).elapsedMs,
    ).toBe("number");
  });

  it("throws if ANTHROPIC_API_KEY is missing (eager validation, no LLM call)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(callHaiku(INPUT, TAXONOMY)).rejects.toThrow(
      /ANTHROPIC_API_KEY/,
    );
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("propagates errors from the AI SDK (SDK already retried; we re-throw)", async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error("anthropic api 503"));
    await expect(callHaiku(INPUT, TAXONOMY)).rejects.toThrow(/503/);
  });

  it("returns empty codes when the LLM responds with an empty array (valid 'no signal')", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { codes: [] },
      usage: { inputTokens: 50, outputTokens: 0 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const result = await callHaiku(INPUT, TAXONOMY);
    expect(result.codes).toEqual([]);
    expect(result.method).toBe("haiku");
  });

  it("falls back to 0 tokens when the SDK's usage shape is unexpected", async () => {
    mockGenerateObject.mockResolvedValueOnce({
      object: { codes: [] },
      usage: {}, // no inputTokens / outputTokens fields
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const result = await callHaiku(INPUT, TAXONOMY);
    expect(result.tokens).toEqual({ input: 0, output: 0 });
  });
});
