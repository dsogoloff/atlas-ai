// Atlas Assessment — answer-key PRESENCE check (local, source-gated).
//
// WHY: the source-verification rule requires that every booklet with active items has a
// locatable answer key before its bank is loaded/edited. The key PDFs are licensed,
// untracked source, so this runs LOCALLY (not CI) where source/** is present. It asserts
// a "Level <N> Placement Worksheet Answer Key.pdf" exists for every booklet that has
// questions in seed.sql, and re-extraction is left to answer-key-manifest.ts.
//
// Run:  pnpm convert:verify-keys
// Exits nonzero (BLOCKER) if any active booklet has no locatable key.

import { existsSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extractSeedQuestionIds, bookletOf, REPO_ROOT } from "./answer-key-manifest";

// booklet (L0A..L6) -> source dir + key filename token.
const KEY_PATH: Record<string, string> = {
  L0A: "source/0a/Level 0A Placement Worksheet Answer Key.pdf",
  L0B: "source/0b/Level 0B Placement Worksheet Answer Key.pdf",
  L0C: "source/0c/Level 0C Placement Worksheet Answer Key.pdf",
  L1: "source/1/Level 1 Placement Worksheet Answer Key.pdf",
  L2: "source/2/Level 2 Placement Worksheet Answer Key.pdf",
  L3: "source/3/Level 3 Placement Worksheet Answer Key.pdf",
  L4: "source/4/Level 4 Placement Worksheet Answer Key.pdf",
  L5: "source/5/Level 5 Placement Worksheet Answer Key.pdf",
  L6: "source/6/Level 6 Placement Worksheet Answer Key.pdf",
};

function main(): void {
  const seed = readFileSync(path.join(REPO_ROOT, "supabase", "seed.sql"), "utf8");
  const booklets = [...new Set(extractSeedQuestionIds(seed).map(bookletOf))].sort();
  const w = process.stdout;
  w.write("=== answer-key presence (booklets with seed questions) ===\n");
  const blockers: string[] = [];
  for (const b of booklets) {
    const rel = KEY_PATH[b];
    const abs = rel ? path.join(REPO_ROOT, "scripts", "conversion", rel) : null;
    if (abs && existsSync(abs)) {
      w.write(`  OK       ${b} -> ${rel}\n`);
    } else {
      blockers.push(b);
      w.write(`  BLOCKER  ${b} -> NO LOCATABLE KEY (${rel ?? "no path mapping"})\n`);
    }
  }
  if (blockers.length) {
    w.write(`\nFAIL — ${blockers.length} active booklet(s) without a key: ${blockers.join(", ")}\n`);
    process.exitCode = 1;
  } else {
    w.write(`\nPASS — every active booklet (${booklets.join(", ")}) has a locatable answer key.\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
