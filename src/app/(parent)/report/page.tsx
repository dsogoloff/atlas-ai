/* eslint-disable @next/next/no-img-element */
// Parent diagnostic report. Server component — runs the page-level auth
// gate (R11), validates the `child` query param, fetches all data via
// two Supabase clients, and dispatches to one of seven rendering
// branches.
//
// Routing: /report?child=<uuid>. Linked from the Phase 1 dashboard
// child card "View Report" CTA (Item #7 placeholder target).
//
// Branches (in evaluation order):
//   1. Missing/bad child UUID         → redirect /dashboard
//   2. Unauthenticated                → redirect /login?next=...
//   3. Orphan auth user (no parents)  → MinimalError, no chrome
//   4. Child not found / not yours    → MinimalError, no chrome
//   5. No COMPLETED session yet       → empty state inside chrome
//   6. session_time_flag unreliable|mixed → "ask child to re-take" banner
//                                       (no scores, no misconceptions)
//   7. session_time_flag rushed|struggling|normal → full report
//      (rushed + struggling render a caveat banner above the report)
//
// Two Supabase clients (P-A read against
// supabase/migrations/20260426000100_rls_policies.sql):
//   * createClient() (anon, RLS-enforced) → parents, children,
//     assessment_sessions, responses, misconceptions,
//     curriculum_recommendations. Per migration, misconceptions and
//     curriculum_recommendations have tenant-scoped public SELECT
//     policies, so the parent's session is sufficient.
//   * createServiceClient() (service role) → questions. The questions
//     table has RLS enabled with NO public policies (compliance.md §8
//     constraint 4: never expose item content to non-instructors), so
//     anon reads return zero rows. We need question_id → strand only,
//     never content, never the prompt — and the join is fanned out
//     server-side to surface only strand to the parent UI.
//
// TODO: extract the inline TopAppBar to (parent)/_components/parent-header.tsx
// if a third parent route lands. With two routes (dashboard, report),
// the duplication is cheaper than the abstraction.

import Link from "next/link";
import { redirect } from "next/navigation";

