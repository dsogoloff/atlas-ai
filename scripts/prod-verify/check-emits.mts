import fs from "node:fs";
import path from "node:path";
import pg from "pg";
const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
const client = new pg.Client({ connectionString: pick("PROD_DATABASE_URL"), ssl: { rejectUnauthorized: false } });
await client.connect();
const ev = await client.query(
  `select event_name::text, created_at, props from analytics_events where session_id = $1 order by created_at`,
  [process.argv[2]],
);
console.log(`events for session (${ev.rowCount}):`);
for (const r of ev.rows) console.log(`  ${r.created_at.toISOString()} ${r.event_name} ${JSON.stringify(r.props)}`);
const cov = await client.query(
  `select event_name::text, count(distinct session_id) as sessions, count(*) as rows
     from analytics_events group by 1 order by 1`);
console.log("\nall event types in prod:");
for (const r of cov.rows) console.log(`  ${r.event_name.padEnd(38)} sessions=${r.sessions} rows=${r.rows}`);
const done = await client.query(`select count(*) c from assessment_sessions where status='COMPLETED'`);
console.log("\ncompleted sessions:", done.rows[0].c);
await client.end();
