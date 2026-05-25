// Atlas Assessment — shared ReportContent assembly.
//
// One function used by BOTH the in-app /report route AND the post-
// completion narration trigger so query orchestration + per-strand
// recommendation lookup don't drift between the two surfaces. The pure
// derivation helpers (computeStrandMastery, aggregateMisconceptions,
// pickNearestRecommendation) are already shared via @/lib/report/;
// this file factors the wiring that previously lived inline in
// /report/page.tsx Branch 7.
//
// Two clients in, one ReportContent out:
//
//   * readClient — for responses, misconceptions, curriculum_recommendations.
//     The page passes its anon RLS client here to preserve defense-in-depth
//     on parent-facing reads; the trigger passes the service-role client.
//   * serviceClient — for `questions` only. Compliance.md §8 locks question
//     content behind RLS with no public policies; service-role is required
//     to read strand_id off question rows. Both callers pass a service
//     client here.
//
// Caller responsibility: the auth + ownership check happens UPSTREAM of
// this function. assembleReportContent does NOT verify that the caller is
// allowed to read this session's data — that's the page's job (parent
// owns child, etc.) or the trigger's structural guarantee (post-completion
// server-side).

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Strand } from "@/lib/engine/types";
import { formatGradeLevel } from "@/lib/format/gradeLevel";
import { aggregateMisconceptions } from "@/lib/report/misconception-aggregate";
import { pickNearestRecommendation } from "@/lib/report/recommendation-lookup";
import {
  computeStrandMastery,
  type MasteryBand,
  type ScoredResponse,
} from "@/lib/report/strand-mastery";
import type {
  Recommendation,
  ReportContent,
} from "@/lib/report/types";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
} from "@/lib/responseSubmit/types";
import type { Database } from "@/lib/supabase/database.types";
import { deriveTier } from "@/lib/tier/derive";

type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];
type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

// Same SAM-level mapping the page used inline (R2 lock: parent-facing
// label is "S.A.M. Level [N]"; engine half-grade enum stays opaque).
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

// Same band-priority ordering for recommendations (area_of_focus first,
// then progressing, mastery, no_data). STRAND_ORDER provides the
// within-band tiebreaker via strandMastery's row order.
const BAND_PRIORITY: Record<MasteryBand, number> = {
  area_of_focus: 0,
  progressing: 1,
  mastery: 2,
  no_data: 3,
};

export interface AssembleSession {
  id: string;
  tenant_id: string;
  started_at: string;
  completed_at: string | null;
  current_estimate: Database["public"]["Tables"]["assessment_sessions"]["Row"]["current_estimate"];
  session_time_flag: SessionTimeFlag | null;
}

export interface AssembleChild {
  name: string;
  birth_year: number;
  grade_level: string | null;
}

export interface AssembleInput {
  readClient: SupabaseClient<Database>;
  serviceClient: SupabaseClient<Database>;
  session: AssembleSession;
  child: AssembleChild;
}

export class AssembleError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AssembleError";
  }
}

/** Builds a full ReportContent from the just-completed session row + the
 *  child row. Throws AssembleError on a query failure or an invalid
 *  placement estimate — callers decide whether that's fatal (page →
 *  MinimalError) or swallowable (trigger → log + skip narration). */
