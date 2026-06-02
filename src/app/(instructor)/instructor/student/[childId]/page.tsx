// Instructor portal — per-student diagnostic view.
//
// Reuses the parent report's data accessor (assembleReportContent) — the
// same deterministic engine output the parent report renders — but presents
// it in instructor-facing chrome, NOT the parent report's editorial shell.
// The placement recommendation is shown prominently up top; strand mastery,
// surfaced misconceptions, and curriculum recommendations follow.
//
// Item-level review (compliance §8):
//   Constraint 4 says parents and instructors see references to
//   misconceptions and recommendations, but NOT the full text of questions.
//   Item #12 Phase 7.6 reversed that for PARENTS only (founder-approved) via
//   /report/answers, which explicitly warns instructor surfaces must own
//   their own access boundary. So this view does NOT touch the licensed
//   `questions` table at all: the item-level list is built purely from
//   response-derived data the instructor already has RLS rights to
//   (correct/incorrect, timing, detected misconceptions). Raw question
//   stems, answer choices, and correct answers are GATED.
//
// Access is RLS-enforced: a child outside the instructor's center returns
// null from the RLS-scoped read and renders a no-access notice. No parent
// PII is read (compliance §6.2 / §10.3).

import Link from "next/link";

import { timeFlagBadge } from "@/lib/display/progress";
import { assembleReportContent } from "@/lib/report/assemble";
import { splitEntryPoint } from "@/lib/report/entry-point";
import type { AggregatedMisconception } from "@/lib/report/misconception-aggregate";
import { resolveNarrationProse } from "@/lib/report/narration/resolve";
import type { StrandMastery, MasteryBand } from "@/lib/report/strand-mastery";
import type { Recommendation, ReportContent } from "@/lib/report/types";
import { isPlacementEstimateJson } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  ENGINE_STRAND_LABELS,
  STRAND_LABELS,
} from "@/app/(parent)/report/strand-labels";

