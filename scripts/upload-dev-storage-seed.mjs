#!/usr/bin/env node
// Atlas Assessment — local-dev storage-seed upload script.
//
// Uploads every file under supabase/storage-seed/<bucket>/ into the
// matching Supabase Storage bucket using the service_role key. Idempotent:
// re-running replaces (upsert) the file in-place — no manual cleanup
// between runs.
//
// When to run:
//   1. After the first `supabase stop && supabase start` that brings up
//      the storage container (per AGENTS.md §11 — db reset alone won't
//      start storage).
//   2. After any change to supabase/storage-seed/ contents.
//   3. Generally not needed after `supabase db reset` unless storage
//      data was wiped (depends on Supabase CLI behavior — re-run if
//      visual gate shows broken images).
//
// Usage:
//   pnpm storage:seed
//
// Env vars (loaded from .env.local at the project root if present;
// existing process.env values take precedence):
//   * SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
//                                   — e.g. http://127.0.0.1:54321
//   * SUPABASE_SERVICE_ROLE_KEY     — service-role JWT printed by
//                                     `supabase start` / available
//                                     via `supabase status`
//
// Note: this script is for LOCAL DEV ONLY. Production storage seeds
// (the real S.A.M. content) load via a separate gated import (per
// architecture.md decision #5 + seed.sql header comment). Do not
// repurpose this script for prod uploads.

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(SCRIPT_DIR, "..");
const SEED_ROOT = join(PROJECT_ROOT, "supabase/storage-seed");

// Minimal .env.local loader — Next.js convention, no dotenv dep.
// Existing process.env values win (matches the dotenv default).
async function loadEnvLocal() {
  const envPath = join(PROJECT_ROOT, ".env.local");
  let raw;
  try {
    raw = await readFile(envPath, "utf8");
  } catch {
    return; // .env.local optional; vars may already be in env
  }
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const MIME_BY_EXT = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function mimeFor(path) {
  const lower = path.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  return MIME_BY_EXT[ext];
}

async function walk(dir) {
  const entries = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) {
      entries.push(...(await walk(full)));
    } else {
      entries.push(full);
    }
  }
  return entries;
}

async function main() {
  await loadEnvLocal();
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[upload-dev-storage-seed] missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
    console.error(
      "[upload-dev-storage-seed] run `supabase status` to see the local values, then export them or write to .env.local at the project root",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seedDir = SEED_ROOT;
  let seedExists;
  try {
    seedExists = (await stat(seedDir)).isDirectory();
  } catch {
    seedExists = false;
  }
  if (!seedExists) {
    console.log(
      `[upload-dev-storage-seed] no ${seedDir} directory; nothing to upload`,
    );
    return;
  }

  const bucketDirs = await readdir(seedDir);
  let totalUploaded = 0;
  let totalSkipped = 0;

  for (const bucket of bucketDirs) {
    const bucketDir = join(seedDir, bucket);
    const s = await stat(bucketDir);
    if (!s.isDirectory()) continue;

    const files = await walk(bucketDir);
    if (files.length === 0) {
      console.log(`[upload-dev-storage-seed] ${bucket}: no files to upload`);
      continue;
    }

    console.log(`[upload-dev-storage-seed] ${bucket}: ${files.length} file(s)`);
    for (const file of files) {
      const objectPath = relative(bucketDir, file).split(/[\\/]/).join("/");
      const mime = mimeFor(file);
      if (!mime) {
        console.warn(
          `[upload-dev-storage-seed]   SKIP ${objectPath} (unrecognised extension)`,
        );
        totalSkipped++;
        continue;
      }
      const bytes = await readFile(file);
      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, bytes, {
          contentType: mime,
          upsert: true,
        });
      if (error) {
        console.error(
          `[upload-dev-storage-seed]   FAIL ${objectPath}: ${error.message}`,
        );
        process.exitCode = 1;
        continue;
      }
      console.log(`[upload-dev-storage-seed]   OK   ${objectPath} (${mime})`);
      totalUploaded++;
    }
  }

  console.log(
    `[upload-dev-storage-seed] done: ${totalUploaded} uploaded, ${totalSkipped} skipped`,
  );
}

main().catch((e) => {
  console.error("[upload-dev-storage-seed] unhandled error", e);
  process.exit(1);
});
