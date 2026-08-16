// ATLAS-004 — bucket keys, and the privacy rules for them.
//
// Bucket keys land in rate_limit_counters, so they must never carry anything
// identifying. An email is hashed before it becomes a key; a child id never
// becomes one at all. Pure functions so the rules are testable without a store.

import { createHash } from "node:crypto";

/** Namespaces. Keeping them here stops two call sites inventing near-identical
 *  keys that silently share (or fail to share) a counter. */
export const QUOTA_NS = {
  AI_SESSION: "ai:session",
  AI_GLOBAL: "ai:global",
  AUTH: "auth",
} as const;

/**
 * Short, stable digest of an email. Only ever the digest is stored.
 *
 * Truncated to 16 hex chars: enough that two pilot addresses will not collide,
 * short enough that the stored value is obviously not a recoverable address.
 * This is a bucketing key, not a security boundary — the point is that reading
 * the table tells you nothing about who signed in.
 */
export function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

/** Cumulative per-assessment AI budget. */
export function aiSessionBucket(sessionId: string): string {
  return `${QUOTA_NS.AI_SESSION}:${sessionId}`;
}

/** System-wide daily AI budget. */
export function aiGlobalBucket(): string {
  return QUOTA_NS.AI_GLOBAL;
}

/** Auth bucket keyed by client IP. */
export function authIpBucket(route: string, ip: string): string {
  return `${QUOTA_NS.AUTH}:${route}:ip:${ip}`;
}

/**
 * Auth bucket keyed by the account being ACTED ON (hashed).
 *
 * This is what stops a shared NAT from locking a family out: the IP bucket is
 * set generously, and the tight limit rides on the individual account, so one
 * person fat-fingering their password cannot exhaust the household's budget.
 */
export function authIdentifierBucket(route: string, identifier: string): string {
  return `${QUOTA_NS.AUTH}:${route}:id:${hashIdentifier(identifier)}`;
}
