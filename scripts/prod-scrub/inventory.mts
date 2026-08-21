// PROD TEST/QA DATA SCRUB — INVENTORY + PLAN. **DRY RUN. DELETES NOTHING.**
//
// There is not a single DELETE, TRUNCATE or UPDATE in this file. It opens a
// read-only picture of prod, pins the one real family, and prints the plan a
// later execute pass would follow.
//
// BUSINESS RULE (founder, this session): the ONLY real child in prod is Éva,
// created 2026-07-03. Everything else — every other child, parent and session —
// is test/QA data.
//
// SAFETY
//   * Hard host guard: aborts unless the connection is the atlas-assessment
//     project (ntfaqzueppqymfkefadm). Never atlas-assessment-2.
//   * The Éva pin must resolve to EXACTLY ONE child. Zero or many ⇒ the script
//     stops and prints what it saw. A scrub keyed to an ambiguous anchor is how
//     real family data gets deleted.
//
// Run: pnpm tsx scripts/prod-scrub/inventory.mts

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";

const url = pick("PROD_DATABASE_URL");
const host = new URL(url).host;
if (!host.includes("ntfaqzueppqymfkefadm")) {
  console.error(`ABORT: ${host} is not the atlas-assessment project.`);
  process.exit(1);
}
console.log(`target: ${host}  (atlas-assessment — authorized)`);
console.log("MODE  : DRY RUN — this script performs NO writes.\n");

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const mask = (e: string | null) =>
  e ? `${e[0]}***@${e.split("@")[1] ?? "?"}` : "(none)";
const hr = (t: string) => console.log(`\n${"=".repeat(78)}\n${t}\n${"=".repeat(78)}`);

// ---------------------------------------------------------------------------
// 1. Pin the ONE real child.
// ---------------------------------------------------------------------------
hr("1. PIN THE REAL CHILD — Éva, created 2026-07-03");

// The stated rule was "Éva, created 2026-07-03". NO child was created on that
// date, so a date+name pin resolves to zero and this script refuses to build a
// delete set around a missing anchor. The NAME is unambiguous on its own —
// exactly one child in the whole table looks like "Eva" — so the pin is
// name-based, and the date is REPORTED (and reconciled) rather than trusted.
const EXPECTED_DATE = "2026-07-03";

const pin = await c.query(`
  select id, name, parent_id, created_at
    from children
   where lower(translate(name, 'ÉéÈèÊêÁáÀà', 'eeeeeeaaaa')) like '%eva%'
   order by created_at`);

if (pin.rowCount !== 1) {
  console.error(`\n*** STOP: Éva pin matched ${pin.rowCount} rows, expected exactly 1.`);
  console.error("*** Nothing was deleted (this script never deletes). Resolve the");
  console.error("*** anchor before any execute pass is authorized.");
  await c.end();
  process.exit(1);
}
const eva = pin.rows[0];
const actualDate = eva.created_at.toISOString().slice(0, 10);
console.log(`PINNED (by name, unique): child ${eva.id}`);
console.log(`  name      : ${JSON.stringify(eva.name)}`);
console.log(`  parent_id : ${eva.parent_id}`);
console.log(`  created_at: ${eva.created_at.toISOString()}  (UTC date ${actualDate})`);
if (actualDate !== EXPECTED_DATE) {
  console.log(`\n  !! DATE MISMATCH — the rule said ${EXPECTED_DATE}, the row says ${actualDate}.`);
  console.log(`  !! Zero children were created on ${EXPECTED_DATE}. The name match is unique,`);
  console.log("  !! so the anchor is almost certainly right — but CONFIRM before executing.");
}

// ---------------------------------------------------------------------------
// 2. Full inventory.
// ---------------------------------------------------------------------------
hr("2. FULL INVENTORY");

const parents = await c.query(`
  select p.id, p.auth_user_id, p.email, p.name, p.created_at,
         (select count(*) from children ch where ch.parent_id = p.id) kids
    from parents p order by p.created_at`);
console.log(`\nPARENTS (${parents.rowCount}):`);
console.log("  keep? parent_id                             created              kids  email");
for (const r of parents.rows) {
  const keep = r.id === eva.parent_id;
  console.log(
    `  ${keep ? "KEEP" : "DEL "}  ${r.id}  ${r.created_at.toISOString().slice(0, 19)}  ${String(r.kids).padStart(4)}  ${mask(r.email)}`,
  );
}

