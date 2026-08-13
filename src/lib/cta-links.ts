// Parent-facing CTA destinations. Placeholders for v1 — every CTA in
// the parent dashboard + report points here. Wire the real URLs in
// ONE place when they exist (booking page, contact-us form, mailto,
// etc.) and every CTA surface updates at once.
//
// Kept as a plain object (not env vars) because these are not
// secrets and not deploy-environment-dependent: marketing owns the
// URLs and updates them via a normal PR.

/**
 * Subject line on the director-conversation mailto. Encoded once here so the
 * href below stays a single readable constant.
 */
const DIRECTOR_CALL_SUBJECT = encodeURIComponent(
  "I'd like to schedule a call with the S.A.M director",
);

export const CTA_LINKS = {
  /** Primary action on the parent dashboard + end-of-report.
   *
   *  INTERIM: a mailto to the S.A.M New York center inbox, replacing the dead
   *  `#schedule-a-free-class` placeholder so the button actually does something
   *  for the beta. Subject is prefilled; no body prefill (the parent writes
   *  their own note). Button labels are unchanged.
   *
   *  This is NOT the final destination: the HubSpot lane owns the eventual
   *  env-gated scheduler swap (SAM_SCHEDULER_URL + its own label), and
   *  multi-center resolution is tracked in TODO.md. */
  scheduleFreeClass: `mailto:parents@samnewyork.com?subject=${DIRECTOR_CALL_SUBJECT}`,

  /** Secondary action on the parent dashboard + end-of-report. Wired to the
   *  S.A.M New York support inbox. */
  questionsTalkToUs: "mailto:hello@samnewyork.com",
} as const;
