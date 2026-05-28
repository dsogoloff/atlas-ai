// Atlas Assessment — Anthropic Sonnet report narration client.
//
// Sibling to src/lib/misconceptionClassifier/llmClient.ts. Mirrors the same
// locks (Q1 dateless-pinned model string, S3 hard timeout, S4 retries, E2
// telemetry, stub-vs-live env gate) but uses generateText (not generateObject)
// so the narration output is raw text that generate.ts JSON-parses, and Piece 3
// owns the schema gate independently of the SDK.
//
// Calls api.anthropic.com directly via @ai-sdk/anthropic.
//
// Two modes:
//   * stub  (default; REPORT_NARRATION_LIVE != 'true'): returns a deterministic
//     placeholder JSON string without calling the LLM. Wires stay testable
//     while Anthropic K-8 educational ToS alignment is in flight
//     (compliance.md §6 LLM-specific guardrails + §13.3, same posture as the
//     classifier).
//   * live  (REPORT_NARRATION_LIVE === 'true'): calls generateText against
//     the Gateway with a hard timeout (S3 analogue) and 1 retry on retryable
//     failures (S4 analogue — AI SDK handles 5xx/timeout retry with
//     exponential backoff and skips 4xx).
//
// Cost telemetry: every live call emits a structured console.log with
// model + token counts + elapsedMs. E2 analogue — no schema column for
// token data; structured logs only. No PII; no prompt or response text
// in the log.
//
// Throws on persistent live-mode failure. Caller (generate.ts) lets the
// throw propagate; Piece 3 (validate/gate) will translate generation
// failures into status='failed' on the report_narrations row.

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import { getAnthropicApiKey, isReportNarrationLive } from "@/lib/env";

/** Direct @ai-sdk/anthropic model string for Sonnet. NO 'anthropic/' prefix
 *  (that was the Vercel AI Gateway convention) and NO date suffix (Sonnet
 *  4.6 is post-4.6-generation, so the dateless 'claude-sonnet-4-6' IS the
 *  pinned snapshot per Anthropic docs — there is no dated form of this
 *  model ID). Mirrors the classifier's Q1 lock — stable model identity,
 *  no silent upgrades. */
const MODEL = "claude-sonnet-4-6";

/** S3 analogue: 15-second hard timeout. Longer than the classifier's 3s
 *  because narration runs asynchronously off the response-submit critical
 *  path and produces ~four prose fields totalling roughly 300-500 output
 *  tokens. Tune if Gateway latency observations warrant. */
const TIMEOUT_MS = 15000;

/** S4 analogue: AI SDK's `maxRetries` covers 5xx + timeout retry with
 *  exponential backoff; 4xx errors bypass retry by SDK default. */
const MAX_RETRIES = 1;

/** Deterministic stub output. JSON with all four output fields populated by
 *  recognisable placeholder copy — same shape live mode would produce so
 *  generate.ts's parse path is exercised identically in stub mode. */
const STUB_TEXT = JSON.stringify({
  placement_line:
    "[stub narration] placement line goes here in live mode.",
  strand_lede:
    "[stub narration] strand lede goes here in live mode.",
  key_findings: {
    strengths: [
      "[stub narration] strength item 1 goes here in live mode.",
      "[stub narration] strength item 2 goes here in live mode.",
    ],
    growth_areas: [
      "[stub narration] growth area item 1 goes here in live mode.",
      "[stub narration] growth area item 2 goes here in live mode.",
    ],
  },
  recommendations_lede:
    "[stub narration] recommendations lede goes here in live mode.",
});

export interface CallSonnetResult {
  /** Raw model output text. generate.ts strips fences defensively and
   *  JSON-parses; no schema validation happens here. */
  text: string;
  model: string;
  tokens: { input: number; output: number };
  elapsedMs: number;
}

export async function callSonnet(
  system: string,
  prompt: string,
): Promise<CallSonnetResult> {
  if (!isReportNarrationLive()) {
    return {
      text: STUB_TEXT,
      model: MODEL,
      tokens: { input: 0, output: 0 },
      elapsedMs: 0,
    };
  }

  // Validate ANTHROPIC_API_KEY is set in live mode. The AI SDK reads it
  // from process.env automatically; eagerly call getAnthropicApiKey()
  // here so a missing key fails with the env helper's clear message
  // rather than as an opaque 401 from the SDK. Return value isn't
  // passed to the SDK — process.env is the SDK's discovery surface.
  getAnthropicApiKey();

  const start = Date.now();

  const result = await generateText({
    model: anthropic(MODEL),
    system,
    prompt,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    maxRetries: MAX_RETRIES,
  });

  const elapsedMs = Date.now() - start;

  // AI SDK v6 usage field names assumed `inputTokens` / `outputTokens`.
  // If telemetry shows zeros despite real LLM calls, verify against the
  // SDK's runtime usage shape — see classifier llmClient.ts for the
  // same caveat.
  const tokens = {
    input: result.usage.inputTokens ?? 0,
    output: result.usage.outputTokens ?? 0,
  };

  // E2 analogue: structured cost telemetry. No PII (compliance.md §6) —
  // model + token counts + elapsed only. No prompt or response text.
  console.log("[narration] sonnet", {
    model: MODEL,
    elapsedMs,
    tokens,
  });

  return {
    text: result.text,
    model: MODEL,
    tokens,
    elapsedMs,
  };
}