import { formatGradeLevel } from "@/lib/format/gradeLevel";
import { assembleReportContent } from "@/lib/report/assemble";
import { resolveNarrationProse } from "@/lib/report/narration/resolve";
import { rollUpToParentStrands } from "@/lib/report/strand-mastery";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import { MisconceptionList } from "./misconception-list";
import { PlacementCard } from "./placement-card";
import { RecommendationsCard } from "./recommendations-card";
import { StrandMap } from "./strand-map";
import { StrandRadar } from "./strand-radar";
import { TimeFlagBanner } from "./time-flag-banner";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SAM level mapping, BAND_PRIORITY, samLevelLabel, the placement hydration
// step, and the per-strand recommendation lookup all moved into the shared
// assembleReportContent helper (Item #16 Piece 5). Both this route and the
// post-completion narration trigger consume that helper so query
// orchestration + derivation don't drift between the two surfaces.

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

  // ---- Branch 3: orphan auth user (parents-row insert failed at signup).
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
  // matches the parent row above; a hostile UUID for someone else's
  // child returns null.
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

  // Most-recent COMPLETED session for this child. R3 lock: empty state
  // when none. Selects everything assembleReportContent needs in Branch 7
  // (tenant_id, started_at, completed_at, current_estimate, session_time_flag)
  // plus the id used everywhere else.
  const { data: latestSession } = await supabase
    .from("assessment_sessions")
    .select(
      "id, tenant_id, started_at, completed_at, current_estimate, session_time_flag",
    )
    .eq("child_id", child.id)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ---- Branch 5: empty state.
  if (!latestSession) {
    return (
      <>
        <TopAppBar />
        <main className="flex-grow flex flex-col px-6 py-12 max-w-3xl mx-auto w-full">
          <TopBackLink />
          <div className="flex-grow flex items-center justify-center">
            <div className="max-w-xl w-full text-center bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
              <ReportHeader
                childName={child.name}
                subtitle={buildSubtitle(child, null)}
              />
              <p className="font-body-regular text-sam-gray-mid mt-4">
                {`${child.name} hasn’t completed an assessment yet. Once they finish their first session, the diagnostic report will appear here.`}
              </p>
              <div className="mt-8 print:hidden flex flex-col md:flex-row gap-3 items-center justify-center">
                <Link
                  href={`/assessment?child_id=${child.id}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-sam-red hover:bg-sam-red/90 text-white font-headline-adult font-bold rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  Start Assessment
                </Link>
                <BackLink />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ---- Branch 6 vs 7: defensive PlacementEstimate check.
  // A COMPLETED session without a valid current_estimate is a data
  // integrity bug (engine should always write one before flipping
  // status). Log + render minimal error so the parent doesn't see a
  // crashed page. assembleReportContent runs the same guard internally,
  // but doing it here too lets Branches 6 (unreliable/mixed) early-return
  // a clean error before reaching the assembly path.
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
  // R5 honor: these two flags mean the engine cannot trust the
  // measurement. We show the date + a banner; we do NOT surface scores
  // or misconceptions because they would mislead the parent.
  if (timeFlag === "unreliable" || timeFlag === "mixed") {
    return (
      <>
        <TopAppBar />
        <main className="flex-grow flex flex-col px-6 py-12 max-w-3xl mx-auto w-full">
          <TopBackLink />
          <ReportHeader
            childName={child.name}
            subtitle={buildSubtitle(child, latestSession.completed_at)}
          />
          <div className="mt-8 w-full">
            <TimeFlagBanner
              flag={timeFlag}
              childName={child.name}
              childId={child.id}
            />
          </div>
          <div className="mt-10 print:hidden">
            <BackLink />
          </div>
        </main>
      </>
    );
  }

  // ---- Branch 7: full report (normal | rushed | struggling).
  //
  // Assembly delegates to the shared assembleReportContent helper. Page
  // passes its anon RLS client as the readClient (defense-in-depth on
  // parent-facing reads) and a service-role client for the questions-
  // table lookup (compliance §8). Any failure inside assembly throws
  // AssembleError; the page treats it the same as the legacy inline
  // lookup failures — render MinimalError.
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

  // Narration prose (Piece 4). Soft fetch — mirrors the misconceptions
  // lookup idiom: no row, fetch error, or status !== 'ok' all resolve to
  // no prose, and the report renders data-only without it. R5 suppression
  // (no prose on unreliable/mixed branches) is enforced structurally —
  // those branches early-return above this block — and belt-and-
  // suspenders inside resolveNarrationProse.
  const { data: narrationRow, error: narrationErr } = await supabase
    .from("report_narrations")
    .select(
      "status, placement_line, strand_lede, misconceptions_lede, recommendations_lede",
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
    <>
      <TopAppBar />
      <main className="flex-grow px-6 py-10 md:py-12 max-w-4xl mx-auto w-full">
        <TopBackLink />
        <ReportHeader
          childName={reportContent.child.display_name}
          subtitle={buildSubtitle(child, latestSession.completed_at)}
        />

        {/* Caveat banner for rushed/struggling — full report still
            renders below, but the parent sees the caveat first. */}
        {(reportContent.time_flag === "rushed" ||
          reportContent.time_flag === "struggling") && (
          <div className="mt-6">
            <TimeFlagBanner
              flag={reportContent.time_flag}
              childName={reportContent.child.display_name}
            />
          </div>
        )}

        <div className="mt-8 space-y-8">
          <PlacementCard
            childName={reportContent.child.display_name}
            samLevel={reportContent.placement.sam_level}
            overallPercentage={reportContent.placement.overall_percentage}
            tier={reportContent.placement.tier}
            narrationLine={narrationProse?.placement_line}
          />

          {/* strand_lede sits above the StrandRadar — the radar is an SVG
              chart with no internal text slot (lock SR1: no section title
              inside the radar; it pairs with StrandMap's heading below).
              Rendering the lede here keeps StrandRadar pure. */}
          {narrationProse?.strand_lede && (
            <p className="font-body-regular text-sam-navy/80 text-base md:text-lg leading-relaxed">
              {narrationProse.strand_lede}
            </p>
          )}

          {/* Radar consumes the 3-parent rollup; bar map consumes the
              N sub-strands directly. Roll-up is derived at render-time
              per the Phase 8 brief — kept out of the component so the
              radar stays a pure render. */}
          <StrandRadar
            rows={rollUpToParentStrands(reportContent.strand_mastery)}
          />

          <StrandMap rows={reportContent.strand_mastery} />

          <MisconceptionList
            rows={reportContent.misconceptions}
            childName={reportContent.child.display_name}
            narrationLede={narrationProse?.misconceptions_lede}
          />

          <RecommendationsCard
            recommendations={reportContent.recommendations}
            childName={reportContent.child.display_name}
            narrationLede={narrationProse?.recommendations_lede}
          />
        </div>

        {/* Footer actions — Item #12 Phase 7.6 reintroduces the Stitch
            "View Detailed Answer Log" CTA dropped at Item #8 audience-
            validation. Founder explicitly re-approved parent exposure
            of question content on a per-completed-assessment basis;
            see /report/answers/page.tsx header for compliance §8
            rationale. */}
        <div className="mt-12 print:hidden flex flex-col md:flex-row justify-center items-center gap-4">
          <Link
            href={`/report/answers?session=${latestSession.id}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-sam-navy text-white rounded-2xl font-bold hover:bg-sam-navy/90 transition-all active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined">list_alt</span>
            View Detailed Answer Log
          </Link>
          <BackLink />
        </div>
      </main>
    </>
  );
}

// =============================================================================
// Inline helpers — chrome shared by all branches that render headers.
// =============================================================================

// Phase 1 dashboard's TopAppBar, ported verbatim. P-E lock: reuse not
// extract for v1; extract when a third parent route lands. Hidden in
// print stylesheet (P-D / R8) because the printed handout shouldn't
// show the nav bar.
function TopAppBar() {
  return (
    <header className="bg-[#FEFBF6] sticky top-0 z-40 border-b border-[#F2EDE4] shadow-[0px_4px_12px_rgba(27,58,107,0.05)] flex justify-between items-center w-full px-6 py-4 print:hidden">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-sam-navy font-display-child">
          Atlas Assessment
        </span>
      </div>
      <div className="flex items-center space-x-6">
        <nav className="hidden md:flex space-x-8">
          <a
            className="text-sam-navy/60 font-display-child font-semibold hover:text-sam-red transition-colors"
            href="/dashboard"
          >
            Family Dashboard
          </a>
          <a
            className="text-sam-navy/60 font-display-child font-semibold hover:text-sam-red transition-colors"
            href="#"
          >
            Resources
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <button
            className="text-sam-navy/60 hover:text-sam-red transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sam-teal">
              <img
                alt="Parent profile avatar"
                className="w-full h-full object-cover"
                src="/img/placeholder-avatar.svg"
              />
            </div>
            <span className="material-symbols-outlined text-sam-navy group-hover:text-sam-red transition-colors">
              expand_more
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 px-6 py-3 border-2 border-sam-navy/20 rounded-2xl font-headline-adult text-sam-navy hover:bg-white hover:border-sam-red hover:text-sam-red transition-all group"
    >
      <span className="material-symbols-outlined text-sam-red group-hover:-translate-x-1 transition-transform">
        arrow_back
      </span>
      Back to Family Dashboard
    </Link>
  );
}

// Top-of-page back link — text-link style (Stitch source 04 line 154).
// Distinct from the bottom outlined BackLink: top navigation is a quick
// "go back," bottom is a "I'm done reading" terminal CTA. Same dest,
// different visual weight.
function TopBackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 text-sam-navy/60 hover:text-sam-red transition-colors mb-6 font-headline-adult print:hidden"
    >
      <span className="material-symbols-outlined text-xl">arrow_back</span>
      <span>Back to Dashboard</span>
    </Link>
  );
}

