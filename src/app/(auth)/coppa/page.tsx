/* eslint-disable @next/next/no-img-element */
// Ported from stitch/module-a/06-coppa-disclosure-desktop.html.
//
// Cycle 1 deviations from source (faithful otherwise):
//  - Stripped `dark:` Tailwind variants.
//  - Replaced inline `font-['Plus_Jakarta_Sans']` with `font-display-child`.
//  - Replaced 2 broken Stitch CDN images (instructor avatar, mascot) with
//    local placeholder SVGs.
//  - Stitch frames this as a modal with a TopAppBar behind it. Ported as a
//    standalone /coppa route — keeps the visual treatment of a centered card
//    over decorative blurs, drops the redundant TopAppBar (the whole point
//    of this route is the disclosure card).
//
// This route is DISCLOSURE-ONLY. Per Model B (per-child consent), the binding
// parental consent is recorded at /add-child (with the child in hand), not
// here — see src/app/(auth)/add-child/actions.ts and
// src/lib/consent/text.ts. "Review & Continue" just advances to add the child.
//
// The "Download PDF" button serves the counsel-approved disclosure asset
// (public/legal/coppa-disclosure-v1.pdf), and the privacy contact is
// privacy@samnewyork.com.
//
// The on-screen body is now the SAME counsel text as that PDF, transcribed
// verbatim into ./disclosure-copy.ts (it used to be Stitch placeholder copy
// that said something different). This file owns layout only — read the header
// of disclosure-copy.ts before touching any wording.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getBranding } from "@/lib/branding";

import {
  AI_PROCESSING_SECTION,
  DISCLOSURE_INTRO,
  DISCLOSURE_SECTIONS,
  DISCLOSURE_VERSION,
  type DisclosureSection,
} from "./disclosure-copy";

// Force dynamic so Next.js doesn't statically prerender — we read
// searchParams to forward stale email-link `?code=` values to the
// /auth/callback Route Handler (where cookies can be set).
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

