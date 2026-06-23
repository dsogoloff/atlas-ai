// Parent report — full editorial article (Branch 7 render) + shared chrome.
//
// Extracted from page.tsx so the SAME layout powers both the live report
// route and the dev-only preview at /dev/report-preview (no auth, no DB) —
// the preview can't drift from production because it renders this component.
//
// ReportArticle is presentational: it takes a fully-assembled ReportContent
// plus the resolved narration prose and renders the article. The data path
// (auth gate, query orchestration, assembleReportContent) stays in page.tsx.
// The editorial chrome (ReportShell/Topbar/Hero/Footer) is exported so the
// page's empty-state / time-flag branches share the same shell.

import Link from "next/link";

import { CTA_LINKS } from "@/lib/cta-links";
import { firstName } from "@/lib/format/firstName";
import type { resolveNarrationProse } from "@/lib/report/narration/resolve";
import { rollUpToParentStrands } from "@/lib/report/strand-mastery";
import type { ReportContent } from "@/lib/report/types";

import { CenterFollowupCta } from "./center-followup-cta";
import { FindingsList } from "./findings-list";
import { ParentReportFeedback } from "./parent-report-feedback";
import { PlacementCard } from "./placement-card";
import { PlacementRecommendation } from "./placement-recommendation";
import { ReadinessSection } from "./readiness-section";
import { StrandMap } from "./strand-map";
import { StrandRadar } from "./strand-radar";
import { TimeFlagBanner } from "./time-flag-banner";

type NarrationProse = ReturnType<typeof resolveNarrationProse>;

const FOOTER_DISCLAIMER =
  "This is an early-pilot assessment designed to identify likely skill gaps and support placement. It is not a validated diagnostic, and the recommended placement should be confirmed with a S.A.M center instructor.";

const NEXT_STEPS_BODY =
  "A S.A.M center director will reach out within two business days to discuss the findings and answer any questions. If you would like to move faster, you can schedule a conversation directly.";

// Label resolved 2026-05-30 (DECISIONS): consultative wording, brand token
// "S.A.M" with no trailing dot. Href stays the CTA_LINKS placeholder until
// real scheduling is wired.
const PRIMARY_CTA_LABEL =
  "Schedule a conversation with a S.A.M center director";

const STRAND_PERF_LEDE_FALLBACK =
  "Performance is reported relative to expected proficiency for the assessed grade band.";

interface ReportArticleProps {
  reportContent: ReportContent;
  narrationProse: NarrationProse;
  childId: string;
  /** LEAD_SCHOOL_FIELD_LIVE — gates the child's-school field on the CTA form. */
  schoolFieldEnabled: boolean;
}

/** The full editorial parent report (page.tsx Branch 7). Section order is the
 *  source of truth for the report layout — including the comprehensive CTA,
 *  which sits BELOW the strand + narrative content. */
export function ReportArticle({
  reportContent,
  narrationProse,
  childId,
  schoolFieldEnabled,
}: ReportArticleProps) {
  const childFirstName = firstName(reportContent.child.display_name);
  const metaLine = buildMetaLine(reportContent);
  const sessionId = reportContent.session_id;

  return (
    <ReportShell>
      <Topbar reportId={reportContent.metadata.report_id} />
      <Hero childName={childFirstName} metaLine={metaLine}>
        {/* Comprehensive placement block. SHORT reports (readiness !== null)
            never show it — a short sample doesn't yield a placement, and the
            comprehensive value would leak (e.g. "S.A.M Level 3" on a 0C short
            report). Short shows only the readiness line + CTA below. */}
        {!reportContent.readiness && (
          <PlacementCard
            childName={childFirstName}
            samLevel={reportContent.placement.sam_level}
            overallPercentage={reportContent.placement.overall_percentage}
            tier={reportContent.placement.tier}
            narrationLine={narrationProse?.placement_line}
          />
        )}
        <Link
          href={`/report/how-it-works?child=${childId}`}
          className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium hover:opacity-70 transition-opacity print:hidden"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-navy)",
          }}
        >
          How this report works
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </Hero>

      {(reportContent.time_flag === "rushed" ||
        reportContent.time_flag === "struggling") && (
        <section
          className="px-12 max-sm:px-6 py-9 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <TimeFlagBanner
            flag={reportContent.time_flag}
            childName={childFirstName}
          />
        </section>
      )}

      <Section
        title="Strand Performance"
        lede={narrationProse?.strand_lede ?? STRAND_PERF_LEDE_FALLBACK}
      >
        <StrandRadar
          rows={rollUpToParentStrands(reportContent.strand_mastery)}
        />
        <StrandMap rows={reportContent.strand_mastery} />
      </Section>

      {narrationProse?.key_findings?.strengths.length ? (
        <Section title="Strengths">
          <FindingsList items={narrationProse.key_findings.strengths} />
        </Section>
      ) : null}

      {narrationProse?.key_findings?.growth_areas.length ? (
        <Section title="Areas to confirm with your instructor">
          <FindingsList items={narrationProse.key_findings.growth_areas} />
          <p
            className="mt-8 max-w-[660px] text-[17px] leading-[1.65]"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-secondary)",
            }}
          >
            Your S.A.M instructor receives a detailed curriculum focus tailored
            to your child.
          </p>
        </Section>
      ) : null}

      {/* SHORT-test readiness + comprehensive CTA (null for comprehensive
          sessions → not rendered). Placed below the strand/narrative content
          so the "See the full picture" CTA closes the report. Copy is DRAFT
          (readiness-section.tsx). */}
      {reportContent.readiness && (
        <section
          className="px-12 max-sm:px-6 py-9 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <ReadinessSection
            readiness={reportContent.readiness}
            sessionId={sessionId}
            schoolFieldEnabled={schoolFieldEnabled}
          />
        </section>
      )}

      {/* Placement recommendation — comprehensive only; suppressed on SHORT
          reports (readiness !== null) for the same reason as the hero block. */}
      {!reportContent.readiness && (
        <Section title="Placement recommendation">
          <PlacementRecommendation samLevel={reportContent.placement.sam_level} />
        </Section>
      )}

      <NextSteps sessionId={sessionId} />

      <ParentReportFeedback sessionId={sessionId} childId={childId} />

      <Footer />
    </ReportShell>
  );
}

