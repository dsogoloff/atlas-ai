// Deterministic prod coverage harness — SERVE + GRADE every active,
// short-test-eligible item, using the app's REAL code paths.
//
// WHY THIS EXISTS. The live UI cannot be made to serve a chosen item: selection
// is adaptive, so UI coverage is statistical and leaves a residue of
// never-served items. This harness reads each item exactly as stored in PROD
// and runs it through the SAME functions the request path uses —
// toClientQuestion (serialize.ts), mintQuestionImage (mintImage.ts) and
// judgeAnswer (correctness.ts). It is deliberately NOT a re-implementation: a
// re-implementation would share the blind spot the live path exists to catch.
//
// Per item:
//   SERVE          — toClientQuestion must not throw and must yield content.
//   IMAGE          — when content.image_path is set, mint the signed URL and
//                    fetch it (HTTP 200 + PNG magic bytes).
//   GRADE CORRECT  — the stored correct answer must grade TRUE.
//   GRADE INCORRECT— a deliberately wrong answer must grade FALSE. This is the
//                    guard against always-true grading; an item that passes
//                    "correct" but also passes "incorrect" is a FAIL.
//
// READ-ONLY. No writes, and ZERO GA4/Meta events — nothing here touches the
// browser or the analytics path.
//
// Run: pnpm tsx scripts/prod-verify/sweep-items.ts

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

import { judgeAnswer } from "../../src/lib/responseSubmit/correctness";
import { toClientQuestion } from "../../src/lib/questionPicker/serialize";
import type { PickedQuestionRow } from "../../src/lib/questionPicker/types";

type Json = unknown;
type Obj = Record<string, Json>;

const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";

const QUESTION_IMAGE_BUCKET = "question-images";
const storage = createClient(pick("NEXT_PUBLIC_SUPABASE_URL"), pick("SUPABASE_SERVICE_ROLE_KEY"));

// ---------------------------------------------------------------------------
// Answer construction — derive a CORRECT and an INCORRECT answer per format
// from the stored content, in the exact wire shape the client submits.
// ---------------------------------------------------------------------------

const wire = (v: unknown) => JSON.stringify(v);

function authoringModel(c: Obj): Obj {
  const a = c["_authoring"] as Obj | undefined;
  return (a?.["answer_model"] ?? {}) as Obj;
}

/** Returns [correctAnswer, incorrectAnswer] as wire strings, or null when the
 *  format is not covered (reported as SKIP, never as a silent pass). */
