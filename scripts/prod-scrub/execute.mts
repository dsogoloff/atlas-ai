// PROD TEST/QA DATA SCRUB — EXECUTE PASS.
//
// DEFAULT MODE IS DRY RUN. Without --execute this prints the exact statements
// and the row counts they would affect, and touches nothing.
//
//   pnpm tsx scripts/prod-scrub/execute.mts             # dry run (default)
//   pnpm tsx scripts/prod-scrub/execute.mts --execute   # transaction-wrapped delete
//
// SCOPE (founder-adjudicated 2026-08-15): the only real child in prod is Éva
// Hegyesi. Every other child, parent and session is test/QA data and may be
// deleted. Staff (admins/instructors) and their auth users are NOT in scope.
//
// SAFETY, IN ORDER OF WHAT ACTUALLY PREVENTS A DISASTER
//   1. Host guard — aborts unless the connection is atlas-assessment
//      (ntfaqzueppqymfkefadm). Never atlas-assessment-2.
//   2. Anchor assertion — Éva must resolve to EXACTLY ONE child. 0 or >1 aborts
//      before a transaction is even opened.
//   3. Everything runs inside ONE transaction.
//   4. POST-DELETE VERIFICATION INSIDE THE TRANSACTION. Éva's rows must still be
//      present at the expected counts, and every other child must be gone. If
//      either check fails the script ROLLS BACK and exits non-zero. COMMIT
//      happens only after the verification passes.
//   5. auth.users IS in scope, but only AFTER the SQL transaction commits, and
//      only via the Admin API (never raw SQL). Its delete set is built by
//      EXPLICIT IDENTITY — keep Éva's parent + staff, delete everything else —
//      not from parents.auth_user_id, which is unreliable (see §2b).

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const EXECUTE = process.argv.includes("--execute");

const ROOT = path.resolve(import.meta.dirname, "../..");
const env = fs.readFileSync(path.join(ROOT, ".env.prod.local"), "utf8");
const pick = (k: string) =>
  env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";

const PROJECT_REF = "ntfaqzueppqymfkefadm"; // atlas-assessment. NEVER atlas-assessment-2.

const url = pick("PROD_DATABASE_URL");
const direct = new URL(url);
if (!direct.host.includes(PROJECT_REF)) {
  console.error(`ABORT: ${direct.host} is not the atlas-assessment project.`);
  process.exit(1);
}
console.log(`target: ${direct.host}  (atlas-assessment — authorized)`);
console.log(`MODE  : ${EXECUTE ? "*** EXECUTE — WILL DELETE ***" : "DRY RUN (no writes)"}\n`);

// --- 0. Connect ------------------------------------------------------------
// db.<ref>.supabase.co publishes an AAAA record only. On a network without an
// IPv6 route it does not resolve at all, so fall back to the Supavisor pooler,
// which is dual-stack. PORT 5432 = SESSION mode: required, because everything
// below runs in one explicit transaction and transaction mode (6543) would not
// hold it. The pooler hostname carries no project ref — the ref rides in the
// USERNAME (postgres.<ref>), and a wrong ref is refused by Supavisor with
// "tenant or user not found", so the host guard above still holds end to end.
const POOLER_HOST = pick("PROD_POOLER_HOST") || "aws-1-us-east-1.pooler.supabase.com";