export async function assembleReportContent(
  input: AssembleInput,
): Promise<ReportContent> {
  const { readClient, serviceClient, session, child } = input;

  if (!isPlacementEstimateJson(session.current_estimate)) {
    throw new AssembleError(
      "session.current_estimate is not a valid PlacementEstimate",
    );
  }
  const placement = fromPlacementEstimateJson(session.current_estimate);

  // ---- responses
  const { data: responses, error: responsesErr } = await readClient
    .from("responses")
    .select("question_id, is_correct, detected_misconceptions")
    .eq("session_id", session.id);
  if (responsesErr || !responses) {
    throw new AssembleError(
      `responses lookup failed: ${responsesErr?.message ?? "no rows"}`,
      responsesErr,
    );
  }

  // ---- questions (service-role; compliance §8 — projection is id+strand only)
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const questionStrandById = new Map<string, Strand>();
  if (questionIds.length > 0) {
    const { data: questionRows, error: questionsErr } = await serviceClient
      .from("questions")
      .select("id, strand")
      .in("id", questionIds);
    if (questionsErr || !questionRows) {
      throw new AssembleError(
        `questions lookup failed: ${questionsErr?.message ?? "no rows"}`,
        questionsErr,
      );
    }
    for (const q of questionRows) {
      questionStrandById.set(q.id, q.strand);
    }
  }

  // Scored responses for the derivation helpers. Drop orphans (defence-
  // in-depth; question_ids come from rows we just selected).
  const scoredResponses: ScoredResponse[] = [];
  for (const r of responses) {
    const strand = questionStrandById.get(r.question_id);
    if (!strand) continue;
    scoredResponses.push({ strand, isCorrect: r.is_correct });
  }

  const overallTotal = scoredResponses.length;
  const overallCorrect = scoredResponses.filter((r) => r.isCorrect).length;
  const overallPercentage =
    overallTotal === 0
      ? 0
      : Math.round((overallCorrect / overallTotal) * 100);

  const strandMastery = computeStrandMastery(scoredResponses);

  // ---- misconceptions
  const misconceptionCodes = responses.map((r) => r.detected_misconceptions);
  const allCodes = Array.from(new Set(misconceptionCodes.flat()));
  let misconceptions: ReturnType<typeof aggregateMisconceptions> = [];
  if (allCodes.length > 0) {
    const { data: mcRows, error: mcErr } = await readClient
      .from("misconceptions")
      .select("code, label, description, strand")
      .in("code", allCodes);
    if (mcErr) {
      throw new AssembleError(
        `misconceptions lookup failed: ${mcErr.message}`,
        mcErr,
      );
    }
    const lookup = new Map((mcRows ?? []).map((row) => [row.code, row]));
    misconceptions = aggregateMisconceptions({
      codes: misconceptionCodes,
      lookup,
    });
  }

  // ---- recommendations (Phase 7.6 nearest-level fallback)
  const strandLevels = placement.strandLevels;
  const recLookupKeys = Object.entries(strandLevels) as Array<
    [Strand, HalfGradeLevel]
  >;
  const distinctStrands = Array.from(new Set(recLookupKeys.map(([s]) => s)));
  const { data: recRows, error: recErr } = await readClient
    .from("curriculum_recommendations")
    .select("strand, level, primary_recommendation, supplementary, notes")
    .in("strand", distinctStrands);
  if (recErr) {
    throw new AssembleError(
      `recommendations lookup failed: ${recErr.message}`,
      recErr,
    );
  }
  const recommendations: Recommendation[] = recLookupKeys
    .map(([strand, level]) => {
      const row = pickNearestRecommendation(strand, level, recRows ?? []);
      if (!row) return null;
      return {
        strand,
        level,
        primary: row.primary_recommendation,
        supplementary: row.supplementary,
        notes: row.notes,
      };
    })
    .filter((r): r is Recommendation => r !== null);

  // Sort by band priority then strand display order.
  const strandMeta = new Map<Strand, { band: MasteryBand; order: number }>();
  strandMastery.forEach((s, i) => {
    strandMeta.set(s.strand, { band: s.band, order: i });
  });
  recommendations.sort((a, b) => {
    const aMeta = strandMeta.get(a.strand);
    const bMeta = strandMeta.get(b.strand);
    const aBand = aMeta ? BAND_PRIORITY[aMeta.band] : 99;
    const bBand = bMeta ? BAND_PRIORITY[bMeta.band] : 99;
    if (aBand !== bBand) return aBand - bBand;
    return (aMeta?.order ?? 99) - (bMeta?.order ?? 99);
  });

  // ---- metadata + envelope
  const tier = deriveTier(child);
  const timeFlag: SessionTimeFlag = session.session_time_flag ?? "normal";

  return {
    session_id: session.id,
    tenant_id: session.tenant_id,
    generated_at: new Date().toISOString(),
    child: {
      display_name: child.name,
      grade_label: formatChildGradeLabel(child),
    },
    metadata: {
      assessed_date_display: formatAssessedDate(session.completed_at),
      duration_display: formatDuration(session.started_at, session.completed_at),
      report_id: session.id,
    },
    time_flag: timeFlag,
    placement: {
      sam_level: samLevelLabel(placement.overallLevel),
      overall_percentage: overallPercentage,
      tier,
    },
    strand_mastery: strandMastery,
    misconceptions,
    recommendations,
  };
}

/** Grade label for ReportContent.child.grade_label. Mirrors page.tsx's
 *  buildSubtitle pattern: format the raw grade_level when present and
 *  non-empty; fall back to "Unknown grade" so the required-string contract
 *  holds. (Narration doesn't fail on "Unknown grade"; it's a real edge
 *  case for children seeded without a grade.) */
function formatChildGradeLabel(child: AssembleChild): string {
  const raw = child.grade_level?.trim();
  return raw ? formatGradeLevel(raw) : "Unknown grade";
}

function formatAssessedDate(completedAt: string | null): string {
  if (!completedAt) return "Unknown";
  const d = new Date(completedAt);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(
  startedAt: string,
  completedAt: string | null,
): string {
  if (!completedAt) return "Unknown";
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return "Unknown";
  }
  const minutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
