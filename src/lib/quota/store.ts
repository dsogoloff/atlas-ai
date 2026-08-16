import "server-only";

// ATLAS-004 — the durable quota store.
//
// Backed by Postgres (rate_limit_counters + consume_quota) because this runs on
// Vercel serverless: an in-process counter is per-instance and resets on every
// deploy, which against a script spread over instances is barely a limit at all,
// and for a SPEND ceiling is worse than useless — the failure mode is silent
// money. No Redis exists in this stack.
//
// FAIL DIRECTION IS DELIBERATELY DIFFERENT PER CALLER, and this is the most
// important decision in the file:
//
//   AI ceiling   -> FAIL CLOSED. If we cannot prove there is budget left, do not
//                   spend. The cost of a false block is a report without fresh
//                   prose; the cost of a false allow is unbounded spend.
//   Auth limits  -> FAIL OPEN. If the store is unreachable, let the request
//                   through. The cost of a false block is locking every parent
//                   out of their account during a database blip — a
//                   self-inflicted outage strictly worse than the abuse the
//                   limiter exists to slow. Supabase's own auth rate limits
//                   remain as a backstop underneath.
//
// Both directions are chosen, not inherited, and each caller states which it
// wants at the call site.

import { createServiceClient } from "@/lib/supabase/server";

export interface QuotaResult {
  allowed: boolean;
  /** Post-increment count. Server-side telemetry only — never sent to a client. */
  used: number;
  /** When the window resets; null for cumulative buckets. */
  resetAt: string | null;
  /** True when the store could not be reached and the fail direction decided it. */
  degraded: boolean;
}

/**
 * Consume one unit from `bucket`.
 *
 * @param windowSeconds 0 or less = cumulative bucket with no expiry.
 * @param failOpen      what to return if the store is unreachable.
 */
export async function consumeQuota(
  bucket: string,
  windowSeconds: number,
  limit: number,
  failOpen: boolean,
): Promise<QuotaResult> {
  try {
    const { data, error } = await createServiceClient().rpc("consume_quota", {
      p_bucket: bucket,
      p_window_seconds: windowSeconds,
      p_limit: limit,
    });

    if (error || !data) {
      return degrade(failOpen);
    }

    // The function returns a single row (setof).
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return degrade(failOpen);

    return {
      allowed: Boolean(row.allowed),
      used: Number(row.used ?? 0),
      resetAt: (row.reset_at as string | null) ?? null,
      degraded: false,
    };
  } catch {
    return degrade(failOpen);
  }
}

function degrade(failOpen: boolean): QuotaResult {
  return { allowed: failOpen, used: 0, resetAt: null, degraded: true };
}
