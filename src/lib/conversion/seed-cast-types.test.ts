import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Seed cast-type guard (process-hardening). seed.sql casts values to enum types by name
// (e.g. v.representation::representation_kind). A cast to a type that does NOT exist —
// a typo like `::representation` (the enum is `representation_kind`) — is invalid SQL that
// ONLY surfaces on a real `supabase db reset`, not in the static seed tests. That exact
// typo shipped in #192 and broke the db-reset path. This guard scans every `::<type>` cast
// in seed.sql and fails if the target is neither a Postgres builtin nor a type declared by
// a migration (create type / create domain), so the class fails CI instead of at reset.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const SEED = path.join(REPO_ROOT, "supabase", "seed.sql");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

// Builtins that appear (or plausibly appear) as a single-identifier cast target in seed.
const BUILTIN_TYPES = new Set([
  "jsonb", "json", "text", "uuid", "boolean", "bool", "date", "bytea", "inet",
  "int", "int2", "int4", "int8", "integer", "smallint", "bigint",
  "real", "float4", "float8", "numeric", "decimal",
  "char", "character", "varchar", "timestamptz", "timestamp", "time", "interval",
]);

/** Type names a migration declares via `create type X ...` / `create domain X ...`. */
function declaredTypes(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    for (const m of sql.matchAll(/create\s+(?:type|domain)\s+([a-z_][a-z0-9_]*)/gi)) {
      out.add(m[1].toLowerCase());
    }
  }
  return out;
}

describe("seed.sql casts only to types that exist in the schema", () => {
  it("every ::<type> cast target is a builtin or a migration-declared type", () => {
    const known = new Set([...BUILTIN_TYPES, ...declaredTypes()]);
    const seed = readFileSync(SEED, "utf8");
    const offenders = new Set<string>();
    for (const m of seed.matchAll(/::([a-z_][a-z0-9_]*)/g)) {
      const ty = m[1].toLowerCase();
      if (!known.has(ty)) offenders.add(ty);
    }
    expect(
      [...offenders],
      `seed.sql casts to type(s) not declared by any migration and not a builtin — likely a ` +
        `typo (the cast will fail on \`supabase db reset\`). Fix the cast or add the type's migration:\n  ` +
        [...offenders].join(", "),
    ).toEqual([]);
  });
});
