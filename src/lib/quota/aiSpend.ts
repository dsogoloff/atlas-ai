import "server-only";

// ATLAS-004 (light) — the AI spend ceiling.
//
// WHAT IT PROTECTS. Two Anthropic call sites, both reached through their own
// llmClient:
//
//   * misconceptionClassifier — fires PER ANSWERED RESPONSE from the submit
//     handler, so a single assessment is already up to ~26 calls, and a retry
//     storm against /api/assess/submit multiplies that.
//   * report narration — once per session close (via after()), plus at most one
//     self-heal on report view (refresh.ts settles on a terminal failed marker,
//     so that half is already loop-guarded).
//
// The ceiling therefore sits at the LLM CLIENT, the one choke point every call
// passes through regardless of caller. Gating any higher would leave a path
// around it.
//
// TWO DIMENSIONS, deliberately the smallest set that covers the pilot risks:
//
//   PER SESSION  one assessment cannot spend unboundedly through retries or a
//                stuck loop. Cumulative — the session IS the window.
//   GLOBAL DAILY system-wide spend cannot run away overnight, whatever the
//                cause. This is the one that bounds the bill.
//
// COUNTS, NOT COST ESTIMATES. A token-cost model needs per-model pricing kept in
// sync with Anthropic's, and gets quietly wrong the moment a model changes —
// a ceiling that drifts is worse than a blunt one. Call counts are exact, need
// no maintenance, and are directly interpretable ("at most N calls a day").
// Cost-weighted budgets are Bar 2's problem, alongside the fuller controls.
//
// HOW IT DEGRADES. Over ceiling, this THROWS. That is on purpose: each caller
// already has a well-tested failure path, and reusing it means no new failure
// mode is introduced —
//
//   classifier -> classify() catches and returns method:'failed'
//   narration  -> attemptNarration's isolation swallows it, no row is written,
//                 and the report renders data-only through the existing
//                 no-prose fallback.
//
// The alternative — returning each client's not-live STUB — was rejected: in
// live mode that would persist stub prose as though it were a real narration,
// fabricating parent-facing text. No prose is honest; fake prose is not.

import { consumeQuota } from "./store";
import { aiGlobalBucket, aiSessionBucket } from "./keys";

/** Thrown when a call would exceed a ceiling. Callers' existing catch blocks
 *  handle it; nothing about it reaches a client response. */
export class AiQuotaExceededError extends Error {
  constructor(readonly dimension: "session" | "global") {
    super(`[ai-quota] ${dimension} ceiling reached`);
    this.name = "AiQuotaExceededError";
  }
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  // A malformed value falls back to the default rather than to Infinity or NaN
  // — a typo in an env var must not silently remove the ceiling.
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * Pilot defaults, sized from the real shape of a session rather than picked
 * round: a comprehensive assessment tops out at 26 items (hardCap), each of
 * which can trigger one classifier call, plus one narration and one self-heal.
 * 40 leaves generous headroom for legitimate retries while still stopping a
 * loop dead.
 */
export const AI_SESSION_CALL_LIMIT_DEFAULT = 40;

/**
 * Daily ceiling across the whole system. At pilot volume (a handful of
 * assessments a day, ~30 calls each) this is roughly 60x real usage — high
 * enough that it will never fire in normal operation, low enough that a runaway
 * loop or a scripted attacker is capped at an amount the founder would rather
 * pay than not notice.
 */
export const AI_DAILY_CALL_LIMIT_DEFAULT = 2000;

const DAY_SECONDS = 86_400;

export function aiSessionCallLimit(): number {
  return intFromEnv("AI_MAX_CALLS_PER_SESSION", AI_SESSION_CALL_LIMIT_DEFAULT);
}

export function aiDailyCallLimit(): number {
  return intFromEnv("AI_MAX_CALLS_PER_DAY", AI_DAILY_CALL_LIMIT_DEFAULT);
}

/**
 * Consume one AI call against both ceilings. Throws AiQuotaExceededError when
 * either is exhausted.
 *
 * `sessionId` is optional because not every call site has one (a narration
 * self-heal on report view does; nothing else is unattributed today). Without
 * it only the global ceiling applies — still the dimension that bounds the bill.
 *
 * FAILS CLOSED: if the store is unreachable we cannot prove there is budget, so
 * we do not spend. A report without fresh prose is recoverable; an unbounded
 * bill is not.
 */
export async function consumeAiCall(sessionId?: string | null): Promise<void> {
  const global = await consumeQuota(
    aiGlobalBucket(),
    DAY_SECONDS,
    aiDailyCallLimit(),
    /* failOpen */ false,
  );
  if (!global.allowed) {
    console.error("[ai-quota] daily ceiling reached", {
      used: global.used,
      limit: aiDailyCallLimit(),
      degraded: global.degraded,
    });
    throw new AiQuotaExceededError("global");
  }

  if (!sessionId) return;

  const session = await consumeQuota(
    aiSessionBucket(sessionId),
    0, // cumulative — the assessment is the window
    aiSessionCallLimit(),
    /* failOpen */ false,
  );
  if (!session.allowed) {
    console.error("[ai-quota] session ceiling reached", {
      // No child identity — the session id is the unit of work, and this line
      // is server logs only.
      sessionId,
      used: session.used,
      limit: aiSessionCallLimit(),
      degraded: session.degraded,
    });
    throw new AiQuotaExceededError("session");
  }
}
