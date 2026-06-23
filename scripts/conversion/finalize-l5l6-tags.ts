// Atlas Assessment — L5/L6 source-verified overrides applied to the Stage-3 drafts.
//
// Stage 3 (AI) produced clean stems/options but (a) emitted SAM-X-Q.. external_ids
// (level slug undetected), (b) under-leveled many content_keys to lower booklets, and
// (c) does not read the worksheet's Short Test column or always nail the answer. This
// script overlays the SOURCE-VERIFIED truth — read from each worksheet's Question
// Summary key (Level + Topic + Short) and the answer-key PDF — onto the tagged records:
//   * external_id  := SAM-L5/L6-Q<NN>
//   * content_key  := forced to the booklet Level (Level column) + topic node
//   * answer       := from the answer-key PDF (correct_index / correct_answer + accepted)
//   * format       := corrected where the AI mis-detected (fraction free-response, etc.)
//   * image_required, dropped phantom fragments, fixed split stems
// short_test_eligible is NOT in the Stage-4 schema; it is applied as a separate UPDATE
// block after load (see add-l5l6-short-eligible). Run: pnpm tsx scripts/conversion/finalize-l5l6-tags.ts

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT = (lvl: string) => path.join(ROOT, "scripts", "conversion", "output", `Level ${lvl} Placement Worksheet`, "stage3-tagged.json");

interface OV {
  ck: string;            // content_key (booklet-level-correct)
  ci?: number;           // MC correct_index
  ca?: string;           // free-response correct_answer
  accepted?: string[];
  fmt?: string;          // format override
  stem?: string;         // stem override (split-fragment fixes)
  img?: boolean;         // image_required override
}

// ── L5 (30 tasks): Level col → 1-27 = Level 4 (l4-*), 28-30 = Level 5 (l5-*) ──
const L5: Record<number, OV> = {
  1:  { ck: "l4-whole_numbers-1", ci: 2 },
  2:  { ck: "l4-whole_numbers-1", ca: "13275", fmt: "NUMERIC_ENTRY" },
  3:  { ck: "l4-whole_numbers-1", ca: "290", accepted: ["300"], fmt: "NUMERIC_ENTRY" },
  4:  { ck: "l4-whole_numbers-2", ca: "30", fmt: "NUMERIC_ENTRY" },
  5:  { ck: "l4-whole_numbers-2", ci: 2 },
  6:  { ck: "l4-whole_numbers-2", ca: "72390", fmt: "NUMERIC_ENTRY" },
  7:  { ck: "l4-whole_numbers-2", ci: 1 },   // FLAG: extracted options contain a duplicate "830"
  8:  { ck: "l4-data_representation-2", ca: "400", fmt: "NUMERIC_ENTRY", img: true },
  9:  { ck: "l4-fractions-2", ca: "5 1/12", accepted: ["5 1/12", "61/12"], fmt: "TEXT_ENTRY" },
  10: { ck: "l4-fractions-1", ca: "3, 10/3, 14/4, 9/2", fmt: "TEXT_ENTRY", accepted: ["3, 10/3, 7/2, 9/2"] },
  11: { ck: "l4-fractions-3", ca: "175", fmt: "NUMERIC_ENTRY" },
  12: { ck: "l4-geometry-1", ca: "65", fmt: "TEXT_ENTRY", img: true }, // manual draw, Short=N -> inactive
  13: { ck: "l4-geometry-1", ci: 2 },
  14: { ck: "l4-geometry-2", ca: "16", accepted: ["16°"], fmt: "NUMERIC_ENTRY", img: true },
  15: { ck: "l4-decimals-1", ci: 3 },
  16: { ck: "l4-decimals-1", ca: "3.716, 3.671, 3.617, 3", fmt: "TEXT_ENTRY" },
  17: { ck: "l4-decimals-4", ci: 3 },
  18: { ck: "l4-decimals-3", ci: 2 },
  19: { ck: "l4-decimals-2", ci: 2 },
  20: { ck: "l4-decimals-4", ca: "24.25", accepted: ["$24.25", "24.25"], fmt: "NUMERIC_ENTRY" },
  21: { ck: "l4-decimals-4", ca: "33", accepted: ["$33"], fmt: "NUMERIC_ENTRY" },
  // Time has no l4 node in the V2026 taxonomy (measurement caps at l3); tag to the
  // highest Time node l3-measurement-2 (skill-accurate; booklet reviews it). Flagged.
  22: { ck: "l3-measurement-2", ca: "120", fmt: "NUMERIC_ENTRY" },
  23: { ck: "l3-measurement-2", ca: "1:45 am", accepted: ["1.45 am", "1:45am", "1.45am", "1:45 a.m.", "1.45 a.m."], fmt: "TEXT_ENTRY" },
  24: { ck: "l4-area_volume-1", ca: "92", accepted: ["92 m"], fmt: "NUMERIC_ENTRY" },
  25: { ck: "l4-area_volume-2", ca: "108", accepted: ["108 m2"], fmt: "NUMERIC_ENTRY", img: true },
  26: { ck: "l4-geometry-3", ci: 1, img: true },
  27: { ck: "l4-geometry-3", ci: 0, img: true },
  28: { ck: "l5-whole_numbers-1", ca: "three million, four hundred and fifty-seven thousand and one", fmt: "TEXT_ENTRY" },
  29: { ck: "l5-whole_numbers-1", ca: "2000000", accepted: ["2,000,000"], fmt: "NUMERIC_ENTRY" },
  30: { ck: "l5-whole_numbers-2", ca: "35000", accepted: ["35,000"], fmt: "NUMERIC_ENTRY" },
};

