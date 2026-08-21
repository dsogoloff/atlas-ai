// READ-ONLY: latest completed session for a child — placement, clamp evidence,
// completed_at, and the served ceiling.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";

const childId = process.argv[2];
const client = new pg.Client({
  connectionString: pick("PROD_DATABASE_URL"),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const s = await client.query(
  `select id, child_id, status, test_type, started_at, completed_at,
          session_time_flag, current_estimate
     from assessment_sessions
    where child_id = $1
    order by started_at desc limit 1`,
  [childId],
);
const row = s.rows[0];
console.log("SESSION");
console.log("  id            :", row.id);
console.log("  child_id      :", row.child_id);
console.log("  status        :", row.status);
console.log("  test_type     :", row.test_type);
console.log("  started_at    :", row.started_at.toISOString());
console.log("  completed_at  :", row.completed_at ? row.completed_at.toISOString() : null);
console.log("  time_flag     :", row.session_time_flag);
console.log("  overall_level :", row.current_estimate?.overall_level);
console.log("  confidence    :", row.current_estimate?.confidence);

const served = await client.query(
  `select q.external_id, q.level::text, q.format::text, r.is_correct
     from responses r join questions q on q.id = r.question_id
    where r.session_id = $1
    order by r.created_at`,
  [row.id],
);
console.log(`\nSERVED (${served.rowCount})`);
for (const r of served.rows) {
  console.log(`  ${r.external_id.padEnd(14)} ${r.level.padEnd(4)} ${r.format.padEnd(20)} correct=${r.is_correct}`);
}
const levels = served.rows.map((r) => r.level);
console.log("\n  served ceiling:", [...new Set(levels)].sort().pop());
console.log("  all correct   :", served.rows.every((r) => r.is_correct));

const narr = await client.query(
  `select status, model, length(placement_line) as placement_len,
          length(strand_lede) as lede_len,
          coalesce(array_length(findings_strengths,1),0) as strengths,
          coalesce(array_length(findings_growth_areas,1),0) as growth
     from report_narrations where session_id = $1`,
  [row.id],
);
console.log("\nNARRATION:", narr.rowCount ? JSON.stringify(narr.rows[0]) : "(none yet)");

await client.end();
