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

import { aggregateMisconceptions } from "@/lib/report/misconception-aggregate";
import {
  computeStrandMastery,
  type MasteryBand,
  type ScoredResponse,
} from "@/lib/report/strand-mastery";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
} from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { deriveTier } from "@/lib/tier/derive";

import { MisconceptionList } from "./misconception-list";
import { PlacementCard } from "./placement-card";
import { RecommendationsCard } from "./recommendations-card";
import { StrandMap } from "./strand-map";
import { StrandRadar } from "./strand-radar";
import { TimeFlagBanner } from "./time-flag-banner";

// Cookies + auth.getUser → no static prerender.
export const dynamic = "force-dynamic";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];
type Strand = Database["public"]["Enums"]["strand"];
type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maps the engine's HalfGradeLevel codes (KA…8B) to the parent-facing
// "S.A.M. Level [N]" label (R2 lock). The S.A.M. curriculum's level
// numbering is intentionally opaque to the parent — they don't need to
// reverse-engineer half-grades. This is a thin display mapping; if
// S.A.M. ever rebrands the levels, change here.
const SAM_LEVEL_BY_HALF_GRADE: Record<HalfGradeLevel, string> = {
  KA: "Kindergarten A",
  KB: "Kindergarten B",
  "1A": "Level 1A",
  "1B": "Level 1B",
  "2A": "Level 2A",
  "2B": "Level 2B",
  "3A": "Level 3A",
  "3B": "Level 3B",
  "4A": "Level 4A",
  "4B": "Level 4B",
  "5A": "Level 5A",
  "5B": "Level 5B",
  "6A": "Level 6A",
  "6B": "Level 6B",
  "7A": "Level 7A",
  "7B": "Level 7B",
  "8A": "Level 8A",
  "8B": "Level 8B",
};

function samLevelLabel(level: HalfGradeLevel): string {
  return `S.A.M. ${SAM_LEVEL_BY_HALF_GRADE[level]}`;
}

// Sort priority for the recommendations card. Lower = surfaced first.
// Within the same band, recommendations fall back to the strandMastery
// row order (which is the canonical STRAND_ORDER from strand-mastery.ts).
const BAND_PRIORITY: Record<MasteryBand, number> = {
  area_of_focus: 0,
  progressing: 1,
  mastery: 2,
  no_data: 3,
};

