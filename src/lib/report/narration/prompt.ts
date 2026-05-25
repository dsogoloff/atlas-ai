// Atlas Assessment — Sonnet prompt builder for report narration.
//
// Pure function — no DB, no LLM call. Builds (system, prompt) strings
// from a ReportContent for ./llmClient.ts's callSonnet to consume.
//
// Voice constraints are stamped into the system message as hard rules.
// The prompt body carries only the data the model needs to write the
// four short intros: child display name + grade, placement level, the
// strand mastery rows, the misconception rows (and explicit empty-vs-
// nonempty framing), the recommendation rows. No question content. No
// PII beyond the child's display name and grade.
//
// Output contract: JSON only, exactly four fields — placement_line,
// strand_lede, misconceptions_lede, recommendations_lede. The model is
// told to produce JSON-only with no markdown fences, but generate.ts
// still strips fences defensively for robustness against models that
// wrap output despite explicit instructions.

import type { ReportContent } from "@/lib/report/types";

const SYSTEM = `You are writing short, warm, parent-readable narration text for a child's math diagnostic assessment report. The report shows the child's placement, per-strand performance, any patterns observed across responses, and recommended next steps. Your job is to write four short intro / framing sentences — nothing more.

OUTPUT FORMAT
Produce JSON only. No preamble. No markdown fences. No commentary. The JSON object must contain exactly these four string fields, all required:
- placement_line — one warm sentence shown directly under the S.A.M. placement level.
- strand_lede — 1-2 sentences introducing the strand performance section (radar + bars).
- misconceptions_lede — 1-2 sentences framing the patterns observed across the child's responses.
- recommendations_lede — 1-2 sentences introducing the numbered list of next-step actions.

VOICE
- Parent-readable. Roughly Flesch-Kincaid grade 8 or below.
- Refer to the child by their display name. Do not over-use second person.
- Warm, plain-spoken, encouraging without inflating — like a thoughtful teacher at a parent conference, not marketing copy.

HARD RULES (never violate)
- NEVER diagnose, label, or pathologise the child. Do NOT write framings like "[child] has", "[child] is", or "[child] struggles with".
- Frame everything as patterns observed in THIS assessment, not as traits of the child.
- Never quote or describe specific question content.
- When the input has zero misconceptions, write misconceptions_lede as a GENUINE positive-signal sentence — no detected misconceptions IS a real positive, not faint praise.`;

export interface PromptBundle {
  system: string;
  prompt: string;
}

export function buildNarrationPrompt(content: ReportContent): PromptBundle {
  const { child, placement, strand_mastery, misconceptions, recommendations } =
    content;

  const strandLines = strand_mastery
    .map((s) => `- ${s.strand}: ${s.percentage}% (${s.band})`)
    .join("\n");

  const misconceptionsBlock =
    misconceptions.length > 0
      ? `MISCONCEPTIONS (patterns observed across the child's responses)\n${misconceptions
          .map(
            (m) =>
              `- ${m.label} [strand: ${m.strand}, occurrences: ${m.occurrences}]: ${m.description}`,
          )
          .join("\n")}`
      : `MISCONCEPTIONS\nnone detected. Write misconceptions_lede as a genuine positive-signal sentence — no detected misconceptions IS a real positive, not faint praise.`;

  const recommendationsBlock =
    recommendations.length > 0
      ? `RECOMMENDATIONS (pre-sorted by priority — most actionable first)\n${recommendations
          .map((r) => `- ${r.strand} @ ${r.level}: ${r.primary}`)
          .join("\n")}`
      : `RECOMMENDATIONS\nnone on this report.`;

  const prompt = `CHILD
Display name: ${child.display_name}
Grade: ${child.grade_label}

PLACEMENT
${placement.sam_level} (overall ${placement.overall_percentage}%, tier ${placement.tier})

STRAND PERFORMANCE
${strandLines}

${misconceptionsBlock}

${recommendationsBlock}

Now produce the JSON.`;

  return { system: SYSTEM, prompt };
}