import { InstructorNotice, InstructorTopBar } from "../../_components/shell";
import { resolveInstructor } from "../../lib/instructor";
import { fetchNotesForChild } from "../../lib/notes";
import { NotesPanel } from "./notes-panel";

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
        body="Please sign in to your instructor account to view this student."
      />
    );
  }

  const instructor = await resolveInstructor(supabase);
  if (!instructor) {
    return (
      <InstructorNotice
        title="Instructor access required"
        body="Your account doesn't have an active instructor profile."
      />
    );
  }

  // RLS scopes this read to children at the instructor's center. A child at
  // another center (or another tenant) returns null → no-access notice.
  const { data: child } = await supabase
    .from("children")
    .select("id, name, grade_level, birth_year, home_center_id")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return (
      <InstructorNotice
        title="Student not available"
        body="This student isn't assigned to your center, or the link is stale."
      />
    );
  }

  // Notes-write is allowed only at the child's CURRENT center (the RLS
  // write policy forbids writes during prior-center grace). Mirror that in
  // the UI so grace-period notes render read-only with a clear reason.
  const canWriteNotes = child.home_center_id === instructor.center_id;

  const notes = await fetchNotesForChild(supabase, child.id, instructor.id);

  // Latest COMPLETED session (RLS-scoped).
  const { data: session } = await supabase
    .from("assessment_sessions")
    .select(
      "id, tenant_id, started_at, completed_at, current_estimate, session_time_flag",
    )
    .eq("child_id", child.id)
    .eq("status", "COMPLETED")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasReport =
    session !== null && isPlacementEstimateJson(session.current_estimate);

  let report: ReportContent | null = null;
  if (hasReport && session) {
    try {
      report = await assembleReportContent({
        readClient: supabase,
        serviceClient: createServiceClient(),
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

  // Strengths reuse the parent report's narration prose (findings_strengths).
  // Read-only; instructor sees the same per-run strengths the parent does.
  let strengths: string[] = [];
  if (report && session) {
    const { data: narrationRow } = await supabase
      .from("report_narrations")
      .select(
        "status, placement_line, strand_lede, findings_strengths, findings_growth_areas, recommendations_lede",
      )
      .eq("session_id", session.id)
      .maybeSingle();
    strengths =
      resolveNarrationProse(narrationRow ?? null, report.time_flag)?.key_findings
        ?.strengths ?? [];
  }

  const items = session ? await fetchItemReview(supabase, session.id) : [];

  return (
    <>
      <InstructorTopBar instructorName={instructor.name} />
      <main className="flex-grow w-full px-6 py-8 md:py-10 max-w-4xl mx-auto">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-2 text-sam-navy/60 hover:text-sam-red transition-colors mb-6 font-headline-adult"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span>Back to roster</span>
        </Link>

        <h1 className="font-display-child text-sam-navy text-3xl md:text-[40px] tracking-tight">
          {child.name}
        </h1>
        <p className="font-headline-adult text-sam-navy/60 mt-1">
          {report?.child.grade_label ?? gradeFallback(child.grade_level)}
          {report && ` · Assessed ${report.metadata.assessed_date_display}`}
        </p>

        {report ? (
          <>
            <PlacementBanner report={report} />
            {report.time_flag !== "normal" && (
              <ReliabilityNote flag={report.time_flag} />
            )}
            <StrandSection rows={report.strand_mastery} />
            <StrengthsSection items={strengths} />
            <MisconceptionSection items={report.misconceptions} />
            <RecommendationSection items={report.recommendations} />
            <ItemReviewSection items={items} />
          </>
        ) : session ? (
          <EmptyDiagnostic
            body="This assessment finished but a placement couldn't be derived. Try the answer detail or contact support."
          />
        ) : (
          <EmptyDiagnostic body="This student hasn't completed an assessment yet." />
        )}

        <NotesPanel
          childId={child.id}
          notes={notes}
          canWrite={canWriteNotes}
        />
      </main>
    </>
  );
}

// =============================================================================
// Item-level review data — RESPONSE-DERIVED ONLY. No `questions` table read,
// so no licensed question content is exposed (compliance §8 Constraint 4).
// =============================================================================

interface ItemReviewRow {
  index: number;
  isCorrect: boolean;
  timeBadge: string | null;
  timeFlag: Database["public"]["Enums"]["time_flag"];
  misconceptionLabels: string[];
}

async function fetchItemReview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<ItemReviewRow[]> {
  const { data: responses } = await supabase
    .from("responses")
    .select("is_correct, time_flag, detected_misconceptions, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!responses || responses.length === 0) return [];

  const codes = Array.from(
    new Set(responses.flatMap((r) => r.detected_misconceptions)),
  );
  let labelByCode = new Map<string, string>();
  if (codes.length > 0) {
    const { data: mcRows } = await supabase
      .from("misconceptions")
      .select("code, label")
      .in("code", codes);
    labelByCode = new Map((mcRows ?? []).map((m) => [m.code, m.label]));
  }

  return responses.map((r, i) => ({
    index: i + 1,
    isCorrect: r.is_correct,
    timeBadge: timeFlagBadge(r.time_flag),
    timeFlag: r.time_flag,
    misconceptionLabels: r.detected_misconceptions
      .map((c) => labelByCode.get(c))
      .filter((l): l is string => Boolean(l)),
  }));
}

// =============================================================================
// Presentation
// =============================================================================

function PlacementBanner({ report }: { report: ReportContent }) {
  // Entry point reads the existing half-level (A/B) from sam_level — no new
  // field. Provisional copy; easy to reword after the S.A.M. discussion.
  const { half } = splitEntryPoint(report.placement.sam_level);
  return (
    <section className="mt-6 bg-sam-navy rounded-2xl p-6 md:p-8 text-white">
      <p className="text-xs font-bold uppercase tracking-wider text-white/60">
        Recommended placement
      </p>
      <p className="font-display-child text-3xl md:text-4xl mt-2">
        {report.placement.sam_level}
      </p>
      {half && (
        <p className="font-headline-adult text-white/80 mt-2">
          Entry point: {half}
        </p>
      )}
      <p className="font-headline-adult text-white/80 mt-3">
        Overall {report.placement.overall_percentage}% across assessed items ·{" "}
        {report.placement.tier === "K_4" ? "K–4 band" : "Grades 5–8 band"}
      </p>
    </section>
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
    <div className="mt-4 flex items-start gap-3 bg-sam-orange/10 border border-sam-orange/30 rounded-2xl p-4">
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

const BAND_PILL: Record<MasteryBand, { label: string; cls: string }> = {
  mastery: { label: "Mastery", cls: "bg-sam-teal/10 text-sam-teal" },
  progressing: { label: "Progressing", cls: "bg-sam-orange/15 text-[#b45309]" },
  area_of_focus: { label: "Area of focus", cls: "bg-sam-red/10 text-sam-red" },
  no_data: { label: "Not assessed", cls: "bg-sam-gray-light text-sam-gray-mid" },
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display-child text-sam-navy text-2xl mt-10 mb-4">
      {children}
    </h2>
  );
}

function StrandSection({ rows }: { rows: StrandMastery[] }) {
  return (
    <section>
      <SectionHeading>Strand performance</SectionHeading>
      {rows.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">
          No strand-level data was captured for this session.
        </p>
      ) : (
        <div className="bg-white rounded-2xl border border-sam-gray-light/40 divide-y divide-sam-gray-light/30">
          {rows.map((row) => {
            const pill = BAND_PILL[row.band];
            return (
              <div
                key={row.strand}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <span className="font-headline-adult text-sam-navy">
                  {STRAND_LABELS[row.strand]}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-sam-navy tabular-nums min-w-[64px] text-right">
                    {row.band === "no_data"
                      ? "—"
                      : `${row.correct}/${row.total} · ${row.percentage}%`}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full font-bold min-w-[110px] text-center ${pill.cls}`}
                  >
                    {pill.label}
                  </span>
                </div>
              </div>
            );
          })}
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
        <ul className="space-y-3">
          {items.map((m) => (
            <li
              key={m.code}
              className="bg-white rounded-2xl border border-sam-gray-light/40 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-headline-adult text-sam-navy font-bold">
                  {m.label}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-sam-gray-mid whitespace-nowrap">
                  {ENGINE_STRAND_LABELS[m.strand]} · {m.occurrences}×
                </span>
              </div>
              <p className="text-sm text-sam-navy/70 mt-2">{m.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecommendationSection({ items }: { items: Recommendation[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading>Curriculum recommendations</SectionHeading>
      <ul className="space-y-3">
        {items.map((r) => (
          <li
            key={`${r.strand}-${r.level}`}
            className="bg-white rounded-2xl border border-sam-gray-light/40 p-5"
          >
            <span className="text-[10px] uppercase tracking-wider text-sam-gray-mid">
              {ENGINE_STRAND_LABELS[r.strand]}
            </span>
            <p className="font-headline-adult text-sam-navy mt-1">{r.primary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemReviewSection({ items }: { items: ItemReviewRow[] }) {
  return (
    <section>
      <SectionHeading>Item-level review</SectionHeading>
      <p className="text-sm text-sam-gray-mid mb-4">
        Per-item outcome, timing, and any detected pattern. Question content
        is licensed S.A.M material and is not shown here (compliance §8).
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-sam-gray-mid">No item responses recorded.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item) => (
            <li
              key={item.index}
              className="bg-white rounded-xl border border-sam-gray-light/40 px-5 py-3 flex items-center gap-4"
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
