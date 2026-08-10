// Atlas — Inspirea Labs' own product brand.
//
// Atlas remains the product brand for Inspirea's own use and for any future
// franchisee white-label that has not supplied a skin. This config is the
// registry fallback; it is NOT what app.samnewyork.com renders (that tenant
// resolves to sam-new-york.ts). Do not delete Atlas branding from this file.

import type { TenantBranding } from "../types";

export const atlasBranding: TenantBranding = {
  key: "atlas",
  tenantSlugs: [],

  productName: "Atlas Assessment",
  shortName: "Atlas",
  compactName: "Atlas Assessment",
  trademarkSymbol: "™",
  poweredBy: "Powered by Inspirea Labs",
  copyrightLine: "© 2026 Atlas Assessment by Inspirea Labs Inc. All rights reserved.",

  logo: {
    src: "/sam-logo.png",
    alt: "Atlas Assessment",
    width: 3887,
    height: 2182,
  },
  faviconHref: "/favicon.ico",
  mascotAlt: "Atlas dachshund mascot",

  colorTokenPrefix: "sam",

  meta: {
    title: "Atlas Assessment",
    description:
      "An adaptive math assessment for K–8 learners — designed to identify likely skill gaps and support placement in about 15 minutes.",
    ogTitle: "Atlas Assessment",
    siteName: "Atlas Assessment",
  },
  loadingText: "Getting your assessment ready…",

  report: {
    headerName: "Atlas Assessment",
    footerName: "Atlas AI · Powered by Inspirea Labs",
    watermark: null,
  },

  email: {
    senderName: "Atlas Assessment",
    subjectPrefix: "",
    footerLine: "Sent by Atlas Assessment, by Inspirea Labs Inc.",
  },

  legal: {
    processorDisclosure:
      "[PLACEHOLDER — pending counsel review] This assessment platform is operated by Inspirea Labs Inc.",
    processorDisclosureIsPlaceholder: true,
  },
};
