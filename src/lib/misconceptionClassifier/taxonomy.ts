// Atlas Assessment — misconception taxonomy loader with module-level cache.
//
// Loads the misconceptions table once per Vercel function instance lifetime
// (Fluid Compute reuses instances) and caches the strand-keyed result.
// Single-cell cache keyed by tenantId for v1 single-tenant correctness;
// if a future call arrives with a different tenantId, the cache refetches
// rather than serving the wrong tenant's data. v2 multi-tenant evolution:
// replace `cachedTenantId / cachedPromise` with a
// `Map<tenantId, Promise<TaxonomyMap>>` so simultaneous tenants don't
// thrash the cache.
//
// Read via service-role client because the misconceptions table's RLS
// policy ("misconceptions_tenant_select") gates by tenant membership;
// the service role bypasses RLS, which is what the classifier needs at
// the response-submit boundary where the calling parent isn't a tenant
// member of misconceptions in the RLS sense.
//
// Errors from the underlying SELECT propagate — the classifier's try/catch
// (S2 lock) maps them to method='failed' on the response row. The cache
// evicts itself on rejection so the next call retries, rather than
// replaying the cached rejection forever.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { TaxonomyEntry, TaxonomyMap } from "./types";

let cachedTenantId: string | null = null;
let cachedPromise: Promise<TaxonomyMap> | null = null;

export async function loadTaxonomy(
  serviceClient: SupabaseClient<Database>,
  tenantId: string,
): Promise<TaxonomyMap> {
  if (cachedPromise && cachedTenantId === tenantId) {
    return cachedPromise;
  }
  cachedTenantId = tenantId;
  cachedPromise = doLoad(serviceClient, tenantId);

  // If the load fails, evict the cache so subsequent callers retry instead
  // of replaying the rejection forever. `void` because we don't need to
  // observe the eviction — the original cachedPromise is what callers await.
  void cachedPromise.catch(() => {
    cachedTenantId = null;
    cachedPromise = null;
  });

  return cachedPromise;
}

/** Test-only entrypoint. Resets the module-level cache so each test can
 *  exercise the cache-population behavior independently. Production code
 *  must not call this — the cache lifetime is the function instance. */
export function resetTaxonomyCacheForTest(): void {
  cachedTenantId = null;
  cachedPromise = null;
}

async function doLoad(
  serviceClient: SupabaseClient<Database>,
  tenantId: string,
): Promise<TaxonomyMap> {
  const { data, error } = await serviceClient
    .from("misconceptions")
    .select("code, strand, label, description")
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`[taxonomy] read failed: ${error.message}`);
  }

  const result: TaxonomyMap = new Map();
  for (const row of data ?? []) {
    const entry: TaxonomyEntry = {
      code: row.code,
      strand: row.strand,
      label: row.label,
      description: row.description,
    };
    const list = result.get(row.strand) ?? [];
    list.push(entry);
    result.set(row.strand, list);
  }
  return result;
}