// Runtime guard for current_estimate now lives at the
// responseSubmit/types boundary as isPlacementEstimateJson — same module
// that owns the inverse serializer toPlacementEstimateJson. Page reads
// the raw jsonb, narrows with isPlacementEstimateJson, then hydrates
// via fromPlacementEstimateJson into the camelCase engine shape used
// downstream.

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

  const tier = deriveTier(child);

  // Most-recent COMPLETED session for this child. R3 lock: empty state
  // when none.
  const { data: latestSession } = await supabase
    .from("assessment_sessions")
    .select("id, completed_at, current_estimate, session_time_flag")
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
  // crashed page. Hydrate snake_case wire shape → camelCase engine
  // shape so all downstream code reads placement.overallLevel, etc.
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
  const placement = fromPlacementEstimateJson(latestSession.current_estimate);
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
  // Fetch responses for this session, then aggregate. Two queries:
  // responses (for is_correct + detected_misconceptions) and questions
  // (for response.question_id → strand). Misconception lookup adds a
  // third query, recommendations a fourth.
  const { data: responses, error: responsesErr } = await supabase
    .from("responses")
    .select("question_id, is_correct, detected_misconceptions")
    .eq("session_id", latestSession.id);

  if (responsesErr || !responses) {
    console.error("[report] responses lookup failed", {
      sessionId: latestSession.id,
      err: responsesErr,
    });
    return (
      <MinimalError
        title="Report unavailable"
        body="We couldn't load this assessment. Please try again in a moment, or contact support if the problem persists."
      />
    );
  }

  // Strand lookup for question_id → strand. Service-role client because
  // the questions table is locked behind RLS for compliance §8 (no item
  // content to non-instructors). We project ONLY id + strand here —
  // never content, never the prompt — so no leakage risk.
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const questionStrandById = new Map<string, Strand>();
  if (questionIds.length > 0) {
    const adminClient = createServiceClient();
    const { data: questionRows, error: questionsErr } = await adminClient
      .from("questions")
      .select("id, strand")
      .in("id", questionIds);
    if (questionsErr || !questionRows) {
      console.error("[report] questions lookup failed", {
        sessionId: latestSession.id,
        err: questionsErr,
      });
      return (
        <MinimalError
          title="Report unavailable"
          body="We couldn't load this assessment. Please try again in a moment, or contact support if the problem persists."
        />
      );
    }
    for (const q of questionRows) {
      questionStrandById.set(q.id, q.strand);
    }
  }

  // Build the engine-typed scored responses for the strand-mastery
  // helper. Skip rows whose question we couldn't resolve (shouldn't
  // happen, but guards against orphaned response rows).
  const scoredResponses: ScoredResponse[] = [];
  for (const r of responses) {
    const strand = questionStrandById.get(r.question_id);
    if (!strand) {
      console.warn("[report] response references unknown question", {
        sessionId: latestSession.id,
        questionId: r.question_id,
      });
      continue;
    }
    scoredResponses.push({ strand, isCorrect: r.is_correct });
  }

  // Overall percentage for the placement card (R1 hybrid: simple
  // correct/attempted across the whole session). The placement level
  // itself comes from the engine's PlacementEstimate.overallLevel.
  const overallTotal = scoredResponses.length;
  const overallCorrect = scoredResponses.filter((r) => r.isCorrect).length;
  const overallPercentage =
    overallTotal === 0 ? 0 : Math.round((overallCorrect / overallTotal) * 100);

  const strandMastery = computeStrandMastery(scoredResponses);

  // Misconception aggregation. Lookup is anon-client because
  // misconceptions has a tenant-scoped public SELECT policy (P-A).
  const misconceptionCodes = responses.map((r) => r.detected_misconceptions);
  const allCodes = Array.from(new Set(misconceptionCodes.flat()));
  let topMisconceptions: ReturnType<typeof aggregateMisconceptions> = [];
  if (allCodes.length > 0) {
    const { data: misconceptionRows, error: misconceptionsErr } = await supabase
      .from("misconceptions")
      .select("code, label, description, strand")
      .in("code", allCodes);
    if (misconceptionsErr) {
      // Soft fail: skip the misconception card rather than blow up the
      // whole report. Strand bars + recommendations still render.
      console.error("[report] misconceptions lookup failed", {
        sessionId: latestSession.id,
        err: misconceptionsErr,
      });
    } else {
      const lookup = new Map(
        (misconceptionRows ?? []).map((row) => [row.code, row]),
      );
      topMisconceptions = aggregateMisconceptions({
        codes: misconceptionCodes,
        lookup,
      });
    }
  }

  // Recommendations (R7 (i) schema-joined). One row per (strand, level)
  // pair; we look up by the engine's per-strand HalfGradeLevel.
  // Curriculum_recommendations also has the tenant-scoped public SELECT
  // policy, so anon-client is fine.
  const strandLevels = placement.strandLevels;
  const recLookupKeys = Object.entries(strandLevels) as Array<
    [Strand, HalfGradeLevel]
  >;
  // Pull all candidates in one round-trip; filter in memory. With 6
  // strands × ~18 levels the curriculum_recommendations table caps at
  // ~108 rows — cheaper than 6 sequential .eq() round-trips, and a
  // single round-trip even when the .in() inputs happen to be empty.
  const distinctStrands = Array.from(new Set(recLookupKeys.map(([s]) => s)));
  const distinctLevels = Array.from(new Set(recLookupKeys.map(([, l]) => l)));
  const { data: recRows, error: recErr } = await supabase
    .from("curriculum_recommendations")
    .select("strand, level, primary_recommendation, supplementary, notes")
    .in("strand", distinctStrands)
    .in("level", distinctLevels);
  if (recErr) {
    console.error("[report] recommendations lookup failed", {
      sessionId: latestSession.id,
      err: recErr,
    });
  }
  const recBy = new Map<string, NonNullable<typeof recRows>[number]>();
  for (const row of recRows ?? []) {
    recBy.set(`${row.strand}|${row.level}`, row);
  }
  const recommendations = recLookupKeys
    .map(([strand, level]) => {
      const row = recBy.get(`${strand}|${level}`);
      if (!row) return null;
      return {
        strand,
        level,
        primary: row.primary_recommendation,
        supplementary: row.supplementary,
        notes: row.notes,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Sort by band priority then strand display order. strandMastery is
  // already in STRAND_ORDER, so its index doubles as the tiebreaker.
  // Single pass to build the lookup avoids 6×6 .findIndex calls.
  const strandMeta = new Map<Strand, { band: MasteryBand; order: number }>();
  strandMastery.forEach((s, i) => {
    strandMeta.set(s.strand, { band: s.band, order: i });
  });
  recommendations.sort((a, b) => {
    // Strands without a mastery entry sort last; helper returns all 6
    // so this is defense-in-depth, not an expected branch.
    const aMeta = strandMeta.get(a.strand);
    const bMeta = strandMeta.get(b.strand);
    const aBand = aMeta ? BAND_PRIORITY[aMeta.band] : 99;
    const bBand = bMeta ? BAND_PRIORITY[bMeta.band] : 99;
    if (aBand !== bBand) return aBand - bBand;
    return (aMeta?.order ?? 99) - (bMeta?.order ?? 99);
  });

  return (
    <>
      <TopAppBar />
      <main className="flex-grow px-6 py-10 md:py-12 max-w-4xl mx-auto w-full">
        <TopBackLink />
        <ReportHeader
          childName={child.name}
          subtitle={buildSubtitle(child, latestSession.completed_at)}
        />

        {/* Caveat banner for rushed/struggling — full report still
            renders below, but the parent sees the caveat first. */}
        {(timeFlag === "rushed" || timeFlag === "struggling") && (
          <div className="mt-6">
            <TimeFlagBanner flag={timeFlag} childName={child.name} />
          </div>
        )}

        <div className="mt-8 space-y-8">
          <PlacementCard
            childName={child.name}
            samLevel={samLevelLabel(placement.overallLevel)}
            overallPercentage={overallPercentage}
            tier={tier}
          />

          <StrandRadar rows={strandMastery} />

          <StrandMap rows={strandMastery} />

          <MisconceptionList rows={topMisconceptions} childName={child.name} />

          <RecommendationsCard
            recommendations={recommendations}
            childName={child.name}
          />
        </div>

        <div className="mt-12 print:hidden">
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

// Grade-level formatter for display.
//
// The add-child form (src/app/(auth)/add-child/add-child-form.tsx:152-158)
// is a closed-list <select> emitting exactly: "K" | "1" | … | "8".
// We expand those known values to "Kindergarten" / "Nth Grade".
//
// The DB column is open text, so non-form write paths (admin imports,
// CSV) could land "Grade 2", "Pre-K", "Kindergarten" verbatim. For
// those, pass through as-is — better to render exactly-as-stored than
// risk awkward double-prefix output ("2nd Grade Grade") from over-eager
// normalization. tier derivation in src/lib/tier/derive.ts already
// tolerates the broader shape set; the renderer just shouldn't make it
// look stupid.
function formatGradeLevel(raw: string): string {
  if (raw === "K") return "Kindergarten";
  if (/^[1-8]$/.test(raw)) {
    const n = parseInt(raw, 10);
    return `${n}${ordinalSuffix(n)} Grade`;
  }
  return raw;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
