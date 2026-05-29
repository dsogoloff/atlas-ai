"use server";

// Top-of-funnel landing_viewed emit. Anonymous (pre-auth): no tenant context
// exists yet, so the event carries a null tenant_id. Driven by the
// <LandingViewBeacon> client island so the marketing page itself stays
// statically rendered.

import { emit } from "@/lib/analytics/emit";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createServiceClient } from "@/lib/supabase/server";

export async function recordLandingView(): Promise<void> {
  await emit(createServiceClient(), ANALYTICS_EVENTS.LANDING_VIEWED);
}