const children = await c.query(`
  select ch.id, ch.name, ch.parent_id, ch.created_at,
         (select count(*) from assessment_sessions s where s.child_id = ch.id) sessions,
         (select count(*) from responses r join assessment_sessions s on s.id = r.session_id
           where s.child_id = ch.id) responses,
         (select count(*) from consent_records cr where cr.child_id = ch.id) consents,
         (select count(*) from report_narrations rn join assessment_sessions s on s.id = rn.session_id
           where s.child_id = ch.id) reports,
         (select count(*) from analytics_events ae where ae.child_id = ch.id) events
    from children ch order by ch.created_at`);
console.log(`\nCHILDREN (${children.rowCount}):`);
console.log("  keep? child_id                               created              sess resp cons rep  evt  name");
for (const r of children.rows) {
  const keep = r.id === eva.id;
  console.log(
    `  ${keep ? "KEEP" : "DEL "}  ${r.id}  ${r.created_at.toISOString().slice(0, 19)}  ` +
      `${String(r.sessions).padStart(4)} ${String(r.responses).padStart(4)} ${String(r.consents).padStart(4)} ` +
      `${String(r.reports).padStart(3)} ${String(r.events).padStart(4)}  ${JSON.stringify(r.name)}`,
  );
}

const sessions = await c.query(`
  select s.id, s.child_id, s.test_type::text, s.status::text, s.started_at, s.completed_at,
         (select count(*) from responses r where r.session_id = s.id) responses
    from assessment_sessions s order by s.started_at`);
console.log(`\nSESSIONS (${sessions.rowCount}):`);
console.log("  keep? session_id                             started              type          status       resp");
for (const r of sessions.rows) {
  const keep = r.child_id === eva.id;
  console.log(
    `  ${keep ? "KEEP" : "DEL "}  ${r.id}  ${r.started_at.toISOString().slice(0, 19)}  ` +
      `${r.test_type.padEnd(13)} ${r.status.padEnd(12)} ${String(r.responses).padStart(4)}`,
  );
}

// auth.users — no FK to parents was found, so these are deleted independently.
const users = await c.query(`
  select u.id, u.email, u.created_at, u.last_sign_in_at,
         (select count(*) from parents p where p.auth_user_id = u.id) parent_rows,
         (select count(*) from admins a where a.auth_user_id = u.id) admin_rows,
         (select count(*) from instructors i where i.auth_user_id = u.id) instructor_rows
    from auth.users u order by u.created_at`);
console.log(`\nAUTH USERS (${users.rowCount}):`);
console.log("  class  auth_user_id                          created              P A I  email");
const evaParentAuth = parents.rows.find((p) => p.id === eva.parent_id)?.auth_user_id;
for (const r of users.rows) {
  const isEva = r.id === evaParentAuth;
  const isStaff = Number(r.admin_rows) > 0 || Number(r.instructor_rows) > 0;
  const cls = isEva ? "KEEP " : isStaff ? "STAFF" : Number(r.parent_rows) === 0 ? "ORPHN" : "DEL  ";
  console.log(
    `  ${cls}  ${r.id}  ${r.created_at.toISOString().slice(0, 19)}  ` +
      `${r.parent_rows} ${r.admin_rows} ${r.instructor_rows}  ${mask(r.email)}`,
  );
}

// ---------------------------------------------------------------------------
// 3. KEEP vs DELETE totals, per table.
// ---------------------------------------------------------------------------
hr("3. KEEP vs DELETE — row counts per table");

const CH = eva.id;
const PA = eva.parent_id;
const q = async (label: string, keepSql: string, params: string[], totalSql: string) => {
  const k = Number((await c.query(keepSql, params)).rows[0].n);
  const t = Number((await c.query(totalSql)).rows[0].n);
  console.log(
    `  ${label.padEnd(22)} total ${String(t).padStart(4)}   KEEP ${String(k).padStart(4)}   DELETE ${String(t - k).padStart(4)}`,
  );
};

