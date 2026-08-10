// Marketing-attribution configuration.
//
// Both IDs are NEXT_PUBLIC_* so they are swappable per environment from the
// Vercel dashboard (prod + preview) without a code change. Next inlines
// NEXT_PUBLIC_* literals at build time, so these must be referenced as full
// static `process.env.NEXT_PUBLIC_X` expressions — never via a computed key.
//
// FAIL SAFE: unset => null => every tracker no-ops. An unconfigured
// environment (local dev, a preview without the vars) must never crash a page.

/** GA4 measurement id, or null when unconfigured. */
export function ga4MeasurementId(): string | null {
  return normalize(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID);
}

/** Meta Pixel id, or null when unconfigured. */
export function metaPixelId(): string | null {
  return normalize(process.env.NEXT_PUBLIC_META_PIXEL_ID);
}

function normalize(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  return value === "" ? null : value;
}
