// Atlas Assessment — PER-ITEM CONTENT-COMPLETENESS verifier (images + gradeability).
//
// Closes the dimension that schema/flags/image-COUNT parity never asserted: that every
// ACTIVE item can actually be SERVED and GRADED. Two sub-dimensions, both derived from
// RUNTIME TRUTH (the DB content + the real engine code), run against local AND prod:
//
//   IMAGES — for every active item, compute the exact bucket keys the serializer mints
//     (top-level content.image_path + per-tile left/right/tiles; see ../minted-image-paths
//     and src/lib/questionPicker/mintImage.ts) and assert EACH resolves to an existing
//     object in the private question-images bucket (createSignedUrl, the same call the
//     runtime makes). A missing object is exactly the `[mintQuestionImage] createSignedUrl
//     failed … Object not found` → 500 that trapped parents on 2026-06-29.
//
//   GRADEABILITY — for every active item, run the REAL serializer (toClientQuestion) and a
//     content-only judgeAnswer probe (a well-formed answer per format, so the content
//     readers run; any throw = a missing/malformed engine-required field, i.e. a serve/
//     submit 500). We don't care whether the probe grades right/wrong — only that it does
//     not THROW on the content.
//
// EXITS NONZERO if any active item on any run side is missing a minted image OR throws in
// the serializer/grader. PLACEHOLDER- dev row excluded.
//
// Run:  tsx scripts/conversion/prod-bringup/12-verify-content-completeness.ts        (local + prod)
//       …  --local      (local only — dev, after `supabase db reset` + uploader)
//       …  --prod       (prod only)

import pg from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { localConnString, prodConnString, prodCreds, parseEnvFile } from "./introspect";
import { extractMintedPaths } from "../minted-image-paths";
import { toClientQuestion } from "../../../src/lib/questionPicker/serialize";
import { judgeAnswer, type QuestionFormat } from "../../../src/lib/responseSubmit/correctness";
import type { PickedQuestionRow } from "../../../src/lib/questionPicker/types";

const BUCKET = "question-images";

interface Side {
  name: "local" | "prod";
  dsn: string;
  ssl: boolean;
  storeUrl: string;
  storeKey: string;
}

interface Row {
  id: string;
  external_id: string;
  strand: string;
  level: string;
  difficulty: number;
  format: string;
  content: unknown;
  content_id: string | null;
}

/** A well-formed answer per format so judgeAnswer reaches the CONTENT readers:
 *  string formats take a plain string; structured formats need a parseable AnswerValue
 *  (grade() treats a rule-mismatched shape as a clean wrong, never a throw — so the only
 *  thing that can throw past this point is a content-authoring gap). */
function probeAnswer(format: string): string {
  switch (format) {
    case "MULTIPLE_CHOICE":
    case "NUMERIC_ENTRY":
    case "TEXT_ENTRY":
    case "DRAG_DROP":
      return "0";
    case "VISUAL_MATCHING":
      return JSON.stringify({ type: "pairs", pairs: {} });
    case "MULTI_BLANK":
      return JSON.stringify({ type: "blanks", values: {} });
    case "EQUATION_SET":
      return JSON.stringify({ type: "equation-set", equations: [] });
    case "IMAGE_ORDERING":
      return JSON.stringify({ type: "ordered-ids", ids: [] });
    default: // SELECT_MULTIPLE, CLICK_IMAGE_SINGLE, CLICK_IMAGE_MULTI
      return JSON.stringify({ type: "id-set", ids: [] });
  }
}

async function readActiveItems(dsn: string, ssl: boolean): Promise<Row[]> {
  const client = new pg.Client({ connectionString: dsn, ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}) });
  await client.connect();
  try {
    const tid = (await client.query<{ id: string }>("select id from tenants where slug = 'inspirea_singapore_math'")).rows[0]?.id;
    const { rows } = await client.query<Row>(
      `select id, external_id, strand::text as strand, level::text as level, difficulty,
              format::text as format, content, content_id
       from questions
       where is_active = true and external_id not like 'PLACEHOLDER-%'
       ${tid ? "and tenant_id = $1" : ""}
       order by external_id`,
      tid ? [tid] : [],
    );
    return rows;
  } finally {
    await client.end();
  }
}

function toPickedRow(r: Row): PickedQuestionRow {
  return {
    id: r.id,
    external_id: r.external_id,
    strand: r.strand as PickedQuestionRow["strand"],
    level: r.level as PickedQuestionRow["level"],
    difficulty: Number(r.difficulty),
    format: r.format as PickedQuestionRow["format"],
    content: r.content as PickedQuestionRow["content"],
    content_id: r.content_id,
  };
}

