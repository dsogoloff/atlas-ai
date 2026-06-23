// Atlas Assessment — shared activation-image resolution + bucket audit.
//
// Single source of truth for BOTH the uploader (upload-activation-images.ts) and the
// standalone auditor (verify-images.ts). The set of images that MUST exist in the
// private `question-images` bucket is DERIVED from supabase/seed.sql — every
// `"image_path"` referenced by an activated row — so it cannot drift from the DB.
// SOURCE_MAP only resolves a bucket key to its source file on disk.

import { stat } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..");
export const SEED_FILE = path.join(REPO_ROOT, "supabase", "seed.sql");
export const BUCKET = "question-images";

// Untracked licensed-crop / generated source roots (override via env if relocated).
const L0_SRC = process.env.L0_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source";
const L1_SRC = process.env.L1_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l1-art/scripts/conversion/output/l1-art";
const L1_RAW = process.env.L1_RAW_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source/1";
const L2_SRC = process.env.L2_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l2/scripts/conversion/input/l2-art";
const L2_GEN = process.env.L2_GEN_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-l2/scripts/conversion/output/l2-art-generated";
const L3_SRC = process.env.L3_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source/3";
const L4_SRC = process.env.L4_SRC_DIR ?? "C:/Users/Acer/PROJECTS/atlas-ai-trunk/scripts/conversion/source/4";

export interface Entry {
  bucket: string;
  source: string;
}

