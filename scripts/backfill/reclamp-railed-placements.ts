// Atlas Assessment — ONE-TIME BACKFILL: re-clamp railed placements (pre-#206).
//
// ===========================================================================
// REVIEW ONLY. THIS HAS NOT BEEN RUN — not against prod, not against local.
// ===========================================================================
//
// WHAT THIS FIXES
//   Before PR #206, `clampPlacementToServedCeiling` was not applied at session
//   finalization. An all-correct, floor-only run leaves the posterior flat-high
//   with no ceiling evidence, so the estimator's argmax rails to the top of the
//   axis (8B). Concretely: session a28f0c2a is a Pre-K child served ten 0A
//   items, all correct, and STORED as 8B — "S.A.M Level 8" on the report and
//   the admin roster. A child cannot be placed above the hardest level they
//   were actually shown.
//
//   #206 fixed the SOURCE. Sessions finalized before it still carry the railed
//   value in assessment_sessions.current_estimate. This script floors those
//   stored values to the highest level actually served, using the SAME function
//   the live path now uses (src/lib/responseSubmit/clampPlacement.ts) — not a
//   re-implementation that could drift from it.
//
// WHAT IT TOUCHES
//   assessment_sessions.current_estimate.overall_level — and nothing else.
//   strand_levels and confidence are carried through byte-for-byte, matching
//   the live clamp, which also only bounds the overall level. No other table,
//   column, or row is written.
//
// SAFETY MODEL
//   * DRY RUN BY DEFAULT. With no flags it reads, prints a per-session diff
//     table, and writes nothing. This is the intended review mode.
//   * Writing needs TWO explicit flags: --apply --confirm. One is a typo; two
//     is a decision.
//   * Target is explicit: --target=local (default) or --target=prod. `prod`
//     additionally requires credentials from the gitignored .env.prod.local
//     (same gate as the prod bank loader) and refuses to run if the resolved
//     URL looks local.
//   * READ-CHECKED. Every candidate is verified before it is counted:
//       - the session is COMPLETED,
//       - current_estimate parses as a PlacementEstimateJson,
//       - the session has at least one answered response (never clamp on an
//         empty served set — the clamp itself no-ops there, but a session with
//         no responses is a data anomaly worth surfacing, not silently fixing),
//       - every served question resolves to a row with a non-null level,
//       - and the proposed value is a FIXED POINT: re-clamping the new estimate
//         yields the same level. A non-idempotent result means the assumptions
//         are wrong and the row is reported as SKIPPED, never written.
//   * Re-runnable: already-correct sessions are no-ops, so a second run after a
//     partial failure converges.
//
// RUN (review):
//   pnpm backfill:reclamp:dry                 # local target, read-only
//   pnpm backfill:reclamp:dry -- --target=prod  # prod READ-ONLY, needs .env.prod.local
//   pnpm backfill:reclamp:dry -- --session=a28f0c2a-…   # single session
//
// RUN (founder-gated, later):
//   pnpm backfill:reclamp -- --target=prod --apply --confirm

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { clampPlacementToServedCeiling } from "../../src/lib/responseSubmit/clampPlacement";
import {
  fromPlacementEstimateJson,
  isPlacementEstimateJson,
  toPlacementEstimateJson,
} from "../../src/lib/responseSubmit/types";
import type { Database } from "../../src/lib/supabase/database.types";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LOCAL_DEFAULT_URL = "http://127.0.0.1:54321";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface Args {
  target: "local" | "prod";
  apply: boolean;
  confirm: boolean;
  sessionId: string | null;
}

function parseArgs(argv: string[]): Args {
  const has = (f: string) => argv.includes(f);
  const value = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };

  const rawTarget = value("target") ?? "local";
  if (rawTarget !== "local" && rawTarget !== "prod") {
    throw new Error(`--target must be 'local' or 'prod' (got '${rawTarget}')`);
  }

  return {
    target: rawTarget,
    apply: has("--apply"),
    confirm: has("--confirm"),
    sessionId: value("session"),
  };
}

// ---------------------------------------------------------------------------
// Credentials — parse the env file directly, never mutate process.env
// ---------------------------------------------------------------------------