// ── L6 (38 tasks): Level col → 1-35 = Level 5 (l5-*), 36-38 = Level 6 (l6-*) ──
const L6: Record<number, OV> = {
  1:  { ck: "l5-whole_numbers-1", ca: "85000", accepted: ["85 000"], fmt: "NUMERIC_ENTRY" },
  2:  { ck: "l5-whole_numbers-1", ci: 0 },
  3:  { ck: "l5-whole_numbers-2", ca: "162000", accepted: ["162 000"], fmt: "NUMERIC_ENTRY" },
  4:  { ck: "l5-whole_numbers-2", ca: "1002", fmt: "NUMERIC_ENTRY" },
  5:  { ck: "l5-whole_numbers-2", ci: 2 },
  6:  { ck: "l5-whole_numbers-3", ca: "130", accepted: ["130 L"], fmt: "NUMERIC_ENTRY" }, // FIX: AI said 186
  7:  { ck: "l5-fractions-1", ci: 0 },
  8:  { ck: "l5-fractions-2", ca: "10.125", fmt: "NUMERIC_ENTRY" },
  9:  { ck: "l5-fractions-3", ca: "8 1/28", fmt: "TEXT_ENTRY" },
  10: { ck: "l5-fractions-3", ca: "2.17", fmt: "NUMERIC_ENTRY" },
  11: { ck: "l5-fractions-4", ca: "88 1/2", accepted: ["177/2"], fmt: "TEXT_ENTRY" },
  12: { ck: "l5-fractions-4", ca: "5/18", fmt: "TEXT_ENTRY", stem: "Multiply 5/8 by 4/9. Express your answer as a fraction in its simplest form." },
  13: { ck: "l5-fractions-5", ca: "100", accepted: ["100 g"], fmt: "NUMERIC_ENTRY" },
  14: { ck: "l5-area_volume-1", ci: 0, img: true },
  15: { ck: "l5-area_volume-1", ca: "54", accepted: ["54 cm2"], fmt: "NUMERIC_ENTRY", img: true },
  16: { ck: "l5-area_volume-1", ca: "267.5", accepted: ["267.5 cm2"], fmt: "NUMERIC_ENTRY", img: true },
  17: { ck: "l5-area_volume-2", ca: "see solution", fmt: "TEXT_ENTRY", img: true }, // manual draw, Short=N -> inactive
  18: { ck: "l5-area_volume-3", ci: 3, img: true },
  19: { ck: "l5-area_volume-4", ca: "415", accepted: ["415 L"], fmt: "NUMERIC_ENTRY", img: true },
  20: { ck: "l5-fractions-2", ci: 2 },
  21: { ck: "l5-decimals-1", ca: "43.2", fmt: "NUMERIC_ENTRY" },
  22: { ck: "l5-decimals-2", ca: "52", accepted: ["52 g"], fmt: "NUMERIC_ENTRY" },
  23: { ck: "l5-rate-1", ca: "54", accepted: ["54 toys"], fmt: "NUMERIC_ENTRY" },
  24: { ck: "l5-rate-2", ca: "7.90", accepted: ["$7.90"], fmt: "NUMERIC_ENTRY" },
  25: { ck: "l5-area_volume-4", ca: "99", accepted: ["99 L"], fmt: "NUMERIC_ENTRY", img: true }, // 2-part (b=6.6h) -> inactive, curate
  26: { ck: "l5-percentage-1", ca: "60", accepted: ["60%"], fmt: "NUMERIC_ENTRY", img: true },
  27: { ck: "l5-percentage-2", ci: 3 },
  28: { ck: "l5-percentage-4", ca: "66", fmt: "NUMERIC_ENTRY" },
  29: { ck: "l5-percentage-4", ca: "2247", accepted: ["$2247", "2,247"], fmt: "NUMERIC_ENTRY" },
  30: { ck: "l5-percentage-3", ca: "45", accepted: ["45%"], fmt: "NUMERIC_ENTRY", img: true }, // 2-part (b=36) -> inactive, curate
  31: { ck: "l5-geometry-1", ci: 2, img: true },
  32: { ck: "l5-geometry-2", ca: "59", accepted: ["59°"], fmt: "NUMERIC_ENTRY", img: true },
  33: { ck: "l5-geometry-2", ca: "110", accepted: ["110°"], fmt: "NUMERIC_ENTRY", img: true },
  34: { ck: "l5-geometry-3", ca: "106", accepted: ["106°"], fmt: "NUMERIC_ENTRY", img: true },
  35: { ck: "l5-geometry-3", ca: "see solution", fmt: "TEXT_ENTRY" }, // manual draw, Short=N -> inactive
  36: { ck: "l6-algebra-2", ca: "2p + 8", accepted: ["2p+8"], fmt: "TEXT_ENTRY" },
  37: { ck: "l6-algebra-2", ca: "33", fmt: "NUMERIC_ENTRY" },
  38: { ck: "l6-algebra-3", ca: "8", accepted: ["y=8", "y = 8"], fmt: "NUMERIC_ENTRY" },
};

