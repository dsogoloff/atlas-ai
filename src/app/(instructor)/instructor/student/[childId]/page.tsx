// Instructor portal — per-student diagnostic view.
//
// Reuses the parent report's data accessor (assembleReportContent) — the
// same deterministic engine output the parent report renders — but presents
// it in instructor-facing chrome (Stitch module-d/09): a student summary
// header, a bento metrics grid, strand bars, misconception cards, curriculum
// recommendations, and an item-level review.
//
// Item-level review (compliance §8):
//   Constraint 4 says parents and instructors see references to
//   misconceptions and recommendations, but NOT the full text of questions.
//   This view never exposes licensed question CONTENT — stems, answer
//   choices, and correct answers stay gated. It DOES read the question's
//   strand CATEGORY (classification metadata, not content) via the service
//   client to label each item, the same projection family
//   assembleReportContent already reads (id, content_id) for strand mastery.
//
// Access is RLS-enforced: a child outside the instructor's center returns
// null from the RLS-scoped read and renders a no-access notice. No parent
// PII is read (compliance §6.2 / §10.3).

import Link from "next/link";

import { timeFlagBadge } from "@/lib/display/progress";
import { comprehensiveBudget } from "@/lib/engine/comprehensive";
import { isLeadSchoolFieldEnabled } from "@/lib/env";
import type { Strand as EngineStrand } from "@/lib/engine/types";
import { deriveTier } from "@/lib/tier/derive";
import { assembleReportContent } from "@/lib/report/assemble";
import type { AggregatedMisconception } from "@/lib/report/misconception-aggregate";
import { resolveNarrationProse } from "@/lib/report/narration/resolve";
import type { StrandMastery, MasteryBand } from "@/lib/report/strand-mastery";
import type { Recommendation, ReportContent } from "@/lib/report/types";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import { ReportArticle } from "@/app/(parent)/report/report-article";
import {
  ENGINE_STRAND_LABELS,
  STRAND_LABELS,
} from "@/app/(parent)/report/strand-labels";

import { InstructorNotice, InstructorTopBar } from "../../_components/shell";
import { resolveStaff } from "../../lib/instructor";
import { fetchNotesForChild } from "../../lib/notes";
import { NotesPanel } from "./notes-panel";
import { ReportViewTracker } from "./report-view-tracker";
import { UsefulnessPanel } from "./usefulness-panel";

export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ childId: string }>;
}

