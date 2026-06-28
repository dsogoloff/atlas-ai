// Atlas Assessment — purge stray full-page renders under the `conversion-staging/` bucket
// prefix (FOUNDER-run; touches the private question-images bucket).
//
// WHY: a Stage-4 exploration run auto-staged ~15 whole-page worksheet renders to
// `question-images/conversion-staging/` (the loader stages whole-page renders when Supabase
// creds are present). These are NOT served to children (served images come from l5/, l6/, …
// keys) — benign, but the founder asked to purge them. They are bucket objects, not repo
// files, so they can only be removed against a live Supabase project.
//
// Run (founder machine, with .env.local / service-role key):
//   pnpm convert:purge-staging          DRY RUN — list what would be deleted, delete nothing
//   pnpm convert:purge-staging --apply  actually delete every object under conversion-staging/
// Defaults to the LOCAL stack; set ALLOW_NONLOCAL=true for a reviewed prod run.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { BUCKET, REPO_ROOT } from "./activation-image-set";

const PREFIX = "conversion-staging";

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return candidate;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const envFile = loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set (env or .env.local).");
  if (!/127\.0\.0\.1|localhost/.test(url) && process.env.ALLOW_NONLOCAL !== "true") {
    throw new Error(`Refusing non-local SUPABASE_URL (${url}). Set ALLOW_NONLOCAL=true for a reviewed prod run.`);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;
  process.stdout.write(`[purge-staging] target ${url} | bucket ${BUCKET}/${PREFIX}/ | env ${envFile ?? "(process env)"}\n`);

  const { data, error } = await supabase.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
  if (error) throw new Error(`list("${PREFIX}") failed: ${error.message}`);
  const objects = (data ?? []).filter((o) => o.id !== null); // skip folder placeholders
  if (objects.length === 0) {
    process.stdout.write(`Nothing to purge — ${PREFIX}/ is empty (or already cleared).\n`);
    return;
  }

  const keys = objects.map((o) => `${PREFIX}/${o.name}`);
  process.stdout.write(`\nFound ${String(keys.length)} object(s) under ${PREFIX}/:\n` + keys.map((k) => `  - ${k}`).join("\n") + "\n");

  if (!apply) {
    process.stdout.write("\nDRY RUN — nothing deleted. Re-run with --apply to remove these.\n");
    return;
  }

  const { error: delErr } = await supabase.storage.from(BUCKET).remove(keys);
  if (delErr) throw new Error(`remove failed: ${delErr.message}`);
  process.stdout.write(`\nDeleted ${String(keys.length)} object(s) under ${PREFIX}/.\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`[purge-staging] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
