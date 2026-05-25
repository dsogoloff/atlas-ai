// Tests for the questions ↔ tax_content bridge added in Phase 7 Part B.
//
// What's tested:
//   1. The migration adds questions.content_id as a NULLABLE uuid FK
//      referencing tax_content(id).
//   2. The migration creates an index on questions(content_id).
//   3. database.types.ts reflects the new shape: content_id is `string | null`
//      and the questions table has a FK relationship to tax_content.
//
// No-orphan guarantee for backfilled content_id is structurally enforced
// by the schema's FK constraint: any UPDATE pointing at a missing
// tax_content row is rejected by Postgres at apply time. The "FK clause
// is present" assertion below proves the constraint exists; `supabase db
// reset` running cleanly proves the backfill itself produced no orphans.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260525000003_bridge_questions_to_tax_content.sql",
);
const TYPES_PATH = resolve(REPO_ROOT, "src/lib/supabase/database.types.ts");

const migration = readFileSync(MIGRATION_PATH, "utf-8");
const types = readFileSync(TYPES_PATH, "utf-8");

describe("questions ↔ tax_content bridge migration", () => {
  it("adds content_id as a nullable uuid FK referencing tax_content(id)", () => {
    // Add-column statement with FK clause. The column is nullable because
    // there is no `not null` in the declaration — tightening would block
    // the question-bank rebuild in later work.
    expect(migration).toMatch(
      /add column content_id uuid references tax_content\(id\)/i,
    );
    // No `not null` in the column declaration — defence against accidental
    // tightening.
    expect(migration).not.toMatch(/content_id uuid[^;]*not null/i);
  });

  it("creates an index on questions(content_id)", () => {
    expect(migration).toMatch(/create index .+ on questions\(content_id\)/i);
  });

  it("prints a backfill summary via raise notice", () => {
    // The brief requires a backfill summary so review can see how many
    // rows matched vs stayed NULL and why. Migration is expected to emit
    // these notices at apply time.
    expect(migration).toMatch(/raise notice[^;]*total=/i);
    expect(migration).toMatch(/raise notice[^;]*null breakdown/i);
  });
});

describe("database.types.ts post-bridge", () => {
  it("questions.content_id is typed string | null", () => {
    // The Row/Insert/Update blocks all carry the nullable type.
    expect(types).toContain("content_id: string | null");
  });

  it("questions has a FK relationship to tax_content via content_id", () => {
    // The generated Relationships array for the questions table now lists
    // a column ["content_id"] referenced relation "tax_content".
    expect(types).toMatch(
      /columns:\s*\["content_id"\][\s\S]{0,200}?referencedRelation:\s*"tax_content"/,
    );
  });
});