export default async function StudentDiagnosticPage({ params }: PageProps) {
  const { childId } = await params;
  if (!UUID_RE.test(childId)) {
    return <InstructorNotice title="Student not found" body="The link is invalid." />;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Server component — render a notice rather than redirect mid-tree;
    // middleware keeps the session fresh and the roster link is the entry.
    return (
      <InstructorNotice
        title="Sign in required"
        body="Please sign in to your staff account to view this student."
      />
    );
  }

  // Shared detail: an instructor (center-scoped) OR an admin (tenant-scoped)
  // may view. Notes authoring stays instructor-only (admins don't author).
  const staff = await resolveStaff(supabase);
  if (!staff) {
    return (
      <InstructorNotice
        title="Staff access required"
        body="Your account doesn't have an active instructor or admin profile."
      />
    );
  }
  const isInstructor = staff.kind === "instructor";
  const roleLabel = isInstructor ? "Instructor" : "Admin";
  const rosterHref = isInstructor ? "/instructor" : "/admin";

  // RLS scopes this read to children the caller can see — an instructor's
  // center (+ grace), or an admin's whole tenant. A child outside scope
  // returns null → no-access notice.
  const { data: child } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year, home_center_id, parent_id")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return (
      <InstructorNotice
        roleLabel={roleLabel}
        homeHref={rosterHref}
        title="Student not available"
        body="This student isn't in your scope, or the link is stale."
      />
    );
  }

  // Parent / account panel — ADMIN ONLY. A service-role read scoped to exactly
  // the viewed child's parent_id, run only AFTER the staff gate confirmed an
  // admin (a single keyed row, not a scan) — the page already uses the service
  // client for report assembly. The instructor view stays parent-PII-free
  // (compliance §6.2 / §10.3): this never runs for kind === "instructor".
  const parentAccount =
    staff.kind === "admin"
      ? await fetchParentAccount(createServiceClient(), child.parent_id)
      : null;

  // Notes-write is instructor-only, and only at the child's CURRENT center
  // (the RLS write policy forbids writes during prior-center grace). Admins
  // never author notes — they see them read-only.
  const canWriteNotes =
    isInstructor && child.home_center_id === staff.center_id;

  // `mine` tagging needs the author id; an admin has none, so pass a sentinel
  // that matches no note (admins see every note as a read-only colleague note).
  const notes = await fetchNotesForChild(
    supabase,
    child.id,
    isInstructor ? (staff.id ?? "") : "",
  );

  // Latest COMPLETED session (RLS-scoped).
  const { data: session } = await supabase
    .from("assessment_sessions")
    .select(
      "id, tenant_id, started_at, completed_at, current_estimate, session_time_flag, test_type",
    )
    .eq("child_id", child.id)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasReport =
    session !== null && isPlacementEstimateJson(session.current_estimate);

  // The report's underlying tables (responses, taxonomy, misconceptions,
  // curriculum_recommendations, report_narrations) are read with the SERVICE
  // client — NOT the caller's RLS client. Authorization is already enforced
  // UPSTREAM: resolveStaff confirmed staff, and `child` + `session` were fetched
  // via the RLS-scoped client (instructor center / admin tenant), so the session
  // is in-scope before we assemble. This mirrors the pattern assemble.ts
  // documents for the narration trigger, and it is REQUIRED for admins: the
  // admin tenant-view policies (#170) cover children/assessment_sessions/
  // pedagogical_notes ONLY — not responses/taxonomy/narration — so an admin's
  // RLS read of `responses` returns empty, collapsing the report to an empty
  // radar. (Instructors have center-scoped policies and read the same rows either
  // way.) No licensed question CONTENT is exposed: `questions` was already
  // service-only and only id/content_id/strand/level are ever projected.
  const reportService = createServiceClient();

  let report: ReportContent | null = null;
  if (hasReport && session) {
    try {
      report = await assembleReportContent({
        readClient: reportService,
        serviceClient: reportService,
        session,
        child,
      });
    } catch (err) {
      console.error("[instructor] report assembly failed", {
        sessionId: session.id,
        err,
      });
      report = null;
    }
  }

  // Narration prose — the SAME per-run prose the parent report renders (read
  // the cached row; no self-heal here, matching the existing instructor read).
  // The admin view feeds the whole prose object to ReportArticle; the
  // instructor view uses only findings_strengths for its Strengths section.
  let narrationProse: ReturnType<typeof resolveNarrationProse> = null;
  if (report && session) {
    const { data: narrationRow } = await reportService
      .from("report_narrations")
      .select(
        "status, placement_line, strand_lede, findings_strengths, findings_growth_areas, recommendations_lede",
      )
      .eq("session_id", session.id)
      .maybeSingle();
    narrationProse = resolveNarrationProse(narrationRow ?? null, report.time_flag);
  }
  const strengths = narrationProse?.key_findings?.strengths ?? [];

  const items =
    report && session
      ? await fetchItemReview(reportService, reportService, session.id)
      : [];
  const correctCount = items.filter((i) => i.isCorrect).length;
  const totalTimeSeconds = items.reduce((sum, i) => sum + i.timeTakenSeconds, 0);

  // Strand coverage — comprehensive sessions only (comprehensive-engine lane).
  // Confidence context for the placement: how many items each in-scope strand
  // got, vs. the tier's per-strand floor. Response-derived COUNTS only — never
  // question content (compliance §8). Service-role read to aggregate
  // responses→questions.strand (questions are service-role-only per §8).
  let strandCoverage: StrandCoverageRow[] = [];
  if (session && session.test_type === "comprehensive") {
    const perStrandFloorN = comprehensiveBudget(
      deriveTier({
        grade_level: child.grade_level,
        birth_year: child.birth_year,
      }),
    ).perStrandFloorN;
    strandCoverage = await fetchStrandCoverage(
      reportService,
      session.id,
      perStrandFloorN,
    );
  }

  return (
    <>
      <InstructorTopBar
        instructorName={staff.name}
        roleLabel={roleLabel}
        homeHref={rosterHref}
      />
      <main className="flex-grow w-full px-6 py-8 md:py-10 max-w-4xl mx-auto">
        <Link
          href={rosterHref}
          className="inline-flex items-center gap-2 text-sam-navy/60 hover:text-sam-red transition-colors mb-6 font-headline-adult"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span>Back to roster</span>
        </Link>

        {parentAccount && (
          <ParentAccountPanel
            account={parentAccount}
            gradeLevel={child.grade_level}
            birthYear={child.birth_year}
          />
        )}

        {report ? (
          isInstructor ? (
            // INSTRUCTOR — unchanged staff layout (instructor-facing chrome).
            <>
              <StudentSummaryHeader
                name={child.name}
                gradeLabel={report.child.grade_label}
                reportId={report.metadata.report_id}
                assessedDate={report.metadata.assessed_date_display}
                report={report}
              />
              {report.time_flag !== "normal" && (
                <ReliabilityNote flag={report.time_flag} />
              )}
              <BentoMetrics
                correct={correctCount}
                total={items.length}
                totalSeconds={totalTimeSeconds}
              />
              <StrandBars rows={report.strand_mastery} />
              <StrengthsSection items={strengths} />
              <MisconceptionSection items={report.misconceptions} />
              <RecommendationSection items={report.recommendations} />
              <StrandCoverageSection rows={strandCoverage} />
              <ItemReviewSection items={items} />
            </>
          ) : (
            // ADMIN ("master instructor") — the SAME full parent report the
            // parent sees (placement, radar, strand map, strand lede, Strengths,
            // Areas to confirm, readiness, placement recommendation), reusing
            // ReportArticle. staffView suppresses the parent-only action widgets
            // (Next Steps / follow-up CTAs, feedback rating island). The
            // admin-only deep affordances (strand coverage, item-level review)
            // stay AFTER the report; the parent-account panel renders above it.
            <>
              <ReportArticle
                reportContent={report}
                narrationProse={narrationProse}
                childId={child.id}
                schoolFieldEnabled={isLeadSchoolFieldEnabled()}
                staffView
              />
              <StrandCoverageSection rows={strandCoverage} />
              <ItemReviewSection items={items} />
            </>
          )
        ) : (
          <>
            <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
              {child.name}
            </h1>
            <p className="font-headline-adult text-sam-navy/60 mt-1">
              {gradeFallback(child.grade_level)}
            </p>
            {session ? (
              <EmptyDiagnostic body="This assessment finished but a placement couldn't be derived. Try the answer detail or contact support." />
            ) : (
              <EmptyDiagnostic body="This student hasn't completed an assessment yet." />
            )}
          </>
        )}

        {/* Report-viewed tracking + the usefulness rating are instructor-only
            affordances (the rating is authored by an instructor; the admin
            view is read-only oversight). */}
        {isInstructor && report && session && (
          <>
            <ReportViewTracker sessionId={session.id} />
            <UsefulnessPanel sessionId={session.id} />
          </>
        )}

        <NotesPanel
          childId={child.id}
          notes={notes}
          canWrite={canWriteNotes}
          readOnlyMessage={
            isInstructor
              ? undefined
              : "Admins can read center notes for oversight but don't author them."
          }
        />
      </main>
    </>
  );
}

