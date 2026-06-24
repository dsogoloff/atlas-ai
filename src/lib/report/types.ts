/**
 * Atlas Assessment — Report data contract (reconciled to the shipped in-app report).
 *
 * This is the SINGLE shared report contract. It describes the exact data the
 * shipped /report components consume. LLM-narration fields (parent-friendly
 * ledes, "What We Noticed" findings) are intentionally OMITTED here — they are
 * added at roadmap Step 4 (Items #14/#15), not invented now.
 *
 * Composed from canonical types — does not redefine StrandMastery,
 * AggregatedMisconception, etc. Import them from their source files.
 */

// Engine's 6-value strand enum (the DB schema column type). Aliased
// because the report-side `Strand` (defined below) is the new V2026
// 12-value sub-strand union; misconceptions + curriculum_recommendations
// rows are still keyed by the engine enum in the DB.
import type { Strand as EngineStrand } from "@/lib/engine/types";
import type { AggregatedMisconception } from "@/lib/report/misconception-aggregate";
import type { StrandMastery } from "@/lib/report/strand-mastery";
import type { ReadinessSummary } from "@/lib/report/readiness";
import type { Database } from "@/lib/supabase/database.types";
import type { Tier } from "@/lib/tier/derive";

type SessionTimeFlag = Database["public"]["Enums"]["session_time_flag"];
type HalfGradeLevel = Database["public"]["Enums"]["half_grade_level"];

// =============================================================================
// V2026 taxonomy types (Item #12 Phase 8)
// =============================================================================
// The report side moved off the engine's closed 6-value strand union to
// the V2026 two-level taxonomy: 3 parent strands → 12 sub-strands.
// strand_mastery is keyed by sub-strand (Strand below) and is variable
// length (the N sub-strands applicable at the child's S.A.M. level). The
// radar rolls up to the 3 parent strands; the bar map renders the N
// sub-strands directly.
//
// Codes are sourced verbatim from docs/sam-v2026-taxonomy.md §7 — do not
// hand-invent. The schema's tax_sub_strands.code / tax_strands.code rows
// are the runtime source of truth.

/** 12 sub-strand codes from V2026 §7. Used for strand_mastery rows and
 *  the bar map. */
export type Strand =
  | "whole_numbers"
  | "fractions"
  | "decimals"
  | "money"
  | "percentage"
  | "rate"
  | "ratio"
  | "algebra"
  | "measurement"
  | "geometry"
  | "area_volume"
  | "data_representation";

/** 3 parent-strand codes from V2026 §7. Used for the radar — always three
 *  fixed axes. Each sub-strand maps to exactly one parent via
 *  SUB_STRAND_TO_PARENT. */
export type ParentStrand =
  | "number_algebra"
  | "measurement_geometry"
  | "statistics";

/** Sub-strand → parent. Per V2026 §7. */
export const SUB_STRAND_TO_PARENT: Record<Strand, ParentStrand> = {
  whole_numbers: "number_algebra",
  fractions: "number_algebra",
  decimals: "number_algebra",
  money: "number_algebra",
  percentage: "number_algebra",
  rate: "number_algebra",
  ratio: "number_algebra",
  algebra: "number_algebra",
  measurement: "measurement_geometry",
  geometry: "measurement_geometry",
  area_volume: "measurement_geometry",
  data_representation: "statistics",
};

/** Canonical radar order. The radar geometry assumes this order — axis 0
 *  points up (number_algebra), axis 1 lower-right (measurement_geometry),
 *  axis 2 lower-left (statistics) — and the SR1 lock keeps the radar
 *  text-free, so this order is the only place the parent-strand sequence
 *  is encoded. */
export const PARENT_STRAND_ORDER: readonly ParentStrand[] = [
  "number_algebra",
  "measurement_geometry",
  "statistics",
] as const;

/**
 * Per-sub-strand supporting detail for the report narration's "areas to
 * confirm" section. NARRATION INPUT ONLY — not rendered by the report page;
 * assembled in assemble.ts and consumed by the Sonnet prompt builder so each
 * "area to confirm" can name the specific skill(s) and scale its note to the
 * evidence. Carries no question content or PII: skill names are taxonomy topic
 * labels (tax_content.name), pace is derived from per-item timing.
 */
export interface GrowthSignal {
  /** Sub-strand slug (same axis as StrandMastery.strand). */
  strand: Strand;
  /** Items served in this sub-strand this session — the evidence weight a
   *  note's specificity is scaled to. */
  served: number;
  correct: number;
  /** Topic labels (tax_content.name) of the items answered incorrectly,
   *  deduped, capped. Never question content. */
  missed_skills: string[];
  /** Misconception labels tied to this sub-strand's responses, deduped. */
  misconceptions: string[];
  /** Pace across the sub-strand's served items, from per-item time_flag:
   *  "fast" (mostly rushed), "slow" (mostly laboured), "mixed" (both), or
   *  "typical". A hint for the note, never asserted as fact. */
  pace: "fast" | "slow" | "mixed" | "typical";
}

