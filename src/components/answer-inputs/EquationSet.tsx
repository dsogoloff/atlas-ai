"use client";

// Equation-set / fact-family input: N editable number sentences, each
//   [a] [op▾] [b] = [result]
// The child fills the numbers and picks the operator per line. We emit
// AnswerValue `{ type:"equation-set", equations }` over the FULLY+VALIDLY
// filled lines only — a partially filled grid still yields a clean structured
// value of the completed sentences (grade() scores set-equality / validity).
//
// Answer-assembly logic lives in EXPORTED PURE FUNCTIONS (rowsToEquationSet,
// defaultRows) so it is unit-testable under node-env vitest (no DOM events).

import { useState } from "react";

import type { AnswerValue, Equation, Op } from "@/lib/grading/types";
import type { EquationSetSpec } from "./types";

/** Mutable per-row form state (strings, since inputs are raw text). */
export interface RowDraft {
  a: string;
  op: Op;
  b: string;
  result: string;
}

const DEFAULT_OPS: Op[] = ["+", "-"];

/** N empty rows, op defaulting to the first allowed op (or "+"). */
export function defaultRows(spec: EquationSetSpec): RowDraft[] {
  const op = spec.ops?.[0] ?? "+";
  return Array.from({ length: spec.rows }, () => ({
    a: "",
    op,
    b: "",
    result: "",
  }));
}

/**
 * Parse drafts into a clean Equation[] for AnswerValue, SKIPPING any row that
 * is not fully + validly filled (blank or NaN in a/b/result).
 */
export function rowsToEquationSet(rows: RowDraft[]): AnswerValue {
  const equations: Equation[] = [];
  for (const row of rows) {
    if (row.a.trim() === "" || row.b.trim() === "" || row.result.trim() === "") {
      continue;
    }
    const a = Number(row.a);
    const b = Number(row.b);
    const result = Number(row.result);
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(result)) {
      continue;
    }
    equations.push({ a, op: row.op, b, result });
  }
  return { type: "equation-set", equations };
}

type Props = EquationSetSpec & {
  onChange?: (v: AnswerValue) => void;
  className?: string;
};

export function EquationSet({
  rows,
  ops,
  ariaLabel,
  onChange,
  className,
}: Props) {
  const spec: EquationSetSpec = { kind: "equation-set", rows, ops, ariaLabel };
  const selectableOps = ops ?? DEFAULT_OPS;
  const [drafts, setDrafts] = useState<RowDraft[]>(() => defaultRows(spec));

  function update(index: number, patch: Partial<RowDraft>) {
    const next = drafts.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    setDrafts(next);
    onChange?.(rowsToEquationSet(next));
  }

  const numberClass =
    "h-12 w-14 rounded-lg border-2 border-sam-navy bg-sam-cream text-center font-bold text-sam-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-teal/40 placeholder:text-sam-gray-light";

  return (
    <div
      aria-label={ariaLabel ?? "Fill in the equations"}
      className={"flex flex-col gap-3 " + (className ?? "")}
    >
      {drafts.map((row, i) => (
        <div
          key={`row-${i}`}
          className="flex flex-wrap items-center gap-2 font-display-child text-2xl text-sam-navy"
        >
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={row.a}
            onChange={(e) => update(i, { a: e.target.value })}
            placeholder="?"
            aria-label={`Row ${i + 1} first number`}
            className={numberClass}
          />
          <select
            value={row.op}
            onChange={(e) => update(i, { op: e.target.value as Op })}
            aria-label={`Row ${i + 1} operator`}
            className="h-12 rounded-lg border-2 border-sam-navy bg-white px-2 font-bold text-sam-navy focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-teal/40"
          >
            {selectableOps.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={row.b}
            onChange={(e) => update(i, { b: e.target.value })}
            placeholder="?"
            aria-label={`Row ${i + 1} second number`}
            className={numberClass}
          />
          <span aria-hidden="true" className="px-1 font-bold">
            =
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={row.result}
            onChange={(e) => update(i, { result: e.target.value })}
            placeholder="?"
            aria-label={`Row ${i + 1} result`}
            className={numberClass}
          />
        </div>
      ))}
    </div>
  );
}
