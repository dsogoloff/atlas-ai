// Atlas Assessment — shared ReportContent assembly.
//
// One function used by BOTH the in-app /report route AND the post-
// completion narration trigger so query orchestration + per-strand
// derivation don't drift between the two surfaces.
//
// Phase 8 (Item #12): strand_mastery is now keyed by V2026 sub-strands
// (not the engine's 6-value enum). The mapping flow per response is:
//   response.question_id → questions.content_id → tax_content.sub_strand_id
//                       → tax_sub_strands.code (the new Strand value)
// applicableStrands for the child's level is determined upstream from
// tax_sub_strands.applies_to_level_codes for the placement's tax_level.
// Questions with NULL content_id are skipped (no sub-strand mapping).
//
// Two clients in, one ReportContent out:
//   * readClient — for responses, taxonomy tables, misconceptions,
//     curriculum_recommendations. The page passes its anon RLS client
//     here to preserve defense-in-depth on parent-facing reads; the
//     trigger passes the service-role client.
//   * serviceClient — for `questions` only. Compliance.md §8 locks
//     question content behind RLS with no public policies; service-role
//     is required to read content_id off question rows.
//
// Caller responsibility: the auth + ownership check happens UPSTREAM of
// this function. assembleReportContent does NOT verify that the caller is
// allowed to read this session's data.

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Strand as EngineStrand } from "@/lib/engine/types";
import { formatGradeLevel } from "@/lib/format/gradeLevel";
import { aggregateMisconceptions } from "@/lib/report/misconception-aggregate";
import { computeReadiness } from "@/lib/report/readiness";
import { pickNearestRecommendation } from "@/lib/report/recommendation-lookup";
import {
  BOOKLET_LEVELS,
  anchorBookletForChild,
  bookletOrdinalForHalfGrade,
} from "@/lib/questionPicker/levelBand";
import {
  buildGrowthSignals,
  type GrowthResponseInput,
} from "@/lib/report/growth-signals";
import {
  computeStrandMastery,
  type ScoredResponse,
} from "@/lib/report/strand-mastery";
import type {
  Recommendation,
  ReportContent,
  Strand,
} from "@/lib/report/types";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
} from "@/lib/responseSubmit/types";
import type { Database } from "@/lib/supabase/database.types";
import { deriveTier } from "@/lib/tier/derive";

type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];
type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];

// Exported for reuse by the instructor roster, which needs the canonical
// S.A.M-level label per child without re-running the full report assembly.
export function samLevelLabel(level: HalfGradeLevel): string {
  // S.A.M-LEVEL (booklet) naming — the parent/placement axis (0A, 0B, 0C,
  // 1, 2 … 8), derived from the row's half_grade via levelBand's booklet axis.
  // The internal half-grade code (KA/KB/3A/3B) is NEVER surfaced — KA/KB fold
  // into the 0C booklet, 3A/3B into "3", etc. No trailing dot ("S.A.M Level 3",
  // not "S.A.M. Level 3"), matching the voice-locked narration prompt.
  const ordinal = bookletOrdinalForHalfGrade(level);
  const booklet = ordinal === null ? level : BOOKLET_LEVELS[ordinal];
  return `S.A.M Level ${booklet}`;
}

/** Half-grade → tax_level code. Best-effort 1:1. The V2026 taxonomy tops out
 *  at l6, so half-grades above the L6 booklet (7A-8B) CLAMP to l6 rather than
 *  mapping to null — a >L6 placement still resolves to the L6 sub-strand grid
 *  (the highest authored level) instead of producing empty strand_mastery.
 *  Grades 7/8 are non-selectable at intake (add-child-form), so this clamp is
 *  defense-in-depth for any session that still lands a >L6 estimate. K maps to
 *  l0a/l0b approximately. */
export function halfGradeToTaxLevelCode(level: HalfGradeLevel): string | null {
  switch (level) {
    case "0A":
      return "l0a";
    case "0B":
      return "l0b";
    case "0C":
      return "l0c";
    case "KA":
      return "l0a";
    case "KB":
      return "l0b";
    case "1A":
    case "1B":
      return "l1";
    case "2A":
    case "2B":
      return "l2";
    case "3A":
    case "3B":
      return "l3";
    case "4A":
    case "4B":
      return "l4";
    case "5A":
    case "5B":
      return "l5";
    case "6A":
    case "6B":
    // >L6 booklets clamp to l6 (highest authored taxonomy level).
    case "7A":
    case "7B":
    case "8A":
    case "8B":
      return "l6";
    default:
      return null;
  }
}

export interface AssembleSession {
  id: string;
  tenant_id: string;
  started_at: string;
  completed_at: string | null;
  current_estimate: Database["public"]["Tables"]["assessment_sessions"]["Row"]["current_estimate"];
  session_time_flag: SessionTimeFlag | null;
  /** Drives the short-test readiness summary (readiness is short-only). */
  test_type: Database["public"]["Enums"]["assessment_test_type"];
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
    .select("question_id, is_correct, detected_misconceptions, time_flag")
    .eq("session_id", session.id);
  if (responsesErr || !responses) {
    throw new AssembleError(
      `responses lookup failed: ${responsesErr?.message ?? "no rows"}`,
      responsesErr,
    );
  }

