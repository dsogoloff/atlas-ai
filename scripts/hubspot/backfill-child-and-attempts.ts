// Atlas Assessment — ONE-TIME BACKFILL: child fields + first-attempt history
// onto existing HubSpot parent contacts.
//
// ===========================================================================
// REVIEW ONLY. THIS HAS NOT BEEN RUN — not against prod, not against local,
// not against HubSpot. Running it is a founder-gated step.
// ===========================================================================
//
// WHAT THIS FILLS IN
//   Parents who completed an assessment BEFORE the contact/child/milestone
//   syncs shipped have a HubSpot contact with none of it. Two gaps:
//
//   (a) Child first name + grade were never written.
//   (b) The live milestone properties (assessment_started_date /
//       assessment_completed_date, D-0061) are LATEST-WINS. For a family that
//       re-took the assessment, the original dates are simply not recoverable
//       from HubSpot — HubSpot overwrote them. They ARE recoverable from Atlas,
//       because every `assessment_sessions` row keeps its own true started_at /
//       completed_at and no attempt is ever deduped or overwritten. So the
//       first-attempt dates and the attempt count come from the ATLAS session
//       history, via fetchAttemptHistory() + toCrmSummary(), never from the
//       HubSpot fields.
//
// WHAT IT TOUCHES
//   HubSpot contact properties ONLY, and only via a PATCH on a contact that
//   ALREADY EXISTS. No create path, deliberately: a contact bearing an
//   atlas_account_id is the proof that a consented parent account exists (see
//   syncContact.ts). No Supabase row is written by this script at all.
//
// COMPLIANCE (D-0055 / D-0061, CLAUDE.md guardrails 1-3)
//   HubSpot receives EXACTLY: child first name, child grade, assessment dates,
//   attempt count. No level, band, score, strand or response — and not because
//   a filter strips them, but because the only shapes that reach the payload
//   builder are `ChildCrmRecord` and `AttemptCrmSummary`, neither of which has
//   a field one could travel in. `AssessmentAttempt` (which DOES carry the
//   assessed level, for the Atlas-only staff view) is converted to a summary at
//   the read boundary in readAccount() below and never leaves this file.
//
// SAFETY MODEL
//   * DRY RUN BY DEFAULT. With no flags it reads, prints the exact PATCH body
//     it would send per contact, and writes nothing anywhere.
//   * Writing needs TWO explicit flags: --apply --confirm. `--apply` alone is
//     REFUSED, not downgraded. There is NO environment variable that enables
//     writes — parseArgs() reads argv and nothing else.
//   * Target is explicit: --target=local (default) or --target=prod, with the
//     same local/prod URL cross-check as the re-clamp backfill.
//   * --limit=N and --account=<uuid> exist so the first real run can be one
//     contact.
//   * The three attempt properties DO NOT EXIST in portal 245446396 yet.
//     HubSpot rejects an entire PATCH containing one unknown property, so
//     sending them early would also take down the child fields in the same
//     request. They are therefore withheld unless
//     HUBSPOT_ATTEMPT_PROPERTIES_LIVE=true is set in the target env file — the
//     same schema-readiness gate the live path uses (src/lib/env.ts). That gate
//     only WIDENS the property set; it can never turn a dry run into a write.
//
// RUN (review):
//   pnpm backfill:hubspot:dry
//   pnpm backfill:hubspot:dry -- --target=prod
//   pnpm backfill:hubspot:dry -- --target=prod --account=<uuid>
//   pnpm backfill:hubspot:dry -- --target=prod --limit=5
//
// RUN (founder-gated, later):
//   pnpm backfill:hubspot -- --target=prod --account=<uuid> --apply --confirm

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  fetchAttemptHistory,
  toCrmSummary,
  type AttemptCrmSummary,
} from "../../src/lib/assessmentHistory/attempts";
import type { ChildCrmRecord } from "../../src/lib/hubspot/childFields";
import {
  findContactIdByAtlasAccountId,
  requestWithRetry,
} from "../../src/lib/hubspot/syncContact";
import type { Database } from "../../src/lib/supabase/database.types";
import {
  planAccount,
  parseArgs,
  resolveMode,
  SKIP_EXPLANATION,
  type BackfillArgs,
  type BackfillPlanRow,
} from "./backfillPlan";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LOCAL_DEFAULT_URL = "http://127.0.0.1:54321";
const RULE = "=".repeat(78);

// ---------------------------------------------------------------------------
// Credentials — parse the env file directly, never mutate process.env.
// Same shape as scripts/backfill/reclamp-railed-placements.ts; each script in
// this repo carries its own loader rather than sharing one.
// ---------------------------------------------------------------------------

