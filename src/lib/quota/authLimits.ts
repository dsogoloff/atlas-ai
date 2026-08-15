import "server-only";

// ATLAS-004 (light) — basic auth-endpoint rate limits.
//
// WHAT IS ACTUALLY LIMITABLE HERE. Every auth flow in this app runs through OUR
// SERVER — login, signup, password-reset request, and password set are server
// actions; email confirm and the recovery link are route handlers. The browser
// Supabase client (src/lib/supabase/browser.ts) has ZERO importers, so there is
// no browser -> GoTrue path to leave uncovered. That is a better position than
// the dispatch anticipated and worth stating plainly rather than assuming.
//
// (There is no verify-resend endpoint in the app at all — nothing calls
// auth.resend — so there is nothing to limit there. If one is added it belongs
// in AUTH_LIMITS below.)
//
// KEYING — IP *and* account, with the tight limit on the account.
//
// Keying on IP alone punishes shared NAT: a school, a library, or a family
// behind one address would collectively exhaust a small budget. So the IP
// bucket is deliberately GENEROUS (it exists to stop a script, not a household)
// and the tight bucket rides on the account being acted on, hashed. One person
// mistyping their password cannot lock out the rest of the building.
//
// The reverse case — one attacker rotating IPs against one account — is caught
// by the account bucket, which is IP-independent. The case neither catches,
// honestly, is a large botnet spraying many accounts from many IPs; that is
// distributed abuse detection and belongs to Bar 2.
//
// FAILS OPEN. If the counter store is unreachable, requests proceed. A limiter
// that locks every parent out during a database blip is a self-inflicted outage
// strictly worse than the abuse it exists to slow, and Supabase's own auth rate
// limits sit underneath as a backstop. The AI ceiling makes the opposite choice
// for the opposite reason — see lib/quota/store.ts.

import { consumeQuota } from "./store";
import { authIdentifierBucket, authIpBucket } from "./keys";

export interface AuthLimitRule {
  /** Window length in seconds. */
  windowSeconds: number;
  /** Max attempts per window from one IP. Generous — shared NAT is normal. */
  ipLimit: number;
  /**
   * Max attempts per window against one account. Tight — this is the real gate.
   *
   * OMITTED for routes that have no account to key on: /auth/confirm and
   * /auth/reset carry an opaque token with no identifier available before it is
   * verified, and the password-set action identifies its account by the
   * recovery SESSION rather than by anything in the payload. Those routes are
   * IP-only, and leaving the field out says so rather than parking a number
   * that is never read.
   */
  identifierLimit?: number;
}

/**
 * Pilot thresholds. Sized so a real person never notices and a script stalls
 * quickly.
 *
 *   login  10/15min per account — a parent who has forgotten their password
 *          gets ten tries a quarter-hour, which is plenty; a credential-stuffer
 *          gets ten.
 *   signup  5/hour per email, 20/hour per IP — signup also sends an email, so
 *          the limit protects the sending reputation as much as the database.
 *   reset   5/hour per email — password-reset mail is the classic amplification
 *          vector: cheap to request, lands in someone else's inbox.
 *   confirm 30/15min per IP — token verification is cheap and legitimate retries
 *          happen (scanners pre-fetch links), so this is loose; it exists only
 *          to stop enumeration hammering.
 */
export const AUTH_LIMITS = {
  login: { windowSeconds: 900, ipLimit: 60, identifierLimit: 10 },
  signup: { windowSeconds: 3600, ipLimit: 20, identifierLimit: 5 },
  reset: { windowSeconds: 3600, ipLimit: 30, identifierLimit: 5 },
  // IP-only — see identifierLimit's note.
  password_set: { windowSeconds: 3600, ipLimit: 30 },
  confirm: { windowSeconds: 900, ipLimit: 30 },
} as const satisfies Record<string, AuthLimitRule>;

export type AuthRoute = keyof typeof AUTH_LIMITS;

export interface AuthLimitResult {
  allowed: boolean;
  /** Seconds until the caller should try again. Coarse on purpose. */
  retryAfterSeconds: number;
}

/**
 * Largest payload an auth action will look at. Every auth input is a short
 * string or two; anything near this is not a real signup. Rejecting before the
 * expensive work (hashing, a GoTrue round-trip, an email send) is the point.
 */
export const MAX_AUTH_PAYLOAD_BYTES = 4096;

/** True if the payload is small enough to be worth processing. */
export function authPayloadWithinLimit(payload: unknown): boolean {
  try {
    return (
      Buffer.byteLength(JSON.stringify(payload ?? null), "utf8") <=
      MAX_AUTH_PAYLOAD_BYTES
    );
  } catch {
    // Unserialisable (a cycle, a BigInt) is not a shape any real auth form
    // produces — refuse rather than guess.
    return false;
  }
}

function retryAfter(rule: AuthLimitRule): number {
  // Coarse and constant: the exact reset time is internal state, and returning
  // it would tell an attacker precisely when to resume.
  return rule.windowSeconds;
}

/**
 * Consume one attempt for `route`.
 *
 * `identifier` is the account being acted on (an email). It is hashed before it
 * becomes a bucket key and never stored or logged in the clear.
 */
export async function consumeAuthAttempt(
  route: AuthRoute,
  ip: string | null,
  identifier?: string | null,
): Promise<AuthLimitResult> {
  // Widen from the literal type  infers: the IP-only
  // members genuinely lack identifierLimit, and the branch below tests for it.
  const rule: AuthLimitRule = AUTH_LIMITS[route];

  // A missing IP (no trusted header) still gets counted, under a shared bucket.
  // Lumping unknowns together is intentional: it bounds them collectively
  // without letting a spoofed-away header buy an exemption.
  const ipKey = ip ?? "unknown";

  const ipResult = await consumeQuota(
    authIpBucket(route, ipKey),
    rule.windowSeconds,
    rule.ipLimit,
    /* failOpen */ true,
  );
  if (!ipResult.allowed) {
    logRateLimited(route, "ip");
    return { allowed: false, retryAfterSeconds: retryAfter(rule) };
  }

  if (identifier && rule.identifierLimit !== undefined) {
    const idResult = await consumeQuota(
      authIdentifierBucket(route, identifier),
      rule.windowSeconds,
      rule.identifierLimit,
      /* failOpen */ true,
    );
    if (!idResult.allowed) {
      logRateLimited(route, "identifier");
      return { allowed: false, retryAfterSeconds: retryAfter(rule) };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Privacy-safe telemetry: the event, the route, and WHICH DIMENSION tripped.
 * No email, no hash, no IP, no child identity — enough to see that limiting is
 * happening and where, and nothing that identifies a person. Groundwork for
 * ATLAS-015; deliberately console-only for now rather than a new event pipeline.
 */
function logRateLimited(route: AuthRoute, dimension: "ip" | "identifier"): void {
  console.warn("[rate-limit] auth attempt blocked", { route, dimension });
}
