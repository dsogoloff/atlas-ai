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

import { isLeadSchoolFieldEnabled } from "@/lib/env";
import { firstName } from "@/lib/format/firstName";
import { assembleReportContent } from "@/lib/report/assemble";
import { resolveNarrationProse } from "@/lib/report/narration/resolve";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  Footer,
  Hero,
  ReportArticle,
  ReportShell,
  Topbar,
} from "./report-article";
import { TimeFlagBanner } from "./time-flag-banner";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  return (
    <ReportArticle
      reportContent={reportContent}
      narrationProse={narrationProse}
      childId={child.id}
      schoolFieldEnabled={isLeadSchoolFieldEnabled()}
    />
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
