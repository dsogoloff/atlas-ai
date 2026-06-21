// Parent Assessment Report (formerly "Diagnostic Report"). Server
// component — runs the page-level auth gate (R11), validates the `child`
// query param, fetches all data via two Supabase clients, and dispatches
// to one of seven rendering branches.
//
// Editorial reskin (docs/atlas-sample-report.html): ~720px reading column
// on a paper-white card centred over a paper-grey body, Playfair Display
// serif heads + DM Sans body, navy #1B3A6B / cyan #00B8D4. Layout chrome
// (topbar, hero, sections, next-steps, footer) is rendered inline below;
// the strand / findings / recommendations leaf components live alongside
// this file and have been restyled to the same editorial palette.
//
// Routing: /report?child=<uuid>. Linked from the Phase 1 dashboard
// child card "View Report" CTA.
//
// Branches (in evaluation order):
//   1. Missing/bad child UUID         → redirect /dashboard
//   2. Unauthenticated                → redirect /login?next=...
//   3. Orphan auth user (no parents)  → MinimalError, no chrome
//   4. Child not found / not yours    → MinimalError, no chrome
//   5. No COMPLETED session yet       → empty state inside report shell
//   6. session_time_flag unreliable|mixed → "ask child to re-take" banner
//                                       (no scores, no misconceptions)
//   7. session_time_flag rushed|struggling|normal → full report
//      (rushed + struggling render a caveat banner above the report)

import Link from "next/link";
import { redirect } from "next/navigation";

import { CTA_LINKS } from "@/lib/cta-links";
import { isLeadSchoolFieldEnabled } from "@/lib/env";
import { firstName } from "@/lib/format/firstName";
import { assembleReportContent } from "@/lib/report/assemble";
import { resolveNarrationProse } from "@/lib/report/narration/resolve";
import { rollUpToParentStrands } from "@/lib/report/strand-mastery";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import { CenterFollowupCta } from "./center-followup-cta";
import { FindingsList } from "./findings-list";
import { ParentReportFeedback } from "./parent-report-feedback";
import { PlacementCard } from "./placement-card";
import { ReadinessSection } from "./readiness-section";
import { PlacementRecommendation } from "./placement-recommendation";
import { StrandMap } from "./strand-map";
import { StrandRadar } from "./strand-radar";
import { TimeFlagBanner } from "./time-flag-banner";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// =============================================================================
// Page
// =============================================================================

interface ReportPageProps {
  searchParams: Promise<{ child?: string }>;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  // ---- Branch 1: validate the child param before doing anything else.
  const params = await searchParams;
  const childId = params.child?.trim() ?? "";
  if (!UUID_RE.test(childId)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // ---- Branch 2: auth gate (R11 page-level).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/report?child=${childId}`);
  }

  // Resolve the parent row (RLS-scoped to the auth user's own row).
  const { data: parent, error: parentErr } = await supabase
    .from("parents")
    .select("id, name")
    .maybeSingle();

  // ---- Branch 3: orphan auth user.
  if (parentErr || !parent) {
    console.error("[report] parent lookup failed", {
      authUserId: user.id,
      err: parentErr,
    });
    return (
      <MinimalError
        title="Account profile not found"
        body="We couldn't find your parent account. Please contact support."
      />
    );
  }

  // Resolve the child. RLS limits this to children whose parent_id
  // matches the parent row above.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year")
    .eq("id", childId)
    .maybeSingle();

  // ---- Branch 4: child not found / belongs to another parent.
  if (childErr || !child) {
    if (childErr) {
      console.error("[report] child lookup failed", {
        childId,
        err: childErr,
      });
    }
    return (
      <MinimalError
        title="Child not found"
        body="We couldn't find this child in your family. The link may be stale, or the child may have been removed."
      />
    );
  }

  // Most-recent COMPLETED session for this child.
  const { data: latestSession } = await supabase
    .from("assessment_sessions")
    .select(
      "id, tenant_id, started_at, completed_at, current_estimate, session_time_flag, test_type",
    )
    .eq("child_id", child.id)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ---- Branch 5: empty state.
  if (!latestSession) {
    const childFirstName = firstName(child.name);
    // School grade is no longer surfaced to parents (founder decision
    // 2026-06-18, D5) — the empty state shows no meta line.
    return (
      <ReportShell>
        <Topbar reportId={null} />
        <Hero childName={childFirstName} metaLine={null} />
        <section
          className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <p
            className="text-lg leading-[1.7] max-w-[660px]"
            style={{
              fontFamily: "var(--font-report-sans)",
              color: "var(--color-report-text-secondary)",
            }}
          >
            {childFirstName} hasn&rsquo;t completed an assessment yet. Once
            they finish their first session, the assessment report will
            appear here.
          </p>
          <Link
            href={`/assessment?child_id=${child.id}`}
            className="mt-7 inline-flex items-center gap-4 px-7 py-5 text-white text-[17px] font-medium hover:opacity-95 transition-opacity"
            style={{
              backgroundColor: "var(--color-report-navy)",
              fontFamily: "var(--font-report-sans)",
            }}
          >
            <span>Start assessment</span>
            <span
              className="text-2xl"
              style={{ fontFamily: "var(--font-report-serif)" }}
              aria-hidden="true"
            >
              &rarr;
            </span>
          </Link>
        </section>
        <Footer />
      </ReportShell>
    );
  }

