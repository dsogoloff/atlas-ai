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
// Routed via the Vercel AI Gateway, not called against Anthropic directly.
// Never import or call this from a client component.
export function getAnthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY");
}

/**
 * Feature flag gating real Anthropic API calls. False (default) means the
 * classifier's LLM client returns a deterministic stub — wires stay testable
 * while the Anthropic DPA is in flight (compliance.md §13.3). Flip to 'true'
 * in Vercel env once the DPA lands. Any other value (unset, '', 'false',
 * '0', etc.) reads as false; only the literal string 'true' enables live
 * calls.
 */
export function isMisconceptionClassifierLive(): boolean {
  return process.env.MISCONCEPTION_CLASSIFIER_LIVE === "true";
}
