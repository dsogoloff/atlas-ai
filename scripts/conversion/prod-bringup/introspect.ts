// Atlas Assessment — prod bring-up schema introspection (shared lib for 06 / 07).
//
// TWO ASYMMETRIC CHANNELS (a hard environment constraint, not a choice):
//
//   LOCAL  (127.0.0.1:54322, the post-reset full-migration DB = CANONICAL "expected")
//     Direct Postgres (`pg`). Full catalog: tables, columns (format_type/default/
//     nullability), enum types+values, pg_policies, RLS-enabled flags, constraints,
//     indexes. This is the source of truth for every comparison and every DDL string.
//
//   PROD   (ntfaqzueppqymfkefadm, read-only)
//     .env.prod.local carries ONLY the PostgREST URL + service-role key — there is NO
//     prod DB password / connection string and NO exec_sql RPC (same wall the bank
//     loader hit). So prod is introspected via the PostgREST OpenAPI spec
//     (`GET /rest/v1/`), which exposes: public tables, their columns (type via `format`,
//     nullability via `required[]`, sometimes `default`), and ENUM VALUES for every
//     enum-typed exposed column. It does NOT expose RLS policy bodies, constraints, or
//     indexes.
//
//   Consequence: prod RLS/constraint state cannot be READ here. That is fine because the
//   generated catch-up DDL is SELF-GUARDING at apply-time in Studio (CREATE TABLE/COLUMN
//   IF NOT EXISTS, ALTER TYPE ADD VALUE IF NOT EXISTS, DO-block `pg_policies` checks) —
//   idempotency holds against prod's real catalog even though we could not pre-read it.
//   The asymmetry is reported explicitly by 06/07, never hidden.

import pg from "pg";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../activation-image-set";

export const LOCAL_DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export interface Column {
  name: string;
  type: string; // DDL-ready: local = format_type(...) ; prod = OpenAPI `format`
  nullable: boolean;
  default: string | null; // local = pg_get_expr(...) ; prod = OpenAPI `default` (best-effort)
  ordinal: number;
}

export interface Policy {
  table: string;
  name: string;
  permissive: "PERMISSIVE" | "RESTRICTIVE";
  roles: string[];
  cmd: string; // SELECT | INSERT | UPDATE | DELETE | ALL
  using: string | null;
  withCheck: string | null;
}

export interface ConstraintDef {
  table: string;
  name: string;
  contype: string; // p | u | c | f
  def: string; // pg_get_constraintdef
}

export interface IndexDef {
  table: string;
  name: string;
  def: string; // pg_get_indexdef
  isPrimary: boolean;
  backsConstraint: boolean;
}

export interface Schema {
  source: "local" | "prod";
  /** table -> (column name -> Column) */
  tables: Map<string, Map<string, Column>>;
  /** enum type name (schema-stripped) -> ordered values */
  enums: Map<string, string[]>;
  /** local only (prod: empty) */
  policies: Policy[];
  /** local only: tables with relrowsecurity = true */
  rlsEnabled: Set<string>;
  /** local only, best-effort */
  constraints: ConstraintDef[];
  /** local only, best-effort */
  indexes: IndexDef[];
  /** prod: only enums reachable through an exposed column are visible */
  enumsComplete: boolean;
  /** prod: false — PostgREST cannot read pg_policies */
  policiesReadable: boolean;
}

/** Parse a .env file into a plain map WITHOUT mutating process.env (local + prod creds
 *  must stay independent — same pattern as 05-load-bank-prod.ts). */