  // ---- questions (service-role; compliance §8 — projection is id +
  // content_id only). content_id keys into tax_content for the V2026
  // sub-strand axis. Questions without content_id can't be placed on the
  // sub-strand grid and are skipped from strand_mastery.
  const questionIds = Array.from(new Set(responses.map((r) => r.question_id)));
  const contentIdByQuestion = new Map<string, string>();
  if (questionIds.length > 0) {
    const { data: questionRows, error: questionsErr } = await serviceClient
      .from("questions")
      .select("id, content_id")
      .in("id", questionIds);
    if (questionsErr || !questionRows) {
      throw new AssembleError(
        `questions lookup failed: ${questionsErr?.message ?? "no rows"}`,
        questionsErr,
      );
    }
    for (const q of questionRows) {
      if (q.content_id) contentIdByQuestion.set(q.id, q.content_id);
    }
  }

  // ---- Taxonomy lookups: determine applicable sub-strands at the
  // child's level, and resolve each question's content_id to a sub-strand
  // code. Both queries pull small tables (≤12 sub-strands, ≤145 content
  // rows per tenant) so a full filter on tenant_id is fine.
  const taxLevelCode = halfGradeToTaxLevelCode(placement.overallLevel);
  let applicableStrands: Strand[] = [];
  const subStrandByQuestion = new Map<string, Strand>();
  // question_id → tax_content.name (the skill/topic label), for the
  // areas-to-confirm enrichment. Taxonomy label, never question content.
  const skillNameByQuestion = new Map<string, string>();

  if (taxLevelCode) {
    // tax_sub_strands — applies_to_level_codes carries the level filter
    // as a denormalised text[] column.
    const { data: subStrands, error: ssErr } = await readClient
      .from("tax_sub_strands")
      .select("id, code, applies_to_level_codes, display_order")
      .eq("tenant_id", session.tenant_id);
    if (ssErr) {
      throw new AssembleError(
        `tax_sub_strands lookup failed: ${ssErr.message}`,
        ssErr,
      );
    }
    const subStrandCodeById = new Map<string, Strand>();
    const displayOrderByCode = new Map<Strand, number>();
    const applicable = new Map<Strand, number>(); // code → display_order
    for (const ss of subStrands ?? []) {
      const code = ss.code as Strand;
      subStrandCodeById.set(ss.id, code);
      displayOrderByCode.set(code, ss.display_order);
      if (ss.applies_to_level_codes.includes(taxLevelCode)) {
        applicable.set(code, ss.display_order);
      }
    }

    // tax_content — map question.content_id → tax_content.sub_strand_id
    // → sub-strand code. Filter to just the content_ids on this session.
    const sessionContentIds = Array.from(
      new Set(contentIdByQuestion.values()),
    );
    if (sessionContentIds.length > 0) {
      const { data: contentRows, error: cErr } = await readClient
        .from("tax_content")
        .select("id, sub_strand_id, name")
        .in("id", sessionContentIds);
      if (cErr) {
        throw new AssembleError(
          `tax_content lookup failed: ${cErr.message}`,
          cErr,
        );
      }
      const subStrandByContent = new Map<string, Strand>();
      const nameByContent = new Map<string, string>();
      for (const c of contentRows ?? []) {
        const code = subStrandCodeById.get(c.sub_strand_id);
        if (code) subStrandByContent.set(c.id, code);
        if (c.name) nameByContent.set(c.id, c.name);
      }
      for (const [qid, cid] of contentIdByQuestion) {
        const code = subStrandByContent.get(cid);
        if (code) subStrandByQuestion.set(qid, code);
        const name = nameByContent.get(cid);
        if (name) skillNameByQuestion.set(qid, name);
      }
    }

    // Displayed sub-strands = those applicable at the child's MEASURED level
    // UNION every sub-strand the child was actually assessed on this session.
    // The short test samples the PREVIOUS booklet, so a child can be served
    // (and scored on) a sub-strand that isn't in applies_to_level_codes for
    // their measured level — e.g. Measurement and Money exist at L3 but not
    // L4. Keying the display set off the measured level ALONE silently
    // dropped those real, scored responses (computeStrandMastery only emits
    // rows for the set passed here), collapsing the bar map toward the one
    // sub-strand that overlaps both levels. Including assessed sub-strands
    // keeps every measured strand visible; unassessed applicable ones still
    // render as no_data so the parent sees the full level grid.
    const displaySet = new Map<Strand, number>(applicable);
    for (const code of subStrandByQuestion.values()) {
      const order = displayOrderByCode.get(code);
      if (order !== undefined && !displaySet.has(code)) {
        displaySet.set(code, order);
      }
    }
    // Stable display order — sub-strand display_order is unique within
    // tax_sub_strands so this gives a deterministic bar order.
    applicableStrands = Array.from(displaySet.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([code]) => code);
  }

