// ATLAS-013 — child creation and consent are ONE atomic operation.
//
// The invariant under test: a child that requires consent cannot exist unless
// its consent record was written in the same committed transaction. Proving
// that needs a real database — a mocked client cannot roll anything back — so
// these run against the same live stack as the ATLAS-002 suite.
//
// FAILURE INJECTION. The consent INSERT casts p_ip_address to `inet`, and that
// cast is the only one in the function. Passing a malformed address therefore
// fails the CONSENT write specifically, after the child row has already been
// inserted in the same transaction — exactly the crash-in-the-middle the
// finding describes, reproduced deterministically.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildFixture, type Fixture } from "./helpers/fixtures";
import { anonClient, serviceClient, signInAs } from "./helpers/supabase";

const CONSENT_TYPE = "coppa_vpc";

let fx: Fixture;
let asA: Awaited<ReturnType<typeof signInAs>>;

beforeAll(async () => {
  fx = await buildFixture();
  asA = await signInAs(fx.a.email, fx.a.password);
});

afterAll(async () => {
  await fx?.cleanup();
});

/** The consent payload the real action sends, minus the bits under test. */
function consentArgs(overrides: Record<string, unknown> = {}) {
  return {
    p_consent_type: CONSENT_TYPE,
    p_consent_text_version: "2026-06-18.v2",
    p_consent_text: "Integration-test consent text.",
    p_disclosure_version: "coppa-disclosure-v1",
    p_disclosure_content_sha256: "0".repeat(64),
    p_data_uses: ["diagnostic_assessment"],
    p_sharing_permissions: {},
    p_ip_address: "203.0.113.7",
    p_user_agent: "integration-test",
    ...overrides,
  };
}

async function childrenNamed(parentId: string, name: string) {
  const { data, error } = await serviceClient()
    .from("children")
    .select("id, tenant_id, home_center_id, parent_id, name, birth_year, grade_level")
    .eq("parent_id", parentId)
    .eq("name", name);
  if (error) throw new Error(`childrenNamed: ${error.message}`);
  return (data ?? []) as Array<Record<string, string | number | null>>;
}

async function consentsFor(childId: string) {
  const { data, error } = await serviceClient()
    .from("consent_records")
    .select("id, child_id, parent_id, tenant_id, consent_type, revoked")
    .eq("child_id", childId);
  if (error) throw new Error(`consentsFor: ${error.message}`);
  return (data ?? []) as Array<Record<string, string | boolean | null>>;
}

describe("ATLAS-013 — atomicity", () => {
  it("consent failure leaves NO child row behind (the invariant)", async () => {
    const name = "IT Atomic Orphan";

    const { error } = await asA.rpc("create_child_with_consent", {
      p_parent_id: fx.a.parentId,
      p_name: name,
      p_birth_year: 2018,
      p_grade_level: "2",
      ...consentArgs({ p_ip_address: "not-an-ip-address" }),
    });

    // The consent INSERT blew up...
    expect(error).not.toBeNull();
    // ...and took the child INSERT with it. Under the OLD two-step path this
    // is precisely where an unassessable orphan was left behind.
    expect(await childrenNamed(fx.a.parentId, name)).toEqual([]);
  });

  it("happy path writes exactly one child and one consent, correctly linked", async () => {
    const name = "IT Atomic Happy";

    const { data: childId, error } = await asA.rpc("create_child_with_consent", {
      p_parent_id: fx.a.parentId,
      p_name: name,
      p_birth_year: 2019,
      p_grade_level: "1",
      ...consentArgs(),
    });

    expect(error).toBeNull();
    expect(typeof childId).toBe("string");

    const kids = await childrenNamed(fx.a.parentId, name);
    expect(kids).toHaveLength(1);
    expect(kids[0].id).toBe(childId);
    expect(kids[0].grade_level).toBe("1");

    // ATLAS-002 trigger still fired inside the SECURITY DEFINER body: these
    // were never passed in, so they can only have come from the parent row.
    expect(kids[0].tenant_id).toBe(fx.a.tenantId);
    expect(kids[0].home_center_id).toBe(fx.a.centerId);

    const consents = await consentsFor(childId as string);
    expect(consents).toHaveLength(1);
    expect(consents[0].parent_id).toBe(fx.a.parentId);
    expect(consents[0].tenant_id).toBe(fx.a.tenantId);
    expect(consents[0].consent_type).toBe(CONSENT_TYPE);
    expect(consents[0].revoked).toBe(false);
  });
});

