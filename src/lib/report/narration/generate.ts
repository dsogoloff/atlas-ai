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
import {
  salvageNarration,
  validateNarration,
  type NarrationProse,
} from "./validate";

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
  const result = await callSonnet(system, prompt, content.session_id);

  const failed = (): ReportNarration => ({
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model: result.model,
    status: "failed",
  });

  // Parse defensively. A non-JSON body used to throw out of here and the
  // trigger swallowed it with NO row written — invisible. Now we log it and
  // write a status:'failed' audit row instead.
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(result.text));
  } catch {
    console.warn("[narration] model output was not valid JSON", {
      sessionId: content.session_id,
    });
    return failed();
  }

  // Strict gate first (happy path). On failure, SALVAGE field-by-field rather
  // than discarding the whole narration: the report degrades per surface, so a
  // single over-long / surplus field should drop only itself, not erase the
  // placement line, strand lede, and the rest. This is the fix for the
  // "report renders with NO narrative" regression — one bad field no longer
  // nukes everything. We log what was dropped so the cause is visible.
  let prose: Partial<NarrationProse>;
  const validation = validateNarration(parsed);
  if (validation.valid) {
    prose = validation.prose;
  } else {
    const salvaged = salvageNarration(parsed);
    if (salvaged.kept.length === 0) {
      console.warn("[narration] output unusable — no fields salvageable", {
        sessionId: content.session_id,
        dropped: salvaged.dropped,
      });
      return failed();
    }
    console.warn("[narration] partial output — salvaged valid fields", {
      sessionId: content.session_id,
      kept: salvaged.kept,
      dropped: salvaged.dropped,
    });
    prose = salvaged.prose;
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
  const kf = prose.key_findings;

  return {
    session_id: content.session_id,
    tenant_id: content.tenant_id,
    generated_at: new Date().toISOString(),
    model: result.model,
    status: "ok",
    placement_line: prose.placement_line,
    strand_lede: hasStrandData ? prose.strand_lede : undefined,
    key_findings: kf
      ? {
          strengths: hasStrandData ? kf.strengths : [],
          growth_areas: kf.growth_areas,
        }
      : undefined,
    recommendations_lede: prose.recommendations_lede,
  };
}
