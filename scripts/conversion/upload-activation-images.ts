// Atlas Assessment — activation-image uploader (DERIVED from the active rows).
//
// ROOT-FIX (was: a hand-maintained MANIFEST that silently drifted out of sync with the
// DB, so l3/l4 + taxonomy activation rows were active with image_path set but their
// files were never uploaded -> 500 at serve). The upload set is now DERIVED from the
// source of truth: every `"image_path"` referenced by an activated row in
// supabase/seed.sql (see scripts/conversion/activation-image-set.ts). The bucket-key
// -> source-file resolution lives in SOURCE_MAP there.
//
// Guarantees (so it cannot drift again):
//   * Upload set IS the active set (derived from seed) — no active row left out.
//   * Active image_path with no SOURCE_MAP entry -> FAIL LOUD.
//   * Resolved source missing on disk -> FAIL LOUD.
//   * POST-UPLOAD HARD GATE: re-list the bucket and confirm every active row's file is
//     actually present; PASS/FAIL verdict with per-folder expected-vs-present counts;
//     exits non-zero on FAIL (this catches "upload silently no-op'd / empty bucket").
//
// Run:
//   pnpm convert:upload-activation-images          upload to LOCAL + post-upload audit gate
//   pnpm convert:upload-activation-images --check  derive + map/disk pre-flight only (no Supabase)
//   pnpm convert:upload-activation-images:prod     upload to PROD (loads .env.prod.local; --prod baked in)
// Audit-only (anytime after reset+upload): pnpm convert:verify-images
//
// TARGET SAFETY: prod is reachable ONLY via the explicit --prod flag (the
// :prod script). A default run loads .env.local and refuses any non-local URL,
// so it can never accidentally point at prod. Prod creds live ONLY in the
// gitignored .env.prod.local — never in .env.local or the repo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  BUCKET,
  REPO_ROOT,
  type Entry,
  SOURCE_MAP,
  requiredImagePaths,
  resolveEntries,
  missingSources,
  fmtCounts,
  auditBucket,
  printVerdict,
} from "./activation-image-set";

/** Minimal dotenv loader (no dependency): only fills keys not already in env. */
function loadEnvFile(fileName: string): string | null {
  const candidate = process.env.ENV_FILE ?? path.join(REPO_ROOT, fileName);
  if (!existsSync(candidate)) return null;
  for (const raw of readFileSync(candidate, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return candidate;
}

function fmtBytes(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes("--check");
  const prod = process.argv.includes("--prod");

  // --- --check: OFFLINE pre-flight (no DB) ---------------------------------
  // The required set is now derived from the DB (runtime truth), which --check has no
  // connection for. So --check validates the FULL SOURCE_MAP against disk — every mapped
  // source crop exists — which is the only meaningful offline guarantee. The active-subset
  // derivation + bucket audit happen in a real (connected) run below.
  if (checkOnly) {
    const allEntries: Entry[] = Object.entries(SOURCE_MAP).map(([bucket, source]) => ({ bucket, source }));
    process.stdout.write(`[upload-activation-images] --check (offline): SOURCE_MAP coverage ${fmtCounts(Object.keys(SOURCE_MAP))}\n`);
    const missingAll = await missingSources(allEntries);
    if (missingAll.length > 0) {
      process.stderr.write(
        `\nFAIL — ${String(missingAll.length)} SOURCE_MAP source(s) missing on disk (will 500 when their rows activate):\n` +
          missingAll.map((s) => `  - ${s}`).join("\n") + "\n",
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`\nPASS (--check) — all ${String(allEntries.length)} SOURCE_MAP source files present on disk.\n`);
    return;
  }

  // --- Connect ------------------------------------------------------------
  // Target selection is EXPLICIT. Default (no flag) loads .env.local and refuses
  // any non-local URL — so a normal run can NEVER reach prod (the default env file
  // holds no prod creds, and the guard below blocks a non-local URL regardless).
  // Prod is reachable ONLY via the explicit --prod flag, which loads the dedicated,
  // gitignored .env.prod.local (the only place prod creds live).
  const envFile = loadEnvFile(prod ? ".env.prod.local" : ".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isLocal = /127\.0\.0\.1|localhost/.test(url);
  if (!key) {
    throw new Error(
      prod
        ? "SUPABASE_SERVICE_ROLE_KEY not set — populate .env.prod.local with the prod service_role key and re-run."
        : "SUPABASE_SERVICE_ROLE_KEY not set (env or .env.local). Set it and re-run, or use --check.",
    );
  }
  if (prod) {
    // Explicit prod run: targeting prod is intended. Guard the inverse mistake —
    // --prod given but the URL is local (prod env file not populated) -> abort.
    if (isLocal) {
      throw new Error(
        `--prod given but NEXT_PUBLIC_SUPABASE_URL is local/empty (${url}). Populate .env.prod.local with the PROD url; aborting.`,
      );
    }
    process.stdout.write(`\n[upload-activation-images] *** PROD TARGET *** (--prod)\n`);
  } else if (!isLocal && process.env.ALLOW_NONLOCAL !== "true") {
    throw new Error(
      `Refusing non-local SUPABASE_URL (${url}). LOCAL QA uploader; use --prod (loads .env.prod.local) for a reviewed prod run.`,
    );
  }
  process.stdout.write(`\n[upload-activation-images] target ${url} | bucket ${BUCKET} | env ${envFile ?? "(process env)"}\n`);
  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;

  // --- Derive the required set from RUNTIME TRUTH (the DB, not seed text) ---
  // Every image the app will mint for the currently-active rows (top-level + per-tile),
  // read from the target DB itself — so it can never drift from what the runtime requests.
  const required = await requiredImagePaths(supabase);
  const entries = resolveEntries(required); // throws loud on unmapped active keys
  process.stdout.write(`[upload-activation-images] required (active, DB-derived): ${fmtCounts(required)}\n`);
  process.stdout.write(`  SOURCE_MAP coverage (superset): ${fmtCounts(Object.keys(SOURCE_MAP))}\n`);

  // --- Pre-flight: resolved sources exist on disk --------------------------
  const missing = await missingSources(entries);
  if (missing.length > 0) {
    process.stderr.write(
      `\nFAIL — ${String(missing.length)} active row(s) have no source crop on disk:\n` +
        missing.map((s) => `  - ${s}`).join("\n") + "\n",
    );
    process.exitCode = 1;
    return;
  }

  // --- Upload (upsert) -----------------------------------------------------
  process.stdout.write("\n  uploaded | size      | bucket path\n");
  for (const e of entries) {
    const buf = await readFile(e.source);
    const { error } = await supabase.storage.from(BUCKET).upload(e.bucket, buf, { upsert: true, contentType: "image/png" });
    process.stdout.write(
      `  ${error ? "NO " : "yes"}      | ${fmtBytes(buf.byteLength).padEnd(9)} | ${e.bucket}` +
        (error ? `   ERROR: ${error.message}` : "") + "\n",
    );
  }

  // --- POST-UPLOAD HARD GATE: re-list the bucket and verify presence -------
  // (Upload-call success is NOT trusted; we read back what is actually in the bucket.
  //  This catches an empty/partial bucket that the old uploader reported green.)
  const audit = await auditBucket(supabase, required);
  const pass = printVerdict(audit);
  if (!pass) {
    process.exitCode = 1;
    return;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[upload-activation-images] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