// bucket object-key -> absolute source file. SUPERSET across l0-l4 (may list keys for
// rows not yet active on this branch; only seed-referenced keys are required). Add a
// row here when authoring a new image question; the guard fails loud if an active row
// references a key missing from this map.
export const SOURCE_MAP: Record<string, string> = {
  // L0A
  // Q08 — #97 re-author (stimulus = boxed reference car; 3 choice tiles bear/ball/car,
  // correct = t3 plain car). This is what the live l0-l2-activation seed block references.
  "l0/sam-l0a-q08-stimulus.png": `${L0_SRC}/0a/0A-08_1.png`,
  "l0/sam-l0a-q08-t1.png": `${L0_SRC}/0a/0A-08_2.png`,
  "l0/sam-l0a-q08-t2.png": `${L0_SRC}/0a/0A-08_3.png`,
  "l0/sam-l0a-q08-t3.png": `${L0_SRC}/0a/0A-08_4.png`,
  "l0/sam-l0a-q11-t1.png": `${L0_SRC}/0a/0A-11_1.png`,
  "l0/sam-l0a-q11-t2.png": `${L0_SRC}/0a/0A-11_2.png`,
  // QA 2026-06-22: Q11 served pictureless — the repeating pattern strip
  // (red,blue,red,blue,red,?) was never wired. Stimulus cropped from the doc page
  // (gen_young_qa_stimuli.py); wired by migration 20260622120000.
  "l0/sam-l0a-q11-stimulus.png": `${L0_SRC}/0a/sam-l0a-q11-stimulus.png`,
  "l0/sam-l0a-q03-t1.png": `${L0_SRC}/0a/sam-l0a-q03-t1.png`,
  "l0/sam-l0a-q03-t2.png": `${L0_SRC}/0a/sam-l0a-q03-t2.png`,
  "l0/sam-l0a-q05-t1.png": `${L0_SRC}/0a/0A-05_1.png`,
  "l0/sam-l0a-q05-t2.png": `${L0_SRC}/0a/0A-05_2.png`,
  "l0/sam-l0a-q06-t1.png": `${L0_SRC}/0a/0A-06_1.png`,
  "l0/sam-l0a-q06-t2.png": `${L0_SRC}/0a/0A-06_2.png`,
  "l0/sam-l0a-q07-t1.png": `${L0_SRC}/0a/0A-07_1.png`,
  "l0/sam-l0a-q07-t2.png": `${L0_SRC}/0a/0A-07_2.png`,
  "l0/sam-l0a-q10-t1.png": `${L0_SRC}/0a/0A-10_1.png`,
  "l0/sam-l0a-q10-t2.png": `${L0_SRC}/0a/0A-10_2.png`,
  "l0/sam-l0a-q13-t1.png": `${L0_SRC}/0a/0A-13_1.png`,
  "l0/sam-l0a-q13-t2.png": `${L0_SRC}/0a/0A-13_2.png`,
  "l0/sam-l0a-q14-t1.png": `${L0_SRC}/0a/0A-14_1.png`,
  "l0/sam-l0a-q14-t2.png": `${L0_SRC}/0a/0A-14_2.png`,
  "l0/sam-l0a-q15-t1.png": `${L0_SRC}/0a/sam-l0a-q15-t1.png`,
  "l0/sam-l0a-q15-t2.png": `${L0_SRC}/0a/sam-l0a-q15-t2.png`,
  "l0/sam-l0a-q15-t3.png": `${L0_SRC}/0a/sam-l0a-q15-t3.png`,
  "l0/sam-l0a-q17.png": `${L0_SRC}/0a/0A-17.png`,
  // L0B
  "l0/sam-l0b-q02-t1.png": `${L0_SRC}/0b/0B-02_1.png`,
  "l0/sam-l0b-q02-t2.png": `${L0_SRC}/0b/0B-02_2.png`,
  "l0/sam-l0b-q02-t3.png": `${L0_SRC}/0b/0B-02_3.png`,
  "l0/sam-l0b-q02-t4.png": `${L0_SRC}/0b/0B-02_4.png`,
  // QA 2026-06-22: Q02 served pictureless — the repeating pattern strip
  // (magnet,baseball x3) was never wired. Stimulus cropped from the doc page
  // (gen_young_qa_stimuli.py); wired by migration 20260622120000.
  "l0/sam-l0b-q02-stimulus.png": `${L0_SRC}/0b/sam-l0b-q02-stimulus.png`,
  "l0/sam-l0b-q14.png": `${L0_SRC}/0b/0B-14.png`,
  "l0/sam-l0b-q15.png": `${L0_SRC}/0b/0B-15.png`, // QA-fix#2: cookies word-problem stimulus
  "l0/sam-l0b-q04.png": `${L0_SRC}/0b/0B-04_1.png`,
  "l0/sam-l0b-q07.png": `${L0_SRC}/0b/sam-l0b-q07.png`, // #97 composited sorted-shapes stimulus (generated)
  // QA 2026-06-22: the wired stimulus was 0B-03_1 = a WHOLE cake; the doc shows the
  // cake with a triangular wedge MISSING (?-overlay). Re-pointed to the doc-faithful
  // crop (gen_young_qa_stimuli.py). Bucket key unchanged — founder re-uploads.
  "l0/sam-l0b-q03-stimulus.png": `${L0_SRC}/0b/sam-l0b-q03-stimulus.png`,
  "l0/sam-l0b-q03-t1.png": `${L0_SRC}/0b/0B-03_2.png`,
  "l0/sam-l0b-q03-t2.png": `${L0_SRC}/0b/0B-03_3.png`,
  "l0/sam-l0b-q03-t3.png": `${L0_SRC}/0b/0B-03_4.png`,
  // L0C
  // QA-fix#2: number-line stimulus re-pointed to the 30-36-labelled regen
  // (gen_l0c_q11_stimulus.py); the raw 0C-11.png crop has no printed numerals.
  "l0/sam-l0c-q11.png": `${L0_SRC}/0c/sam-l0c-q11.png`,
  "l0/sam-l0c-q14.png": `${L0_SRC}/0c/0C-14.png`,
  "l0/sam-l0c-q09.png": `${L0_SRC}/0c/0C-09.png`, // QA-fix#2: necklace word-problem stimulus
  "l0/sam-l0c-q10.png": `${L0_SRC}/0c/sam-l0c-q10.png`, // QA-fix#2: birds composite (gen_l0c_q10_birds.py)
  "l0/sam-l0c-q13-t1.png": `${L0_SRC}/0c/sam-l0c-q13-t1.png`,
  "l0/sam-l0c-q13-t2.png": `${L0_SRC}/0c/sam-l0c-q13-t2.png`,
  "l0/sam-l0c-q13-t3.png": `${L0_SRC}/0c/sam-l0c-q13-t3.png`,
  "l0/sam-l0c-q13-t4.png": `${L0_SRC}/0c/sam-l0c-q13-t4.png`,
  // QA 2026-06-22: Q13 served pictureless + stem reworded. Torn-calendar stimulus
  // (Mon-Thu | Sat-Sun, Friday torn out) cropped from the doc (gen_young_qa_stimuli.py);
  // wired + stem re-authored verbatim by migration 20260622120000.
  "l0/sam-l0c-q13-stimulus.png": `${L0_SRC}/0c/sam-l0c-q13-stimulus.png`,
  "l0/sam-l0c-q11-after.png": `${L0_SRC}/0c/sam-l0c-q11-after.png`,
  "l0/sam-l0c-q11-before.png": `${L0_SRC}/0c/sam-l0c-q11-before.png`,
  "l0/sam-l0c-q11-greater.png": `${L0_SRC}/0c/sam-l0c-q11-greater.png`,
  "l0/sam-l0c-q11-smaller.png": `${L0_SRC}/0c/sam-l0c-q11-smaller.png`,
  "l0/sam-l0c-q05-t1.png": `${L0_SRC}/0c/sam-l0c-q05-t1.png`,
  "l0/sam-l0c-q05-t2.png": `${L0_SRC}/0c/sam-l0c-q05-t2.png`,
  "l0/sam-l0c-q05-t3.png": `${L0_SRC}/0c/sam-l0c-q05-t3.png`,
  // L1
  "l1/sam-l1-q02.png": `${L1_SRC}/sam-l1-q02.png`,
  "l1/sam-l1-q03.png": `${L1_SRC}/sam-l1-q03.png`,
  // QA-fix#2: Q02/Q04 re-authored to CLICK_IMAGE_SINGLE — per-figure tiles on a
  // shared canvas at true relative scale (gen_l1_q02_q04_tiles.py). The old
  // combined stimuli (q02.png/q04.png) are no longer referenced by active rows.
  "l1/sam-l1-q02-t1.png": `${L1_RAW}/sam-l1-q02-t1.png`,
  "l1/sam-l1-q02-t2.png": `${L1_RAW}/sam-l1-q02-t2.png`,
  "l1/sam-l1-q04-t1.png": `${L1_RAW}/sam-l1-q04-t1.png`,
  "l1/sam-l1-q04-t2.png": `${L1_RAW}/sam-l1-q04-t2.png`,
  "l1/sam-l1-q13-circle.png": `${L1_SRC}/sam-l1-q13-circle.png`,
  "l1/sam-l1-q13-rectangle.png": `${L1_SRC}/sam-l1-q13-rectangle.png`,
  "l1/sam-l1-q13-square.png": `${L1_SRC}/sam-l1-q13-square.png`,
  "l1/sam-l1-q13-triangle.png": `${L1_SRC}/sam-l1-q13-triangle.png`,
  "l1/sam-l1-q14.png": `${L1_SRC}/sam-l1-q14.png`,
  "l1/sam-l1-q15-sphere.png": `${L1_SRC}/sam-l1-q15-sphere.png`,
  "l1/sam-l1-q15-cylinder.png": `${L1_SRC}/sam-l1-q15-cylinder.png`,
  "l1/sam-l1-q15-cube.png": `${L1_SRC}/sam-l1-q15-cube.png`,
  "l1/sam-l1-q15-cone.png": `${L1_SRC}/sam-l1-q15-cone.png`,
  "l1/sam-l1-q16.png": `${L1_SRC}/sam-l1-q16.png`,
  "l1/sam-l1-q17-brushing-teeth.png": `${L1_SRC}/sam-l1-q17-brushing-teeth.png`,
  "l1/sam-l1-q17-walking-to-school.png": `${L1_SRC}/sam-l1-q17-walking-to-school.png`,
  "l1/sam-l1-q17-studying.png": `${L1_SRC}/sam-l1-q17-studying.png`,
  "l1/sam-l1-q17-sleeping.png": `${L1_SRC}/sam-l1-q17-sleeping.png`,
  "l1/sam-l1-q04.png": `${L1_SRC}/sam-l1-q04.png`,
  "l1/sam-l1-q05.png": `${L1_SRC}/sam-l1-q05.png`,
  "l1/sam-l1-q10.png": `${L1_SRC}/sam-l1-q10.png`,
  "l1/sam-l1-q12.png": `${L1_SRC}/sam-l1-q12.png`,
  "l1/sam-l1-q19.png": `${L1_SRC}/sam-l1-q19.png`,
  "l1/sam-l1-q01-t1.png": `${L1_RAW}/L1-1_1.png`,
  "l1/sam-l1-q01-t2.png": `${L1_RAW}/L1-1_2.png`,
  "l1/sam-l1-q01-t3.png": `${L1_RAW}/L1-1_3.png`,
  "l1/sam-l1-q01-t4.png": `${L1_RAW}/L1-1_4.png`,
  "l1/sam-l1-q01-t5.png": `${L1_RAW}/L1-1_5.png`,
  "l1/sam-l1-q01-t6.png": `${L1_RAW}/L1-1_6.png`,
  "l1/sam-l1-q07-stimulus.png": `${L1_RAW}/L1-7_1.png`,
  "l1/sam-l1-q07-t1.png": `${L1_RAW}/L1-7_2.png`,
  "l1/sam-l1-q07-t2.png": `${L1_RAW}/L1-7_3.png`,
  // L2
  "l2/sam-l2-q06-opt1.png": `${L2_SRC}/L2-6_1.png`,
  "l2/sam-l2-q06-opt2.png": `${L2_SRC}/L2-6_2.png`,
  "l2/sam-l2-q06-opt3.png": `${L2_SRC}/L2-6_3.png`,
  "l2/sam-l2-q06-opt4.png": `${L2_SRC}/L2-6_4.png`,
  "q-sam-l2-q02-triangles.png": `${L2_SRC}/L2-2.png`,
  "q-sam-l2-q03-composite-shape.png": `${L2_SRC}/L2-3.png`,
  "q-sam-l2-q05-seashell-graph.png": `${L2_GEN}/q-sam-l2-q05-seashell-graph.png`,
  "q-sam-l2-q12-toy-car-ruler.png": `${L2_SRC}/L2-12.png`,
  "q-sam-l2-q15-clock.png": `${L2_SRC}/L2-15.png`,
  "q-sam-l2-q16-coins.png": `${L2_SRC}/L2-16.png`,
  "q-sam-l2-q18-base-ten.png": `${L2_SRC}/L2-18.png`,
  // L3
  "l3/sam-l3-q01.png": `${L3_SRC}/L3-1.png`,
  "l3/sam-l3-q06.png": `${L3_SRC}/L3-6.png`,
  "l3/sam-l3-q08.png": `${L3_SRC}/L3-8.png`,
  "l3/sam-l3-q09.png": `${L3_SRC}/L3-9.png`,
  "l3/sam-l3-q10.png": `${L3_SRC}/L3-10.png`,
  "l3/sam-l3-q12.png": `${L3_SRC}/L3-12.png`,
  "l3/sam-l3-q13.png": `${L3_SRC}/L3-13.png`,
  "l3/sam-l3-q17.png": `${L3_SRC}/L3-17.png`,
  "l3/sam-l3-q20.png": `${L3_SRC}/L3-20.png`,
  // L4
  "l4/sam-l4-q01.png": `${L4_SRC}/L4-1.png`,
  "l4/sam-l4-q13.png": `${L4_SRC}/L4-13.png`,
  "l4/sam-l4-q16.png": `${L4_SRC}/L4-16.png`,
  "l4/sam-l4-q20.png": `${L4_SRC}/L4-20.png`,
  "l4/sam-l4-q21.png": `${L4_SRC}/L4-21.png`,
  "l4/sam-l4-q23.png": `${L4_SRC}/L4-23.png`,
};

