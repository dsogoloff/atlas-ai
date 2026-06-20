// Atlas Assessment — manifest-driven uploader for the L0/L1/L2 activation images
// (lane/l0-l2-activation).
//
// Uploads every per-question / per-tile image referenced by the 19 activated rows
// (PR #78) plus the 5 L1 art-curation rows (migration 20260614120001) plus the 4
// SAM-L0C-Q13 day-word tiles (migration 20260618130200) plus the SAM-L0B-Q14
// sushi stimulus (migration 20260618130000) plus the 4 SAM-L0C-Q11A..D
// comparison-word tiles (migration 20260618130400) to the private
// `question-images` Supabase Storage bucket at its EXACT
// object path, so an activated image row serves its picture instead of 500-ing at
// serve (the serve-time minter throws on a missing object). Deterministic +
// idempotent (upsert) — re-runs are safe. NO Studio drag-drop.
//
// The contract is scripts/conversion/l0-l2-activation-notes.md (source PNG →
// bucket path); MANIFEST below is the machine-readable transcription of it, kept
// 1:1 with the `image_path` values in overlay/l*-activation.json. SOURCE_DIRS are
// the (untracked, licensed) crop locations; override via env if they move.
//
// TWO sections: (1) MANIFEST — 46 images (the 19 PR-#78-activated rows + the 5 l1-art-curation rows + the 4 SAM-L0C-Q13 day tiles + the SAM-L0B-Q14 sushi stimulus + the 4 SAM-L0C-Q11 comparison-word tiles); and
// (2) PREEXISTING_L2_BACKFILL — the 7 images for the ALREADY-active L2 rows whose
// files were never uploaded to local storage (they 500 at serve until present).
// Both upsert. The backfill bucket paths are the EXACT root-level keys those live
// rows reference (read from overlay/l2-authoring.json), NOT the l2/ convention.
//
// LOCAL ONLY (QA). Reads NEXT_PUBLIC_SUPABASE_URL (default the local
// http://127.0.0.1:54321) + SUPABASE_SERVICE_ROLE_KEY from the environment, or
// from a dotenv file (ENV_FILE, else <repoRoot>/.env.local). The bucket is
// private, hence the service-role key.
//
// PROD RETARGET (separate future step — NOT now): point the same script at prod
// by setting NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to the prod
// project's values (and uploading from the prod-curated source set). No code
// change is needed; only env. Do that as its own reviewed step.
//
// Run: pnpm convert:upload-activation-images

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile, stat } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

const BUCKET = "question-images";

// Untracked licensed-crop source roots (override via env if relocated).
const L0_SRC = process.env.L0_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source";
const L1_SRC = process.env.L1_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l1-art/scripts/conversion/output/l1-art";
const L2_SRC = process.env.L2_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l2/scripts/conversion/input/l2-art";
// The Q05 seashell picture-graph is GENERATED (gen_l2_q05_graph.py), not a raw crop.
const L2_GEN = process.env.L2_GEN_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l2/scripts/conversion/output/l2-art-generated";

interface ManifestEntry {
  source: string; // absolute path to the source PNG
  bucket: string; // exact object path in `question-images`
}

