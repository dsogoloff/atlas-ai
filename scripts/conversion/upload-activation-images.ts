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
//   pnpm convert:upload-activation-images          upload + post-upload audit gate
//   pnpm convert:upload-activation-images --check  derive + map/disk pre-flight only (no Supabase)
// Audit-only (anytime after reset+upload): pnpm convert:verify-images

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  BUCKET,
  REPO_ROOT,
  type Entry,
  SOURCE_MAP,
  activeImagePaths,
  resolveEntries,
  missingSources,
  fmtCounts,
  auditBucket,
  printVerdict,
} from "./activation-image-set";

/** Minimal dotenv loader (no dependency): only fills keys not already in env. */
function loadEnvFile(): string | null {
  const candidate = process.env.ENV_FILE ?? path.join(REPO_ROOT, ".env.local");
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

  // --- Derive the required set from the DB source of truth ------------------
  const required = activeImagePaths();
  const entries = resolveEntries(required); // throws loud on unmapped active keys

  process.stdout.write("[upload-activation-images] derived from supabase/seed.sql\n");
  process.stdout.write(`  required (active image rows): ${fmtCounts(required)}\n`);
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

  if (checkOnly) {
    const allEntries: Entry[] = Object.entries(SOURCE_MAP).map(([bucket, source]) => ({ bucket, source }));
    const missingAll = await missingSources(allEntries);
    if (missingAll.length > 0) {
      process.stderr.write(
        `\nWARNING — ${String(missingAll.length)} SOURCE_MAP source(s) missing on disk (will fail when their rows activate):\n` +
          missingAll.map((s) => `  - ${s}`).join("\n") + "\n",
      );
    } else {
      process.stdout.write(`  full SOURCE_MAP: all ${String(allEntries.length)} source files present on disk.\n`);
    }
    process.stdout.write("\nPASS (--check) — every active image_path is mapped and its source exists on disk.\n");
    return;
  }

  // --- Connect ------------------------------------------------------------
  const envFile = loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set (env or .env.local). Set it and re-run, or use --check.");
  }
  if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_NONLOCAL !== "true") {
    throw new Error(
      `Refusing non-local SUPABASE_URL (${url}). LOCAL QA uploader; set ALLOW_NONLOCAL=true for a reviewed prod run.`,
    );
  }
  process.stdout.write(`\n[upload-activation-images] target ${url} | bucket ${BUCKET} | env ${envFile ?? "(process env)"}\n`);
  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;

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