export function parseEnvFile(fileName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const file = path.join(REPO_ROOT, fileName);
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

/** Local DB connection string: env override, else .env.local DATABASE_URL/SUPABASE_DB_URL,
 *  else the standard supabase-local superuser DSN. Refuses a non-local host. */
export function localConnString(): string {
  const env = parseEnvFile(".env.local");
  const dsn =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    env.SUPABASE_DB_URL ||
    env.DATABASE_URL ||
    LOCAL_DEFAULT_DB_URL;
  if (!/127\.0\.0\.1|localhost/.test(dsn)) {
    throw new Error(`local DSN must point at 127.0.0.1/localhost, got '${dsn}'. The local DB is the canonical expected schema; refusing a remote source.`);
  }
  return dsn;
}

/** Prod DIRECT Postgres DSN from the gitignored .env.prod.local (PROD_DATABASE_URL).
 *  This is the high-fidelity prod read channel — full pg_catalog/pg_policies, unlike the
 *  PostgREST OpenAPI spec which only exposes API-granted tables. Refuses a local DSN. */
export function prodConnString(): string {
  const env = parseEnvFile(".env.prod.local");
  const dsn = process.env.PROD_DATABASE_URL || env.PROD_DATABASE_URL || "";
  if (!dsn) throw new Error(".env.prod.local is missing PROD_DATABASE_URL (direct Postgres DSN).");
  if (/127\.0\.0\.1|localhost/.test(dsn)) {
    throw new Error(`PROD_DATABASE_URL points at localhost (${dsn}); refusing — that is not prod.`);
  }
  return dsn;
}

/** Prod PostgREST creds from the gitignored .env.prod.local. Refuses a local/empty URL. */
export function prodCreds(): { url: string; key: string } {
  const env = parseEnvFile(".env.prod.local");
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error(".env.prod.local is missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`prod URL is local/empty (${url}); populate .env.prod.local with the PROD url. Aborting.`);
  }
  return { url, key };
}

/** Strip a leading `public.` schema qualifier (prod OpenAPI qualifies enum types). */
export function stripSchema(t: string): string {
  return t.replace(/^public\./i, "");
}

/** Coerce a Postgres array value to string[]. node-pg parses known array OIDs (text[]),
 *  but `name[]` (pg_policies.roles) arrives as the raw literal `{a,b}`. */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    const inner = v.replace(/^\{/, "").replace(/\}$/, "").trim();
    if (!inner) return [];
    return inner.split(",").map((s) => s.replace(/^"(.*)"$/, "$1").trim());
  }
  return [];
}

/** Loose type normaliser for divergence detection ONLY (never for DDL): strip schema,
 *  strip length/precision parens, collapse whitespace, lowercase. Calibrated against
 *  prod OpenAPI vs local format_type — they match verbatim apart from the schema prefix. */
