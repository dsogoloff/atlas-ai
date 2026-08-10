// "How this report works" — parent-facing explainer for the Assessment Report.
//
// Dedicated sub-route, mirroring report/answers/ as a self-contained server
// component (the (parent) layout does not gate auth, so each route self-gates).
// Shares the report's editorial design system (--font-report-serif /
// --color-report-* tokens, 850px reading column, 17px body) so it reads as a
// continuation of the report after the typography/width pass.
//
// Linked from the full report's hero, just below the placement block, with the
// child id carried through so "Back to report" returns to the right report.
//
// Copy is founder-locked and rendered verbatim. Per strategy §2.4 this surface
// must not use "diagnostic", "validated", "accurate", "guaranteed", or
// "official S.A.M.". The bold on "how" in the opening line is intentional.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getBranding } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";

// auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface HowItWorksPageProps {
  searchParams: Promise<{ child?: string }>;
}

export default async function HowItWorksPage({
  searchParams,
}: HowItWorksPageProps) {
  const branding = getBranding();
  const params = await searchParams;
  const childId = params.child?.trim() ?? "";
  const hasChild = UUID_RE.test(childId);
  const backHref = hasChild ? `/report?child=${childId}` : "/dashboard";

  // Self-gate: parent-area content, reachable only from inside the report.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?next=/report/how-it-works${hasChild ? `?child=${childId}` : ""}`,
    );
  }

  return (
    <div
      className="flex-grow w-full"
      style={{
        backgroundColor: "var(--color-report-paper)",
        fontFamily: "var(--font-report-sans)",
        color: "var(--color-report-text)",
        lineHeight: 1.6,
      }}
    >
      <article
        className="max-w-[850px] mx-auto min-h-screen"
        style={{ backgroundColor: "var(--color-report-paper-white)" }}
      >
        {/* Topbar — brand left, quiet return link right. */}
        <div
          className="flex justify-between items-center px-12 max-sm:px-6 py-5 border-b text-[12px] max-sm:text-[11px] uppercase tracking-[0.12em]"
          style={{
            borderColor: "var(--color-report-border)",
            color: "var(--color-report-text-light)",
            fontFamily: "var(--font-report-sans)",
          }}
        >
          <span
            className="font-semibold"
            style={{ color: "var(--color-report-navy)" }}
          >
            {branding.report.headerName}
          </span>
          <Link
            href={backHref}
            className="hover:text-[color:var(--color-report-navy)] transition-colors"
          >
            <span aria-hidden="true">&larr;</span> Back to report
          </Link>
        </div>

        {/* Header. */}
        <div
          className="px-12 max-sm:px-6 pt-14 max-sm:pt-10 pb-11 max-sm:pb-8 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <div
            className="text-[12px] uppercase tracking-[0.16em] mb-4"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-light)",
            }}
          >
            Assessment Report
          </div>
          <h1
            className="text-4xl max-sm:text-3xl leading-[1.1] font-medium"
            style={{
              fontFamily: "var(--font-report-serif)",
              color: "var(--color-report-navy)",
              letterSpacing: "-0.01em",
            }}
          >
            How this report works
          </h1>
        </div>

        {/* Body — verbatim founder copy. */}
        <section
          className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <div className="max-w-[660px] flex flex-col gap-7">
            <p
              className="text-[17px] leading-[1.7]"
              style={{ color: "var(--color-report-text)" }}
            >
              This report is built from{" "}
              <strong
                className="font-semibold"
                style={{ color: "var(--color-report-navy)" }}
              >
                how
              </strong>{" "}
              your child actually answered &mdash; not just how many questions
              they got right.
            </p>

            <p
              className="text-[17px] leading-[1.7]"
              style={{ color: "var(--color-report-text-secondary)" }}
            >
              <strong
                className="font-semibold"
                style={{ color: "var(--color-report-navy)" }}
              >
                A test that adapts as it goes.
              </strong>{" "}
              Rather than a fixed worksheet, the assessment adjusts in real
              time. As your child answers, it estimates where their
              understanding sits and chooses the next question to learn the most
              from &mdash; easing off when something is solid, probing gently
              when it isn&rsquo;t. That&rsquo;s why a short session can cover a
              lot of ground.
            </p>

            <p
              className="text-[17px] leading-[1.7]"
              style={{ color: "var(--color-report-text-secondary)" }}
            >
              <strong
                className="font-semibold"
                style={{ color: "var(--color-report-navy)" }}
              >
                Estimating ability, not just scoring.
              </strong>{" "}
              Behind the scenes we use a method called{" "}
              <em style={{ color: "var(--color-report-navy)" }}>
                Bayesian ability estimation
              </em>
              . In plain terms: the assessment starts with a reasonable
              expectation for your child&rsquo;s grade, then updates that
              picture with every answer &mdash; growing more confident as
              evidence builds. Where the evidence is thin, the report says so
              rather than overstating what it knows. (You&rsquo;ll see this when
              a section is marked &ldquo;not yet assessed.&rdquo;)
            </p>

            <p
              className="text-[17px] leading-[1.7]"
              style={{ color: "var(--color-report-text-secondary)" }}
            >
              <strong
                className="font-semibold"
                style={{ color: "var(--color-report-navy)" }}
              >
                Looking at why, not just wrong.
              </strong>{" "}
              A wrong answer usually isn&rsquo;t random &mdash; it often points
              to a specific misunderstanding, like regrouping the wrong way or
              misreading place value. We use a{" "}
              <em style={{ color: "var(--color-report-navy)" }}>
                language model
              </em>{" "}
              to look at the pattern of answers and flag these likely{" "}
              <em style={{ color: "var(--color-report-navy)" }}>
                misconceptions
              </em>
              , so the feedback is about what to work on, not just a grade.
            </p>

            <p
              className="text-[17px] leading-[1.7]"
              style={{ color: "var(--color-report-text-secondary)" }}
            >
              <strong
                className="font-semibold"
                style={{ color: "var(--color-report-navy)" }}
              >
                What this means for you.
              </strong>{" "}
              The result is a starting picture of your child&rsquo;s strengths
              and the few specific areas worth a closer look &mdash; designed to
              help a {branding.shortName} instructor place and support your child,
              not to
              label them. A fuller assessment at a center can confirm and go
              deeper.
            </p>
          </div>

          <div className="mt-10">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.1em] font-medium hover:text-[color:var(--color-report-navy)] transition-colors"
              style={{
                fontFamily: "var(--font-report-sans)",
                color: "var(--color-report-text-light)",
              }}
            >
              <span aria-hidden="true">&larr;</span>
              Back to your report
            </Link>
          </div>
        </section>

        {/* Footer. */}
        <footer
          className="px-12 max-sm:px-6 pt-9 pb-12 text-center text-[12px] tracking-[0.08em] leading-[1.7]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-light)",
          }}
        >
          <div
            className="uppercase font-medium"
            style={{ color: "var(--color-report-navy-muted)" }}
          >
            {branding.report.footerName}
          </div>
        </footer>
      </article>
    </div>
  );
}
