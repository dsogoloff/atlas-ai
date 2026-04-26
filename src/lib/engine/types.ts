// IRT/Bayesian engine — public types.
//
// Shapes here are JSON-serializable so engine state can live verbatim in
// assessment_sessions.current_estimate (jsonb) per features.md §1.

import type { Enums } from "@/lib/supabase/database.types";

export type Strand = Enums<"strand">;
export type HalfGradeLevel = Enums<"half_grade_level">;
export type QuestionFormat = Enums<"question_format">;

/**
 * Posterior probability mass over the 18 half-grade levels for a single
 * strand. Indexed by HalfGradeLevel string. Values must sum to 1.0
 * (we renormalise after every update to absorb floating-point drift).
 */
export type StrandPosterior = Record<HalfGradeLevel, number>;

/** Posteriors for all six strands. */
export type Posteriors = Record<Strand, StrandPosterior>;

/**
 * Minimal description of a question for the engine. The full content
 * field stays in the DB; the engine only needs the IRT inputs.
 */
export interface EngineQuestion {
  id: string;
  strand: Strand;
  level: HalfGradeLevel;
  difficulty: number; // IRT b parameter
  format: QuestionFormat;
}

/**
 * The child's response to a question, as seen by the engine.
 * Misconception detection happens elsewhere; the engine only needs correctness.
 */
export interface EngineResponse {
  questionId: string;
  strand: Strand;
  isCorrect: boolean;
  takenSeconds: number;
}

/**
 * Aggregate placement summary, written into assessment_sessions.current_estimate.
 * Shape mirrors PlacementEstimate from features.md §1.
 */
export interface PlacementEstimate {
  overallLevel: HalfGradeLevel;
  strandLevels: Record<Strand, HalfGradeLevel>;
  /** Probability mass within ±1 half-grade of the overallLevel mode, in [0, 1]. */
  confidence: number;
}

/**
 * Full engine state — JSON-serializable, persisted as
 * assessment_sessions.current_estimate.
 */
export interface EngineState {
  posteriors: Posteriors;
  /** Number of responses processed so far. Termination cap defaults to 25. */
  responseCount: number;
  /** Question IDs already served — never repeat within a session. */
  servedQuestionIds: string[];
}

/**
 * Request describing the next question the engine wants. Layer 2 (LLM
 * question selector, per architecture.md) picks the actual question
 * within this band.
 */
export interface NextQuestionRequest {
  strand: Strand;
  /** IRT difficulty target. Layer 2 picks among items in [target ± width]. */
  targetDifficulty: number;
  width: number;
  /** For diagnostics / test assertions. */
  reason: "max-variance-strand" | "round-robin-fallback";
}

export interface TerminationDecision {
  done: boolean;
  reason:
    | "confidence-threshold-met"
    | "max-questions-reached"
    | "in-progress";
}