// =============================================================================
// Recommendation — still keyed by the engine's 6-value strand because the
// curriculum_recommendations DB rows haven't been remapped onto sub-strands.
// =============================================================================

export interface Recommendation {
  strand: EngineStrand;
  level: HalfGradeLevel;
  primary: string;
  supplementary: string[]; // hidden v1 (RC3)
  notes: string | null; // hidden v1 (RC4)
}

export interface ReportContent {
  session_id: string;
  tenant_id: string;
  generated_at: string; // ISO8601

  child: {
    display_name: string; // demo: full name "Aiden Park"; live treatment TBD
    grade_label: string; // "Grade 3"
  };
  metadata: {
    assessed_date_display: string; // "May 19, 2026"
    duration_display: string; // "14 minutes"
    report_id: string; // "A-2026-051901"
    // ACTUAL questions served this session (adaptive — not a fixed total).
    // Optional so hand-built / legacy ReportContent stays valid; the meta
    // line renders "· N questions" only when present and > 0.
    questions_served?: number;
  };

  // Drives the time-flag banner + whether scores render at all (lock R5).
  // ALWAYS present; value "normal" means render no banner.
  time_flag: SessionTimeFlag; // unreliable | mixed | rushed | struggling | normal

  placement: {
    sam_level: string; // pre-formatted "S.A.M Level 3A" (samLevelLabel output)
    overall_percentage: number; // 0..100, R1 hybrid (correct/attempted)
    tier: Tier; // K_4 | G5_8
  };

  // strand_mastery is the N sub-strands applicable at the child's
  // S.A.M. level (variable length 2-8 per the V2026 taxonomy). Feeds the
  // bar map directly; the radar consumes a rolled-up 3-parent view
  // derived at render time via rollUpToParentStrands.
  strand_mastery: StrandMastery[];
  // Narration-only supporting detail per assessed sub-strand (the
  // areas-to-confirm enrichment). NOT rendered by the page; consumed by the
  // narration prompt builder. Optional — absent on hand-built/legacy
  // ReportContent (e.g. the dev preview), present on assembled content.
  growth_signals?: GrowthSignal[];
  misconceptions: AggregatedMisconception[]; // 0..3, occurrence desc; empty array
  // is the ML1 positive-state signal — no separate flag
  recommendations: Recommendation[]; // band-sorted (page-owned sort), strand-keyed

  // SHORT-test readiness (asymmetric, §2.4-safe — see lib/report/readiness.ts).
  // null for comprehensive sessions. For short sessions: ready=true drives the
  // upside-only "appears ready for…" line; ready=false surfaces NO negative
  // framing. Either way the short report shows the comprehensive CTA.
  readiness: ReadinessSummary | null;
}

// =============================================================================
// ReportNarration — the LLM-generated prose layer, kept separate from
// ReportContent. ReportContent is deterministic engine data; ReportNarration
// is generated, fallible prose. The two join by session_id; the renderer
// degrades each surface to data-only when its prose field is absent.
// =============================================================================

/**
 * ReportNarration — LLM-generated parent-facing prose for the report.
 *
 * Deliberately SEPARATE from ReportContent: ReportContent is deterministic
 * engine data; ReportNarration is generated, fallible prose. One row per
 * session, joined by session_id. Every prose field is independently optional
 * — the report renders each surface data-only when its field is absent, so a
 * missing or partial narration degrades gracefully with no special handling.
 */
export interface ReportNarration {
  session_id: string;
  tenant_id: string;
  generated_at: string; // ISO8601
  model: string; // e.g. "claude-sonnet-..." — audit
  status: "ok" | "failed"; // 'failed' rows may be written for audit; treat prose as absent

  // One warm sentence shown under the S.A.M placement level.
  placement_line?: string;

  // 1-2 sentence intro to the strand radar + bar section.
  strand_lede?: string;

  /**
   * Backs the parent report's "What We Noticed" numbered list. strengths
   * come from top-mastered sub-strands (strand_mastery data); growth_areas
   * come from surfaced misconception patterns, supplemented from
   * lowest-mastery sub-strands when fewer than 2 misconceptions surfaced.
   * Each item is short prose (pattern name + plain description for growth
   * areas; sub-strand + warm phrase for strengths).
   *
   * strengths MAY be empty when there is no measured strand data
   * (thin-bank case); growth_areas MAY be empty when neither misconceptions
   * nor mastery data surfaced anything. Both are valid — not errors.
   */
  key_findings?: {
    strengths: string[]; // 0-3 items
    growth_areas: string[]; // 0-3 items
  };

  // 1-2 sentence intro to the recommendations action list.
  recommendations_lede?: string;
}
