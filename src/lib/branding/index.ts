// Tenant branding registry + resolution.
//
// Resolution order for the customer-facing surface:
//   1. NEXT_PUBLIC_TENANT_BRAND (per-deployment config; the normal path)
//   2. the sam-new-york skin (the only live tenant today)
//
// Deliberately env-keyed rather than request-keyed: one deployment serves one
// tenant (app.samnewyork.com), the brand must be identical in server
// components, client components and static metadata, and a per-request lookup
// would make every branded page dynamic. brandingForTenantSlug() exists for
// call sites that already hold a DB `tenants.slug` (e.g. email assembly).
//
// Adding a franchisee skin = a file in ./tenants + a line in REGISTRY + the env
// var on that deployment. No component changes.

import { atlasBranding } from "./tenants/atlas";
import { samNewYorkBranding } from "./tenants/sam-new-york";
import type { TenantBranding } from "./types";

export type { TenantBranding, BrandImage } from "./types";

const REGISTRY: readonly TenantBranding[] = [samNewYorkBranding, atlasBranding];

/** Skin used when NEXT_PUBLIC_TENANT_BRAND is unset or unknown. */
const DEFAULT_BRAND_KEY = samNewYorkBranding.key;

function byKey(key: string | undefined): TenantBranding | undefined {
  if (!key) return undefined;
  return REGISTRY.find((b) => b.key === key);
}

/**
 * The branding for this deployment's customer-facing surface.
 *
 * NOTE: `process.env.NEXT_PUBLIC_TENANT_BRAND` is written out in full so Next
 * inlines it into the client bundle — do not destructure or index into
 * process.env here.
 */
export function getBranding(): TenantBranding {
  return (
    byKey(process.env.NEXT_PUBLIC_TENANT_BRAND) ??
    byKey(DEFAULT_BRAND_KEY) ??
    atlasBranding
  );
}

/** Branding for a DB `tenants.slug`, falling back to the deployment default. */
export function brandingForTenantSlug(slug: string): TenantBranding {
  return REGISTRY.find((b) => b.tenantSlugs.includes(slug)) ?? getBranding();
}

/** All registered skins — for tests and the guard. */
export function allBrandings(): readonly TenantBranding[] {
  return REGISTRY;
}