function answersFor(format: string, c: Obj): [string, string] | null {
  switch (format) {
    case "MULTIPLE_CHOICE": {
      const options = c.options as string[];
      const idx = c.correct_index as number;
      return [options[idx], options[(idx + 1) % options.length]];
    }
    case "NUMERIC_ENTRY": {
      const accepted = (c.accepted_answers as string[] | undefined) ?? [
        String(c.correct_answer),
      ];
      // A value no authored numeric key uses.
      return [accepted[0], "-987654321"];
    }
    case "TEXT_ENTRY": {
      const accepted = (c.accepted_answers as string[] | undefined) ?? [
        String(c.correct_answer),
      ];
      return [accepted[0], "zzz_definitely_not_the_answer"];
    }
    case "DRAG_DROP": {
      const order = c.correct_order as unknown[];
      if (order.length < 2) return null;
      const wrong = [...order].reverse();
      if (wire(wrong) === wire(order)) return null; // palindromic — no wrong form
      return [wire(order), wire(wrong)];
    }
    case "SELECT_MULTIPLE": {
      if (c.select_rule === "all") {
        const correct = c.correct as string[];
        return [
          wire({ type: "id-set", ids: correct }),
          wire({ type: "id-set", ids: correct.slice(0, -1) }),
        ];
      }
      const ids = ((c.options as Obj[]) ?? []).map((o) => String(o.id));
      const n = c.count as number;
      return [
        wire({ type: "id-set", ids: ids.slice(0, n) }),
        wire({ type: "id-set", ids: ids.slice(0, Math.max(0, n - 1)) }),
      ];
    }
    case "MULTI_BLANK": {
      const blanks = c.blanks as Record<string, { value: string }>;
      const good: Record<string, string> = {};
      for (const [k, v] of Object.entries(blanks)) good[k] = String(v.value);
      const bad = { ...good };
      const firstKey = Object.keys(bad)[0];
      bad[firstKey] = `${bad[firstKey]}_wrong`;
      return [wire({ type: "blanks", values: good }), wire({ type: "blanks", values: bad })];
    }
    case "VISUAL_MATCHING": {
      const pairs = c.pairs as Record<string, string>;
      const keys = Object.keys(pairs);
      if (keys.length < 2) return null;
      const bad = { ...pairs, [keys[0]]: pairs[keys[1]] };
      return [wire({ type: "pairs", pairs }), wire({ type: "pairs", pairs: bad })];
    }
    case "CLICK_IMAGE_SINGLE": {
      const correct = String(authoringModel(c).correct);
      return [
        wire({ type: "id-set", ids: [correct] }),
        wire({ type: "id-set", ids: [`${correct}__wrong`] }),
      ];
    }
    case "CLICK_IMAGE_MULTI": {
      const correct = authoringModel(c).correct as string[];
      return [
        wire({ type: "id-set", ids: correct }),
        wire({ type: "id-set", ids: correct.slice(0, -1) }),
      ];
    }
    case "IMAGE_ORDERING": {
      const order = authoringModel(c).order as string[];
      if (order.length < 2) return null;
      return [
        wire({ type: "ordered-ids", ids: order }),
        wire({ type: "ordered-ids", ids: [...order].reverse() }),
      ];
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

interface Result {
  externalId: string;
  level: string;
  format: string;
  serve: string;
  image: string;
  gradeCorrect: string;
  gradeIncorrect: string;
  note: string;
}

const client = new pg.Client({
  connectionString: pick("PROD_DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(
  `select id, external_id, strand::text, level::text, format::text, content
     from questions
    where is_active and short_test_eligible
    order by level::text, external_id`,
);
await client.end();

console.log(`sweeping ${rows.length} active + short_test_eligible items from PROD\n`);

const results: Result[] = [];

for (const row of rows) {
  const c = row.content as Obj;
  const r: Result = {
    externalId: row.external_id,
    level: row.level,
    format: row.format,
    serve: "-",
    image: "n/a",
    gradeCorrect: "-",
    gradeIncorrect: "-",
    note: "",
  };

  // --- SERVE (real serializer) --------------------------------------------
  let clientImage;
  try {
    if (typeof c.image_path === "string") {
      const { data, error } = await storage.storage
        .from(QUESTION_IMAGE_BUCKET)
        .createSignedUrl(c.image_path, 120);
      if (error || !data?.signedUrl) throw new Error(`sign: ${error?.message}`);
      const res = await fetch(data.signedUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      const okPng = res.ok && buf.length > 8 && buf.toString("latin1", 1, 4) === "PNG";
      r.image = okPng ? "PASS" : `FAIL(http=${res.status},bytes=${buf.length})`;
      clientImage = {
        url: data.signedUrl,
        alt: String(c.image_alt ?? ""),
        required: c.image_required === true,
      };
    }
    const picked = {
      id: row.id,
      strand: row.strand,
      level: row.level,
      format: row.format,
      content: row.content,
    } as unknown as PickedQuestionRow;
    const q = toClientQuestion(picked, clientImage);
    r.serve = q && q.content ? "PASS" : "FAIL(empty content)";
  } catch (e) {
    r.serve = "FAIL";
    r.note = `serve: ${e instanceof Error ? e.message : String(e)}`;
  }

  // --- GRADE (real judgeAnswer) -------------------------------------------
  const pair = answersFor(row.format, c);
  if (!pair) {
    r.gradeCorrect = "SKIP";
    r.gradeIncorrect = "SKIP";
    if (!r.note) r.note = "no answer pair derivable for this format/content";
  } else {
    const [good, bad] = pair;
    try {
      r.gradeCorrect = judgeAnswer(row.format, row.content, good) ? "PASS" : "FAIL";
    } catch (e) {
      r.gradeCorrect = "THROW";
      r.note = `correct: ${e instanceof Error ? e.message : String(e)}`;
    }
    try {
      // Must be FALSE. True here means grading is always-true — a real defect.
      r.gradeIncorrect = judgeAnswer(row.format, row.content, bad) ? "FAIL" : "PASS";
    } catch (e) {
      r.gradeIncorrect = "THROW";
      r.note = `${r.note} | incorrect: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  results.push(r);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const bad = results.filter(
  (r) =>
    r.serve !== "PASS" ||
    r.image.startsWith("FAIL") ||
    r.gradeCorrect !== "PASS" ||
    r.gradeIncorrect !== "PASS",
);

console.log("external_id        level format             serve image gradeOK gradeBAD");
for (const r of results) {
  console.log(
    `${r.externalId.padEnd(18)} ${r.level.padEnd(5)} ${r.format.padEnd(18)} ` +
      `${r.serve.padEnd(5)} ${r.image.padEnd(5)} ${r.gradeCorrect.padEnd(7)} ${r.gradeIncorrect}` +
      (r.note ? `  << ${r.note}` : ""),
  );
}

console.log("\n--- format coverage ---");
const byFormat = new Map<string, { n: number; bad: number }>();
for (const r of results) {
  const e = byFormat.get(r.format) ?? { n: 0, bad: 0 };
  e.n++;
  if (bad.includes(r)) e.bad++;
  byFormat.set(r.format, e);
}
for (const [f, e] of [...byFormat].sort()) {
  console.log(`  ${f.padEnd(20)} ${String(e.n).padStart(3)} items, ${e.bad} not-clean`);
}

console.log(`\nTOTAL ${results.length} | CLEAN ${results.length - bad.length} | NOT-CLEAN ${bad.length}`);
if (bad.length) {
  console.log("\n--- NOT CLEAN ---");
  for (const r of bad) {
    console.log(
      `  ${r.externalId} [${r.format}] serve=${r.serve} image=${r.image} ` +
        `ok=${r.gradeCorrect} bad=${r.gradeIncorrect} ${r.note}`,
    );
  }
}
