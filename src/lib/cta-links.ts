// Parent-facing CTA destinations. Placeholders for v1 — every CTA in
// the parent dashboard + report points here. Wire the real URLs in
// ONE place when they exist (booking page, contact-us form, mailto,
// etc.) and every CTA surface updates at once.
//
// Kept as a plain object (not env vars) because these are not
// secrets and not deploy-environment-dependent: marketing owns the
// URLs and updates them via a normal PR.

export const CTA_LINKS = {
  /** Primary action on the parent dashboard + end-of-report.
   *  TODO(marketing): wire the real booking URL when scheduling lands. */
  scheduleFreeClass: "#schedule-a-free-class",

  /** Secondary action on the parent dashboard + end-of-report.
   *  TODO(marketing): wire the real contact URL (form, mailto, or
   *  inbound chat) when the support channel is chosen. */
  questionsTalkToUs: "#questions-talk-to-us",
} as const;
