// resolveStaff tests.
//
// resolveStaff unifies the two staff identities behind one resolver: an
// instructor (center-scoped) or an admin (tenant-scoped). RLS scopes each
// underlying read to the caller's own row, so a given auth user resolves to
// exactly one — or neither (no access). These tests pin the discrimination
// and the ACTIVE-status gate; the actual row scoping is RLS's job at the DB.

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { resolveStaff } from "./instructor";

// Fake RLS-scoped client. resolveInstructor / resolveStaff read a single row
// per table via .select(...).maybeSingle(). The closure returns the first row
// for the named table, or null.
function makeClient(rows: {
  instructors?: unknown[];
  admins?: unknown[];
}): SupabaseClient<Database> {
  const fake = {
    from(table: string) {
      const list = (rows as Record<string, unknown[]>)[table] ?? [];
      const single = list.length > 0 ? list[0] : null;
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.maybeSingle = () =>
        Promise.resolve({ data: single, error: null });
      return builder;
    },
  };
  return fake as unknown as SupabaseClient<Database>;
}

describe("resolveStaff", () => {
  it("resolves an active instructor as kind 'instructor' with center scope", async () => {
    const client = makeClient({
      instructors: [
        {
          id: "i-1",
          tenant_id: "t-1",
          center_id: "ctr-1",
          name: "Dev Instructor",
          status: "ACTIVE",
        },
      ],
      admins: [],
    });

    expect(await resolveStaff(client)).toEqual({
      kind: "instructor",
      id: "i-1",
      tenant_id: "t-1",
      center_id: "ctr-1",
      name: "Dev Instructor",
    });
  });

  it("resolves an active admin as kind 'admin' (tenant scope, no center) when there is no instructor row", async () => {
    const client = makeClient({
      instructors: [],
      admins: [
        { id: "a-1", tenant_id: "t-1", name: "Dev Admin", status: "ACTIVE" },
      ],
    });

    const staff = await resolveStaff(client);

    expect(staff).toEqual({
      kind: "admin",
      id: "a-1",
      tenant_id: "t-1",
      name: "Dev Admin",
    });
    expect(staff?.center_id).toBeUndefined();
  });

  it("returns null for an INACTIVE admin", async () => {
    const client = makeClient({
      instructors: [],
      admins: [
        { id: "a-1", tenant_id: "t-1", name: "Dev Admin", status: "INACTIVE" },
      ],
    });

    expect(await resolveStaff(client)).toBeNull();
  });

  it("returns null when the caller is neither an active instructor nor an active admin", async () => {
    const client = makeClient({ instructors: [], admins: [] });
    expect(await resolveStaff(client)).toBeNull();
  });
});