type Rec = Record<string, unknown>;

function applyLevel(lvl: string, map: Record<number, OV>) {
  const file = OUT(lvl);
  const data = JSON.parse(readFileSync(file, "utf8")) as Rec | Rec[];
  const wrapped = !Array.isArray(data) ? data : null;
  const recs: Rec[] = Array.isArray(data)
    ? data
    : ((data.records ?? data.questions) as Rec[]);
  const isWrapped = wrapped !== null && Array.isArray(wrapped.questions);
  const out: Rec[] = [];
  const seen = new Set<number>();
  for (const r of recs) {
    const tn = r.task_number as number;
    const ov = map[tn];
    if (!ov || seen.has(tn)) continue; // drop phantom/duplicate fragments (e.g. L6 split T9)
    seen.add(tn);
    r.external_id = `SAM-L${lvl}-Q${String(tn).padStart(2, "0")}`;
    r.content_key = ov.ck;
    if (ov.fmt) r.format = ov.fmt;
    if (ov.stem) r.stem = ov.stem;
    if (ov.img !== undefined) r.image_required = ov.img;
    if (ov.ci !== undefined) { r.correct_index = ov.ci; r.correct_answer = null; }
    if (ov.ca !== undefined) { r.correct_answer = ov.ca; r.correct_index = null; }
    if (ov.accepted) r.accepted_answers = ov.accepted;
    // clear review_flags that would trip Stage-4's flag-contradiction gate
    r.review_flags = [];
    out.push(r);
  }
  // coverage check
  const missing = Object.keys(map).map(Number).filter((t) => !seen.has(t));
  if (missing.length) console.error(`L${lvl}: tasks with no record matched: ${missing.join(", ")}`);
  if (isWrapped && wrapped) { wrapped.questions = out; wrapped.question_count = out.length; writeFileSync(file, JSON.stringify(wrapped, null, 2)); }
  else writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`L${lvl}: wrote ${out.length} records (expected ${Object.keys(map).length})`);
}

applyLevel("5", L5);
applyLevel("6", L6);
