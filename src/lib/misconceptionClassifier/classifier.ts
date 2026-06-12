// Atlas Assessment — top-level misconception classifier router.
//
// Single public entrypoint. Routes per the locked decisions in Item #9:
//
//   * is_correct  → method='none' (R2 lock — only run on incorrect)
//   * DRAG_DROP   → method='none' (R1 lock — DD detection deferred to v1.x)
//   * MULTIPLE_CHOICE with distractor map hit → method='distractor-map'
//   * MULTIPLE_CHOICE without map / NUMERIC_ENTRY / TEXT_ENTRY → Haiku
//     (live or stub)
//
// Failure-soft mode (S2 lock): the router NEVER throws to the caller.
// If the Haiku branch fails (taxonomy load error, prompt build error,
// LLM call error, or anything else), classify() catches and returns
// { codes: [], method: 'failed', version: null }. The handler (Phase 3)
// writes the failure to the row and continues; one classification miss
// never blocks the response insert.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { extractFromContent } from "./distractorMap";
import { callHaiku } from "./llmClient";
import { PROMPT_VERSION } from "./prompt";
import { isMathSafeAnswer } from "./sanitizer";
import { loadTaxonomy } from "./taxonomy";
import type { ClassifierInput, ClassifierOutput } from "./types";

export async function classify(
  input: ClassifierInput,
  serviceClient: SupabaseClient<Database>,
  tenantId: string,
): Promise<ClassifierOutput> {
  // R2: only run on incorrect responses.
  if (input.isCorrect) {
    return { codes: [], method: "none", version: null };
  }

  // R1: DRAG_DROP not supported by v1 classifier.
  if (input.format === "DRAG_DROP") {
    return { codes: [], method: "none", version: null };
  }

  // MULTIPLE_CHOICE: try distractor map first; fall through to Haiku
  // if no code surfaces.
  if (input.format === "MULTIPLE_CHOICE") {
    const codes = extractFromContent(
      input.format,
      input.content,
      input.answerGiven,
    );
    if (codes.length > 0) {
      return {
        codes,
        method: "distractor-map",
        version: PROMPT_VERSION,
      };
    }
    // Fall through — content has no map, or the answer didn't match
    // a tagged distractor. Haiku is the catch-all.
  }

  // Data-minimization gate (audit Lane 3): for free-text TEXT_ENTRY answers,
  // refuse to send anything that is not a math-shaped answer to the model.
  // A free-text answer that looks like a NAME or EMAIL (e.g. "John Smith",
  // "kid@example.com") must NEVER reach the Anthropic prompt. Non-conforming
  // input skips the LLM entirely and returns the same "no misconception"
  // shape the router uses elsewhere (fail-soft, no API call).
  // MULTIPLE_CHOICE / NUMERIC_ENTRY answers are an option index or a numeric
  // value, not free text, so they keep their existing path.
  if (input.format === "TEXT_ENTRY" && !isMathSafeAnswer(input.answerGiven)) {
    return { codes: [], method: "none", version: null };
  }

  // Haiku branch (NE / TE, or MC fallback). Wrap in try/catch so any failure
  // (taxonomy load, prompt build, LLM call) resolves to method='failed'.
  try {
    const taxonomy = await loadTaxonomy(serviceClient, tenantId);
    return await callHaiku(input, taxonomy);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[classifier] haiku branch failed", { error: msg });
    return { codes: [], method: "failed", version: null };
  }
}