/** Every `"image_path":"KEY"` referenced in seed.sql (held rows carry none). */
export function activeImagePaths(): string[] {
  const seed = readFileSync(SEED_FILE, "utf8");
  const keys = new Set<string>();
  for (const m of seed.matchAll(/"image_path"\s*:\s*"([^"]+)"/g)) keys.add(m[1]);
  return [...keys].sort();
}

export function folderOf(key: string): string {
  const slash = key.indexOf("/");
  return slash === -1 ? "(root)" : key.slice(0, slash);
}

export function countByFolder(keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[folderOf(k)] = (out[folderOf(k)] ?? 0) + 1;
  return out;
}

export function fmtCounts(keys: string[]): string {
  const by = countByFolder(keys);
  return `${String(keys.length)} total  (${Object.keys(by).sort().map((f) => `${f}=${String(by[f])}`).join("  ")})`;
}

/** Resolve the active set to {bucket, source}; throws loud on a key with no SOURCE_MAP entry. */
export function resolveEntries(required: string[]): Entry[] {
  const unmapped = required.filter((k) => !(k in SOURCE_MAP));
  if (unmapped.length > 0) {
    throw new Error(
      `MANIFEST DRIFT — ${String(unmapped.length)} active image row(s) reference an image_path ` +
        `with no SOURCE_MAP entry (they will 500 at serve). Add them to activation-image-set.ts:\n` +
        unmapped.map((k) => `  - ${k}`).join("\n"),
    );
  }
  return required.map((k) => ({ bucket: k, source: SOURCE_MAP[k] }));
}