// =============================================================================
// Item-level review data — outcome / timing / detected-pattern, plus the
// question's strand CATEGORY for labeling. Licensed question CONTENT (stems,
// options, correct answers) is never read (compliance §8 Constraint 4).
// =============================================================================

interface ItemReviewRow {
  index: number;
  isCorrect: boolean;
  strandLabel: string | null;
  timeTakenSeconds: number;
  timeBadge: string | null;
  misconceptionLabels: string[];
}

async function fetchItemReview(
  readClient: ReturnType<typeof createServiceClient>,
  serviceClient: ReturnType<typeof createServiceClient>,
  sessionId: string,
): Promise<ItemReviewRow[]> {
  const { data: responses } = await readClient
    .from("responses")
    .select(
      "question_id, is_correct, time_taken_seconds, time_flag, detected_misconceptions, created_at",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!responses || responses.length === 0) return [];

  // Misconception labels (anon client; misconceptions are tenant-readable).
  const codes = Array.from(
    new Set(responses.flatMap((r) => r.detected_misconceptions)),
  );
  let labelByCode = new Map<string, string>();
  if (codes.length > 0) {
    const { data: mcRows } = await readClient
      .from("misconceptions")
      .select("code, label")
      .in("code", codes);
    labelByCode = new Map((mcRows ?? []).map((m) => [m.code, m.label]));
  }

  // Per-item strand CATEGORY via the service client (questions RLS gates
  // content; the strand column is classification metadata, not content).
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const strandByQuestion = new Map<string, EngineStrand>();
  if (questionIds.length > 0) {
    const { data: qRows } = await serviceClient
      .from("questions")
      .select("id, strand")
      .in("id", questionIds);
    for (const q of qRows ?? []) {
      strandByQuestion.set(q.id, q.strand);
    }
  }

  return responses.map((r, i) => {
    const strand = strandByQuestion.get(r.question_id);
    return {
      index: i + 1,
      isCorrect: r.is_correct,
      strandLabel: strand ? ENGINE_STRAND_LABELS[strand] : null,
      timeTakenSeconds: r.time_taken_seconds,
      timeBadge: timeFlagBadge(r.time_flag),
      misconceptionLabels: r.detected_misconceptions
        .map((c) => labelByCode.get(c))
        .filter((l): l is string => Boolean(l)),
    };
  });
}

