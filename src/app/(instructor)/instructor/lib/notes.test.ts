// notes tests.
//
// The write-shape (buildNoteInsert) is the security-relevant surface: the
// author, tenant, and authoring center MUST come from the server-resolved
// instructor identity, never from caller input, so a client can't forge a
// note as another instructor or write into another tenant/center. RLS is
// the final gate, but shaping it correctly here keeps the app from ever
// submitting a wrong row.

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import type { InstructorIdentity } from "./instructor";
import { buildNoteInsert, fetchNotesForChild } from "./notes";

const INSTRUCTOR: InstructorIdentity = {
  id: "instr-1",
  tenant_id: "tenant-1",
  center_id: "center-1",
  name: "Ms. Tan",
};

describe("buildNoteInsert", () => {
  it("takes author / tenant / center from the resolved identity and trims the body", () => {
    const row = buildNoteInsert(INSTRUCTOR, "child-9", "  needs fraction review  ");

    expect(row).toEqual({
      instructor_id: "instr-1",
      child_id: "child-9",
      tenant_id: "tenant-1",
      authored_at_center_id: "center-1",
      body: "needs fraction review",
    });
  });

  it("never lets the body override the scoping ids", () => {
    // Even a body containing id-like text can't change the trusted fields.
    const row = buildNoteInsert(INSTRUCTOR, "child-9", "instructor_id: other");
    expect(row.instructor_id).toBe("instr-1");
    expect(row.tenant_id).toBe("tenant-1");
    expect(row.authored_at_center_id).toBe("center-1");
  });
});

describe("fetchNotesForChild", () => {
  function makeClient(rows: unknown[]): SupabaseClient<Database> {
    const fake = {
      from() {
        const result = { data: rows, error: null };
        const builder: Record<string, unknown> = {};
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.order = () => Promise.resolve(result);
        return builder;
      },
    };
    return fake as unknown as SupabaseClient<Database>;
  }

  it("tags the caller's own notes as editable and others as read-only", async () => {
    const client = makeClient([
      {
        id: "n-1",
        body: "mine",
        created_at: "2026-05-20T10:00:00.000Z",
        instructor_id: "instr-1",
      },
      {
        id: "n-2",
        body: "colleague's",
        created_at: "2026-05-19T10:00:00.000Z",
        instructor_id: "instr-2",
      },
    ]);

    const notes = await fetchNotesForChild(client, "child-9", "instr-1");

    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ id: "n-1", body: "mine", mine: true });
    expect(notes[1]).toMatchObject({ id: "n-2", mine: false });
  });

  it("returns an empty list when there are no notes", async () => {
    const client = makeClient([]);
    expect(await fetchNotesForChild(client, "child-9", "instr-1")).toEqual([]);
  });
});