// 46 images: 32 for the 19 PR-#78 activation rows (overlay/l*-activation.json) + 5 for the
// L1 art-curation rows activated by migration 20260614120001 + 4 day-word tiles for
// SAM-L0C-Q13 (migration 20260618130200; gen_l0c_q13_tiles.py) + 1 sushi stimulus for
// SAM-L0B-Q14 (migration 20260618130000) + 4 comparison-word tiles for SAM-L0C-Q11A..D
// (migration 20260618130400; gen_l0c_q11_tiles.py). The Q11 number-line stimulus
// (l0/sam-l0c-q11.png) was already in the manifest and is reused by the sub-items.
const MANIFEST: ManifestEntry[] = [
  // L0A-Q08 (CLICK_IMAGE_SINGLE) — 4 object tiles
  { source: `${L0_SRC}/0a/0A-08_1.png`, bucket: "l0/sam-l0a-q08-t1.png" },
  { source: `${L0_SRC}/0a/0A-08_2.png`, bucket: "l0/sam-l0a-q08-t2.png" },
  { source: `${L0_SRC}/0a/0A-08_3.png`, bucket: "l0/sam-l0a-q08-t3.png" },
  { source: `${L0_SRC}/0a/0A-08_4.png`, bucket: "l0/sam-l0a-q08-t4.png" },
  // L0A-Q11 (CLICK_IMAGE_SINGLE) — 2 flower tiles
  { source: `${L0_SRC}/0a/0A-11_1.png`, bucket: "l0/sam-l0a-q11-t1.png" },
  { source: `${L0_SRC}/0a/0A-11_2.png`, bucket: "l0/sam-l0a-q11-t2.png" },
  // L0B-Q02 (CLICK_IMAGE_SINGLE) — 4 object tiles
  { source: `${L0_SRC}/0b/0B-02_1.png`, bucket: "l0/sam-l0b-q02-t1.png" },
  { source: `${L0_SRC}/0b/0B-02_2.png`, bucket: "l0/sam-l0b-q02-t2.png" },
  { source: `${L0_SRC}/0b/0B-02_3.png`, bucket: "l0/sam-l0b-q02-t3.png" },
  { source: `${L0_SRC}/0b/0B-02_4.png`, bucket: "l0/sam-l0b-q02-t4.png" },
  // L0B-Q14 (NUMERIC_ENTRY) — sushi tray-of-4 + box-of-6 composite stimulus
  // (Item 1, migration 20260618130000; source crop 0B-14.png).
  { source: `${L0_SRC}/0b/0B-14.png`, bucket: "l0/sam-l0b-q14.png" },
  // L0C-Q11A..D (CLICK_IMAGE_SINGLE) — shared number-line stimulus (reused by all 4 sub-items)
  { source: `${L0_SRC}/0c/0C-11.png`, bucket: "l0/sam-l0c-q11.png" },
  // L0C-Q14 (NUMERIC_ENTRY) — count-pairs stimulus
  { source: `${L0_SRC}/0c/0C-14.png`, bucket: "l0/sam-l0c-q14.png" },
  // L0C-Q13 (CLICK_IMAGE_SINGLE) — 4 day-word tiles (Defect C, migration
  // 20260618130200). GENERATED by scripts/conversion/gen_l0c_q13_tiles.py;
  // the child taps the correctly-spelled missing day (t2 = "Friday").
  { source: `${L0_SRC}/0c/sam-l0c-q13-t1.png`, bucket: "l0/sam-l0c-q13-t1.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q13-t2.png`, bucket: "l0/sam-l0c-q13-t2.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q13-t3.png`, bucket: "l0/sam-l0c-q13-t3.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q13-t4.png`, bucket: "l0/sam-l0c-q13-t4.png" },
  // L0C-Q11A..D (CLICK_IMAGE_SINGLE) — 4 shared comparison-word tiles (migration
  // 20260618130400). GENERATED by scripts/conversion/gen_l0c_q11_tiles.py; reused
  // across the 4 number-line sub-items (After+Before for a/c; Greater+Smaller for b/d).
  { source: `${L0_SRC}/0c/sam-l0c-q11-after.png`, bucket: "l0/sam-l0c-q11-after.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q11-before.png`, bucket: "l0/sam-l0c-q11-before.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q11-greater.png`, bucket: "l0/sam-l0c-q11-greater.png" },
  { source: `${L0_SRC}/0c/sam-l0c-q11-smaller.png`, bucket: "l0/sam-l0c-q11-smaller.png" },
  // L1-Q02 / Q03 (MC stimulus)
  { source: `${L1_SRC}/sam-l1-q02.png`, bucket: "l1/sam-l1-q02.png" },
  { source: `${L1_SRC}/sam-l1-q03.png`, bucket: "l1/sam-l1-q03.png" },
  // L1-Q13 (VISUAL_MATCHING) — 4 shape tiles
  { source: `${L1_SRC}/sam-l1-q13-circle.png`, bucket: "l1/sam-l1-q13-circle.png" },
  { source: `${L1_SRC}/sam-l1-q13-rectangle.png`, bucket: "l1/sam-l1-q13-rectangle.png" },
  { source: `${L1_SRC}/sam-l1-q13-square.png`, bucket: "l1/sam-l1-q13-square.png" },
  { source: `${L1_SRC}/sam-l1-q13-triangle.png`, bucket: "l1/sam-l1-q13-triangle.png" },
  // L1-Q14 (MULTI_BLANK) — apples stimulus
  { source: `${L1_SRC}/sam-l1-q14.png`, bucket: "l1/sam-l1-q14.png" },
  // L1-Q15 (VISUAL_MATCHING) — 4 solid tiles
  { source: `${L1_SRC}/sam-l1-q15-sphere.png`, bucket: "l1/sam-l1-q15-sphere.png" },
  { source: `${L1_SRC}/sam-l1-q15-cylinder.png`, bucket: "l1/sam-l1-q15-cylinder.png" },
  { source: `${L1_SRC}/sam-l1-q15-cube.png`, bucket: "l1/sam-l1-q15-cube.png" },
  { source: `${L1_SRC}/sam-l1-q15-cone.png`, bucket: "l1/sam-l1-q15-cone.png" },
  // L1-Q16 (MC stimulus)
  { source: `${L1_SRC}/sam-l1-q16.png`, bucket: "l1/sam-l1-q16.png" },
  // L1-Q17 (IMAGE_ORDERING) — 4 day tiles
  { source: `${L1_SRC}/sam-l1-q17-brushing-teeth.png`, bucket: "l1/sam-l1-q17-brushing-teeth.png" },
  { source: `${L1_SRC}/sam-l1-q17-walking-to-school.png`, bucket: "l1/sam-l1-q17-walking-to-school.png" },
  { source: `${L1_SRC}/sam-l1-q17-studying.png`, bucket: "l1/sam-l1-q17-studying.png" },
  { source: `${L1_SRC}/sam-l1-q17-sleeping.png`, bucket: "l1/sam-l1-q17-sleeping.png" },
  // L1-Q04/Q05/Q10/Q12/Q19 — single-image rows activated by migration
  // 20260614120001_l1_art_wire_activate.sql (lane/l1-art-curation), NOT by the
  // PR-#78 activation overlay above. Their images were omitted from this manifest,
  // so the rows serve-500 (createSignedUrl "Object not found") until uploaded.
  { source: `${L1_SRC}/sam-l1-q04.png`, bucket: "l1/sam-l1-q04.png" },
  { source: `${L1_SRC}/sam-l1-q05.png`, bucket: "l1/sam-l1-q05.png" },
  { source: `${L1_SRC}/sam-l1-q10.png`, bucket: "l1/sam-l1-q10.png" },
  { source: `${L1_SRC}/sam-l1-q12.png`, bucket: "l1/sam-l1-q12.png" },
  { source: `${L1_SRC}/sam-l1-q19.png`, bucket: "l1/sam-l1-q19.png" },
  // L2-Q06 (CLICK_IMAGE_SINGLE) — 4 base-ten option tiles
  { source: `${L2_SRC}/L2-6_1.png`, bucket: "l2/sam-l2-q06-opt1.png" },
  { source: `${L2_SRC}/L2-6_2.png`, bucket: "l2/sam-l2-q06-opt2.png" },
  { source: `${L2_SRC}/L2-6_3.png`, bucket: "l2/sam-l2-q06-opt3.png" },
  { source: `${L2_SRC}/L2-6_4.png`, bucket: "l2/sam-l2-q06-opt4.png" },
  // L0A "Same or Different" + "Position" CLICK_IMAGE_SINGLE tiles
  // (lane/l0a-taxonomy-activation) — 7 rows x 2 tiles. Q03 tiles are GENERATED
  // (gen_l0a_q03_tiles.py, same-object big/small); the rest are the two licensed
  // crops per row.
  { source: `${L0_SRC}/0a/sam-l0a-q03-t1.png`, bucket: "l0/sam-l0a-q03-t1.png" },
  { source: `${L0_SRC}/0a/sam-l0a-q03-t2.png`, bucket: "l0/sam-l0a-q03-t2.png" },
  { source: `${L0_SRC}/0a/0A-05_1.png`, bucket: "l0/sam-l0a-q05-t1.png" },
  { source: `${L0_SRC}/0a/0A-05_2.png`, bucket: "l0/sam-l0a-q05-t2.png" },
  { source: `${L0_SRC}/0a/0A-06_1.png`, bucket: "l0/sam-l0a-q06-t1.png" },
  { source: `${L0_SRC}/0a/0A-06_2.png`, bucket: "l0/sam-l0a-q06-t2.png" },
  { source: `${L0_SRC}/0a/0A-07_1.png`, bucket: "l0/sam-l0a-q07-t1.png" },
  { source: `${L0_SRC}/0a/0A-07_2.png`, bucket: "l0/sam-l0a-q07-t2.png" },
  { source: `${L0_SRC}/0a/0A-10_1.png`, bucket: "l0/sam-l0a-q10-t1.png" },
  { source: `${L0_SRC}/0a/0A-10_2.png`, bucket: "l0/sam-l0a-q10-t2.png" },
  { source: `${L0_SRC}/0a/0A-13_1.png`, bucket: "l0/sam-l0a-q13-t1.png" },
  { source: `${L0_SRC}/0a/0A-13_2.png`, bucket: "l0/sam-l0a-q13-t2.png" },
  { source: `${L0_SRC}/0a/0A-14_1.png`, bucket: "l0/sam-l0a-q14-t1.png" },
  { source: `${L0_SRC}/0a/0A-14_2.png`, bucket: "l0/sam-l0a-q14-t2.png" },
  // L0A-Q15 (CLICK_IMAGE_SINGLE) — 3 GENERATED rack+bowl tiles (gen_l0a_q15_tiles.py,
  // bowl on top/middle/bottom shelf; correct = t3 bottom).
  { source: `${L0_SRC}/0a/sam-l0a-q15-t1.png`, bucket: "l0/sam-l0a-q15-t1.png" },
  { source: `${L0_SRC}/0a/sam-l0a-q15-t2.png`, bucket: "l0/sam-l0a-q15-t2.png" },
  { source: `${L0_SRC}/0a/sam-l0a-q15-t3.png`, bucket: "l0/sam-l0a-q15-t3.png" },
];

// Pre-existing-L2-backfill: the 7 already-ACTIVE L2 image rows whose files were
// never uploaded to LOCAL storage (so those rows 500 at serve locally). Distinct
// from the 46 activation images above — these belong to rows that are already
// is_active=true; this only backfills their missing pictures for local QA. The
// bucket paths are the EXACT image_path each live row references (root-level keys
// from overlay/l2-authoring.json, NOT the l2/ folder convention).
const PREEXISTING_L2_BACKFILL: ManifestEntry[] = [
  { source: `${L2_SRC}/L2-2.png`, bucket: "q-sam-l2-q02-triangles.png" },
  { source: `${L2_SRC}/L2-3.png`, bucket: "q-sam-l2-q03-composite-shape.png" },
  { source: `${L2_GEN}/q-sam-l2-q05-seashell-graph.png`, bucket: "q-sam-l2-q05-seashell-graph.png" },
  { source: `${L2_SRC}/L2-12.png`, bucket: "q-sam-l2-q12-toy-car-ruler.png" },
  { source: `${L2_SRC}/L2-15.png`, bucket: "q-sam-l2-q15-clock.png" },
  { source: `${L2_SRC}/L2-16.png`, bucket: "q-sam-l2-q16-coins.png" },
  { source: `${L2_SRC}/L2-18.png`, bucket: "q-sam-l2-q18-base-ten.png" },
];

// ---------------------------------------------------------------------------

/** Minimal dotenv loader (no dependency): only fills keys not already in env. */
function loadEnvFile(): string | null {
  const candidate = process.env.ENV_FILE ?? path.join(REPO_ROOT, ".env.local");
  if (!existsSync(candidate)) return null;
  for (const raw of readFileSync(candidate, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return candidate;
}

function fmtBytes(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

interface UploadResult {
  bucket: string;
  uploaded: boolean;
  bytes: number;
  error?: string;
}

async function uploadSection(
  supabase: SupabaseClient,
  entries: ManifestEntry[],
): Promise<UploadResult[]> {
  const out: UploadResult[] = [];
  for (const e of entries) {
    const buf = await readFile(e.source);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(e.bucket, buf, { upsert: true, contentType: "image/png" });
    out.push({ bucket: e.bucket, uploaded: !error, bytes: buf.byteLength, error: error?.message });
  }
  return out;
}

function printSection(title: string, results: UploadResult[]): void {
  process.stdout.write(`\n${title}:\n`);
  process.stdout.write("  uploaded | size      | bucket path\n");
  for (const r of results) {
    process.stdout.write(
      `  ${r.uploaded ? "yes" : "NO "}      | ${fmtBytes(r.bytes).padEnd(9)} | ${r.bucket}` +
        (r.error ? `   ERROR: ${r.error}` : "") +
        "\n",
    );
  }
}

async function main(): Promise<void> {
  const envFile = loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not set (env or .env.local). Set it (local service-role key) and re-run.",
    );
  }
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    // Loud safety note: this script is the LOCAL QA uploader. Prod retarget is a
    // separate reviewed step. Refuse a non-local URL unless explicitly forced.
    if (process.env.ALLOW_NONLOCAL !== "true") {
      throw new Error(
        `Refusing non-local SUPABASE_URL (${url}). This is the LOCAL QA uploader; set ALLOW_NONLOCAL=true to override for a reviewed prod run.`,
      );
    }
  }
  process.stdout.write(
    `[upload-activation-images] target ${url} | bucket ${BUCKET} | env ${envFile ?? "(process env)"}\n\n`,
  );

  const supabase = createClient(url, key, { auth: { persistSession: false } }) as SupabaseClient;

  // --- 1) Pre-flight: every source in BOTH sections must exist -------------
  const ALL = [...MANIFEST, ...PREEXISTING_L2_BACKFILL];
  const missingSources: string[] = [];
  for (const e of ALL) {
    try {
      await stat(e.source);
    } catch {
      missingSources.push(`${e.source}  (→ ${e.bucket})`);
    }
  }
  if (missingSources.length > 0) {
    process.stderr.write(
      `\nFAIL — ${String(missingSources.length)} source file(s) not found:\n` +
        missingSources.map((s) => `  - ${s}`).join("\n") +
        "\n",
    );
    process.exitCode = 1;
    return;
  }

  // --- 2) Upload (upsert) both sections -----------------------------------
  const activation = await uploadSection(supabase, MANIFEST);
  const backfill = await uploadSection(supabase, PREEXISTING_L2_BACKFILL);

  // --- 3) Verification tables ---------------------------------------------
  printSection("ACTIVATION IMAGES (46 — 19 PR-#78 + 5 l1-art + 4 L0C-Q13 + 1 L0B-Q14 + 4 L0C-Q11)", activation);
  printSection("PRE-EXISTING-L2-BACKFILL (7 — already-active rows' missing files)", backfill);

  const results = [...activation, ...backfill];
  const failed = results.filter((r) => !r.uploaded);
  const ok = results.length - failed.length;
  process.stdout.write(
    `\nSUMMARY: ${String(activation.filter((r) => r.uploaded).length)}/${String(activation.length)} activation + ` +
      `${String(backfill.filter((r) => r.uploaded).length)}/${String(backfill.length)} pre-existing-L2-backfill uploaded ` +
      `(${String(ok)}/${String(results.length)} total).\n`,
  );

  if (failed.length > 0) {
    process.stderr.write(
      `\nFAIL — ${String(failed.length)} upload(s) errored (see ERROR lines above).\n`,
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write("\nPASS — all images uploaded; local QA fully green for these rows.\n");
}

main().catch((err: unknown) => {
  process.stderr.write(`[upload-activation-images] FAILED: ${String(err)}\n`);
  process.exitCode = 1;
});
