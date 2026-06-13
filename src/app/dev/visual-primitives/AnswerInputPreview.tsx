"use client";

// Gallery-only client wrapper: renders one answer-input component and shows the
// structured AnswerValue it emits, so the founder can see the grading-ready
// shape each input produces. Not used in the assessment flow.

import { useState } from "react";

import {
  EquationFill,
  EquationSet,
  VisualMC,
  type AnswerInputSpec,
} from "@/components/answer-inputs";
import type { AnswerValue } from "@/lib/grading/types";

export function AnswerInputPreview({ spec }: { spec: AnswerInputSpec }) {
  const [value, setValue] = useState<AnswerValue | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {spec.kind === "equation-fill" && (
        <EquationFill {...spec} onChange={setValue} />
      )}
      {spec.kind === "equation-set" && (
        <EquationSet {...spec} onChange={setValue} />
      )}
      {spec.kind === "visual-mc" && <VisualMC {...spec} onChange={setValue} />}

      <pre className="overflow-x-auto rounded-lg bg-sam-navy/5 p-2 text-xs text-sam-gray-dark">
        {value ? JSON.stringify(value) : "(emitted AnswerValue appears here)"}
      </pre>
    </div>
  );
}
