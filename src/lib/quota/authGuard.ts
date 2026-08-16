import "server-only";

// ATLAS-004 — one helper the auth entry points share, so the size cap, the IP
// read and the limiter cannot be wired three slightly different ways.

import { headers } from "next/headers";

import { extractClientIp } from "@/lib/questionAccessLog/log";

import {
  authPayloadWithinLimit,
  consumeAuthAttempt,
  type AuthRoute,
} from "./authLimits";

export type AuthGuardOutcome =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; reason: "rate_limited" | "too_large" };

/**
 * Size-cap then rate-limit, in that order — a 5 MB body should be refused
 * before it costs a database round-trip, let alone a GoTrue call.
 *
 * Never reveals which limit tripped, how many attempts remain, or when exactly
 * the window resets. Callers surface a generic message and the coarse
 * retry hint; quota internals stay server-side.
 */
export async function guardAuthAttempt(
  route: AuthRoute,
  payload: unknown,
  identifier?: string | null,
): Promise<AuthGuardOutcome> {
  if (!authPayloadWithinLimit(payload)) {
    console.warn("[rate-limit] auth payload rejected as oversized", { route });
    return { ok: false, retryAfterSeconds: 0, reason: "too_large" };
  }

  const ip = extractClientIp(await headers());
  const result = await consumeAuthAttempt(route, ip, identifier);
  if (!result.allowed) {
    return {
      ok: false,
      retryAfterSeconds: result.retryAfterSeconds,
      reason: "rate_limited",
    };
  }

  return { ok: true };
}

/**
 * The user-facing message for a blocked attempt.
 *
 * Identical wording for rate-limited and oversized, and no mention of which
 * dimension tripped: an attacker learning "you hit the per-account limit"
 * learns the account exists. It also stays consistent with the anti-enumeration
 * posture the forgot-password action already takes.
 */
export function authThrottleMessage(outcome: {
  retryAfterSeconds: number;
}): string {
  const minutes = Math.max(1, Math.round(outcome.retryAfterSeconds / 60));
  return `Too many attempts. Please wait about ${minutes} minute${
    minutes === 1 ? "" : "s"
  } and try again.`;
}