// =============================================================================
// Strand coverage (comprehensive-engine lane) — RESPONSE-DERIVED COUNTS ONLY.
//
// Per in-scope strand: how many items were served and a coverage label
// relative to the tier's per-strand floor. Uses a service-role read because
// the `questions` table (for the strand of each response) is service-role-only
// per compliance §8 — but we only ever surface the COUNT and the strand label,
// never any question content. "In-scope" here is "appeared in this session's
// responses" (a strand with zero served items is simply absent from the list).
// =============================================================================

type CoverageLabel = "deep adaptive" | "floor only" | "partial";

interface StrandCoverageRow {
  strand: EngineStrand;
  count: number;
  label: CoverageLabel;
}

async function fetchStrandCoverage(
  serviceClient: ReturnType<typeof createServiceClient>,
  sessionId: string,
  perStrandFloorN: number,
): Promise<StrandCoverageRow[]> {
  const { data: responses } = await serviceClient
    .from("responses")
    .select("question_id")
    .eq("session_id", sessionId);

  if (!responses || responses.length === 0) return [];

  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const { data: questionRows } = await serviceClient
    .from("questions")
    .select("id, strand")
    .in("id", questionIds);

  const strandById = new Map(
    (questionRows ?? []).map((q) => [q.id, q.strand] as const),
  );

  const counts = new Map<EngineStrand, number>();
  for (const r of responses) {
    const strand = strandById.get(r.question_id);
    if (!strand) continue;
    counts.set(strand, (counts.get(strand) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([strand, count]) => ({
    strand,
    count,
    label:
      count > perStrandFloorN
        ? "deep adaptive"
        : count === perStrandFloorN
          ? "floor only"
          : "partial",
  }));
}

// =============================================================================
// Parent / account (ADMIN ONLY) — the viewed child's parent account.
//
// Read via the service client, scoped to exactly one parent row (the viewed
// child's parent_id), and only ever invoked after resolveStaff confirmed an
// admin. The instructor surface never calls this, so no parent PII reaches a
// center-scoped instructor (compliance §6.2 / §10.3). The parents table has no
// phone/address columns — we project only what exists; home_center_id resolves
// to a center name when set, and is omitted (not blank-rendered) when null.
// =============================================================================

interface ParentAccountData {
  name: string;
  email: string;
  createdAt: string;
  /** subscription_tier enum (e.g. "PILOT"). */
  plan: string;
  centerName: string | null;
}

async function fetchParentAccount(
  serviceClient: ReturnType<typeof createServiceClient>,
  parentId: string,
): Promise<ParentAccountData | null> {
  const { data: parent } = await serviceClient
    .from("parents")
    .select("name, email, created_at, subscription_tier, home_center_id")
    .eq("id", parentId)
    .maybeSingle();
  if (!parent) return null;

  let centerName: string | null = null;
  if (parent.home_center_id) {
    const { data: center } = await serviceClient
      .from("centers")
      .select("name")
      .eq("id", parent.home_center_id)
      .maybeSingle();
    centerName = center?.name ?? null;
  }

  return {
    name: parent.name,
    email: parent.email,
    createdAt: parent.created_at,
    plan: parent.subscription_tier,
    centerName,
  };
}

// =============================================================================
// Presentation
// =============================================================================

const CARD = "shadow-[0px_4px_12px_rgba(27,58,107,0.08)]";

/** First-letter initials from a display name (max 2). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** mm ss / ss clock for pace + per-item time. */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function proficiencyTextColor(pct: number): string {
  if (pct >= 75) return "text-sam-teal";
  if (pct >= 50) return "text-[#b45309]";
  return "text-sam-red";
}

/** Deterministic short date for "Account created" (fixed locale + UTC so the
 *  render is stable across server timezones). new Date(iso) is pure. */
function formatAccountDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ParentAccountPanel({
  account,
  gradeLevel,
  birthYear,
}: {
  account: ParentAccountData;
  gradeLevel: string | null;
  birthYear: number | null;
}) {
  // Only rows whose data exists are rendered — omit (never blank-render) the
  // home center when unset and the child fields when null.
  const rows: Array<{ label: string; value: string }> = [
    { label: "Parent", value: account.name },
    { label: "Email", value: account.email },
    { label: "Account created", value: formatAccountDate(account.createdAt) },
    ...(account.centerName
      ? [{ label: "Home center", value: account.centerName }]
      : []),
    { label: "Plan", value: account.plan },
    ...(gradeLevel ? [{ label: "Grade", value: gradeLevel }] : []),
    ...(birthYear !== null
      ? [{ label: "Birth year", value: String(birthYear) }]
      : []),
  ];

  return (
    <section
      className={`mt-2 mb-8 bg-white rounded-[24px] p-6 ${CARD}`}
      aria-label="Parent and account"
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-sam-navy" aria-hidden="true">
          account_circle
        </span>
        <h2 className="font-headline-adult text-[18px] text-sam-navy">
          Parent / account
        </h2>
        <span className="text-[10px] uppercase tracking-wider bg-sam-navy/5 text-sam-navy/70 rounded-full px-2.5 py-0.5">
          Admin only
        </span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-[11px] uppercase tracking-wider text-sam-gray-mid">
              {row.label}
            </dt>
            <dd className="font-headline-adult text-sam-navy break-words">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StudentSummaryHeader({
  name,
  gradeLabel,
  reportId,
  assessedDate,
  report,
}: {
  name: string;
  gradeLabel: string;
  reportId: string;
  assessedDate: string;
  report: ReportContent;
}) {
  const pct = report.placement.overall_percentage;
  return (
    <section
      className={`mt-2 bg-white rounded-[24px] p-6 md:p-8 mb-8 ${CARD} flex items-start gap-6`}
    >
      <div
        className="hidden sm:flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-sam-cream text-sam-navy font-display-child text-2xl border-4 border-white shadow-inner"
        aria-hidden="true"
      >
        {initials(name)}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display-child text-sam-navy text-3xl md:text-4xl tracking-tight mb-2">
              {name}
            </h1>
            <p className="text-sam-gray-mid flex flex-wrap items-center gap-2 text-sm">
              <span className="bg-surface-container px-3 py-1 rounded-full text-on-surface font-medium">
                {gradeLabel}
              </span>
              <span aria-hidden="true">•</span>
              <span>ID: #{reportId.slice(0, 8).toUpperCase()}</span>
              <span aria-hidden="true">•</span>
              <span>Assessed {assessedDate}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-bold text-sam-gray-mid uppercase tracking-wider mb-1">
              Overall proficiency
            </p>
            <span
              className={`font-display-child text-3xl md:text-4xl ${proficiencyTextColor(pct)}`}
            >
              {pct}%
            </span>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 bg-sam-navy/5 rounded-xl px-4 py-2">
          <span className="material-symbols-outlined text-sam-navy text-[20px]">
            school
          </span>
          <span className="font-headline-adult text-sam-navy">
            Recommended placement: {report.placement.sam_level}
          </span>
          <span className="text-sam-gray-mid text-sm">
            · {report.placement.tier === "K_4" ? "K–4 band" : "Grades 5–8 band"}
          </span>
        </div>
      </div>
    </section>
  );
}

function BentoMetrics({
  correct,
  total,
  totalSeconds,
}: {
  correct: number;
  total: number;
  totalSeconds: number;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <MetricCard
        icon="check_circle"
        iconCls="text-sam-orange"
        label="Accuracy"
        value={total > 0 ? `${correct}/${total}` : "—"}
        sub={total > 0 ? "items correct" : "no items recorded"}
      />
      <MetricCard
        icon="timer"
        iconCls="text-sam-teal"
        label="Pace"
        value={total > 0 ? formatClock(totalSeconds) : "—"}
        sub={total > 0 ? "total time" : "no items recorded"}
      />
    </div>
  );
}

function MetricCard({
  icon,
  iconCls,
  label,
  value,
  sub,
}: {
  icon: string;
  iconCls: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`bg-white rounded-[24px] p-6 ${CARD}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`material-symbols-outlined ${iconCls}`}>{icon}</span>
        <h3 className="font-headline-adult text-[18px] text-sam-navy">{label}</h3>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display-child text-3xl text-sam-navy tabular-nums">
          {value}
        </span>
        <span className="text-sm text-sam-gray-mid mb-1">{sub}</span>
      </div>
    </div>
  );
}

function StrengthsSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading>Strengths</SectionHeading>
      <ul className="space-y-3">
        {items.map((s, i) => (
          <li
            key={i}
            className="bg-white rounded-2xl border border-sam-gray-light/40 p-5"
          >
            <p className="font-headline-adult text-sam-navy">{s}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReliabilityNote({ flag }: { flag: Exclude<SessionTimeFlag, "normal"> }) {
  const copy: Record<Exclude<SessionTimeFlag, "normal">, string> = {
    unreliable:
      "Timing data suggests this session may not reflect the student's ability — interpret the placement with caution.",
    mixed:
      "Some responses showed unusual timing — treat the placement as indicative, not definitive.",
    rushed:
      "The student moved quickly through several items — they may be capable of more than the scores show.",
    struggling:
      "The student spent unusually long on several items — consider whether the level felt challenging.",
  };
  return (
    <div className="mt-2 mb-8 flex items-start gap-3 bg-sam-orange/10 border border-sam-orange/30 rounded-2xl p-4">
      <span
        className="material-symbols-outlined text-[#b45309] mt-0.5"
        aria-hidden="true"
      >
        info
      </span>
      <p className="text-sm text-sam-navy/80">{copy[flag]}</p>
    </div>
  );
}

const BAND_BAR: Record<MasteryBand, string> = {
  mastery: "bg-sam-teal",
  progressing: "bg-sam-orange",
  area_of_focus: "bg-sam-red",
  no_data: "bg-sam-gray-light",
};

const BAND_TEXT: Record<MasteryBand, string> = {
  mastery: "text-sam-teal",
  progressing: "text-[#b45309]",
  area_of_focus: "text-sam-red",
  no_data: "text-sam-gray-mid",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display-child text-sam-navy text-2xl mt-10 mb-4">
      {children}
    </h2>
  );
}

function StrandBars({ rows }: { rows: StrandMastery[] }) {
  return (
    <section>
      <SectionHeading>Performance by strand</SectionHeading>
      {rows.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">
          No strand-level data was captured for this session.
        </p>
      ) : (
        <div className={`bg-white rounded-[24px] p-6 md:p-8 space-y-6 ${CARD}`}>
          {rows.map((row) => (
            <div key={row.strand}>
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-sam-navy">
                  {STRAND_LABELS[row.strand]}
                </span>
                <span className={`font-bold ${BAND_TEXT[row.band]}`}>
                  {row.band === "no_data"
                    ? "Not assessed"
                    : `${row.correct}/${row.total} · ${row.percentage}%`}
                </span>
              </div>
              <div className="w-full h-3 bg-sam-cream rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAND_BAR[row.band]}`}
                  style={{
                    width: `${row.band === "no_data" ? 0 : row.percentage}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MisconceptionSection({ items }: { items: AggregatedMisconception[] }) {
  return (
    <section>
      <SectionHeading>Patterns observed</SectionHeading>
      {items.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">
          No recurring misconception patterns surfaced in this session.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((m) => (
            <div
              key={m.code}
              className={`bg-white rounded-[20px] p-6 border-2 border-transparent hover:border-sam-orange transition-all ${CARD}`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="p-3 bg-sam-orange/10 rounded-xl shrink-0">
                  <span className="material-symbols-outlined text-sam-orange">
                    warning
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sam-navy">{m.label}</h4>
                  <p className="text-xs text-sam-gray-mid">
                    {ENGINE_STRAND_LABELS[m.strand]} · {m.occurrences}×
                  </p>
                </div>
              </div>
              <p className="text-sm text-sam-navy/70">{m.description}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** An authored recommendation is one backed by the real S.A.M. library — not
 *  a seed placeholder stub.
 *  TODO(recommendation-library): wire the curriculum_recommendations table to
 *  the real S.A.M-authored library. Until it lands the seed ships PLACEHOLDER
 *  rows; we filter them so the view never shows stub copy and never
 *  auto-generates teaching guidance. When the library is wired, this filter
 *  becomes a no-op and authored rows render. */
function isAuthoredRecommendation(r: Recommendation): boolean {
  return !/placeholder/i.test(r.primary);
}

function RecommendationSection({ items }: { items: Recommendation[] }) {
  const authored = items.filter(isAuthoredRecommendation);
  return (
    <section>
      <SectionHeading>Curriculum recommendations</SectionHeading>
      {authored.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-sam-gray-light p-6">
          <p className="text-sm text-sam-gray-mid">
            Recommendations pending instructor review.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {authored.map((r) => (
            <li
              key={`${r.strand}-${r.level}`}
              className="bg-white rounded-2xl border border-sam-gray-light/40 p-5"
            >
              <span className="text-[10px] uppercase tracking-wider text-sam-gray-mid">
                {ENGINE_STRAND_LABELS[r.strand]}
              </span>
              <p className="font-headline-adult text-sam-navy mt-1">
                {r.primary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const COVERAGE_PILL: Record<CoverageLabel, string> = {
  "deep adaptive": "bg-sam-teal/10 text-sam-teal",
  "floor only": "bg-sam-orange/15 text-[#b45309]",
  partial: "bg-sam-red/10 text-sam-red",
};

function StrandCoverageSection({ rows }: { rows: StrandCoverageRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <SectionHeading>Strand coverage</SectionHeading>
      <p className="text-sm text-sam-gray-mid mb-4">
        How many items each strand received in this comprehensive session, as
        confidence context for the placement. Counts only — no question content.
      </p>
      <div className="bg-white rounded-2xl border border-sam-gray-light/40 divide-y divide-sam-gray-light/30">
        {rows.map((row) => (
          <div
            key={row.strand}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <span className="font-headline-adult text-sam-navy">
              {ENGINE_STRAND_LABELS[row.strand]}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-sam-navy tabular-nums min-w-[64px] text-right">
                {row.count} {row.count === 1 ? "item" : "items"}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold min-w-[110px] text-center ${COVERAGE_PILL[row.label]}`}
              >
                {row.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ItemReviewSection({ items }: { items: ItemReviewRow[] }) {
  return (
    <section>
      <SectionHeading>Item-level review</SectionHeading>
      <p className="text-sm text-sam-gray-mid mb-4">
        Per-item outcome, strand, time, and any detected pattern. Question shown
        only in S.A.M. materials (licensed content).
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">No item responses recorded.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li
              key={item.index}
              className="bg-white rounded-xl border border-sam-gray-light/40 px-5 py-3 flex items-center gap-3"
            >
              <span className="text-xs font-bold text-sam-gray-mid w-8 shrink-0">
                #{item.index}
              </span>
              <span
                className={`material-symbols-outlined text-xl shrink-0 ${
                  item.isCorrect ? "text-sam-teal" : "text-sam-red"
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-label={item.isCorrect ? "Correct" : "Incorrect"}
              >
                {item.isCorrect ? "check_circle" : "cancel"}
              </span>
              {item.strandLabel && (
                <span className="hidden sm:inline text-[11px] bg-sam-navy/5 text-sam-navy rounded-full px-2.5 py-0.5 whitespace-nowrap shrink-0">
                  {item.strandLabel}
                </span>
              )}
              <div className="flex-grow flex flex-wrap items-center gap-2">
                {item.misconceptionLabels.map((label) => (
                  <span
                    key={label}
                    className="text-[11px] bg-sam-red/5 text-sam-red rounded-full px-2.5 py-0.5"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-medium text-sam-gray-mid tabular-nums whitespace-nowrap shrink-0">
                {formatClock(item.timeTakenSeconds)}
              </span>
              {item.timeBadge && (
                <span className="text-[11px] text-sam-gray-mid whitespace-nowrap shrink-0">
                  {item.timeBadge}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EmptyDiagnostic({ body }: { body: string }) {
  return (
    <section className="mt-6 bg-white rounded-2xl border border-sam-gray-light/40 p-8 text-center">
      <p className="font-headline-adult text-sam-navy/70">{body}</p>
    </section>
  );
}

function gradeFallback(grade: string | null): string {
  return grade ? `Grade ${grade}` : "Grade unknown";
}