describe("ATLAS-013 — idempotency", () => {
  it("two concurrent identical submits yield ONE child and ONE consent", async () => {
    const name = "IT Atomic Double Click";
    const args = {
      p_parent_id: fx.a.parentId,
      p_name: name,
      p_birth_year: 2020,
      p_grade_level: "Pre-K",
      ...consentArgs(),
    };

    // Two tabs / a double-click: genuinely parallel HTTP requests.
    const [first, second] = await Promise.all([
      asA.rpc("create_child_with_consent", args),
      asA.rpc("create_child_with_consent", args),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toBe(second.data); // the SAME child id, not two

    const kids = await childrenNamed(fx.a.parentId, name);
    expect(kids).toHaveLength(1);
    expect(await consentsFor(first.data as string)).toHaveLength(1);
  });

  it("retry after a transient failure leaves no orphan and no duplicate", async () => {
    const name = "IT Atomic Retry";
    const base = {
      p_parent_id: fx.a.parentId,
      p_name: name,
      p_birth_year: 2016,
      p_grade_level: "4",
    };

    const failed = await asA.rpc("create_child_with_consent", {
      ...base,
      ...consentArgs({ p_ip_address: "still-not-an-ip" }),
    });
    expect(failed.error).not.toBeNull();
    expect(await childrenNamed(fx.a.parentId, name)).toEqual([]); // no orphan

    const retried = await asA.rpc("create_child_with_consent", {
      ...base,
      ...consentArgs(),
    });
    expect(retried.error).toBeNull();

    const kids = await childrenNamed(fx.a.parentId, name);
    expect(kids).toHaveLength(1); // no duplicate either
    expect(await consentsFor(retried.data as string)).toHaveLength(1);
  });

  it("a repeat submit of an existing child returns the same id, not a second row", async () => {
    const name = "IT Atomic Repeat";
    const args = {
      p_parent_id: fx.a.parentId,
      p_name: name,
      p_birth_year: 2015,
      p_grade_level: "5",
      ...consentArgs(),
    };

    const first = await asA.rpc("create_child_with_consent", args);
    const second = await asA.rpc("create_child_with_consent", args);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data).toBe(first.data);
    expect(await childrenNamed(fx.a.parentId, name)).toHaveLength(1);
    expect(await consentsFor(first.data as string)).toHaveLength(1);
  });
});

describe("ATLAS-013 — the ATLAS-002 ownership boundary holds through the RPC", () => {
  it("parent A cannot create a child for parent B", async () => {
    // Re-proves the boundary through the NEW path: SECURITY DEFINER bypasses
    // RLS, so this is carried by the function's own check, not by
    // children_parent_insert. If app_current_parent_id() failed to resolve
    // inside the definer body, this would silently succeed.
    const name = "IT Atomic Smuggled";

    const { error } = await asA.rpc("create_child_with_consent", {
      p_parent_id: fx.b.parentId,
      p_name: name,
      p_birth_year: 2018,
      p_grade_level: "2",
      ...consentArgs(),
    });

    expect(error).not.toBeNull();
    expect(await childrenNamed(fx.b.parentId, name)).toEqual([]);

    // B still has only the fixture child.
    const { count } = await serviceClient()
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", fx.b.parentId);
    expect(count).toBe(1);
  });

  it("an anonymous caller cannot execute the RPC at all", async () => {
    const { error } = await anonClient().rpc("create_child_with_consent", {
      p_parent_id: fx.a.parentId,
      p_name: "IT Atomic Anon",
      p_birth_year: 2018,
      p_grade_level: "2",
      ...consentArgs(),
    });

    expect(error).not.toBeNull(); // EXECUTE revoked from anon
    expect(await childrenNamed(fx.a.parentId, "IT Atomic Anon")).toEqual([]);
  });
});
