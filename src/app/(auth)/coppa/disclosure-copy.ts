// COUNSEL-APPROVED COPPA disclosure copy — transcribed VERBATIM from
// public/legal/coppa-disclosure-v1.pdf (the asset the "Download PDF" button
// serves). This replaces the Stitch-derived placeholder body that used to be
// inlined in page.tsx and did not match the served PDF.
//
// ---------------------------------------------------------------------------
// DO NOT EDIT THE WORDING. Not a typo fix, not a tightening, not a
// "clearer" rewrite. Every string below is counsel-approved text; the on-screen
// page and the downloadable PDF must say the same thing. If the PDF is
// revised, re-transcribe from the new asset in one pass and bump the version
// label in DISCLOSURE_VERSION.
//
// What IS ours to shape: the HTML structure. The PDF renders its lists as
// bullets, so they are <ul>/<li> here; PDF line wrapping is not preserved
// (it is a page-width artifact, not wording). Nothing is added, dropped, or
// reordered.
//
// NOT part of coppa-disclosure-v1: AI_PROCESSING_SECTION below. That is the
// app-side minor-safety disclosure (safeguard C2, M2 readiness) describing what
// the misconception classifier actually does. It is app-authored, kept
// deliberately separate from the counsel text, and appended after the counsel
// sections so it never renumbers them. Folding it into the PDF is a
// counsel-facing decision for the founder.
// ---------------------------------------------------------------------------

/** Identifies which counsel asset this copy was transcribed from. */
export const DISCLOSURE_VERSION = "coppa-disclosure-v1";

export const DISCLOSURE_TITLE = "COPPA Disclosure and Parental Consent";

/** The two unnumbered paragraphs that open the PDF, before section 1. */
export const DISCLOSURE_INTRO: readonly string[] = [
  "Before you create a child profile or allow your child to take an online S.A.M assessment, we need your consent to collect and use limited information about your child.",
  "This notice explains what information we collect, how we use it, and your rights as a parent or legal guardian under the Children's Online Privacy Protection Act, commonly known as COPPA.",
];

/**
 * A numbered section. `blocks` render in order: a string is a paragraph, an
 * array of strings is a bulleted list.
 */
export interface DisclosureSection {
  heading: string;
  blocks: ReadonlyArray<string | readonly string[]>;
}

export const DISCLOSURE_SECTIONS: readonly DisclosureSection[] = [
  {
    heading: "1. Parent or Guardian Consent Required",
    blocks: [
      "By continuing, you confirm that:",
      [
        "You are the parent or legal guardian of the child or children you add to this account;",
        "You consent to our collection and use of the limited child information described below;",
        "You understand that the assessment is intended to help evaluate your child's current math level and learning needs; and",
        "You may review, correct, or request deletion of your child's information at any time.",
      ],
      "You should not create a child profile unless you are the child's parent or legal guardian.",
    ],
  },
  {
    heading: "2. Child Information We Collect",
    blocks: [
      "For each child profile, we collect only the following child information:",
      [
        "Child's first name;",
        "Child's age;",
        "Child's grade level; and",
        "Assessment responses, results, scores, and related learning-level information generated through the assessment.",
      ],
      "We do not ask for the child's last name, home address, phone number, email address, photograph, precise location, Social Security number, or other government identification number.",
    ],
  },
  {
    heading: "3. Parent Information We Collect",
    blocks: [
      "To create and manage your parent account, we may collect information from you, including:",
      [
        "Your name;",
        "Your email address;",
        "Your phone number, if provided;",
        "Login credentials or authentication information; and",
        "Communications you send to us.",
      ],
      "Parent account information is used to manage your account, provide assessment results, communicate with you, and respond to your requests.",
    ],
  },
  {
    heading: "4. How We Use Child Information",
    blocks: [
      "We use child information only for educational and operational purposes, including to:",
      [
        "Create a child profile under your parent account;",
        "Administer the SAM online assessment;",
        "Evaluate the child's current math level, strengths, and areas for improvement;",
        "Generate assessment results and recommendations for you;",
        "Help determine appropriate S.A.M placement, instruction, or follow-up; and",
        "Maintain, secure, troubleshoot, and improve the assessment service.",
      ],
      "We do not use child information for behavioral advertising, targeted advertising, or sale to third parties.",
    ],
  },
  {
    heading: "5. Sharing of Child Information",
    blocks: [
      "We do not sell child information.",
      "We may share child information only in limited circumstances:",
      [
        "With service providers who help us operate the assessment platform, host data, secure the service, or provide technical support;",
        "With SAM personnel or authorized staff who need the information to provide assessment results, placement guidance, or educational services;",
        "If required by law, legal process, or to protect the safety, rights, or security of users, the service, or others; or",
        "With your additional consent, if a use or disclosure is not described in this notice.",
      ],
      "Any service providers who process child information on our behalf are expected to use it only to provide services to us and to maintain reasonable safeguards.",
    ],
  },
  {
    heading: "6. Data Retention",
    blocks: [
      "We retain child information only for as long as reasonably necessary to provide the assessment service, communicate results to you, support placement or enrollment decisions, maintain records, comply with legal obligations, resolve disputes, and improve the service.",
      "You may request deletion of your child's information at any time by contacting us at privacy@samnewyork.com.",
    ],
  },
  {
    heading: "7. Your Rights as Parent or Guardian",
    blocks: [
      "As the parent or legal guardian, you have the right to:",
      [
        "Review the personal information we have collected about your child;",
        "Request correction of inaccurate child information;",
        "Request deletion of your child's information;",
        "Refuse to allow further collection or use of your child's information; and",
        "Withdraw your consent.",
      ],
      "To exercise these rights, contact us at privacy@samnewyork.com. We may take reasonable steps to verify your identity before responding to a request.",
      "If you withdraw consent or request deletion, your child may no longer be able to use the assessment service, and we may not be able to provide assessment results or placement recommendations.",
    ],
  },
  {
    heading: "8. Security",
    blocks: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect child information from unauthorized access, disclosure, alteration, or destruction.",
      "No online service can guarantee complete security, but we work to limit the information we collect and protect it appropriately.",
    ],
  },
  {
    heading: "9. No Child-Directed Account Creation",
    blocks: [
      "Children may not create their own accounts. Child profiles must be created only by a parent or legal guardian through a parent account.",
    ],
  },
  {
    heading: "10. Consent",
    blocks: [
      "By checking the box below and continuing, I confirm that:",
      [
        "I am the parent or legal guardian of the child or children I add to this account;",
        "I have read and understood this Parent Notice and Consent;",
        "I consent to the collection, use, and limited disclosure of my child's information as described above;",
        "I understand that I may review, correct, delete, or withdraw consent for my child's information by contacting privacy@samnewyork.com.",
      ],
    ],
  },
];

/**
 * APP-AUTHORED — not part of coppa-disclosure-v1. Minor-safety safeguard C2
 * (M2 readiness): disclose, inside the consent flow, that an automated system
 * processes responses and that the child never interacts with it directly.
 * Mirrors what src/lib/misconceptionClassifier/* actually does (structured
 * response data only). Numbered after the counsel sections so adding it never
 * shifts their numbering.
 */
export const AI_PROCESSING_SECTION: DisclosureSection = {
  heading: "11. Automated (AI) Processing",
  blocks: [
    "To help identify common misconceptions, your child's answers to assessment questions are processed by an automated system that uses artificial intelligence. Your child never chats with or types free-form messages to this system: only structured assessment data (the question, the expected answer, and the answer your child selected or entered) is analyzed, and the analysis happens on our servers after the response is submitted. The AI is never shown your child's name or any identifying information.",
  ],
};
