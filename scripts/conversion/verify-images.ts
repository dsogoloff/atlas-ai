// Atlas Assessment — activation-image bucket AUDIT (no upload).
//
// One command, one verdict. Run anytime AFTER `supabase db reset` + the uploader to
// confirm every is_active image row actually has its file in the private
// `question-images` bucket. Derives the required set from supabase/seed.sql (the DB
// source of truth) and re-lists the bucket; prints per-folder expected-vs-present
// counts and names any 500-risk row (active but no file). Exits non-zero on FAIL.
//
// Run: pnpm convert:verify-images
//   (--check skips Supabase and only checks map + source-on-disk, like the uploader.)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import {
  BUCKET,
  REPO_ROOT,
  activeImagePaths,
  resolveEntries,
  missingSources,
  fmtCounts,
  auditBucket,
  printVerdict,
} from "./activation-image-set";

function loadEnvFile(): void {
  const candidate = process.env.ENV_FILE ?? path.join(REPO_ROOT, ".env.local");
  if (!existsSync(candidate)) return;
  for (const raw of readFileSync(candidate, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

async function main(): Promise<void> {
  const required = activeImagePaths();
  const entries = resolveEntries(required); // throws loud on unmapped active keys
  process.stdout.write("[verify-images] active image rows derived from supabase/seed.sql\n");
  process.stdout.write(`  required: ${fmtCounts(required)}\n`);

  if (process.argv.includes("--check")) {
    const missing = await missingSources(entries);
    if (missing.length > 0) {
      process.stderr.write(`\nFAIL — ${String(missing.length)} source(s) missing on disk:\n` + missing.map((s) => `  - ${s}`).join("\n") + "\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write("\nPASS (--check) — every active image_path is mapped and its source exists on disk.\n");
    return;
  }

  loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not set (env or .env.local). Set it and re-run, or use --check.");
  }
  if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_NONLOCAL !== "true") {
    throw new Error(`Refusing non-local SUPABASE_URL (${url}); set ALLOW_NONLOCAL=true for a reviewed prod audit.`);
  }
  process.stdout.write(`  target ${url} | bucket ${BUCKET}\n`);
  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;

  const audit = await auditBucket(supabase, required);
  const pass = printVerdict(audit);
  if (!pass) {
    process.exitCode = 1;
    return;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[verify-images] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
