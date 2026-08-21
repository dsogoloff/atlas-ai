// READ-ONLY: answer key for the 0A band (the only band a Pre-K-4 child is
// served: shortTestLevelBand(0) = {0A}). Used to answer the smoke-pass run
// correctly. Licensed stems are truncated to a short matching prefix.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";

const client = new pg.Client({
  connectionString: pick("PROD_DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const { rows } = await client.query(
  `select id, external_id, format::text, content
     from questions
    where is_active and short_test_eligible and level::text = '0A'
    order by external_id`,
);
await client.end();

for (const r of rows) {
  const c = r.content as Record<string, unknown>;
  const stem = String(c.stem ?? "").replace(/\s+/g, " ").slice(0, 70);
  let key: unknown;
  switch (r.format) {
    case "MULTIPLE_CHOICE":
      key = { options: c.options, correct_index: c.correct_index };
      break;
    case "NUMERIC_ENTRY":
    case "TEXT_ENTRY":
      key = c.accepted_answers ?? c.correct_answer;
      break;
    case "CLICK_IMAGE_SINGLE":
    case "CLICK_IMAGE_MULTI":
    case "IMAGE_ORDERING":
      key = (c._authoring as Record<string, unknown>)?.answer_model;
      break;
    case "DRAG_DROP":
      key = c.correct_order;
      break;
    case "MULTI_BLANK":
      key = c.blanks;
      break;
    case "SELECT_MULTIPLE":
      key = { rule: c.select_rule, correct: c.correct, count: c.count };
      break;
    default:
      key = "(unhandled)";
  }
  console.log(
    `${r.external_id} | ${r.format} | ${r.id}\n   stem: ${stem}\n   key : ${JSON.stringify(key)}`,
  );
}
console.log(`\n${rows.length} items in the 0A band`);
