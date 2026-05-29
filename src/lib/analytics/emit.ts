// Atlas Assessment — fail-soft analytics emit.
//
// One insert into analytics_events. The contract is: NEVER throw, NEVER
// reject. Logging is not allowed to break or block a user flow — if the
// insert fails (network, RLS, bad enum, anything) we log server-side and
// resolve. Call it inside next/server `after()` at request-scope touchpoints
// so the insert runs off the response's critical path.
//
// Pass the SERVICE-ROLE client: analytics_events has RLS enabled with no
// client policy, so a user-scoped client would be silently denied.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";
import type { AnalyticsEventName } from "./events";

export interface EmitOptions {
  /** Tenant the event belongs to. Null only for pre-auth events
   *  (landing_viewed), which fire before any tenant context exists. */
  tenantId?: string | null;
  childId?: string | null;
  sessionId?: string | null;
  /** Non-PII scalars only (strategy §6.4): rating, question number,
   *  is_correct, consent version. Never names, emails, or free text. */
  props?: Record<string, Json>;
}

export async function emit(
  client: SupabaseClient<Database>,
  eventName: AnalyticsEventName,
  options: EmitOptions = {},
): Promise<void> {
  try {
    const { error } = await client.from("analytics_events").insert({
      event_name: eventName,
      tenant_id: options.tenantId ?? null,
      child_id: options.childId ?? null,
      session_id: options.sessionId ?? null,
      props: options.props ?? {},
    });
    if (error) {
      console.error("[analytics] emit failed", {
        eventName,
        err: error.message,
      });
    }
  } catch (e) {
    // Defensive: insert() should resolve with {error}, but a thrown client
    // (e.g. a transport-layer exception) must still be swallowed.
    console.error("[analytics] emit threw", {
      eventName,
      err: e instanceof Error ? e.message : "unknown",
    });
  }
}