async function objectExists(store: SupabaseClient, key: string): Promise<boolean> {
  const { data, error } = await store.storage.from(BUCKET).createSignedUrl(key, 60);
  return !error && !!data?.signedUrl;
}

/** Run both sub-dimensions for one side. Returns the number of failures (0 = PASS). */
async function verifySide(side: Side): Promise<number> {
  const w = process.stdout;
  w.write(`\n========== ${side.name.toUpperCase()} ==========\n`);
  w.write(`  db: ${side.dsn.replace(/:[^:@/]*@/, ":****@")}\n  storage: ${side.storeUrl}\n`);

  const rows = await readActiveItems(side.dsn, side.ssl);
  w.write(`  active items: ${rows.length}\n`);
  const store = createClient(side.storeUrl, side.storeKey, { auth: { persistSession: false } }) as SupabaseClient;

  // --- IMAGES ---------------------------------------------------------------
  const pathToItems = new Map<string, string[]>();
  for (const r of rows) {
    for (const p of extractMintedPaths(r.format, r.content)) {
      const a = pathToItems.get(p) ?? [];
      a.push(r.external_id);
      pathToItems.set(p, a);
    }
  }
  const uniquePaths = [...pathToItems.keys()].sort();
  const missingImages: string[] = [];
  for (const p of uniquePaths) {
    if (!(await objectExists(store, p))) missingImages.push(p);
  }
  w.write(`\n  [images] ${uniquePaths.length} unique minted path(s); ${missingImages.length} MISSING from bucket\n`);
  for (const p of missingImages) w.write(`    MISSING  ${p}  ← ${pathToItems.get(p)!.join(", ")}\n`);

  // --- GRADEABILITY ---------------------------------------------------------
  const renderThrew: string[] = [];
  const gradeThrew: string[] = [];
  for (const r of rows) {
    try {
      toClientQuestion(toPickedRow(r));
    } catch (e) {
      renderThrew.push(`${r.external_id} (${r.format}): ${msg(e)}`);
    }
    try {
      judgeAnswer(r.format as QuestionFormat, r.content as Parameters<typeof judgeAnswer>[1], probeAnswer(r.format));
    } catch (e) {
      gradeThrew.push(`${r.external_id} (${r.format}): ${msg(e)}`);
    }
  }
  w.write(`\n  [gradeability] render-throws: ${renderThrew.length}; grade content-throws: ${gradeThrew.length}\n`);
  for (const s of renderThrew) w.write(`    RENDER  ${s}\n`);
  for (const s of gradeThrew) w.write(`    GRADE   ${s}\n`);

  const fails = missingImages.length + renderThrew.length + gradeThrew.length;
  w.write(`\n  ${side.name} result: ${fails === 0 ? "PASS" : `FAIL (${fails})`}\n`);
  return fails;
}

function msg(e: unknown): string {
  return String(e instanceof Error ? e.message : e).replace(/^\[[^\]]+\]\s*/, "").slice(0, 100);
}

async function main(): Promise<void> {
  const wantLocal = !process.argv.includes("--prod");
  const wantProd = !process.argv.includes("--local");

  const sides: Side[] = [];
  if (wantLocal) {
    const env = parseEnvFile(".env.local");
    const storeUrl = env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const storeKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!storeKey) throw new Error("local storage key missing — set SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    sides.push({ name: "local", dsn: localConnString(), ssl: false, storeUrl, storeKey });
  }
  if (wantProd) {
    const { url, key } = prodCreds();
    sides.push({ name: "prod", dsn: prodConnString(), ssl: true, storeUrl: url, storeKey: key });
  }

  process.stdout.write("[content-completeness] images + gradeability, derived from runtime truth (DB + engine)\n");
  let totalFails = 0;
  for (const side of sides) totalFails += await verifySide(side);

  process.stdout.write("\n=== RESULT ===\n");
  if (totalFails === 0) {
    process.stdout.write(`  PASS — every active item on ${sides.map((s) => s.name).join(" + ")} is servable (image present) and gradeable.\n`);
  } else {
    process.stdout.write(`  FAIL — ${totalFails} content-completeness gap(s). Missing images: upload via the gated convert:upload-activation-images:prod (after the derivation fix is merged). Engine throws: fix the item content.\n`);
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`[content-completeness] FAILED: ${String(err instanceof Error ? (err.stack ?? err.message) : err)}\n`);
  process.exitCode = 1;
});
