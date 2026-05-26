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

import type { ReportContent, Strand } from "@/lib/report/types";

const SYSTEM = `You are writing short, warm, parent-readable narration text for a child's math diagnostic assessment report. The report shows the child's placement, per-strand performance, any patterns observed across responses, and recommended next steps. Your job is to write four short intro / framing sentences — nothing more.

OUTPUT FORMAT
Produce JSON only. No preamble. No markdown fences. No commentary. The JSON object must contain exactly these four string fields, all required:
- placement_line — one warm sentence shown directly under the S.A.M placement level.
- strand_lede — 1-2 sentences introducing the strand performance section (radar + bars).
- misconceptions_lede — 1-2 sentences framing the patterns observed across the child's responses.
- recommendations_lede — 1-2 sentences introducing the numbered list of next-step actions.

VOICE
- Parent-readable. Roughly Flesch-Kincaid grade 8 or below.
- Refer to the child by their FIRST NAME only — the part of the Display name before any space. Never use the surname or the full display name in any prose field. Do not over-use second person.
- For placement framing, prefer warm, plain verbs ("working at", "is at") over clinical ones ("placed at", "assessed at").
- Warm, plain-spoken, encouraging without inflating — like a thoughtful teacher at a parent conference, not marketing copy.

HARD RULES (never violate)
- NEVER diagnose, label, or pathologise the child. Do NOT write framings like "[child] has", "[child] is", or "[child] struggles with".
- Frame everything as patterns observed in THIS assessment, not as traits of the child.
- Never quote or describe specific question content.
- When the input has zero misconceptions, write misconceptions_lede as a GENUINE positive-signal sentence — no detected misconceptions IS a real positive, not faint praise.
- Render the placement as "S.A.M Level N" only (e.g. "S.A.M Level 3") — note S.A.M has NO trailing dot. NEVER include the half-level letter (e.g. "3A", "3B") in any prose field — the half-level is an internal placement detail, not parent-facing copy.
- Do NOT claim that any strand, sub-strand, or recommendation is higher-impact, more important, more urgent, more valuable, or will "make the biggest difference" relative to another — in ANY prose field (strand_lede, misconceptions_lede, recommendations_lede, placement_line). Naming strengths and focus areas is allowed; ranking them by impact, importance, or priority is not. The recommendations are presented in a fixed display order, not impact-ranked. Frame everything neutrally — e.g. "areas to work on next", "suggested next steps", "where to focus practice" — with no comparative ranking.
- strand_lede MUST name 1-2 specific sub-strands as strengths AND 1-2 specific sub-strands as focus areas, drawn from the STRAND PERFORMANCE block in the prompt. Use the sub-strand labels exactly as written there (e.g. "Whole Numbers", "Area and Volume"). Generic phrasings such as "some areas show solid footing" or "others point to topics worth spending more time on" are NOT acceptable — strand_lede without named sub-strands fails the brief.
- DESCRIPTIVE vs PRESCRIPTIVE — strict split. strand_lede is DESCRIPTIVE: it describes what the strand chart SHOWS from this assessment (which sub-strands are strengths, which are focus areas). It MUST NOT contain any forward-looking claim about practice, impact, or what to do next. Phrasings like "where focused practice will help most", "where to focus practice next", "areas to work on next", "where extra time will pay off", "the two areas to prioritise", or any equivalent forward-looking framing are FORBIDDEN in strand_lede — including in subordinate clauses appended to a descriptive sentence. recommendations_lede is PRESCRIPTIVE: that is the only field where forward-looking "what to do next" framing belongs. Never blur the two.`;

/** Sub-strand slug → human-readable label, mirroring the `name` column in
 *  supabase/migrations/...seed_v2026_taxonomy.sql. Local to prompt.ts so the
 *  narration's display surface stays decoupled from the report contract
 *  (ReportContent still carries slug-only Strand values). If a future
 *  sub-strand is added to the V2026 enum, TypeScript will flag a missing
 *  key here. */
const SUB_STRAND_LABELS: Record<Strand, string> = {
  whole_numbers: "Whole Numbers",
  fractions: "Fractions",
  decimals: "Decimals",
  money: "Money",
  percentage: "Percentage",
  rate: "Rate",
  ratio: "Ratio",
  algebra: "Algebra",
  measurement: "Measurement",
  geometry: "Geometry",
  area_volume: "Area and Volume",
  data_representation: "Data Representation and Interpretation",
};

/** Strip the trailing half-level letter (e.g. "3A" → "3", "0b" → "0") from a
 *  formatted placement string. The taxonomy uses A/B at most levels and adds C
 *  at L0; the matcher accepts any trailing letter to stay forward-compatible. */
function stripHalfLevel(samLevel: string): string {
  return samLevel.replace(/[A-Za-z]$/, "");
}

export interface PromptBundle {
  system: string;
  prompt: string;
}

export function buildNarrationPrompt(content: ReportContent): PromptBundle {
  const { child, placement, strand_mastery, misconceptions, recommendations } =
    content;

  const strandLines = strand_mastery
    .map(
      (s) => `- ${SUB_STRAND_LABELS[s.strand]}: ${s.percentage}% (${s.band})`,
    )
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
      ? `RECOMMENDATIONS (suggested next steps — presented in display order, NOT ranked by priority or impact)\n${recommendations
          .map((r) => `- ${r.strand} @ ${r.level}: ${r.primary}`)
          .join("\n")}`
      : `RECOMMENDATIONS\nnone on this report.`;

  const prompt = `CHILD
Display name: ${child.display_name}
Grade: ${child.grade_label}

PLACEMENT
${stripHalfLevel(placement.sam_level)} (overall ${placement.overall_percentage}%, tier ${placement.tier})

STRAND PERFORMANCE
${strandLines}

${misconceptionsBlock}

${recommendationsBlock}

Now produce the JSON.`;

  return { system: SYSTEM, prompt };
}