function ReportHeader({
  childName,
  subtitle,
}: {
  childName: string;
  subtitle: string | null;
}) {
  return (
    <div>
      <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
        {childName}&rsquo;s Diagnostic Report
      </h1>
      {subtitle && (
        <p className="font-headline-adult text-sam-navy/60 mt-2">{subtitle}</p>
      )}
    </div>
  );
}

// MinimalError = no chrome (no TopAppBar). Used for branches 3 + 4 +
// data-integrity catches where the user has no functional account
// state to chrome around. Mirrors the dashboard's orphan branch.
function MinimalError({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex-grow flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center bg-white rounded-3xl p-10 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
        <h1 className="font-display-child text-2xl text-sam-navy mb-4">
          {title}
        </h1>
        <p className="font-body-regular text-sam-gray-mid">{body}</p>
        <div className="mt-8">
          <BackLink />
        </div>
      </div>
    </main>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Subtitle composer: "{grade} • Completed {date}" when both are present;
// gracefully degrades to one-or-the-other or null.
function buildSubtitle(
  child: { grade_level: string | null },
  completedAt: string | null,
): string | null {
  const raw = child.grade_level?.trim();
  const formattedGrade = raw ? formatGradeLevel(raw) : null;
  const completed = completedAt
    ? `Completed ${formatDate(completedAt)}`
    : null;
  if (formattedGrade && completed) return `${formattedGrade} • ${completed}`;
  return formattedGrade ?? completed ?? null;
}

