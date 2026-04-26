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
