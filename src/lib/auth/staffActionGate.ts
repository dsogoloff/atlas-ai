import "server-only";

// ATLAS-007 — the staff gate for SERVER ACTIONS.
//
// Separate from requireStaffAal2() because an action must not redirect: it
// returns data to the caller, and throwing NEXT_REDIRECT out of a mutation is
// the wrong shape. The security decision is identical — the same
// decideStaffMfaStep core — only the failure expression differs.
//
// This exists because a server action is a directly invokable POST endpoint.
// Neither the page redirect nor the middleware prefix gate protects it: the
// action posts to the PAGE's own path, so path matching only catches it by
// coincidence, and an attacker with a session can invoke the action reference
// without ever rendering the page. The check has to be inside the body.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { checkStaffAal2 } from "./requireStaffAal2";

/**
 * True iff the caller is ACTIVE staff holding AAL2.
 *
 * Every failure mode — unauthenticated, not staff, below AAL2, unreadable
 * assurance, thrown error — returns false. Callers translate that into their
 * own "Not authorised." result, deliberately without distinguishing which
 * failure it was: an unauthenticated stranger and a staff member who has not
 * yet enrolled should learn the same amount from the response.
 */
export async function requireStaffAal2Action(
  client: SupabaseClient<Database>,
): Promise<boolean> {
  try {
    const result = await checkStaffAal2(client);
    return result.ok;
  } catch {
    return false;
  }
}
