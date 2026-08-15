// ATLAS-009 — updating a pedagogical note requires CURRENT access to the child,
// not merely having authored it once.
//
// The headline case is the "former instructor": someone who legitimately wrote
// a note, then lost access because the child moved centres. Before the fix that
// UPDATE succeeded — authorship alone carried write rights forever. This suite
// fails loudly if that ever comes back.
//
// Everything runs against a real stack with real instructor JWTs, because the
// control being tested IS the RLS policy. A mocked client would prove nothing.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { serviceClient, signInAs } from "./helpers/supabase";

const PASSWORD = "atlas-integration-pw-9f2b";

interface Staff {
  email: string;
  authUserId: string;
  instructorId: string;
  client: Awaited<ReturnType<typeof signInAs>>;
}

let tenantId: string;
let centerA: string;
let centerB: string;
let parentId: string;
let childId: string;
let noteId: string;

/** Author, at centre A — where the child starts. */
let author: Staff;
/** Unrelated instructor at centre B — never had this child. */
let stranger: Staff;
let adminUserId: string;
let adminClient: Awaited<ReturnType<typeof signInAs>>;

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${what}: no data`);
  return res.data;
}

async function makeInstructor(
  label: string,
  suffix: string,
  centerId: string,
): Promise<Staff> {
  const svc = serviceClient();
  const email = `atlas-note-${label}-${suffix}@integration.local`;
  const { data: created, error } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) {
    throw new Error(`create ${label}: ${error?.message ?? "no user"}`);
  }
  const row = must(
    await svc
      .from("instructors")
      .insert({
        auth_user_id: created.user.id,
        tenant_id: tenantId,
        center_id: centerId,
        email,
        name: `IT ${label}`,
        status: "ACTIVE",
      })
      .select("id")
      .single(),
    `insert instructor ${label}`,
  ) as { id: string };

  return {
    email,
    authUserId: created.user.id,
    instructorId: row.id,
    client: await signInAs(email, PASSWORD),
  };
}

/** Put the child back at centre A with no grace state — the "has access" baseline. */
async function resetChildToCenterA() {
  await serviceClient()
    .from("children")
    .update({
      home_center_id: centerA,
      prior_center_id: null,
      center_changed_at: null,
    })
    .eq("id", childId);
}

async function readNoteBody(): Promise<string> {
  const { data, error } = await serviceClient()
    .from("pedagogical_notes")
    .select("body")
    .eq("id", noteId)
    .single();
  if (error) throw new Error(`readNoteBody: ${error.message}`);
  return (data as { body: string }).body;
}

beforeAll(async () => {
  const svc = serviceClient();
  const suffix = randomUUID().slice(0, 8);

  tenantId = (
    must(
      await svc
        .from("tenants")
        .insert({ slug: `it-note-${suffix}`, display_name: `IT Note ${suffix}` })
        .select("id")
        .single(),
      "tenant",
    ) as { id: string }
  ).id;

  const centers = must(
    await svc
      .from("centers")
      .insert([
        { tenant_id: tenantId, name: "IT Center A", status: "ACTIVE" },
        { tenant_id: tenantId, name: "IT Center B", status: "ACTIVE" },
      ])
      .select("id, name"),
    "centers",
  ) as Array<{ id: string; name: string }>;
  centerA = centers.find((c) => c.name === "IT Center A")!.id;
  centerB = centers.find((c) => c.name === "IT Center B")!.id;

  // Parent + child at centre A.
  const { data: parentUser } = await svc.auth.admin.createUser({
    email: `atlas-note-parent-${suffix}@integration.local`,
    password: PASSWORD,
    email_confirm: true,
  });
  parentId = (
    must(
      await svc
        .from("parents")
        .insert({
          auth_user_id: parentUser!.user!.id,
          tenant_id: tenantId,
          home_center_id: centerA,
          email: `atlas-note-parent-${suffix}@integration.local`,
          name: "IT Note Parent",
        })
        .select("id")
        .single(),
      "parent",
    ) as { id: string }
  ).id;

  childId = (
    must(
      await svc
        .from("children")
        .insert({
          tenant_id: tenantId,
          parent_id: parentId,
          home_center_id: centerA,
          name: "IT Note Child",
          birth_year: 2018,
          grade_level: "2",
        })
        .select("id")
        .single(),
      "child",
    ) as { id: string }
  ).id;

  author = await makeInstructor("author", suffix, centerA);
  stranger = await makeInstructor("stranger", suffix, centerB);

  // An admin, to confirm the admin path is unchanged (read-only on notes).
  const adminEmail = `atlas-note-admin-${suffix}@integration.local`;
  const { data: adminUser } = await svc.auth.admin.createUser({
    email: adminEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  adminUserId = adminUser!.user!.id;
  await svc.from("admins").insert({
    auth_user_id: adminUserId,
    tenant_id: tenantId,
    email: adminEmail,
    name: "IT Note Admin",
    status: "ACTIVE",
  });
  adminClient = await signInAs(adminEmail, PASSWORD);

  // The note, authored while the author legitimately had the child.
  noteId = (
    must(
      await svc
        .from("pedagogical_notes")
        .insert({
          tenant_id: tenantId,
          child_id: childId,
          instructor_id: author.instructorId,
          body: "ORIGINAL",
        })
        .select("id")
        .single(),
      "note",
    ) as { id: string }
  ).id;
});

afterAll(async () => {
  const svc = serviceClient();
  await svc.from("pedagogical_notes").delete().eq("id", noteId);
  await svc.from("instructors").delete().eq("tenant_id", tenantId);
  await svc.from("admins").delete().eq("tenant_id", tenantId);
  await svc.from("tenants").delete().eq("id", tenantId);
  for (const id of [author?.authUserId, stranger?.authUserId, adminUserId]) {
    if (id) await svc.auth.admin.deleteUser(id).catch(() => undefined);
  }
});

// ===========================================================================
// Baseline — the legitimate path must keep working
// ===========================================================================
describe("ATLAS-009 — legitimate editing is unaffected", () => {
  it("the author, with the child CURRENTLY at their centre, can update", async () => {
    await resetChildToCenterA();

    const { error } = await author.client
      .from("pedagogical_notes")
      .update({ body: "EDITED BY AUTHOR" })
      .eq("id", noteId);

    expect(error).toBeNull();
    expect(await readNoteBody()).toBe("EDITED BY AUTHOR");
  });

  it("the author can still READ the note in every case below", async () => {
    const { data } = await author.client
      .from("pedagogical_notes")
      .select("id")
      .eq("id", noteId);
    expect(data).toHaveLength(1);
  });
});

// ===========================================================================
// HEADLINE — the exploit
// ===========================================================================
describe("ATLAS-009 headline — authorship alone does NOT confer edit rights", () => {
  it("a FORMER instructor who AUTHORED the note cannot update it once the child moves centre", async () => {
    await resetChildToCenterA();
    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "BEFORE TRANSFER" })
      .eq("id", noteId);

    // The child transfers to centre B. The author is still ACTIVE, still the
    // author — they simply no longer have this child. Before ATLAS-009 this
    // update SUCCEEDED, which is the whole finding.
    await serviceClient()
      .from("children")
      .update({ home_center_id: centerB })
      .eq("id", childId);

    await author.client
      .from("pedagogical_notes")
      .update({ body: "EDITED AFTER LOSING ACCESS" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("BEFORE TRANSFER");
  });

  it("the same applies during the prior-centre GRACE window (grace is read-only)", async () => {
    // Grace grants READ, never WRITE — app_instructor_can_write_for_child omits
    // the prior-centre branch on purpose. This asserts what that existing
    // predicate already implies; it does not define a new grace rule.
    await serviceClient()
      .from("children")
      .update({
        home_center_id: centerB,
        prior_center_id: centerA,
        center_changed_at: new Date().toISOString(),
      })
      .eq("id", childId);

    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "GRACE BASELINE" })
      .eq("id", noteId);

    await author.client
      .from("pedagogical_notes")
      .update({ body: "EDITED DURING GRACE" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("GRACE BASELINE");

    // ...but the author CAN still read it during grace, unchanged behaviour.
    const { data } = await author.client
      .from("pedagogical_notes")
      .select("id")
      .eq("id", noteId);
    expect(data).toHaveLength(1);
  });

  it("a DEACTIVATED author cannot update (this half already worked — keep it)", async () => {
    await resetChildToCenterA();
    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "ACTIVE BASELINE" })
      .eq("id", noteId);

    await serviceClient()
      .from("instructors")
      .update({ status: "INACTIVE" })
      .eq("id", author.instructorId);

    await author.client
      .from("pedagogical_notes")
      .update({ body: "EDITED WHILE INACTIVE" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("ACTIVE BASELINE");

    await serviceClient()
      .from("instructors")
      .update({ status: "ACTIVE" })
      .eq("id", author.instructorId);
  });
});

// ===========================================================================
// Non-authors and admins
// ===========================================================================
describe("ATLAS-009 — everyone else", () => {
  it("an unrelated instructor cannot update the note", async () => {
    await resetChildToCenterA();
    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "STRANGER BASELINE" })
      .eq("id", noteId);

    await stranger.client
      .from("pedagogical_notes")
      .update({ body: "EDITED BY STRANGER" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("STRANGER BASELINE");
  });

  it("an instructor at the child's centre who did NOT author it cannot update", async () => {
    // Current access is necessary but not sufficient — authorship is still
    // required. Move the stranger to the child's centre to isolate that half.
    await resetChildToCenterA();
    await serviceClient()
      .from("instructors")
      .update({ center_id: centerA })
      .eq("id", stranger.instructorId);
    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "COLLEAGUE BASELINE" })
      .eq("id", noteId);

    await stranger.client
      .from("pedagogical_notes")
      .update({ body: "EDITED BY COLLEAGUE" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("COLLEAGUE BASELINE");

    await serviceClient()
      .from("instructors")
      .update({ center_id: centerB })
      .eq("id", stranger.instructorId);
  });

  it("an admin can READ notes but not update them (unchanged policy)", async () => {
    await resetChildToCenterA();
    await serviceClient()
      .from("pedagogical_notes")
      .update({ body: "ADMIN BASELINE" })
      .eq("id", noteId);

    const { data: readable } = await adminClient
      .from("pedagogical_notes")
      .select("id")
      .eq("id", noteId);
    expect(readable).toHaveLength(1); // admin SELECT policy still applies

    await adminClient
      .from("pedagogical_notes")
      .update({ body: "EDITED BY ADMIN" })
      .eq("id", noteId);

    expect(await readNoteBody()).toBe("ADMIN BASELINE");
  });

  it("no client role can DELETE a note (no delete policy exists at all)", async () => {
    await resetChildToCenterA();

    for (const client of [author.client, stranger.client, adminClient]) {
      await client.from("pedagogical_notes").delete().eq("id", noteId);
    }

    const { data } = await serviceClient()
      .from("pedagogical_notes")
      .select("id")
      .eq("id", noteId);
    expect(data).toHaveLength(1); // still there
  });
});
