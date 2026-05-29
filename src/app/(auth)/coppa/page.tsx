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
// Spec gaps to address before launch (intentionally NOT fixed in this port):
//  - The Stitch disclosure text is placeholder marketing copy. Final wording
//    must match compliance.md §2 (including the school-operator consent
//    extension and 30-day revocation grace) and be reviewed by counsel.
//  - "Download PDF" button has no handler.
//  - Email address `privacy@atlasassessment.edu` is placeholder; replace
//    with the real S.A.M. / Inspirea Labs privacy contact before launch.

import Link from "next/link";
import { redirect } from "next/navigation";

// Force dynamic so Next.js doesn't statically prerender — we read
// searchParams to forward stale email-link `?code=` values to the
// /auth/callback Route Handler (where cookies can be set).
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function CoppaPage({ searchParams }: Props) {
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
          src="/img/placeholder-mascot.svg"
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
            <p className="font-caption text-caption text-sam-gray-mid">
              Updated: October 24, 2023 • Required for Student Assessments
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
          {/* Introduction */}
          <div className="bg-sam-cream/50 rounded-2xl p-6 border border-sam-orange/20">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-sam-orange">
                info
              </span>
              <div className="space-y-2">
                <p className="font-body-regular text-on-background font-semibold">
                  Our Commitment to Privacy
                </p>
                <p className="font-body-regular text-on-background text-sm leading-relaxed">
                  Atlas Assessment is committed to complying with the
                  Children&rsquo;s Online Privacy Protection Act (COPPA). We
                  collect minimal information necessary to evaluate
                  mathematical progress and never share identifiable data with
                  third parties for marketing purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="font-headline-adult text-lg text-sam-navy font-bold">
                1. Information Collection
              </h2>
              <p className="font-body-regular text-sam-gray-dark text-sm leading-relaxed">
                For students under the age of 13, we collect only the
                following: first name (or nickname), age, and assessment
                responses. This data is used exclusively to generate diagnostic
                reports for parents and instructors.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="font-headline-adult text-lg text-sam-navy font-bold">
                2. Use of Data
              </h2>
              <p className="font-body-regular text-sam-gray-dark text-sm leading-relaxed">
                The diagnostic data helps identify learning gaps and
                mathematical strands requiring attention. All progress data is
                encrypted and hosted on secure servers.
              </p>
            </section>
            <section className="space-y-3">
              <h2 className="font-headline-adult text-lg text-sam-navy font-bold">
                3. Your Rights as a Parent
              </h2>
              <p className="font-body-regular text-sam-gray-dark text-sm leading-relaxed">
                You have the right to review your child&rsquo;s information,
                request its deletion, and refuse further collection or use.
                Please contact our Data Privacy Officer at
                privacy@atlasassessment.edu for any such requests.
              </p>
            </section>
            {/* Automated (AI) processing disclosure — minor-safety safeguard
                C2 (M2 readiness). Discloses, in the consent flow itself, that
                an AI system processes responses and that the child never
                interacts with it directly. Mirrors what the misconception
                classifier actually does (structured response data only —
                src/lib/misconceptionClassifier/*). */}
            <section className="space-y-3">
              <h2 className="font-headline-adult text-lg text-sam-navy font-bold">
                4. Automated (AI) Processing
              </h2>
              <p className="font-body-regular text-sam-gray-dark text-sm leading-relaxed">
                To help identify common misconceptions, your child&rsquo;s
                answers to assessment questions are processed by an automated
                system that uses artificial intelligence. Your child never
                chats with or types free-form messages to this system: only
                structured assessment data (the question, the expected answer,
                and the answer your child selected or entered) is analyzed, and
                the analysis happens on our servers after the response is
                submitted. The AI is never shown your child&rsquo;s name or any
                identifying information.
              </p>
            </section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="border border-sam-gray-light rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-sam-teal">
                  check_circle
                </span>
                <div>
                  <p className="font-caption text-sam-navy font-bold">
                    No Advertising
                  </p>
                  <p className="text-xs text-sam-gray-mid">
                    We do not serve ads to children.
                  </p>
                </div>
              </div>
              <div className="border border-sam-gray-light rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-sam-teal">
                  check_circle
                </span>
                <div>
                  <p className="font-caption text-sam-navy font-bold">
                    Encrypted Storage
                  </p>
                  <p className="text-xs text-sam-gray-mid">
                    Bank-grade security protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer. This screen is disclosure-only — the binding, per-child
            consent is recorded at /add-child (Model B), with the child in
            hand. "Continue" advances to add the child; the actual
            consent_records row (what the assessment gate checks) is written by
            the add-child server action. */}
        <div className="p-8 border-t border-sam-gray-light bg-surface-container-lowest rounded-b-[32px] flex flex-col md:flex-row justify-between items-center gap-4">
          <button className="w-full md:w-auto px-6 py-3 border-2 border-sam-navy text-sam-navy rounded-xl font-headline-adult text-sm hover:bg-sam-navy hover:text-white transition-all flex items-center justify-center gap-2 order-2 md:order-1">
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Download PDF
          </button>
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
            alt="Mascot"
            className="w-full h-full object-contain drop-shadow-lg"
            src="/img/placeholder-mascot.svg"
          />
        </div>
      </div>
    </main>
  );
}
