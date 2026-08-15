// Atlas Assessment — Anthropic Haiku misconception classifier client.
//
// Calls api.anthropic.com directly via @ai-sdk/anthropic (Q1 lock:
// 'claude-haiku-4-5-20251001' — dated form, pinned snapshot, no silent
// upgrades; Haiku 4.5 is pre-4.6-generation so the dateless alias is an
// evergreen pointer, NOT a snapshot, and would silently shift under IRT
// calibration. Do not strip the date suffix.).
//
// Two modes:
//   * stub  (default; MISCONCEPTION_CLASSIFIER_LIVE != 'true'): returns
//     the conservative-empty fixture without calling the LLM. Wires stay
//     testable while Anthropic K-8 educational ToS alignment is in flight
//     (compliance.md §6 LLM-specific guardrails + §13.3).
//   * live  (MISCONCEPTION_CLASSIFIER_LIVE === 'true'): calls generateObject
//     against api.anthropic.com with structured-output enforcement, 3s
//     hard timeout (S3 lock), 1 retry on retryable failures (S4 lock;
//     AI SDK handles 5xx/timeout retry with exponential backoff and
//     skips 4xx).
//
// Cost telemetry: every live call emits a structured console.log with
// token counts + elapsedMs + strand + format. E2 lock — no schema column
// for token data in the tight-scope phase, just structured logs.
//
// Stub vs live distinction is NOT visible on the response row (both
// stamp method='haiku' + version=PROMPT_VERSION). Disambiguating
// historical rows requires correlating the deploy's MISCONCEPTION_CLASSIFIER_LIVE
// state with row created_at. Acceptable v1 tradeoff per the founder
// fixture lock; v1.x could add a stub-vs-live column if the analytical
// need surfaces.
//
// Throws on persistent live-mode failure. classifier.ts wraps the haiku
// branch in try/catch (S2 lock) → method='failed' on the response row.

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";

import { getAnthropicApiKey, isMisconceptionClassifierLive } from "@/lib/env";
import { consumeAiCall } from "@/lib/quota/aiSpend";

import {
  PROMPT_VERSION,
  buildClassifierPrompt,
  classifierResponseSchema,
} from "./prompt";
import type { ClassifierInput, ClassifierOutput, TaxonomyMap } from "./types";

/** Direct @ai-sdk/anthropic model string (Q1 lock — dated form for stable
 *  model identity, no silent upgrades). NO 'anthropic/' prefix (that was
 *  the Vercel AI Gateway convention). Haiku 4.5 is pre-4.6-generation, so
 *  the dateless 'claude-haiku-4-5' is an EVERGREEN ALIAS, not a snapshot —
 *  do not strip the date suffix or classifier output drifts on minor
 *  Haiku 4.5 revisions. */
const MODEL = "claude-haiku-4-5-20251001";

/** S3 lock: 3-second hard timeout on the live call. */
const TIMEOUT_MS = 3000;

/** S4 lock: AI SDK's `maxRetries` covers 5xx + timeout retry with
 *  exponential backoff; 4xx errors bypass retry by SDK default. */
const MAX_RETRIES = 1;

const STUB_OUTPUT: ClassifierOutput = {
  codes: [],
  method: "haiku",
  version: PROMPT_VERSION,
  tokens: { input: 0, output: 0 },
  elapsedMs: 0,
};

export async function callHaiku(
  input: ClassifierInput,
  taxonomy: TaxonomyMap,
  sessionId?: string | null,
): Promise<ClassifierOutput> {
  if (!isMisconceptionClassifierLive()) {
    return STUB_OUTPUT;
  }

  // ATLAS-004: spend ceiling. Sits here — the single choke point every live
  // classifier call passes through — so no caller can route around it. Throws
  // when a ceiling is reached; classify() already catches everything and
  // returns method:'failed', so the existing degrade path handles it and no
  // new failure mode is introduced.
  await consumeAiCall(sessionId);

  // Validate ANTHROPIC_API_KEY is set in live mode. The AI SDK reads it
  // from process.env automatically; we eagerly call getAnthropicApiKey()
  // here so a missing key fails with the env helper's clear message
  // rather than as an opaque 401 from the SDK. The return value isn't
  // passed to the SDK — process.env is the SDK's discovery surface.
  getAnthropicApiKey();

  const { system, prompt } = buildClassifierPrompt(input, taxonomy);
  const start = Date.now();

  const result = await generateObject({
    model: anthropic(MODEL),
    system,
    prompt,
    schema: classifierResponseSchema,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    maxRetries: MAX_RETRIES,
  });

  const elapsedMs = Date.now() - start;

  // AI SDK v6 usage field names assumed `inputTokens` / `outputTokens`.
  // If telemetry shows zeros despite real LLM calls, verify against the
  // SDK's runtime usage shape (the `?? 0` fallback prevents NaN/undefined
  // bugs but masks a name-drift bug as zeros — flag in observability).
  const tokens = {
    input: result.usage.inputTokens ?? 0,
    output: result.usage.outputTokens ?? 0,
  };

  // E2 lock: structured cost telemetry. No PII (compliance.md §6) —
  // strand and format only; question stem and answers are not logged
  // to keep S.A.M. content out of operational logs.
  console.log("[classifier] haiku", {
    elapsedMs,
    tokens,
    strand: input.strand,
    format: input.format,
  });

  return {
    codes: result.object.codes,
    method: "haiku",
    version: PROMPT_VERSION,
    tokens,
    elapsedMs,
  };
}