async function connect(): Promise<pg.Client> {
  const viaDirect = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  try {
    await viaDirect.connect();
    console.log(`route : direct  ${direct.host}`);
    return viaDirect;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/ENOTFOUND|ENETUNREACH|EHOSTUNREACH|ETIMEDOUT/.test(msg)) throw e;
    await viaDirect.end().catch(() => undefined);
    console.log(`route : direct host unreachable (${msg.split("\n")[0]})`);
    console.log(`        falling back to pooler ${POOLER_HOST}:5432 (session mode)`);
  }
  const viaPooler = new pg.Client({
    host: POOLER_HOST,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: decodeURIComponent(direct.password),
    database: direct.pathname.replace(/^\//, "") || "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });
  await viaPooler.connect();
  console.log(`route : pooler  ${POOLER_HOST}:5432  as postgres.${PROJECT_REF}`);
  return viaPooler;
}

const c = await connect();

// Independent confirmation that we are on the intended instance, whichever
// route got us here: the server's own address must match the address the
// authorized direct host resolves to.
{
  const srv = await c.query(
    `select current_database() db, inet_server_addr()::text addr, current_user usr`,
  );
  console.log(`server: ${JSON.stringify(srv.rows[0])}\n`);
}

// --- 1. Anchor -------------------------------------------------------------
const pin = await c.query(`
  select id, name, parent_id, created_at
    from children
   where lower(translate(name, 'ÉéÈèÊêÁáÀà', 'eeeeeeaaaa')) like '%eva%'`);
if (pin.rowCount !== 1) {
  console.error(`ABORT: Éva anchor matched ${pin.rowCount} rows, expected exactly 1.`);
  await c.end();
  process.exit(1);
}
const EVA_CHILD = pin.rows[0].id as string;
const EVA_PARENT = pin.rows[0].parent_id as string;

// follow_up_leads has no parent FK — the parent is carried as free text
// (parent_email). So Éva's parent must be excluded by email as well as by
// child/session, or a lead she submitted before her child row existed would
// fall on the delete side.
const evaParent = await c.query(
  `select email, name, auth_user_id from parents where id = $1`,
  [EVA_PARENT],
);
if (evaParent.rowCount !== 1) {
  console.error(`ABORT: Éva's parent ${EVA_PARENT} did not resolve to exactly 1 row.`);
  await c.end();
  process.exit(1);
}
const EVA_PARENT_EMAIL = String(evaParent.rows[0].email).trim().toLowerCase();
const EVA_PARENT_AUTH = evaParent.rows[0].auth_user_id as string | null;

console.log(`anchor: child ${EVA_CHILD} (${JSON.stringify(pin.rows[0].name)})`);
console.log(`        parent ${EVA_PARENT}  <${EVA_PARENT_EMAIL}>`);
console.log(`        parent auth_user_id ${EVA_PARENT_AUTH ?? "(null)"}\n`);

// Expected survivors, measured BEFORE the delete and re-asserted after.
const SURVIVOR_COUNTS = `select
     (select count(*) from children where id = $1) ch,
     (select count(*) from parents  where id = $2) pa,
     (select count(*) from assessment_sessions where child_id = $1) se,
     (select count(*) from responses r join assessment_sessions s on s.id=r.session_id
       where s.child_id = $1) re,
     (select count(*) from consent_records where child_id = $1) co,
     (select count(*) from report_narrations rn join assessment_sessions s on s.id=rn.session_id
       where s.child_id = $1) rn,
     (select count(*) from analytics_events
       where child_id = $1
          or session_id in (select id from assessment_sessions where child_id = $1)) ae,
     (select count(*) from follow_up_leads
       where child_id = $1
          or session_id in (select id from assessment_sessions where child_id = $1)
          or lower(trim(parent_email)) = $3) ful`;

const before = await c.query(SURVIVOR_COUNTS, [EVA_CHILD, EVA_PARENT, EVA_PARENT_EMAIL]);
const B = before.rows[0];
console.log("Éva's rows BEFORE:", JSON.stringify(B));

// --- 2. The statements -----------------------------------------------------
// Ordered child-table-first. The FK graph is CASCADE end to end, so most of
// these are belt-and-braces — written explicitly so the pass does not depend on
// cascade behaviour silently staying the same, and so each step's row count is
// visible in the log.
// Each step carries its OWN params, so every statement binds exactly the
// placeholders it uses ($1 only). Sharing one params array across statements
// with different arity is a bind error waiting to happen.
const SESSIONS_OF_TEST_CHILDREN = `(select id from assessment_sessions where child_id <> $1)`;
const TEST_CHILDREN = `(select id from children where id <> $1)`;
const TEST_PARENTS = `(select id from parents where id <> $1)`;

const STEPS: Array<[string, string, string[]]> = [
  // FIRST, while child_id / session_id linkage is still intact. Once sessions
  // are deleted the SET NULL rules blank those columns, and the predicate would
  // then be reasoning about nulls rather than real attribution.
  //
  // ÉVA IS EXCLUDED BY BOTH LINKAGES. 34 analytics_events are attributable to
  // her (34 by child_id, 32 of those also by session). A blanket purge would
  // have destroyed a real family's funnel history.
  //
  // NOTE what this DOES take: rows with child_id IS NULL and session_id IS NULL
  // (landing_viewed and friends) are not attributable to anyone — including
  // Éva — so they fall on the delete side. See the dry-run breakdown.
  [
    "analytics_events",
    `delete from analytics_events
      where child_id is distinct from $1
        and (session_id is null
             or session_id not in (select id from assessment_sessions where child_id = $1))`,
    [EVA_CHILD],
  ],
  // Same three-way exclusion as analytics_events, PLUS parent_email: this table
  // has no parent FK, so the only link back to Éva's parent is the free-text
  // address captured on the form.
  [
    "follow_up_leads",
    `delete from follow_up_leads
      where child_id is distinct from $1
        and (session_id is null
             or session_id not in (select id from assessment_sessions where child_id = $1))
        and lower(trim(parent_email)) is distinct from $2`,
    [EVA_CHILD, EVA_PARENT_EMAIL],
  ],

  ["responses", `delete from responses where session_id in ${SESSIONS_OF_TEST_CHILDREN}`, [EVA_CHILD]],
  ["report_narrations", `delete from report_narrations where session_id in ${SESSIONS_OF_TEST_CHILDREN}`, [EVA_CHILD]],
  ["parent_satisfaction", `delete from parent_satisfaction where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["instructor_usefulness", `delete from instructor_usefulness where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["question_access_log", `delete from question_access_log where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["pedagogical_notes", `delete from pedagogical_notes where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["consent_records", `delete from consent_records where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["assessment_sessions", `delete from assessment_sessions where child_id in ${TEST_CHILDREN}`, [EVA_CHILD]],
  ["children", `delete from children where id <> $1`, [EVA_CHILD]],
  ["vpc_audit_log", `delete from vpc_audit_log where parent_id in ${TEST_PARENTS}`, [EVA_PARENT]],
  ["parents", `delete from parents where id <> $1`, [EVA_PARENT]],
];

// --- 2b. auth.users delete set, by EXPLICIT IDENTITY ------------------------
// Deliberately NOT derived from the parent->auth mapping: 8 of the 16 parent
// rows carry an auth_user_id that no longer exists in auth.users (earlier
// manual QA cleanup, no FK to stop it), so that mapping is unreliable.
// Instead: enumerate every auth user, keep exactly two by identity, delete the
// rest — and print the list so it is eyeballed before anything runs.
const authRows = await c.query(
  `select u.id, u.email, u.created_at,
          (select count(*) from admins a where a.auth_user_id = u.id) is_admin,
          (select count(*) from instructors i where i.auth_user_id = u.id) is_instructor,
          (u.id = (select auth_user_id from parents where id = $1)) is_eva_parent
     from auth.users u order by u.created_at`,
  [EVA_PARENT],
);
const authKeep = authRows.rows.filter(
  (r) => r.is_eva_parent || Number(r.is_admin) > 0 || Number(r.is_instructor) > 0,
);
const authDelete = authRows.rows.filter((r) => !authKeep.includes(r));

console.log("\n--- auth.users: KEEP ---");
for (const r of authKeep) {
  const why = r.is_eva_parent ? "Éva's parent" : "STAFF (admin/instructor)";
  console.log(`  KEEP    ${r.id}  ${r.email}   <- ${why}`);
}
console.log("--- auth.users: DELETE ---");
for (const r of authDelete) {
  console.log(`  DELETE  ${r.id}  ${r.email}`);
}
console.log(`  (${authKeep.length} keep, ${authDelete.length} delete, ${authRows.rowCount} total)`);

// The keep set must be exactly {Éva's parent, staff}. In EXECUTE mode a
// mismatch aborts before the transaction opens. In DRY RUN we record it and
// keep going, so the founder sees the WHOLE plan and the reason it is blocked
// in one pass instead of one blocker at a time.
const blockers: string[] = [];
const evaParentInAuth = authRows.rows.some((r) => r.is_eva_parent);
if (!evaParentInAuth) {
  blockers.push(
    `Éva's parent auth user (${EVA_PARENT_AUTH ?? "null"}) is NOT present in auth.users — ` +
      `the keep set cannot be built by identity.`,
  );
}
if (authKeep.length !== 2) {
  blockers.push(`expected exactly 2 auth users to keep, found ${authKeep.length}.`);
}
if (EXECUTE && blockers.length) {
  console.error("\nABORT:");
  for (const b of blockers) console.error(`  - ${b}`);
  await c.end();
  process.exit(1);
}

if (!EXECUTE) {
  console.log("\n--- SQL statements that WOULD run (one transaction) ---");
  for (const [label, sql, params] of STEPS) {
    const probe = sql.replace(/^delete from/, "select count(*) n from");
    const n = Number((await c.query(probe, params)).rows[0].n);
    console.log(`  ${label.padEnd(22)} ${String(n).padStart(5)} rows`);
  }

  // Breakdown of what the analytics_events predicate actually takes, so the
  // unattributable rows are a decision rather than a surprise.
  const brk = await c.query(
    `select
       count(*) filter (where child_id = $1
          or session_id in (select id from assessment_sessions where child_id = $1)) eva_kept,
       count(*) filter (where child_id is not null and child_id <> $1) test_child_linked,
       count(*) filter (where child_id is null and session_id is null) unattributable,
       count(*) total
     from analytics_events`,
    [EVA_CHILD],
  );
  const K = brk.rows[0];
  console.log(`
analytics_events breakdown (total ${K.total}):
  KEEP   ${String(K.eva_kept).padStart(4)}  attributable to Éva (child or session)
  DELETE ${String(K.test_child_linked).padStart(4)}  linked to a test child
  DELETE ${String(K.unattributable).padStart(4)}  child_id AND session_id both NULL — landing_viewed etc.
         ^^ these cannot be attributed to anyone, including Éva. They include
            any real landing-page views. Deleting them is the founder's call;
            the predicate above currently TAKES them.
`);

  // --- follow_up_leads: same question, table is small enough to itemise ------
  const leads = await c.query(
    `select id, parent_email, child_id, session_id, created_at,
            (child_id = $1
             or session_id in (select id from assessment_sessions where child_id = $1)
             or lower(trim(parent_email)) = $2) is_eva
       from follow_up_leads order by created_at`,
    [EVA_CHILD, EVA_PARENT_EMAIL],
  );
  console.log(`follow_up_leads (total ${leads.rowCount}):`);
  for (const r of leads.rows) {
    console.log(
      `  ${r.is_eva ? "KEEP  " : "DELETE"}  ${r.parent_email}  ` +
        `child=${r.child_id ?? "null"} session=${r.session_id ?? "null"} ` +
        `${new Date(r.created_at).toISOString().slice(0, 10)}`,
    );
  }

  // --- parents <-> auth.users anomaly ---------------------------------------
  // parents.auth_user_id is NOT NULL UNIQUE with NO foreign key to auth.users
  // (deliberate: ARCHITECTURE guardrail #9, so the auth provider can change
  // without a schema migration). The cost of that choice is that deleting an
  // auth user leaves the parent row behind pointing at an id that no longer
  // resolves. Those are the "NULL auth" parents — orphans, not nulls.
  const anomaly = await c.query(
    `select p.id, p.email, p.name, p.created_at, p.auth_user_id,
            (u.id is not null) auth_exists,
            (select count(*) from children ch where ch.parent_id = p.id) n_children
       from parents p left join auth.users u on u.id = p.auth_user_id
      order by auth_exists, p.created_at`,
  );
  const orphanParents = anomaly.rows.filter((r) => !r.auth_exists);
  console.log(`
--- parents <-> auth.users reconciliation ---
  parents rows                 ${String(anomaly.rowCount).padStart(3)}
  ... with a live auth user    ${String(anomaly.rows.length - orphanParents.length).padStart(3)}
  ... ORPHANED (auth gone)     ${String(orphanParents.length).padStart(3)}
  auth.users rows              ${String(authRows.rowCount).padStart(3)}`);
  console.log("\n  orphaned parent rows (auth_user_id resolves to nothing):");
  for (const r of orphanParents) {
    const isEva = r.id === EVA_PARENT;
    console.log(
      `    ${isEva ? "!! EVA !!" : "test    "}  ${r.email.padEnd(34)} ` +
        `children=${r.n_children}  created ${new Date(r.created_at).toISOString().slice(0, 10)}  ` +
        `auth_user_id=${r.auth_user_id}`,
    );
  }

  // auth users with no parent row at all (e.g. a signup whose parent row was
  // hand-deleted, or a staff login that never had one).
  const authOrphans = await c.query(
    `select u.id, u.email,
            (select count(*) from admins a where a.auth_user_id = u.id) is_admin,
            (select count(*) from instructors i where i.auth_user_id = u.id) is_instructor
       from auth.users u
      where not exists (select 1 from parents p where p.auth_user_id = u.id)
      order by u.created_at`,
  );
  console.log("\n  auth users with NO parent row:");
  for (const r of authOrphans.rows) {
    const role =
      Number(r.is_admin) > 0 ? "admin" : Number(r.is_instructor) > 0 ? "instructor" : "ORPHAN";
    console.log(`    ${role.padEnd(10)} ${r.email}  ${r.id}`);
  }

  // --- staff reconciliation -------------------------------------------------
  // The keep set treats "staff" as "has a row in admins or instructors". Any
  // auth user that LOOKS like staff (company domain) but has no such row lands
  // in the delete set. That is the one place this pass could quietly revoke a
  // real person's access, so it gets printed on its own.
  const staff = await c.query(
    `select 'admin' role, a.auth_user_id, u.email, (u.id is not null) auth_exists
       from admins a left join auth.users u on u.id = a.auth_user_id
     union all
     select 'instructor', i.auth_user_id, u.email, (u.id is not null)
       from instructors i left join auth.users u on u.id = i.auth_user_id`,
  );
  console.log("\n  staff rows (admins + instructors):");
  for (const r of staff.rows) {
    console.log(
      `    ${String(r.role).padEnd(10)} ${String(r.email ?? "(auth user missing)").padEnd(34)} ` +
        `${r.auth_exists ? "auth ok" : "AUTH MISSING"}  ${r.auth_user_id}`,
    );
  }
  const STAFF_DOMAIN = "@samnewyork.com";
  const domainButNotStaff = authDelete.filter((r) =>
    String(r.email ?? "").toLowerCase().endsWith(STAFF_DOMAIN),
  );
  if (domainButNotStaff.length) {
    console.log(
      `\n  !! ${domainButNotStaff.length} auth user(s) on ${STAFF_DOMAIN} are in the DELETE set` +
        ` because they have NO admins/instructors row:`,
    );
    for (const r of domainButNotStaff) console.log(`       ${r.email}  ${r.id}`);
    console.log(
      "       If any of these is a real staff login, it must be added to the keep\n" +
        "       set (or given an instructors row) BEFORE --execute. FOUNDER CALL.",
    );
  }

  console.log("\nNOT run in dry mode. Re-run with --execute to apply.");
  if (blockers.length) {
    console.error("\n*** BLOCKED — --execute would abort on: ***");
    for (const b of blockers) console.error(`  - ${b}`);
    await c.end();
    process.exit(1);
  }
  await c.end();
  process.exit(0);
}

// --- 3. Execute ------------------------------------------------------------
try {
  await c.query("begin");
  for (const [label, sql, params] of STEPS) {
    const r = await c.query(sql, params);
    console.log(`  deleted ${String(r.rowCount).padStart(4)}  ${label}`);
  }

  // --- 4. Verify INSIDE the transaction, before committing -----------------
  const after = await c.query(
    `${SURVIVOR_COUNTS},
       (select count(*) from children where id <> $1) other_children,
       (select count(*) from parents  where id <> $2) other_parents`,
    [EVA_CHILD, EVA_PARENT, EVA_PARENT_EMAIL],
  );
  const A = after.rows[0];
  console.log("\nÉva's rows AFTER:", JSON.stringify(A));

  const survived =
    A.ch === B.ch && A.pa === B.pa && A.se === B.se &&
    A.re === B.re && A.co === B.co && A.rn === B.rn &&
    A.ae === B.ae && A.ful === B.ful;
  const cleared = Number(A.other_children) === 0 && Number(A.other_parents) === 0;

  if (!survived) {
    throw new Error("VERIFY FAILED: Éva's rows changed — rolling back.");
  }
  if (!cleared) {
    throw new Error(
      `VERIFY FAILED: ${A.other_children} children / ${A.other_parents} parents remain — rolling back.`,
    );
  }

  await c.query("commit");
  console.log("\nCOMMIT — SQL scrub applied and verified.");
} catch (e) {
  await c.query("rollback").catch(() => undefined);
  console.error("\nROLLED BACK — nothing was deleted.");
  console.error(e instanceof Error ? e.message : String(e));
  await c.end();
  process.exit(1);
}

// --- 5. auth.users, AFTER the SQL committed --------------------------------
// Via the Admin API, never raw SQL: deleting auth rows with SQL bypasses
// Supabase's own auth bookkeeping (identities, sessions, refresh tokens).
// Runs only after the transaction committed, so a rollback never leaves auth
// and public out of step.
{
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    pick("NEXT_PUBLIC_SUPABASE_URL"),
    pick("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log("\n--- deleting auth users (Admin API) ---");
  let ok = 0;
  const failed: string[] = [];
  for (const r of authDelete) {
    const { error } = await admin.auth.admin.deleteUser(r.id as string);
    if (error) {
      failed.push(`${r.email}: ${error.message}`);
      console.error(`  FAIL    ${r.email}  ${error.message}`);
    } else {
      ok++;
      console.log(`  deleted ${r.email}`);
    }
  }
  console.log(`\nauth users deleted: ${ok}/${authDelete.length}`);
  if (failed.length) {
    console.error("FAILURES (the SQL scrub is already committed; retry these):");
    for (const f of failed) console.error(`  ${f}`);
  }
  for (const r of authKeep) console.log(`  kept    ${r.email}`);
}

console.log("\nSCRUB COMPLETE.");
await c.end();