/** One counsel section: heading, then its paragraphs and bulleted lists. */
function Section({ section }: { section: DisclosureSection }) {
  return (
    <section className="space-y-3">
      <h2 className="font-headline-adult text-lg text-sam-navy font-bold">
        {section.heading}
      </h2>
      {section.blocks.map((block, i) =>
        Array.isArray(block) ? (
          <ul
            key={i}
            className="font-body-regular text-sam-gray-dark text-sm leading-relaxed list-disc pl-5 space-y-1.5"
          >
            {block.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p
            key={i}
            className="font-body-regular text-sam-gray-dark text-sm leading-relaxed"
          >
            {block as string}
          </p>
        ),
      )}
    </section>
  );
}

export default async function CoppaPage({ searchParams }: Props) {
  const branding = getBranding();
  const { code } = await searchParams;

  // Old verification emails (sent before the /auth/callback handler
  // existed) point directly here with `?code=`. Forward them to the
  // proper callback so the session cookie gets set and audit rows
  // get written. After the handler does its work it redirects back
  // here with a clean URL.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/coppa`);
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6 md:p-12 relative overflow-hidden flex-1">
      {/* Background mascot decoration */}
      <div className="absolute bottom-[-20px] left-[5%] opacity-20 pointer-events-none select-none">
        <img
          alt=""
          aria-hidden
          className="w-64 grayscale contrast-125"
          src="/mascot/waving.png"
        />
      </div>

      {/* Decorative background blurs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sam-yellow/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-sam-teal/10 rounded-full blur-[100px]" />
      </div>

      {/* Disclosure Card */}
      <div className="bg-white rounded-[32px] w-full max-w-report-width shadow-[0px_8px_40px_rgba(27,58,107,0.12)] flex flex-col max-h-[870px] relative z-10 border border-[#F2EDE4]">
        {/* Header */}
        <div className="p-8 border-b border-sam-gray-light flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="font-headline-adult text-headline-adult text-sam-navy flex items-center gap-3">
              <span
                className="material-symbols-outlined text-sam-red"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
              COPPA Disclosure &amp; Parental Consent
            </h1>
            {/* The Stitch port carried a hardcoded "Updated: October 24, 2023"
                — filler, and wrong. Now that the body IS the counsel text, a
                false effective date sitting above it is worse than no date, so
                the sub-header identifies the disclosure VERSION instead. Add a
                real date here when counsel supplies one. */}
            <p className="font-caption text-caption text-sam-gray-mid">
              Version: {DISCLOSURE_VERSION} • Required for Student Assessments
            </p>
          </div>
          <Link
            href="/signup"
            className="text-sam-gray-mid hover:text-sam-navy transition-colors p-1"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Introduction — the two unnumbered paragraphs that open the PDF.
              Replaces a Stitch "Our Commitment to Privacy" blurb that made
              privacy claims the counsel text does not make. */}
          <div className="bg-sam-cream/50 rounded-2xl p-6 border border-sam-orange/20">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-sam-orange">
                info
              </span>
              <div className="space-y-2">
                {DISCLOSURE_INTRO.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="font-body-regular text-on-background text-sm leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Sections 1–10, verbatim from coppa-disclosure-v1, then the
              app-authored AI-processing disclosure appended as 11 (safeguard
              C2) so it never renumbers the counsel sections.

              The Stitch "No Advertising" / "Encrypted Storage" badge tiles were
              removed with the placeholder body: "Bank-grade security protocols"
              is a security claim the counsel text does not make (§8 says
              "reasonable administrative, technical, and organizational
              safeguards"), and §4 already states the advertising position in
              counsel's own words. */}
          <div className="space-y-6">
            {DISCLOSURE_SECTIONS.map((section) => (
              <Section key={section.heading} section={section} />
            ))}
            <Section section={AI_PROCESSING_SECTION} />

            {/* ---------------------------------------------------------------
                OPERATOR / DATA-PROCESSOR DISCLOSURE — legal fine print.
                This is the ONE customer-facing place an Inspirea reference
                legitimately remains: it is a compliance disclosure, not
                branding, and must NOT be scrubbed by a rebrand.
                The wording is COUNSEL-GATED and supplied by the founder —
                src/lib/branding/tenants/*.ts `legal.processorDisclosure`
                currently holds a clearly-marked placeholder. Do not rewrite it
                here.
                --------------------------------------------------------------- */}
            <p className="pt-2 text-xs leading-relaxed text-sam-gray-mid">
              {branding.legal.processorDisclosure}
            </p>
          </div>
        </div>

        {/* Footer. This screen is disclosure-only — the binding, per-child
            consent is recorded at /add-child (Model B), with the child in
            hand. "Continue" advances to add the child; the actual
            consent_records row (what the assessment gate checks) is written by
            the add-child server action. */}
        <div className="p-8 border-t border-sam-gray-light bg-surface-container-lowest rounded-b-[32px] flex flex-col md:flex-row justify-between items-center gap-4">
          <a
            href="/legal/coppa-disclosure-v1.pdf"
            download
            target="_blank"
            rel="noopener"
            className="w-full md:w-auto px-6 py-3 border-2 border-sam-navy text-sam-navy rounded-xl font-headline-adult text-sm hover:bg-sam-navy hover:text-white transition-all flex items-center justify-center gap-2 order-2 md:order-1"
          >
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Download PDF
          </a>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto order-1 md:order-2">
            <Link
              href="/signup"
              className="px-8 py-3 text-sam-navy font-semibold hover:bg-sam-cream rounded-xl transition-colors text-center"
            >
              Decline
            </Link>
            <Link
              href="/add-child"
              className="px-10 py-3 bg-sam-red text-white rounded-xl font-headline-adult text-base shadow-[0px_4px_12px_rgba(230,57,70,0.3)] hover:scale-105 active:scale-95 transition-all text-center"
            >
              Review &amp; Continue
            </Link>
          </div>
        </div>
      </div>

      {/* Mascot peek (desktop only) */}
      <div className="fixed bottom-8 right-12 z-50 items-end gap-2 group hidden lg:flex">
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-sam-gray-light mb-12 relative opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 w-48">
          <p className="text-xs text-sam-navy italic">
            &ldquo;Safety first! Let&rsquo;s keep your data secure.&rdquo;
          </p>
          <div className="absolute bottom-[-10px] right-6 w-5 h-5 bg-white border-r border-b border-sam-gray-light rotate-45" />
        </div>
        <div className="w-24 h-24 relative">
          <img
            alt={`${branding.mascotAlt} waving hello`}
            className="w-full h-full object-contain drop-shadow-lg"
            src="/mascot/waving.png"
          />
        </div>
      </div>
    </main>
  );
}
