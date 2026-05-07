// Atlas Assessment — question-picker public types.
//
// The picker is the "Layer 1.5" deterministic shim between Layer 1 (the
// IRT/Bayesian engine — features.md §1, src/lib/engine/) and the route
// handlers that call it. Given a NextQuestionRequest from the engine, the
// picker turns the {strand, target_difficulty, width} band into a concrete
// question row from the bank.
//
// Layer 2 (LLM-assisted item selection, future cycle per architecture.md
// and engine.ts header) plugs in via the `chooser` callback in pickQuestion.
// The picker stays pure-deterministic for v1.
//
// Convention (matches src/lib/responseSubmit/types.ts and timeFlagging):
//   * In-memory TS shapes are camelCase.
//   * DB rows / wire shapes are snake_case.
//   * Convert at the boundary; never rename in flight.

import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  HalfGradeLevel,
  QuestionFormat,
  Strand,
} from "@/lib/engine/types";

// ---------------------------------------------------------------------------
// DB row subset returned by the picker
// ---------------------------------------------------------------------------

/**
 * The columns the picker selects from `questions`. Deliberately narrower
 * than `Database["public"]["Tables"]["questions"]["Row"]` — the picker
 * doesn't read time-norm tags (those are the time-flagger's concern) and
 * the handler doesn't need tenant_id back since it already had it to
 * scope the query.
 *
 * `external_id` is included for the deterministic tiebreak (see picker.ts).
 */
export interface PickedQuestionRow {
  id: string;
  external_id: string | null;
  strand: Strand;
  level: HalfGradeLevel;
  difficulty: number;
  format: QuestionFormat;
  content: Json;
}

// Compile-time guard: PickedQuestionRow keys must remain a subset of the
// real questions row. If the schema ever drops one of these columns, this
// fails to typecheck and the maintainer fixes the picker rather than
// silently returning undefined fields.
type _PickedRowKeyCheck =
  keyof PickedQuestionRow extends keyof Database["public"]["Tables"]["questions"]["Row"]
    ? true
    : never;
const _pickedRowKeyCheck: _PickedRowKeyCheck = true;
void _pickedRowKeyCheck;

// ---------------------------------------------------------------------------
// Client-bound payload (compliance.md §8 Constraint 1 — answers stripped)
// ---------------------------------------------------------------------------

/**
 * Question shape sent to the browser. Every field is allowlisted by the
 * serializer in serialize.ts — anything not on this list is dropped.
 *
 * Per compliance.md §8 the following MUST NOT appear on the wire:
 *   * correct_answer        (NUMERIC_ENTRY)
 *   * correct_index         (MULTIPLE_CHOICE)
 *   * correct_order         (DRAG_DROP)
 *   * distractor_misconceptions  (any format)
 *   * misconception_tags    (any format — denormalised diagnostic data)
 *   * external_id           (S.A.M. catalog ID — licensing audit, server-only)
 */
export interface ClientQuestion {
  id: string;
  strand: Strand;
  level: HalfGradeLevel;
  format: QuestionFormat;
  content: ClientQuestionContent;
}

export type ClientQuestionContent =
  | { stem: string; options: string[] }   // MULTIPLE_CHOICE
  | { stem: string }                       // NUMERIC_ENTRY
  | { stem: string; items: string[] };     // DRAG_DROP

// ---------------------------------------------------------------------------
// Picker contract
// ---------------------------------------------------------------------------

/** What the picker is asked to find. Mirrors engine.NextQuestionRequest
 *  but is repeated here so the picker module has no engine import cycle
 *  if it ever needs to be reused. */
export interface PickerRequest {
  strand: Strand;
  /** IRT difficulty target. The picker treats `width` as advisory only —
   *  see picker.ts for the strand-exhaustion rationale. */
  targetDifficulty: number;
  width: number;
}

/** Side-data the picker needs that doesn't come from the engine state. */
export interface PickerContext {
  tenantId: string;
  /** Question IDs already served in this session — never repeat. Sourced
   *  from EngineState.servedQuestionIds at the call site. */
  servedQuestionIds: ReadonlyArray<string>;
  /** Optional cap on candidates fetched. v1 callers leave this at 1 (the
   *  default chooser returns the first row). Layer 2 will raise this and
   *  pass a misconception-aware chooser. */
  candidateLimit?: number;
}

/** Discriminated result. `strand-exhausted` is the only failure mode the
 *  picker reports; DB errors throw so the orchestrator can map them to 500. */
export type PickerResult =
  | { ok: true; question: PickedQuestionRow }
  | { ok: false; reason: "strand-exhausted" };

/** Layer-2 plug-in point. Receives the candidate set (size determined by
 *  PickerContext.candidateLimit) and returns the chosen row, or null to
 *  signal the chooser declined to pick (treated as strand-exhausted by
 *  the orchestrator). The default chooser returns candidates[0] ?? null. */
export type Chooser = (
  candidates: ReadonlyArray<PickedQuestionRow>,
) => PickedQuestionRow | null;