// =============================================================================
// Editorial chrome — shared so every Branch 5/6/7 (and the dev preview) use
// the same shell without an extra round of indirection.
// =============================================================================

export function ReportShell({ children }: { children: React.ReactNode }) {
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
        {children}
      </article>
    </div>
  );
}

export function Topbar({ reportId }: { reportId: string | null }) {
  return (
    <div
      className="flex justify-between items-center px-12 max-sm:px-6 py-5 border-b text-[12px] max-sm:text-[11px] uppercase tracking-[0.12em] print:hidden"
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
        Atlas Assessment
      </span>
      {reportId && (
        <span className="max-sm:hidden">Report ID &middot; {reportId}</span>
      )}
    </div>
  );
}

export function Hero({
  childName,
  metaLine,
  children,
}: {
  childName: string;
  metaLine: string | null;
  children?: React.ReactNode;
}) {
  return (
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
        className="text-5xl max-sm:text-4xl leading-[1.1] font-medium"
        style={{
          fontFamily: "var(--font-report-serif)",
          color: "var(--color-report-navy)",
          letterSpacing: "-0.01em",
        }}
      >
        {childName}
      </h1>
      {metaLine && (
        <div
          className="text-base mt-2.5"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {metaLine}
        </div>
      )}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
      style={{ borderColor: "var(--color-report-border)" }}
    >
      <h2
        className="text-[28px] max-sm:text-2xl font-medium mb-2.5"
        style={{
          fontFamily: "var(--font-report-serif)",
          color: "var(--color-report-navy)",
          letterSpacing: "-0.005em",
        }}
      >
        {title}
      </h2>
      {lede && (
        <p
          className="text-[17px] leading-[1.65] mb-8 max-w-[660px]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {lede}
        </p>
      )}
      {children}
    </section>
  );
}

function NextSteps({ sessionId }: { sessionId: string }) {
  return (
    <section
      className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b print:hidden"
      style={{ borderColor: "var(--color-report-border)" }}
    >
      <h2
        className="text-[28px] max-sm:text-2xl font-medium mb-2.5"
        style={{
          fontFamily: "var(--font-report-serif)",
          color: "var(--color-report-navy)",
          letterSpacing: "-0.005em",
        }}
      >
        Next Steps
      </h2>
      <p
        className="text-lg leading-[1.7] mb-7 max-w-[660px]"
        style={{
          fontFamily: "var(--font-report-sans)",
          color: "var(--color-report-text)",
        }}
      >
        {NEXT_STEPS_BODY}
      </p>
      <CenterFollowupCta
        sessionId={sessionId}
        label={PRIMARY_CTA_LABEL}
        href={CTA_LINKS.scheduleFreeClass}
      />
      <div
        className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[13px] uppercase tracking-[0.1em]"
        style={{
          fontFamily: "var(--font-report-sans)",
          color: "var(--color-report-text-light)",
        }}
      >
        <Link
          href={CTA_LINKS.questionsTalkToUs}
          className="hover:text-[color:var(--color-report-navy)] transition-colors"
        >
          Questions? Talk to us
        </Link>
        <Link
          href={`/report/answers?session=${sessionId}`}
          className="hover:text-[color:var(--color-report-navy)] transition-colors"
        >
          View detailed answer log
        </Link>
        <Link
          href="/dashboard"
          className="hover:text-[color:var(--color-report-navy)] transition-colors"
        >
          Back to family dashboard
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
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
        Atlas AI &middot; Powered by Inspirea Labs
      </div>
      <p
        className="mt-4 italic max-w-[600px] mx-auto leading-[1.6]"
        style={{
          letterSpacing: "0",
          textTransform: "none",
          color: "var(--color-report-text-light)",
        }}
      >
        {FOOTER_DISCLAIMER}
      </p>
    </footer>
  );
}

/** Compose the hero meta line: "Assessed {date} · Completed in {duration}".
 *  Each piece is optional — gracefully degrades when fields are missing.
 *  The interpunct separator matches the reference (atlas-sample-report.html). */
function buildMetaLine(reportContent: {
  metadata: { assessed_date_display: string; duration_display: string };
}): string | null {
  // School grade dropped from the parent meta line (D5).
  const parts: string[] = [];
  if (reportContent.metadata.assessed_date_display) {
    parts.push(`Assessed ${reportContent.metadata.assessed_date_display}`);
  }
  if (reportContent.metadata.duration_display) {
    parts.push(`Completed in ${reportContent.metadata.duration_display}`);
  }
  return parts.length ? parts.join(" · ") : null;
}
