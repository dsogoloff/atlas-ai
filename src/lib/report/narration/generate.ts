// Atlas Assessment — report narration generation orchestrator.
//
// Reads a ReportContent, builds the Sonnet prompt via ./prompt, calls
// Sonnet via ./llmClient, defensively strips markdown code fences if the
// model wrapped its output, JSON-parses the response, runs the Piece 3
// schema gate via ./validate, and assembles a ReportNarration.
//
// Failure classes:
//   * Validation failure (parse succeeded but shape is invalid — missing
//     field, wrong type, empty after trim, over-length): RESOLVES to a
//     status:'failed' ReportNarration with all four prose fields absent.
//     This is the DESIGNED degraded path — the report renderer falls back
//     to data-only output per surface.
//   * JSON.parse error: THROWS — caller handles (different failure class,
//     e.g. fenced output the strip missed, or the model emitting non-JSON
//     entirely). callSonnet failures (network, API, timeout) also throw.

import type { ReportContent, ReportNarration } from "@/lib/report/types";

import { callSonnet } from "./llmClient";
import { buildNarrationPrompt } from "./prompt";
import { validateNarration } from "./validate";

/** Defensively strip a single outer markdown code fence pair from the model
 *  output. The system prompt instructs JSON-only, but models occasionally
 *  wrap output in ```json ... ``` or ``` ... ``` despite explicit
 *  instructions. Strip then JSON.parse. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function generateReportNarration(
  content: ReportContent,
): Promise<ReportNarration> {
  const { system, prompt } = buildNarrationPrompt(content);
  const result = await callSonnet(system, prompt);

  // JSON.parse throws on malformed JSON — let it propagate (caller's job).
  // Successful parse but shape-invalid falls through to the validation gate.
  const parsed: unknown = JSON.parse(stripFences(result.text));

  const validation = validateNarration(parsed);
  if (!validation.valid) {
    return {
      session_id: content.session_id,
      tenant_id: content.tenant_id,
      generated_at: new Date().toISOString(),
      model: result.model,
      status: "failed",
    };
  }

  // Strand-fabrication guard (BUSINESS_RULES "Claims & language" / strategy
  // §2.4): narration must NOT assert specific strand strengths/weaknesses when
  // there is no measured strand-level data. The voice-locked prompt's HARD
  // RULE still demands strand_lede name specific sub-strands, so on a thin /
  // no-data session (every sub-strand band === "no_data", i.e. total === 0)
  // the model can only fabricate them. We suppress those data-dependent fields
  // here, deterministically — strand_lede drops to a data-only render and
  // strengths (which are inherently per-sub-strand claims) clear to empty.
  // growth_areas survive: they are misconception-derived response patterns,
  // not strand-mastery claims. This is a data-path guard, NOT a voice change.
  const hasStrandData = content.strand_mastery.some((s) => s.total > 0);
  const prose = validation.prose;

  return {
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model: result.model,
    status: "ok",
    placement_line: prose.placement_line,
    strand_lede: hasStrandData ? prose.strand_lede : undefined,
    key_findings: {
      strengths: hasStrandData ? prose.key_findings.strengths : [],
      growth_areas: prose.key_findings.growth_areas,
    },
    recommendations_lede: prose.recommendations_lede,
  };
}
