// Environment variables, validated lazily on first read.
//
// Throwing on access (rather than at module load) keeps the build green
// for routes that don't touch Supabase and surfaces a clear error the
// instant a route that does need credentials runs without them.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] required variable ${name} is missing. ` +
        `Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

// Public — exposed to browser bundles. Safe to ship.
// Next.js inlines NEXT_PUBLIC_* at build time, so the getter resolves
// to the baked literal in client bundles.
export const env = {
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
};

// Server-only. Bypasses RLS — used by admin / job code (e.g., serving
// questions one-at-a-time per compliance.md §8). Never import or call
// this from a client component.
export function getServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

// Server-only. Used by the misconception classifier (architecture.md #3).
// Called against api.anthropic.com directly via @ai-sdk/anthropic (the Vercel
// AI Gateway routing was removed in ebc47dd). Never import or call this from a
// client component.
export function getAnthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY");
}

/**
 * Feature flag gating real Anthropic API calls for the misconception
 * classifier. When false, the classifier's LLM client returns a deterministic
 * stub. Any value other than the literal string 'true' reads as false.
 *
 * M2 readiness (2026-05-28): cleared to go live behind the minor-safety
 * safeguards — the child never sends free text to the model (only structured
 * response data is classified, server-side), the age gate is satisfied by
 * verifiable parental consent (the /coppa consent gate, not child
 * self-attestation), and the AI-processing disclosure is shown in the consent
 * flow. Live calls stay fail-soft (classifier.ts wraps the call and degrades
 * to method='failed' on error). The flip itself is operational: set
 * MISCONCEPTION_CLASSIFIER_LIVE='true' in the deploy env (with
 * ANTHROPIC_API_KEY).
 */
export function isMisconceptionClassifierLive(): boolean {
  return process.env.MISCONCEPTION_CLASSIFIER_LIVE === "true";
}

/**
 * Feature flag gating real Anthropic API calls for the report narration
 * generator. False (default) means the Sonnet wrapper returns a deterministic
 * stub JSON — wires stay testable while the Anthropic DPA is in flight
 * (compliance.md §13.3, mirrors the misconception classifier's gating). Flip
 * to 'true' in Vercel env once the DPA lands. Only the literal string 'true'
 * enables live calls.
 */
export function isReportNarrationLive(): boolean {
  return process.env.REPORT_NARRATION_LIVE === "true";
}
