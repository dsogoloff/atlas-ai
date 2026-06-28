// Atlas Assessment — BANK flag-level parity (shared by 10/11).
//
// Compares the question bank PROD vs the audited LOCAL bank, keyed by `external_id` (NOT
// row counts — count parity already passed yet missed half-flagged held items). Both sides
// read via DIRECT Postgres.
//
// CANONICAL = LOCAL, but INVARIANT-NORMALIZED: the hard rule `is_active=false ⟹
// short_test_eligible=false` wins. LOCAL itself stores key-driven `short_test_eligible`
// that can be TRUE on held/inactive rows (observed on the held set + others); the bank's
// non-servable items must be fully false in prod (defence in depth, not just is_active).
// So for any LOCAL-inactive row the canonical short flag is FALSE regardless of the raw
// key-driven value. This matches the remediation rule "held/inactive -> both false".
//
// The `format` column is of enum type `question_format`; we compare it as text.
// `content_id` uuids differ per DB (the loader remaps by code), so we compare the natural
// `tax_content.code`, never the uuid. `image_path` lives in `questions.content` JSONB and
// is compared present/absent only (it is content, not a flag).

import pg from "pg";

export const TENANT_SLUG = "inspirea_singapore_math";
export const PLACEHOLDER_PREFIX = "PLACEHOLDER-";

/** Founder-named held set — must be non-servable (both flags false) in prod. */
export const HELD_SET = ["SAM-L1-Q06", "SAM-L1-Q08", "SAM-L1-Q18", "SAM-L3-Q19", "SAM-L4-Q17"];

/** Display order for the per-level rollup. Unknown levels are appended, sorted. */
const LEVEL_ORDER = ["0A", "0B", "0C", "KA", "KB", "1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "6A"];
export function levelSort(a: string, b: string): number {
  const ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

export interface BankRow {
  externalId: string;
  isActive: boolean;
  shortEligible: boolean; // RAW value as stored
  level: string;
  strand: string;
  contentCode: string | null; // tax_content.code (uuid-independent)
  format: string | null; // question_format enum as text; null if the column is absent
  hasImage: boolean; // content->>'image_path' non-empty
}

export interface BankRead {
  rows: Map<string, BankRow>;
  formatColType: string | null; // format col type in this DB, or null if absent
}

function client(dsn: string, ssl: boolean): pg.Client {
  return new pg.Client({ connectionString: dsn, ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}) });
}

export async function readBank(dsn: string, ssl: boolean): Promise<BankRead> {
  const c = client(dsn, ssl);
  await c.connect();
  try {
    const tid = (await c.query("select id from tenants where slug=$1", [TENANT_SLUG])).rows[0]?.id;
    if (!tid) throw new Error(`tenant '${TENANT_SLUG}' not found`);
    const formatColType =
      (await c.query(
        `select format_type(a.atttypid,a.atttypmod) ty
         from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='public' and c.relname='questions' and a.attname='format' and not a.attisdropped`,
      )).rows[0]?.ty ?? null;

    const res = await c.query(
      `select q.external_id, q.is_active, q.short_test_eligible,
              q.level::text as level, q.strand::text as strand,
              ${formatColType ? "q.format::text" : "null::text"} as format,
              tc.code as content_code,
              (coalesce(q.content->>'image_path','') <> '') as has_image
       from questions q
       left join tax_content tc on tc.id = q.content_id
       where q.tenant_id=$1 and q.external_id not like '${PLACEHOLDER_PREFIX}%'`,
      [tid],
    );
    const rows = new Map<string, BankRow>();
    for (const r of res.rows) {
      rows.set(r.external_id, {
        externalId: r.external_id,
        isActive: r.is_active,
        shortEligible: r.short_test_eligible,
        level: r.level,
        strand: r.strand,
        contentCode: r.content_code,
        format: r.format,
        hasImage: r.has_image,
      });
    }
    return { rows, formatColType };
  } finally {
    await c.end();
  }
}

