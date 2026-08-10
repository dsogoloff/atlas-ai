// S.A.M New York tenant skin — the first white-label config.
//
// BRAND MARK (exact, non-negotiable): the mark is "S.A.M" — dot after S, dot
// after A, NO dot after M. Two dots. See BUSINESS_RULES.md "Claims & language".
// src/lib/branding/customer-surface.guard.test.ts enforces this.
//
// COPY STATUS: every string below is a clearly-labelled S.A.M-NY PLACEHOLDER
// chosen so the build is not blocked. S.A.M New York owns final copy and will
// supply it; swapping a string here is the whole change — no component edits.
// Strings that are parent-facing CLAIMS language are additionally constrained
// by BUSINESS_RULES.md §"Claims & language" (no "validated", "guaranteed",
// "accurate placement", no headline precision number pre-calibration).

import type { TenantBranding } from "../types";

export const samNewYorkBranding: TenantBranding = {
  key: "sam-new-york",
  tenantSlugs: ["inspirea_singapore_math"],

  productName: "S.A.M New York Math Assessment",
  shortName: "S.A.M New York",
  compactName: "S.A.M Assessment",
  // No trademark assertion on the S.A.M New York surface.
  trademarkSymbol: null,
  // "Powered by Inspirea Labs" is removed from ALL customer-facing chrome.
  // The operator/processor disclosure is NOT deleted — it lives in
  // legal.processorDisclosure and renders in the legal fine print.
  poweredBy: null,
  // PLACEHOLDER — founder/counsel to confirm the entity on the notice line.
  copyrightLine: "© 2026 S.A.M New York. All rights reserved.",

  logo: {
    src: "/sam-logo.png",
    alt: "S.A.M Singapore Math",
    width: 3887,
    height: 2182,
  },
  faviconHref: "/favicon.ico",
  mascotAlt: "S.A.M dachshund mascot",

  colorTokenPrefix: "sam",

  meta: {
    title: "S.A.M New York Math Assessment",
    // PLACEHOLDER — parent-facing claims language, founder-gated. Deliberately
    // weaker than the copy it replaces: no "diagnostic", no "pinpoints".
    description:
      "An adaptive math assessment for K–8 learners at S.A.M New York — designed to identify likely skill gaps and support placement in about 15 minutes.",
    ogTitle: "S.A.M New York Math Assessment",
    siteName: "S.A.M New York Math Assessment",
  },
  // Child-facing splash. Deliberately short and name-free — a K–8 child mid-
  // flow does not need the operator's name, and the requirement here is that
  // the splash carries no "Atlas"/"Inspirea". A franchisee that wants its name
  // on the splash just changes this string.
  loadingText: "Getting ready…",

  report: {
    headerName: "S.A.M New York Math Assessment",
    footerName: "S.A.M New York",
    watermark: null,
  },

  email: {
    senderName: "S.A.M New York",
    subjectPrefix: "",
    footerLine: "Sent by S.A.M New York.",
  },

  legal: {
    // ---------------------------------------------------------------------
    // PLACEHOLDER — COUNSEL-GATED. DO NOT EDIT THE WORDING HERE.
    // The founder supplies the final operator/data-processor disclosure after
    // counsel review. This slot exists so the disclosure has a home; it must
    // not be scrubbed and must not be rewritten by an agent.
    // ---------------------------------------------------------------------
    processorDisclosure:
      "[PLACEHOLDER — pending counsel review] This assessment platform is operated by Inspirea Labs Inc. on behalf of S.A.M New York.",
    processorDisclosureIsPlaceholder: true,
  },
};