export function normalizeType(t: string): string {
  return stripSchema(t).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

// ------------------------------------------------------------- SQL (local + prod)

/** Full-fidelity schema introspection over a direct Postgres connection. Works for any
 *  database (local OR prod-direct). `ssl` should be set for remote/prod hosts. */
export async function introspectSql(
  connString: string,
  source: "local" | "prod",
  opts: { ssl?: boolean } = {},
): Promise<Schema> {
  const client = new pg.Client({
    connectionString: connString,
    ...(opts.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  await client.connect();
  try {
    const tables = new Map<string, Map<string, Column>>();

    const cols = await client.query<{
      table_name: string; column_name: string; col_type: string;
      not_null: boolean; col_default: string | null; attnum: number;
    }>(`
      SELECT c.relname AS table_name, a.attname AS column_name,
             format_type(a.atttypid, a.atttypmod) AS col_type,
             a.attnotnull AS not_null,
             pg_get_expr(d.adbin, d.adrelid) AS col_default,
             a.attnum
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY c.relname, a.attnum`);
    for (const r of cols.rows) {
      if (!tables.has(r.table_name)) tables.set(r.table_name, new Map());
      tables.get(r.table_name)!.set(r.column_name, {
        name: r.column_name, type: r.col_type, nullable: !r.not_null,
        default: r.col_default, ordinal: r.attnum,
      });
    }

    const enums = new Map<string, string[]>();
    const en = await client.query<{ enum_name: string; value: string }>(`
      SELECT t.typname AS enum_name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder`);
    for (const r of en.rows) {
      if (!enums.has(r.enum_name)) enums.set(r.enum_name, []);
      enums.get(r.enum_name)!.push(r.value);
    }

    const policies: Policy[] = [];
    const pol = await client.query<{
      tablename: string; policyname: string; permissive: string;
      roles: unknown; cmd: string; qual: string | null; with_check: string | null;
    }>(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname = 'public'
      ORDER BY tablename, policyname`);
    for (const r of pol.rows) {
      policies.push({
        table: r.tablename, name: r.policyname,
        permissive: r.permissive === "RESTRICTIVE" ? "RESTRICTIVE" : "PERMISSIVE",
        roles: toStringArray(r.roles), cmd: r.cmd, using: r.qual, withCheck: r.with_check,
      });
    }

    const rlsEnabled = new Set<string>();
    const rls = await client.query<{ relname: string; relrowsecurity: boolean }>(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'`);
    for (const r of rls.rows) if (r.relrowsecurity) rlsEnabled.add(r.relname);

    const constraints: ConstraintDef[] = [];
    const con = await client.query<{ table_name: string; conname: string; contype: string; def: string }>(`
      SELECT con.conrelid::regclass::text AS table_name, con.conname,
             con.contype::text AS contype, pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_namespace n ON n.oid = con.connamespace
      JOIN pg_class c ON c.oid = con.conrelid
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY 1, 2`);
    for (const r of con.rows) {
      constraints.push({ table: stripSchema(r.table_name).replace(/"/g, ""), name: r.conname, contype: r.contype, def: r.def });
    }

    const indexes: IndexDef[] = [];
    const idx = await client.query<{
      tbl: string; idx: string; def: string; isprimary: boolean; backs: string | null;
    }>(`
      SELECT c.relname AS tbl, i.relname AS idx, pg_get_indexdef(i.oid) AS def,
             x.indisprimary AS isprimary,
             (SELECT con.conname FROM pg_constraint con WHERE con.conindid = i.oid LIMIT 1) AS backs
      FROM pg_index x
      JOIN pg_class i ON i.oid = x.indexrelid
      JOIN pg_class c ON c.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname, i.relname`);
    for (const r of idx.rows) {
      indexes.push({ table: r.tbl, name: r.idx, def: r.def, isPrimary: r.isprimary, backsConstraint: r.backs !== null });
    }

    return { source, tables, enums, policies, rlsEnabled, constraints, indexes, enumsComplete: true, policiesReadable: true };
  } finally {
    await client.end();
  }
}

/** Local canonical schema (no SSL). */
export function introspectLocal(connString: string): Promise<Schema> {
  return introspectSql(connString, "local");
}

/** Prod schema via DIRECT Postgres (SSL). High-fidelity — replaces the OpenAPI channel. */
export function introspectProdSql(connString: string): Promise<Schema> {
  return introspectSql(connString, "prod", { ssl: true });
}

// ---------------------------------------------------------------------------- PROD

interface OpenApiProp { type?: string; format?: string; default?: unknown; enum?: string[]; description?: string }
interface OpenApiDef { properties?: Record<string, OpenApiProp>; required?: string[] }
interface OpenApiSpec { definitions?: Record<string, OpenApiDef> }

export async function introspectProd(url: string, key: string): Promise<Schema> {
  const res = await fetch(url.replace(/\/$/, "") + "/rest/v1/", {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`prod OpenAPI fetch failed: HTTP ${res.status} ${res.statusText}`);
  const spec = (await res.json()) as OpenApiSpec;
  const defs = spec.definitions ?? {};

  const tables = new Map<string, Map<string, Column>>();
  const enums = new Map<string, string[]>();

  for (const [tn, def] of Object.entries(defs)) {
    const required = new Set(def.required ?? []);
    const cols = new Map<string, Column>();
    let ord = 0;
    for (const [cn, prop] of Object.entries(def.properties ?? {})) {
      ord += 1;
      const rawType = prop.format ?? prop.type ?? "unknown";
      cols.set(cn, {
        name: cn,
        type: stripSchema(rawType),
        nullable: !required.has(cn),
        default: prop.default === undefined ? null : String(prop.default),
        ordinal: ord,
      });
      // Enum values surface on enum-typed columns: format is the (schema-qualified) type.
      if (Array.isArray(prop.enum) && prop.format) {
        const name = stripSchema(prop.format);
        const set = enums.get(name) ?? [];
        for (const v of prop.enum) if (!set.includes(v)) set.push(v);
        enums.set(name, set);
      }
    }
    tables.set(tn, cols);
  }

  return {
    source: "prod", tables, enums,
    policies: [], rlsEnabled: new Set(), constraints: [], indexes: [],
    enumsComplete: false, policiesReadable: false,
  };
}