/** Pre-flight: which resolved source files are missing on disk. */
export async function missingSources(entries: Entry[]): Promise<string[]> {
  const missing: string[] = [];
  for (const e of entries) {
    try {
      await stat(e.source);
    } catch {
      missing.push(`${e.source}  (-> ${e.bucket})`);
    }
  }
  return missing;
}

/** List the actual object keys present under the folders touched by `requiredKeys`. */
export async function listPresentKeys(
  supabase: SupabaseClient,
  requiredKeys: string[],
): Promise<Set<string>> {
  const present = new Set<string>();
  const folders = new Set(requiredKeys.map(folderOf));
  for (const f of folders) {
    const prefix = f === "(root)" ? "" : f;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (error) throw new Error(`bucket list("${prefix}") failed: ${error.message}`);
    for (const obj of data ?? []) {
      // Folder placeholders have id === null; only count real files.
      if (obj.id === null) continue;
      present.add(prefix ? `${prefix}/${obj.name}` : obj.name);
    }
  }
  return present;
}

export interface AuditResult {
  required: string[];
  present: string[];
  missing: string[];
}

/** Hard audit: every active image row must have a file in the bucket at its key. */
export async function auditBucket(
  supabase: SupabaseClient,
  required: string[],
): Promise<AuditResult> {
  const presentSet = await listPresentKeys(supabase, required);
  const present = required.filter((k) => presentSet.has(k));
  const missing = required.filter((k) => !presentSet.has(k));
  return { required, present, missing };
}

