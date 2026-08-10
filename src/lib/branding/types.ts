// Per-tenant white-label branding contract.
//
// Implements ARCHITECTURE.md cross-cutting guardrail #5 ("Themeable UI —
// branding from a config object; no hardcoded brand assets in components").
// Every customer-facing brand string, asset path and sender identity is
// resolved from one of these objects at render time. Adding a franchisee skin
// is a new entry in src/lib/branding/tenants/ + a registry line — never a
// component edit.
//
// SCOPE: the CUSTOMER-facing surface only (marketing, auth, child assessment,
// parent dashboard/report, instructor portal, transactional email). Internal
// Inspirea chrome — the (admin) route group and /dev — deliberately keeps Atlas
// branding and does not read this config.

/** A brand image asset. Dimensions are the intrinsic size of the source file. */
export interface BrandImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface TenantBrandingMeta {
  /** <title> for the root layout. */
  title: string;
  /** <meta name="description"> and the OG description default. */
  description: string;
  /** og:title / twitter:title. */
  ogTitle: string;
  /** og:site_name. */
  siteName: string;
}

export interface TenantBrandingReport {
  /** Report topbar wordmark (screen + print). */
  headerName: string;
  /** Report footer attribution line. Replaces the old "Atlas AI · Powered by …". */
  footerName: string;
  /** Print/PDF watermark text. Null hides the watermark. */
  watermark: string | null;
}

export interface TenantBrandingEmail {
  /** Display name on the From: header of transactional email. */
  senderName: string;
  /** Prefix applied to transactional subjects. Empty string = no prefix. */
  subjectPrefix: string;
  /** Signature/footer line in transactional bodies. */
  footerLine: string;
}

export interface TenantBrandingLegal {
  /**
   * Operator / data-processor disclosure shown in legal fine print only
   * (privacy notice, terms, consent notice). This is the ONE customer-facing
   * place an Inspirea reference legitimately remains — it is a compliance
   * disclosure, not branding, and must NOT be scrubbed.
   *
   * COUNSEL-GATED: the string below is a clearly-marked placeholder. Final
   * wording is supplied by the founder after counsel review. Do not invent or
   * "improve" it.
   */
  processorDisclosure: string;
  /** True while processorDisclosure is still the un-reviewed placeholder. */
  processorDisclosureIsPlaceholder: boolean;
}

export interface TenantBranding {
  /** Registry key. Also the value of NEXT_PUBLIC_TENANT_BRAND. */
  key: string;
  /** DB `tenants.slug` values that resolve to this skin. */
  tenantSlugs: readonly string[];

  /** Full product name, e.g. the hero eyebrow and page wordmarks. */
  productName: string;
  /** Short operator name for inline prose ("… a {shortName} instructor"). */
  shortName: string;
  /**
   * Wordmark for space-constrained chrome (the child assessment header). Kept
   * separate from productName so a long tenant name can't overflow a 64px bar.
   */
  compactName: string;
  /**
   * Trademark superscript rendered after productName. Null = no ™ assertion.
   * S.A.M New York asserts no Atlas trademark on its surface.
   */
  trademarkSymbol: string | null;
  /** "Powered by …" chrome line. Null hides the element entirely. */
  poweredBy: string | null;
  /** Footer copyright line. */
  copyrightLine: string;

  logo: BrandImage;
  /** Path to the favicon / app icon served from /public (or app/favicon.ico). */
  faviconHref: string;
  /**
   * Alt text for the shared dachshund mascot. The mascot IMAGE FILES
   * (public/mascot/*.png) are supplied as-is and are never regenerated,
   * upscaled or passed through image tooling — only the alt text is branded.
   */
  mascotAlt: string;

  /**
   * CSS custom-property namespace this tenant's palette is defined under in
   * globals.css (the `--color-sam-*` / `sam-*` Tailwind token set). Colour
   * VALUES live in CSS; this is the reference a future skin overrides.
   */
  colorTokenPrefix: string;

  meta: TenantBrandingMeta;
  /** Loading / splash copy. Must not name Atlas or Inspirea. */
  loadingText: string;

  report: TenantBrandingReport;
  email: TenantBrandingEmail;
  legal: TenantBrandingLegal;
}
