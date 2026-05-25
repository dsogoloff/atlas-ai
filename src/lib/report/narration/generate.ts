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

  return {
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model: result.model,
    status: "ok",
    placement_line: validation.prose.placement_line,
    strand_lede: validation.prose.strand_lede,
    misconceptions_lede: validation.prose.misconceptions_lede,
    recommendations_lede: validation.prose.recommendations_lede,
  };
}