/** Print the PASS/FAIL verdict block. Returns true on PASS (all present). */
export function printVerdict(audit: AuditResult): boolean {
  const reqBy = countByFolder(audit.required);
  const presBy = countByFolder(audit.present);
  const folders = [...new Set(audit.required.map(folderOf))].sort();
  process.stdout.write("\n=== ACTIVE-IMAGE BUCKET AUDIT ===\n");
  process.stdout.write("  folder | expected | present | status\n");
  for (const f of folders) {
    const exp = reqBy[f] ?? 0;
    const got = presBy[f] ?? 0;
    process.stdout.write(
      `  ${f.padEnd(7)}| ${String(exp).padStart(8)} | ${String(got).padStart(7)} | ${got === exp ? "ok" : "MISSING"}\n`,
    );
  }
  process.stdout.write(
    `  TOTAL  | ${String(audit.required.length).padStart(8)} | ${String(audit.present.length).padStart(7)} | ${audit.missing.length === 0 ? "ok" : "MISSING"}\n`,
  );
  if (audit.missing.length > 0) {
    process.stdout.write(
      `\nFAIL — ${String(audit.missing.length)} active image row(s) have NO file in the bucket (500 risk at serve):\n` +
        audit.missing.map((k) => `  - ${k}  (source: ${SOURCE_MAP[k] ?? "UNMAPPED"})`).join("\n") +
        "\n",
    );
    return false;
  }
  process.stdout.write("\nPASS — every active image row has a file in the bucket.\n");
  return true;
}
