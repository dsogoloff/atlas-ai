// Server-side attribution accessor.
//
// THIS IS THE SEAM FOR THE HUBSPOT LANE (Contract A). A future contact-sync
// emit calls getAttribution() at the point it builds its payload and maps the
// five UTMs onto HubSpot properties. It does NOT re-read the query string and
// does NOT need to know how the cookie is encoded — that stays here.
//
// The mapping itself is deliberately NOT built in this lane.

import "server-only";

import { cookies } from "next/headers";

import { ATTRIBUTION_COOKIE, type Attribution } from "./attribution";
import { deserializeAttribution } from "./attribution";

export type { Attribution };

/**
 * The persisted first-touch attribution for the current request, or an empty
 * object when the visitor arrived untagged (or blocked cookies).
 *
 * Fail-soft by contract: never throws, so a caller can attach attribution to a
 * sync payload without a try/catch of its own.
 */
export async function getAttribution(): Promise<Attribution> {
  try {
    const store = await cookies();
    return deserializeAttribution(store.get(ATTRIBUTION_COOKIE)?.value);
  } catch {
    return {};
  }
}