/** prod tax_content code -> id, for remapping content_id in remediation UPDATEs. */
export async function readContentCodeMap(dsn: string, ssl: boolean): Promise<Map<string, string>> {
  const c = client(dsn, ssl);
  await c.connect();
  try {
    const tid = (await c.query("select id from tenants where slug=$1", [TENANT_SLUG])).rows[0]?.id;
    const res = await c.query("select code, id from tax_content where tenant_id=$1", [tid]);
    return new Map(res.rows.map((r) => [r.code as string, r.id as string]));
  } finally {
    await c.end();
  }
}

/** Invariant-normalized canonical short flag: false whenever the row is inactive. */
export function canonicalShort(local: BankRow): boolean {
  return local.isActive ? local.shortEligible : false;
}

export type FieldName = "is_active" | "short_test_eligible" | "level" | "strand" | "content_id" | "question_format" | "image_path";
export interface FieldDrift { field: FieldName; local: string; prod: string }
export type Status = "MATCH" | "DRIFT" | "MISSING_IN_PROD" | "EXTRA_IN_PROD";

export interface RowVerdict {
  externalId: string;
  status: Status;
  drifts: FieldDrift[];
  localInactive: boolean; // local says is_active=false -> remediation forces both flags false
}

const b = (v: boolean) => (v ? "true" : "false");
const img = (v: boolean) => (v ? "present" : "absent");

/** Compare one prod row against the invariant-normalized local canonical. */
export function compareRow(local: BankRow, prod: BankRow): FieldDrift[] {
  const d: FieldDrift[] = [];
  const lShort = canonicalShort(local);
  if (local.isActive !== prod.isActive) d.push({ field: "is_active", local: b(local.isActive), prod: b(prod.isActive) });
  if (lShort !== prod.shortEligible) d.push({ field: "short_test_eligible", local: b(lShort), prod: b(prod.shortEligible) });
  if (local.level !== prod.level) d.push({ field: "level", local: local.level, prod: prod.level });
  if (local.strand !== prod.strand) d.push({ field: "strand", local: local.strand, prod: prod.strand });
  if ((local.contentCode ?? "") !== (prod.contentCode ?? "")) d.push({ field: "content_id", local: local.contentCode ?? "∅", prod: prod.contentCode ?? "∅" });
  if ((local.format ?? "") !== (prod.format ?? "")) d.push({ field: "question_format", local: local.format ?? "∅", prod: prod.format ?? "∅" });
  if (local.hasImage !== prod.hasImage) d.push({ field: "image_path", local: img(local.hasImage), prod: img(prod.hasImage) });
  return d;
}

export function compareBank(local: Map<string, BankRow>, prod: Map<string, BankRow>): RowVerdict[] {
  const out: RowVerdict[] = [];
  for (const [eid, lr] of [...local].sort((a, b2) => a[0].localeCompare(b2[0]))) {
    const pr = prod.get(eid);
    if (!pr) { out.push({ externalId: eid, status: "MISSING_IN_PROD", drifts: [], localInactive: !lr.isActive }); continue; }
    const drifts = compareRow(lr, pr);
    out.push({ externalId: eid, status: drifts.length ? "DRIFT" : "MATCH", drifts, localInactive: !lr.isActive });
  }
  for (const eid of [...prod.keys()].sort()) {
    if (!local.has(eid)) out.push({ externalId: eid, status: "EXTRA_IN_PROD", drifts: [], localInactive: false });
  }
  return out;
}

/** Raw invariant violators (is_active=false AND short_test_eligible=true). */
export function invariantViolators(rows: Map<string, BankRow>): string[] {
  return [...rows.values()].filter((r) => !r.isActive && r.shortEligible).map((r) => r.externalId).sort();
}

/** Per-level rollup of RAW active + short counts. */
export interface LevelRoll { level: string; active: number; short: number }
export function levelRollup(rows: Map<string, BankRow>): Map<string, LevelRoll> {
  const m = new Map<string, LevelRoll>();
  for (const r of rows.values()) {
    const e = m.get(r.level) ?? { level: r.level, active: 0, short: 0 };
    if (r.isActive) e.active += 1;
    if (r.shortEligible) e.short += 1;
    m.set(r.level, e);
  }
  return m;
}
