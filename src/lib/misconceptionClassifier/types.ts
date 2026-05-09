// Atlas Assessment — misconception classifier shared types.
//
// The classifier produces detected_misconceptions[] for the responses table
// alongside an audit method+version stamp (compliance.md §12 version-on-row
// pattern). Phase 2 ships the service module; Phase 3 wires the handler to
// populate the columns.

import type { QuestionFormat, Strand } from "@/lib/engine/types";
import type { Enums, Json } from "@/lib/supabase/database.types";

/**
 * Mirror of the misconception_classifier_method pg enum (migration
 * 20260509000000_misconception_classifier_audit.sql). Imported directly
 * from database.types so the TS surface and DB surface cannot drift.
 */
export type ClassifierMethod = Enums<"misconception_classifier_method">;

/**
 * Inputs the classifier needs from the response-submit handler.
 */
export interface ClassifierInput {
  format: QuestionFormat;
  strand: Strand;
  /** questions.content jsonb, full shape — the classifier reads
   *  distractor_misconceptions for MC and stem/correct_answer for NE. */
  content: Json;
  answerGiven: string;
  isCorrect: boolean;
}

/**
 * What classify() returns. Never thrown — failure-soft mode returns
 * { codes: [], method: 'failed', version: null } per the S2 lock.
 *
 * codes is an array even though D1 locks "top code only" — the array
 * shape preserves future multi-code without a schema migration.
 *
 * tokens + elapsedMs are populated only on live haiku calls (E2 cost
 * telemetry); stub-mode haiku returns { input: 0, output: 0 } and 0ms.
 * distractor-map / none / failed leave them undefined.
 */
export interface ClassifierOutput {
  codes: string[];
  method: ClassifierMethod;
  version: string | null;
  tokens?: { input: number; output: number };
  elapsedMs?: number;
}

/**
 * One row from the misconceptions taxonomy. Structurally identical to
 * MisconceptionRow in src/lib/report/misconception-aggregate.ts:21 —
 * defined separately for now (Q3 lock). Deferred punch list: extract
 * to a shared location once a third consumer arrives.
 */
export interface TaxonomyEntry {
  code: string;
  label: string;
  description: string;
  strand: Strand;
}

/**
 * Strand-keyed taxonomy map produced by loadTaxonomy(). The classifier
 * passes the slice for input.strand into the prompt builder so the LLM
 * only sees codes that could plausibly apply.
 */
export type TaxonomyMap = Map<Strand, TaxonomyEntry[]>;
