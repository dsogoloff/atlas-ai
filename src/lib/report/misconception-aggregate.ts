// Misconception aggregation for the parent diagnostic report.
//
// Pure function: given the per-response detected_misconceptions arrays
// from a session AND a lookup table from misconception code → row
// metadata (label, description, strand), returns the top N misconceptions
// by occurrence count, ready to render.
//
// Caller (the report page server component) queries the misconceptions
// table once for all relevant codes and builds the Map. Two queries
// total — responses (with detected_misconceptions[]) and misconceptions
// (where code = ANY(...)) — same pattern as Phase 1 dashboard's
// children + sessions split.
//
// Unknown-code policy (R6 / M2 lock): a code in responses but missing
// from the lookup is dropped from the output and logged via console.warn
// for traceability. Don't surface "Unknown misconception" to the parent
// — that exposes classifier/seed drift as a UX defect.

import type { Strand } from "@/lib/engine/types";

export interface MisconceptionRow {
  code: string;
  label: string;
  description: string;
  strand: Strand;
}

export interface AggregatedMisconception extends MisconceptionRow {
  /** Number of responses that flagged this code (deduped within each
   *  response — see implementation note below). */
  occurrences: number;
}

export interface AggregateMisconceptionsInput {
  /** One array per response — the row's detected_misconceptions field. */
  codes: string[][];
  /** Code → MisconceptionRow lookup; caller queries `misconceptions` and
   *  builds the Map (e.g., new Map(rows.map(r => [r.code, r]))). */
  lookup: Map<string, MisconceptionRow>;
}

const DEFAULT_TOP_N = 3; // R6 lock: top 3 misconception cards on the report.

export function aggregateMisconceptions(
  input: AggregateMisconceptionsInput,
  topN: number = DEFAULT_TOP_N,
): AggregatedMisconception[] {
  // Count occurrences across responses. Dedupe within a single response
  // (Set) so the same code listed twice in one response doesn't
  // double-count — the semantics of duplicates within one response are
  // undefined, so the safe interpretation is "this response flagged
  // this code (once)."
  const counts = new Map<string, number>();
  for (const arr of input.codes) {
    const seen = new Set(arr);
    for (const code of seen) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  const rows: AggregatedMisconception[] = [];
  for (const [code, occurrences] of counts) {
    const row = input.lookup.get(code);
    if (!row) {
      console.warn("[misconception-aggregate] unknown misconception code", {
        code,
        occurrences,
      });
      continue;
    }
    rows.push({ ...row, occurrences });
  }

  // Sort descending by occurrences; tie-break by code ascending for
  // stable ordering across renders and tests. localeCompare matches
  // string-sort in V8 deterministically.
  rows.sort(
    (a, b) => b.occurrences - a.occurrences || a.code.localeCompare(b.code),
  );

  return rows.slice(0, topN);
}