function parseEnvFile(fileName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(REPO_ROOT, fileName);
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

interface Context {
  client: SupabaseClient<Database>;
  url: string;
  hubspotToken: string;
  attemptPropertiesLive: boolean;
}

function makeContext(target: BackfillArgs["target"]): Context {
  const envFile = target === "prod" ? ".env.prod.local" : ".env.local";
  const env = parseEnvFile(envFile);
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ?? (target === "local" ? LOCAL_DEFAULT_URL : "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hubspotToken = (env.HUBSPOT_ATLAS_SYNC_TOKEN ?? "").trim();

  if (!url) throw new Error(`${envFile}: NEXT_PUBLIC_SUPABASE_URL is missing`);
  if (!key) throw new Error(`${envFile}: SUPABASE_SERVICE_ROLE_KEY is missing`);
  if (!hubspotToken) {
    throw new Error(
      `${envFile}: HUBSPOT_ATLAS_SYNC_TOKEN is missing. Even the DRY RUN needs it — ` +
        `"would write" is only true if a contact with that atlas_account_id actually ` +
        `exists, and only HubSpot can answer that. The token is read here and used ` +
        `for READS ONLY unless --apply --confirm are both given.`,
    );
  }

  const looksLocal = /(127\.0\.0\.1|localhost)/.test(url);
  if (target === "prod" && looksLocal) {
    throw new Error(`--target=prod but ${envFile} resolves to a LOCAL url: ${url}`);
  }
  if (target === "local" && !looksLocal) {
    throw new Error(
      `--target=local but ${envFile} resolves to a NON-local url: ${url}. ` +
        `Refusing — pass --target=prod deliberately if that is what you mean.`,
    );
  }

  return {
    client: createClient<Database>(url, key, { auth: { persistSession: false } }),
    url,
    hubspotToken,
    // Mirrors isHubspotAttemptPropertiesLive() in src/lib/env.ts, read from the
    // env FILE because this script never mutates process.env.
    attemptPropertiesLive: env.HUBSPOT_ATTEMPT_PROPERTIES_LIVE === "true",
  };
}

function fail<T>(
  res: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}

// ---------------------------------------------------------------------------
// Read side — the ONLY place an AssessmentAttempt exists, and it is narrowed
// to an AttemptCrmSummary before anything HubSpot-bound sees it.
// ---------------------------------------------------------------------------

interface AccountRead {
  accountId: string;
  email: string;
  contactId: string | null;
  children: ChildCrmRecord[];
  archivedChildCount: number;
  childSummaries: AttemptCrmSummary[];
}

async function readAccount(
  ctx: Context,
  parent: { id: string; email: string },
): Promise<AccountRead> {
  // archived_at IS NULL matches every parent-facing read in the app: a
  // soft-deleted child must not newly populate a HubSpot slot, and their
  // attempts are excluded from the totals for the same reason.
  const rows = fail(
    await ctx.client
      .from("children")
      .select("id, name, grade_level, created_at, archived_at")
      .eq("parent_id", parent.id)
      .order("created_at", { ascending: true }),
    `read children for ${parent.id}`,
  ) as Array<{
    id: string;
    name: string;
    grade_level: string | null;
    created_at: string;
    archived_at: string | null;
  }>;

  const active = rows.filter((r) => r.archived_at === null);

  const children: ChildCrmRecord[] = [];
  const childSummaries: AttemptCrmSummary[] = [];
  for (const row of active) {
    children.push({ firstName: row.name, grade: row.grade_level });
    // fetchAttemptHistory returns AssessmentAttempt[], which carries the
    // assessed level. It is consumed by toCrmSummary() on the SAME line and is
    // never stored, logged, or handed onward. Do not hoist it to a variable.
    childSummaries.push(toCrmSummary(await fetchAttemptHistory(ctx.client, row.id)));
  }

  return {
    accountId: parent.id,
    email: parent.email,
    contactId:
      (await findContactIdByAtlasAccountId(ctx.hubspotToken, parent.id)) ?? null,
    children,
    archivedChildCount: rows.length - active.length,
    childSummaries,
  };
}

// ---------------------------------------------------------------------------
// Write side — one PATCH per contact, only ever under --apply --confirm.
// ---------------------------------------------------------------------------

async function applyRow(ctx: Context, row: BackfillPlanRow): Promise<boolean> {
  if (row.contactId === null) return false; // unreachable for would-write rows
  const res = await requestWithRetry(
    ctx.hubspotToken,
    "PATCH",
    `/crm/v3/objects/contacts/${encodeURIComponent(row.contactId)}`,
    { properties: row.properties },
    "child+attempt backfill",
  );
  if (!res) return false; // threw — already logged by requestWithRetry
  if (!res.ok) {
    console.error(
      `  ${row.accountId}: PATCH failed (status ${res.status}) — NOT retried further`,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printRow(row: BackfillPlanRow, email: string): void {
  console.log(`  account ${row.accountId}  <${email}>`);
  console.log(`    hubspot contact  ${row.contactId ?? "—"}`);
  console.log(`    would PATCH      ${JSON.stringify(row.properties)}`);
  console.log(
    `    atlas history    attempts=${row.summary.attemptCount}` +
      `  firstStarted=${row.summary.firstStartedAt ?? "—"}` +
      `  firstCompleted=${row.summary.firstCompletedAt ?? "—"}`,
  );
  for (const note of row.notes) console.log(`    note             ${note}`);
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = resolveMode(args);
  if (mode.kind === "refused") throw new Error(mode.reason);
  const willWrite = mode.kind === "apply";

  const ctx = makeContext(args.target);

  console.log("");
  console.log(RULE);
  console.log(`  HUBSPOT BACKFILL: child fields + attempt history — ${args.target.toUpperCase()}`);
  console.log(`  supabase : ${ctx.url}`);
  console.log(`  mode     : ${willWrite ? "!!! LIVE WRITE TO HUBSPOT !!!" : "DRY RUN (no writes)"}`);
  console.log(
    `  attempt properties : ${ctx.attemptPropertiesLive ? "LIVE (will be included)" : "WITHHELD (not yet created in portal 245446396)"}`,
  );
  if (args.accountId) console.log(`  account  : ${args.accountId}`);
  if (args.limit !== null) console.log(`  limit    : ${args.limit}`);
  console.log(RULE);
  console.log("");

  let query = ctx.client
    .from("parents")
    .select("id, email")
    .order("created_at", { ascending: true });
  if (args.accountId) query = query.eq("id", args.accountId);
  if (args.limit !== null) query = query.limit(args.limit);

  const parents = fail(await query, "read parents") as Array<{
    id: string;
    email: string;
  }>;

  console.log(`Parent accounts scanned: ${parents.length}`);
  console.log("");

  const planned: Array<{ row: BackfillPlanRow; email: string }> = [];
  for (const parent of parents) {
    const read = await readAccount(ctx, parent);
    planned.push({
      email: read.email,
      row: planAccount({
        accountId: read.accountId,
        contactId: read.contactId,
        children: read.children,
        archivedChildCount: read.archivedChildCount,
        childSummaries: read.childSummaries,
        attemptPropertiesLive: ctx.attemptPropertiesLive,
      }),
    });
  }

  const toWrite = planned.filter((p) => p.row.verdict === "would-write");
  const skipped = planned.filter((p) => p.row.verdict === "skipped");

  if (toWrite.length > 0) {
    console.log(`WOULD WRITE (${toWrite.length}):`);
    console.log("");
    for (const { row, email } of toWrite) printRow(row, email);
  } else {
    console.log("WOULD WRITE: none.");
    console.log("");
  }

  if (skipped.length > 0) {
    console.log(`SKIPPED (${skipped.length}) — nothing was written for these:`);
    for (const { row, email } of skipped) {
      const reason = row.skipReason;
      console.log(
        `  ${row.accountId}  <${email}>  ${reason}: ${reason ? SKIP_EXPLANATION[reason] : ""}`,
      );
    }
    console.log("");
  }

  console.log("-".repeat(78));
  console.log(
    `SUMMARY  scanned: ${planned.length}   would write: ${toWrite.length}   skipped: ${skipped.length}`,
  );
  for (const reason of Object.keys(SKIP_EXPLANATION) as Array<
    keyof typeof SKIP_EXPLANATION
  >) {
    const n = skipped.filter((p) => p.row.skipReason === reason).length;
    if (n > 0) console.log(`           skipped/${reason}: ${n}`);
  }
  console.log("-".repeat(78));
  console.log("");

  if (!willWrite) {
    console.log("DRY RUN — nothing was written to HubSpot or Supabase.");
    console.log("To apply (after founder review): --apply --confirm");
    return;
  }

  console.log(`Applying ${toWrite.length} PATCH(es)...`);
  let applied = 0;
  for (const { row } of toWrite) {
    if (await applyRow(ctx, row)) {
      applied++;
      console.log(`  ${row.accountId}: ok`);
    }
  }
  console.log("");
  console.log(`Done. ${applied}/${toWrite.length} contact(s) updated.`);
}

main().catch((e: unknown) => {
  console.error("");
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
