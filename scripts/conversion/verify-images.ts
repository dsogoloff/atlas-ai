// Atlas Assessment — activation-image bucket AUDIT (no upload).
//
// One command, one verdict. Run anytime AFTER `supabase db reset` + the uploader to
// confirm every is_active image row actually has its file in the private
// `question-images` bucket. The required set is derived from RUNTIME TRUTH — every active
// row's actual content in the DB (top-level image_path + per-tile), exactly what the app
// mints at serve time (see ./minted-image-paths.ts) — NOT from seed text. It re-lists the
// bucket; prints per-folder expected-vs-present counts and names any 500-risk row (active
// but no file). Exits non-zero on FAIL.
//
// Run: pnpm convert:verify-images
//   (--check is OFFLINE: validates the full SOURCE_MAP against disk only, no DB/Supabase.)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  // --check: OFFLINE — required set is DB-derived (needs a connection), so the only
  // meaningful offline guarantee is that every mapped source crop exists on disk.
  if (process.argv.includes("--check")) {
    const allEntries: Entry[] = Object.entries(SOURCE_MAP).map(([bucket, source]) => ({ bucket, source }));
    process.stdout.write(`[verify-images] --check (offline): SOURCE_MAP coverage ${fmtCounts(Object.keys(SOURCE_MAP))}\n`);
    const missing = await missingSources(allEntries);
    if (missing.length > 0) {
      process.stderr.write(`\nFAIL — ${String(missing.length)} SOURCE_MAP source(s) missing on disk:\n` + missing.map((s) => `  - ${s}`).join("\n") + "\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`\nPASS (--check) — all ${String(allEntries.length)} SOURCE_MAP source files present on disk.\n`);
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
  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;

  const required = await requiredImagePaths(supabase);
  resolveEntries(required); // throws loud on unmapped active keys
  process.stdout.write("[verify-images] active image rows derived from the DB (runtime truth)\n");
  process.stdout.write(`  required: ${fmtCounts(required)}\n  target ${url} | bucket ${BUCKET}\n`);

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