  // ---- Branch 6 vs 7: defensive PlacementEstimate check.
  if (!isPlacementEstimateJson(latestSession.current_estimate)) {
    console.error("[report] completed session missing valid placement", {
      sessionId: latestSession.id,
      childId: child.id,
    });
    return (
      <MinimalError
        title="Report unavailable"
        body="We couldn't generate the report for this assessment. Please contact support."
      />
    );
  }
  const timeFlag: SessionTimeFlag = latestSession.session_time_flag ?? "normal";

  // ---- Branch 6: unreliable/mixed → "please re-take" banner only.
  if (timeFlag === "unreliable" || timeFlag === "mixed") {
    const childFirstName = firstName(child.name);
    // School grade is no longer surfaced to parents (D5) — meta line is the
    // assessed date only.
    const completed = formatDate(latestSession.completed_at);
    const metaLine = completed ? `Assessed ${completed}` : "";
    return (
      <ReportShell>
        <Topbar reportId={null} />
        <Hero
          childName={childFirstName}
          metaLine={metaLine || null}
        />
        <section
          className="px-12 max-sm:px-6 py-13 max-sm:py-10 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <TimeFlagBanner
            flag={timeFlag}
            childName={childFirstName}
            childId={child.id}
          />
        </section>
        <Footer />
      </ReportShell>
    );
  }

  // ---- Branch 7: full report.
  let reportContent;
  try {
    reportContent = await assembleReportContent({
      readClient: supabase,
      serviceClient: createServiceClient(),
      session: latestSession,
      child,
    });
  } catch (err) {
    console.error("[report] assembly failed", {
      sessionId: latestSession.id,
      err,
    });
    return (
      <MinimalError
        title="Report unavailable"
        body="We couldn't load this assessment. Please try again in a moment, or contact support if the problem persists."
      />
    );
  }

  const { data: narrationRow, error: narrationErr } = await supabase
    .from("report_narrations")
    .select(
      "status, placement_line, strand_lede, findings_strengths, findings_growth_areas, recommendations_lede",
    )
    .eq("session_id", latestSession.id)
    .maybeSingle();
  if (narrationErr) {
    console.error("[report] narration lookup failed", {
      sessionId: latestSession.id,
      err: narrationErr,
    });
  }
  const narrationProse = resolveNarrationProse(
    narrationRow ?? null,
    reportContent.time_flag,
  );

  const childFirstName = firstName(reportContent.child.display_name);
  const metaLine = buildMetaLine(reportContent);

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
          href={`/report/how-it-works?child=${child.id}`}
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

      {/* SHORT-test readiness + comprehensive CTA (null for comprehensive
          sessions → not rendered). Copy is DRAFT (readiness-section.tsx). */}
      {reportContent.readiness && (
        <section
          className="px-12 max-sm:px-6 py-9 border-b"
          style={{ borderColor: "var(--color-report-border)" }}
        >
          <ReadinessSection
            readiness={reportContent.readiness}
            sessionId={reportContent.session_id}
            schoolFieldEnabled={isLeadSchoolFieldEnabled()}
          />
        </section>
      )}

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

      {/* Placement recommendation — comprehensive only; suppressed on SHORT
          reports (readiness !== null) for the same reason as the hero block. */}
      {!reportContent.readiness && (
        <Section title="Placement recommendation">
          <PlacementRecommendation samLevel={reportContent.placement.sam_level} />
        </Section>
      )}

      <NextSteps sessionId={latestSession.id} />

      <ParentReportFeedback sessionId={latestSession.id} childId={child.id} />

      <Footer />
    </ReportShell>
  );
}

// =============================================================================
// Editorial chrome — inline so every Branch 5/6/7 share the same shell
// without an extra round of indirection.
// =============================================================================

function ReportShell({ children }: { children: React.ReactNode }) {
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

function Topbar({ reportId }: { reportId: string | null }) {
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

function Hero({
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

function Footer() {
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

// MinimalError keeps its own simple chrome — no full editorial shell —
// because these branches fire before we have any report data to render.
function MinimalError({ title, body }: { title: string; body: string }) {
  return (
    <main
      className="flex-grow flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--color-report-paper)" }}
    >
      <div
        className="max-w-md text-center bg-white p-10"
        style={{ border: "1px solid var(--color-report-border)" }}
      >
        <h1
          className="text-2xl mb-4"
          style={{
            fontFamily: "var(--font-report-serif)",
            color: "var(--color-report-navy)",
          }}
        >
          {title}
        </h1>
        <p
          className="text-[17px] leading-[1.65]"
          style={{
            fontFamily: "var(--font-report-sans)",
            color: "var(--color-report-text-secondary)",
          }}
        >
          {body}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-white text-[17px] font-medium hover:opacity-95 transition-opacity"
          style={{
            backgroundColor: "var(--color-report-navy)",
            fontFamily: "var(--font-report-sans)",
          }}
        >
          Back to family dashboard
        </Link>
      </div>
    </main>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