  // Scored responses for computeStrandMastery — keyed by V2026 sub-strand
  // codes. Responses whose question has no content_id (or whose content_id
  // doesn't resolve to any sub-strand) are dropped; resolved sub-strands are
  // all displayed (applicableStrands now includes every assessed sub-strand).
  const scoredResponses: ScoredResponse[] = [];
  for (const r of responses) {
    const strand = subStrandByQuestion.get(r.question_id);
    if (!strand) continue;
    scoredResponses.push({ strand, isCorrect: r.is_correct });
  }

  // Overall percentage stays correct/attempted across the whole session
  // (R1 hybrid). Counts ALL responses, not just sub-strand-resolved ones —
  // overall mastery doesn't depend on whether each question has been
  // taxonomy-tagged yet.
  const overallTotal = responses.length;
  const overallCorrect = responses.filter((r) => r.is_correct).length;
  const overallPercentage =
    overallTotal === 0
      ? 0
      : Math.round((overallCorrect / overallTotal) * 100);

  const strandMastery = computeStrandMastery(
    scoredResponses,
    applicableStrands,
  );

  // ---- misconceptions
  const misconceptionCodes = responses.map((r) => r.detected_misconceptions);
  const allCodes = Array.from(new Set(misconceptionCodes.flat()));
  // code → label, shared by the aggregate (cards) and the growth-signal
  // enrichment (per-sub-strand "areas to confirm" detail).
  const misconceptionLabelByCode = new Map<string, string>();
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
    for (const row of mcRows ?? []) {
      misconceptionLabelByCode.set(row.code, row.label);
    }
    misconceptions = aggregateMisconceptions({
      codes: misconceptionCodes,
      lookup,
    });
  }

  // ---- areas-to-confirm supporting detail (narration input only). One
  // GrowthSignal per assessed sub-strand: served count + missed skill labels
  // + tied misconception labels + pace, so the narrator can name the specific
  // skill and scale the note to the evidence. Responses that don't resolve to
  // a sub-strand are dropped (same as strand_mastery).
  const growthResponses: GrowthResponseInput[] = [];
  for (const r of responses) {
    const strand = subStrandByQuestion.get(r.question_id);
    if (!strand) continue;
    growthResponses.push({
      strand,
      isCorrect: r.is_correct,
      skillName: skillNameByQuestion.get(r.question_id) ?? null,
      timeFlag: r.time_flag,
      misconceptionLabels: r.detected_misconceptions
        .map((c) => misconceptionLabelByCode.get(c))
        .filter((l): l is string => Boolean(l)),
    });
  }
  const growthSignals = buildGrowthSignals(growthResponses);

  // ---- recommendations (Phase 7.6 nearest-level fallback). Still keyed
  // by the engine's 6-value strand because curriculum_recommendations
  // rows aren't remapped onto sub-strands.
  const strandLevels = placement.strandLevels;
  const recLookupKeys = Object.entries(strandLevels) as Array<
    [EngineStrand, HalfGradeLevel]
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

  // Phase 8 sort: deterministic by level then engine-strand code.
  // The old pre-Phase-8 sort was "area_of_focus first, then progressing,
  // then mastery, with STRAND_ORDER as within-band tiebreak" — but that
  // relied on the strand-mastery key matching the recommendation strand
  // (both were engine 6-value). Now strand_mastery is sub-strand-keyed
  // and curriculum_recommendations rows are still engine-strand-keyed;
  // the axis mismatch means we can't cleanly band-prioritise here.
  // v2 work (curriculum_recommendations rebuild onto sub-strands) can
  // restore the band-priority sort. For now: stable, alphabetic, level-
  // first. The brief's RC1 lock (per-item strand eyebrow) holds; the
  // order shifts mildly but the data is the same.
  recommendations.sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    return a.strand.localeCompare(b.strand);
  });

  // ---- metadata + envelope
  const tier = deriveTier(child);
  const timeFlag: SessionTimeFlag = session.session_time_flag ?? "normal";

  // SHORT-test readiness: clean pass on the previous-level sample (overall %)
  // → "appears ready for [current grade level]". Null for comprehensive.
  // Readiness names the S.A.M booklet level the child appears ready for — their
  // CURRENT grade's booklet (the short test sampled the level below). Booklet
  // display via levelBand (grade → booklet ordinal → "0C"/"1"/…); NEVER a
  // school grade or half-grade code.
  const readinessLevel =
    BOOKLET_LEVELS[anchorBookletForChild(child.grade_level, child.birth_year)];
  const readiness = computeReadiness({
    testType: session.test_type,
    overallPercentage: overallPercentage,
    gradedCount: overallTotal,
    currentLevelLabel: readinessLevel,
  });

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
      questions_served: overallTotal,
    },
    time_flag: timeFlag,
    placement: {
      sam_level: samLevelLabel(placement.overallLevel),
      overall_percentage: overallPercentage,
      tier,
    },
    strand_mastery: strandMastery,
    growth_signals: growthSignals,
    misconceptions,
    recommendations,
    readiness,
  };
}

/** Grade label for ReportContent.child.grade_label. Mirrors page.tsx's
 *  buildSubtitle pattern: format the raw grade_level when present and
 *  non-empty; fall back to "Unknown grade" so the required-string contract
 *  holds. */
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