await q("parents", `select count(*) n from parents where id = $1`, [PA], `select count(*) n from parents`);
await q("children", `select count(*) n from children where id = $1`, [CH], `select count(*) n from children`);
await q("assessment_sessions", `select count(*) n from assessment_sessions where child_id = $1`, [CH], `select count(*) n from assessment_sessions`);
await q("responses", `select count(*) n from responses r join assessment_sessions s on s.id=r.session_id where s.child_id = $1`, [CH], `select count(*) n from responses`);
await q("consent_records", `select count(*) n from consent_records where child_id = $1`, [CH], `select count(*) n from consent_records`);
await q("report_narrations", `select count(*) n from report_narrations rn join assessment_sessions s on s.id=rn.session_id where s.child_id = $1`, [CH], `select count(*) n from report_narrations`);
await q("analytics_events", `select count(*) n from analytics_events where child_id = $1`, [CH], `select count(*) n from analytics_events`);
await q("vpc_audit_log", `select count(*) n from vpc_audit_log where parent_id = $1`, [PA], `select count(*) n from vpc_audit_log`);
await q("parent_satisfaction", `select count(*) n from parent_satisfaction where child_id = $1`, [CH], `select count(*) n from parent_satisfaction`);
await q("instructor_usefulness", `select count(*) n from instructor_usefulness where child_id = $1`, [CH], `select count(*) n from instructor_usefulness`);
await q("pedagogical_notes", `select count(*) n from pedagogical_notes where child_id = $1`, [CH], `select count(*) n from pedagogical_notes`);
await q("question_access_log", `select count(*) n from question_access_log where child_id = $1`, [CH], `select count(*) n from question_access_log`);
await q("follow_up_leads", `select count(*) n from follow_up_leads where child_id = $1`, [CH], `select count(*) n from follow_up_leads`);

// ---------------------------------------------------------------------------
// 4. The FK-safe delete sequence a later execute pass would run.
// ---------------------------------------------------------------------------
hr("4. PROPOSED DELETE SEQUENCE (NOT EXECUTED)");
console.log(`
Observed FK behaviour in prod (discovered, not assumed):

  responses            .session_id -> assessment_sessions   ON DELETE CASCADE
  report_narrations    .session_id -> assessment_sessions   ON DELETE CASCADE
  parent_satisfaction  .session_id -> assessment_sessions   ON DELETE CASCADE
  instructor_usefulness.session_id -> assessment_sessions   ON DELETE CASCADE
  question_access_log  .session_id -> assessment_sessions   ON DELETE CASCADE
  assessment_sessions  .child_id   -> children              ON DELETE CASCADE
  consent_records      .child_id   -> children              ON DELETE CASCADE
  pedagogical_notes    .child_id   -> children              ON DELETE CASCADE
  children             .parent_id  -> parents               ON DELETE CASCADE
  consent_records      .parent_id  -> parents               ON DELETE CASCADE
  analytics_events     .child_id   -> children              ON DELETE SET NULL
  analytics_events     .session_id -> assessment_sessions   ON DELETE SET NULL
  follow_up_leads      .child_id   -> children              ON DELETE SET NULL
  vpc_audit_log        .parent_id  -> parents               ON DELETE SET NULL

Because the family chain is CASCADE end to end, deleting the parent rows alone
removes children -> sessions -> responses / consents / narrations. The explicit
ordering below is still written out so the execute pass is auditable and does
not depend on cascade behaviour silently staying the same:

  BEGIN;
   1. delete from responses            where session_id in (<del sessions>);
   2. delete from report_narrations    where session_id in (<del sessions>);
   3. delete from parent_satisfaction  where child_id  in (<del children>);
   4. delete from instructor_usefulness where child_id in (<del children>);
   5. delete from question_access_log  where child_id  in (<del children>);
   6. delete from pedagogical_notes    where child_id  in (<del children>);
   7. delete from consent_records      where child_id  in (<del children>);
   8. delete from assessment_sessions  where child_id  in (<del children>);
   9. delete from children             where id        in (<del children>);
  10. delete from vpc_audit_log        where parent_id in (<del parents>);
  11. delete from parents              where id        in (<del parents>);
  -- verify counts here, THEN commit
  COMMIT;

  12. auth.users: deleted SEPARATELY, after COMMIT, via the Supabase Admin API
      (auth.admin.deleteUser) — NOT raw SQL. No FK from parents.auth_user_id to
      auth.users was found in prod, so removing a parent row does NOT remove its
      auth user, and deleting auth rows by SQL bypasses Supabase's own auth
      bookkeeping. Staff auth users (admin/instructor) must be EXCLUDED.

DECISIONS THIS PLAN DOES NOT MAKE (founder call before the execute pass):

  a) analytics_events / follow_up_leads / vpc_audit_log are SET NULL, not
     CASCADE — after the scrub they survive as orphaned rows with null ids.
     Keep them (funnel history, with the child link severed) or delete the rows
     belonging to deleted children too? The plan above only deletes
     vpc_audit_log; analytics_events and follow_up_leads are LEFT IN PLACE.
  b) There is no score_estimates table in prod — placement lives in
     assessment_sessions.current_estimate (jsonb) and dies with the session.
     Nothing extra to scrub.
  c) The staff auth user(s) and the admins row are NOT in the delete set.
`);

hr("DRY RUN COMPLETE — nothing was deleted.");
await c.end();