function parseEnvFile(fileName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(REPO_ROOT, fileName);
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function makeClient(target: Args["target"]): {
  client: SupabaseClient<Database>;
  url: string;
} {
  const envFile = target === "prod" ? ".env.prod.local" : ".env.local";
  const env = parseEnvFile(envFile);
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ?? (target === "local" ? LOCAL_DEFAULT_URL : "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url) throw new Error(`${envFile}: NEXT_PUBLIC_SUPABASE_URL is missing`);
  if (!key) throw new Error(`${envFile}: SUPABASE_SERVICE_ROLE_KEY is missing`);

  const looksLocal = /(127\.0\.0\.1|localhost)/.test(url);
  if (target === "prod" && looksLocal) {
    throw new Error(`--target=prod but ${envFile} resolves to a LOCAL url: ${url}`);
  }
  if (target === "local" && !looksLocal) {
    throw new Error(
      `--target=local but ${envFile} resolves to a NON-local url: ${url}. ` +
        `Refusing — pass --target=prod deliberately if that is what you mean.`,
    );
  }

  return {
    client: createClient<Database>(url, key, { auth: { persistSession: false } }),
    url,
  };
}

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

type Verdict = "would-reclamp" | "already-correct" | "skipped";

interface Row {
  sessionId: string;
  childId: string;
  verdict: Verdict;
  storedLevel: string | null;
  proposedLevel: string | null;
  servedCount: number;
  /** Distinct served levels, low → high, e.g. "0A x10". */
  servedSummary: string;
  note: string;
}

function fail<T>(
  res: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}

async function inspectSession(
  client: SupabaseClient<Database>,
  session: {
    id: string;
    child_id: string;
    status: string;
    current_estimate: unknown;
  },
): Promise<Row> {
  const base: Row = {
    sessionId: session.id,
    childId: session.child_id,
    verdict: "skipped",
    storedLevel: null,
    proposedLevel: null,
    servedCount: 0,
    servedSummary: "—",
    note: "",
  };

  if (session.status !== "COMPLETED") {
    return { ...base, note: `status=${session.status} (not COMPLETED)` };
  }
  if (!isPlacementEstimateJson(session.current_estimate)) {
    return { ...base, note: "current_estimate missing or not a placement" };
  }

  const stored = fromPlacementEstimateJson(session.current_estimate);

  // Served set = the questions the child actually ANSWERED, which is what the
  // live path's engine state carries into the clamp.
  const responses = fail(
    await client.from("responses").select("question_id").eq("session_id", session.id),
    `read responses for ${session.id}`,
  ) as Array<{ question_id: string }>;

  const servedIds = [...new Set(responses.map((r) => r.question_id))];
  if (servedIds.length === 0) {
    return {
      ...base,
      storedLevel: stored.overallLevel,
      note: "no responses on a COMPLETED session — investigate, not clamped",
    };
  }

  const questions = fail(
    await client.from("questions").select("id, level").in("id", servedIds),
    `read served questions for ${session.id}`,
  ) as Array<{ id: string; level: string | null }>;

  const missing = servedIds.length - questions.length;
  const unlevelled = questions.filter((q) => !q.level).length;
  if (missing > 0 || unlevelled > 0) {
    return {
      ...base,
      storedLevel: stored.overallLevel,
      servedCount: servedIds.length,
      note: `${missing} served question(s) not found, ${unlevelled} with no level — cannot establish a ceiling`,
    };
  }

  const counts = new Map<string, number>();
  for (const q of questions) {
    counts.set(q.level!, (counts.get(q.level!) ?? 0) + 1);
  }
  const servedSummary = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([level, n]) => `${level} x${n}`)
    .join(", ");

  const clamped = await clampPlacementToServedCeiling(client, servedIds, stored);

  if (clamped.overallLevel === stored.overallLevel) {
    return {
      ...base,
      verdict: "already-correct",
      storedLevel: stored.overallLevel,
      proposedLevel: stored.overallLevel,
      servedCount: servedIds.length,
      servedSummary,
      note: "at or below the served ceiling",
    };
  }

  // READ-CHECK: the proposed value must be a fixed point. If re-clamping the
  // clamped estimate moves it again, our assumptions are wrong — skip the row.
  const recheck = await clampPlacementToServedCeiling(client, servedIds, clamped);
  if (recheck.overallLevel !== clamped.overallLevel) {
    return {
      ...base,
      storedLevel: stored.overallLevel,
      servedCount: servedIds.length,
      servedSummary,
      note: `NOT IDEMPOTENT (${clamped.overallLevel} -> ${recheck.overallLevel}) — refusing`,
    };
  }

  return {
    ...base,
    verdict: "would-reclamp",
    storedLevel: stored.overallLevel,
    proposedLevel: clamped.overallLevel,
    servedCount: servedIds.length,
    servedSummary,
    note: "stored level is above the served ceiling",
  };
}

/** Write ONLY current_estimate, preserving strand_levels + confidence. */
async function applyReclamp(
  client: SupabaseClient<Database>,
  sessionId: string,
  currentEstimate: unknown,
  newLevel: string,
): Promise<void> {
  if (!isPlacementEstimateJson(currentEstimate)) {
    throw new Error(`${sessionId}: estimate stopped parsing between read and write`);
  }
  const next = toPlacementEstimateJson({
    ...fromPlacementEstimateJson(currentEstimate),
    overallLevel: newLevel as ReturnType<
      typeof fromPlacementEstimateJson
    >["overallLevel"],
  });

  const { error } = await client
    .from("assessment_sessions")
    // Guarded: only a session still holding the railed value is updated, so a
    // concurrent/second run cannot overwrite a corrected row.
    .update({ current_estimate: next as never })
    .eq("id", sessionId)
    .eq("status", "COMPLETED");

  if (error) throw new Error(`${sessionId}: update failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const willWrite = args.apply && args.confirm;

  if (args.apply && !args.confirm) {
    throw new Error(
      "--apply requires --confirm. Re-run with both flags once the founder has " +
        "reviewed the dry-run table.",
    );
  }

  const { client, url } = makeClient(args.target);

  console.log("");
  console.log("=".repeat(78));
  console.log(`  RE-CLAMP RAILED PLACEMENTS — ${args.target.toUpperCase()}`);
  console.log(`  target : ${url}`);
  console.log(`  mode   : ${willWrite ? "!!! LIVE WRITE !!!" : "DRY RUN (no writes)"}`);
  if (args.sessionId) console.log(`  session: ${args.sessionId}`);
  console.log("=".repeat(78));
  console.log("");

  let query = client
    .from("assessment_sessions")
    .select("id, child_id, status, current_estimate")
    .eq("status", "COMPLETED")
    .not("current_estimate", "is", null);
  if (args.sessionId) query = query.eq("id", args.sessionId);

  const sessions = fail(await query, "read completed sessions") as Array<{
    id: string;
    child_id: string;
    status: string;
    current_estimate: unknown;
  }>;

  console.log(`Completed sessions with a stored estimate: ${sessions.length}`);
  console.log("");

  const rows: Row[] = [];
  for (const session of sessions) {
    rows.push(await inspectSession(client, session));
  }

  const toFix = rows.filter((r) => r.verdict === "would-reclamp");
  const ok = rows.filter((r) => r.verdict === "already-correct");
  const skipped = rows.filter((r) => r.verdict === "skipped");

  if (toFix.length > 0) {
    console.log(`WOULD RE-CLAMP (${toFix.length}):`);
    console.log("");
    for (const r of toFix) {
      console.log(`  session ${r.sessionId}`);
      console.log(`    child          ${r.childId}`);
      console.log(`    stored level   ${r.storedLevel}   <- railed`);
      console.log(`    proposed level ${r.proposedLevel}   <- highest level served`);
      console.log(`    served         ${r.servedCount} item(s): ${r.servedSummary}`);
      console.log("");
    }
  } else {
    console.log("WOULD RE-CLAMP: none — every stored level is at or below its ceiling.");
    console.log("");
  }

  if (skipped.length > 0) {
    console.log(`SKIPPED — read-check failed (${skipped.length}), NOT written:`);
    for (const r of skipped) {
      console.log(`  ${r.sessionId}  ${r.note}`);
    }
    console.log("");
  }

  console.log("-".repeat(78));
  console.log(
    `SUMMARY  would re-clamp: ${toFix.length}   already correct: ${ok.length}   skipped: ${skipped.length}`,
  );
  console.log("-".repeat(78));
  console.log("");

  if (!willWrite) {
    console.log("DRY RUN — nothing was written.");
    console.log("To apply (after founder review): --apply --confirm");
    return;
  }

  console.log(`Applying ${toFix.length} update(s)...`);
  let applied = 0;
  for (const r of toFix) {
    const session = sessions.find((s) => s.id === r.sessionId)!;
    await applyReclamp(client, r.sessionId, session.current_estimate, r.proposedLevel!);
    applied++;
    console.log(`  ${r.sessionId}: ${r.storedLevel} -> ${r.proposedLevel}`);
  }
  console.log("");
  console.log(`Done. ${applied} session(s) updated.`);
  console.log(
    "NOTE: report narration prose generated BEFORE this run may still quote the " +
      "old level — regenerate narrations for the affected sessions if they have " +
      "already been shown to a parent.",
  );
}

main().catch((e: unknown) => {
  console.error("");
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
