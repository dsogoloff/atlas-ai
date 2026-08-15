import "server-only";

// Same-origin validation for the `?next=` that rides through the MFA round
// trip, so `/admin` still lands correctly after a code is verified.
//
// Reuses the rule already applied at /login and /auth/callback rather than
// inventing a second one: a value must be root-relative and must not begin
// `//` (which a browser reads as scheme-relative and would follow off-origin).

const DEFAULT_NEXT = "/dashboard";

export function safeNext(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/")) return DEFAULT_NEXT;
  if (raw.startsWith("//")) return DEFAULT_NEXT;
  return raw;
}
