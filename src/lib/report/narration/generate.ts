// Atlas Assessment — report narration generation orchestrator.
//
// Reads a ReportContent, builds the Sonnet prompt via ./prompt, calls
// Sonnet via ./llmClient, defensively strips markdown code fences if the
// model wrapped its output, JSON-parses the response, and assembles a
// ReportNarration.
//
// No schema validation here beyond JSON.parse success — that is Piece 3
// (the schema gate). The deliberate sequence is generate -> validate ->
// gate: keeping the parse-vs-validate split testable means a malformed
// generation surfaces as a typed value Piece 3 can reject cleanly, rather
// than as an exception thrown deep inside the SDK.
//
// Error modes:
//   * JSON.parse failure throws — caller / Piece 3 catches and writes
//     status='failed' on the report_narrations row.
//   * callSonnet's throw on persistent live-mode failure propagates.

import type { ReportContent, ReportNarration } from "@/lib/report/types";

import { callSonnet } from "./llmClient";
import { buildNarrationPrompt } from "./prompt";

/** Defensively strip markdown code fences from the model output. The
 *  system prompt instructs JSON-only, but real models occasionally wrap
 *  output in ```json ... ``` or ``` ... ``` despite explicit instructions.
 *  Strip a single outer fence pair if present before JSON.parse. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

interface ParsedNarrationFields {
  placement_line?: string;
  strand_lede?: string;
  misconceptions_lede?: string;
  recommendations_lede?: string;
}

export async function generateReportNarration(
  content: ReportContent,
): Promise<ReportNarration> {
  const { system, prompt } = buildNarrationPrompt(content);
  const result = await callSonnet(system, prompt);

  const parsed = JSON.parse(stripFences(result.text)) as ParsedNarrationFields;

  return {
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model: result.model,
    status: "ok",
    placement_line: parsed.placement_line,
    strand_lede: parsed.strand_lede,
    misconceptions_lede: parsed.misconceptions_lede,
    recommendations_lede: parsed.recommendations_lede,
  };
}
