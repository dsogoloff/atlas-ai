// ATLAS-002 / ATLAS-017 — adversarial RLS + column-scope tests.
//
// These run against a REAL Supabase stack with REAL GoTrue JWTs, so each
// "attack" below is the literal HTTP request a signed-in parent's browser could
// issue against PostgREST. That matters: the audit finding is specifically that
// server-action allowlists do not protect the direct PostgREST interface, so a
// test that went through the app's own code would prove nothing.
//
// ASSERTION STYLE. Every adversarial case asserts the SECURITY PROPERTY — the
// stored value did not change — rather than a particular SQLSTATE. The defence
// is layered (column privilege, then RLS policy, then trigger) and which layer
// fires first is an implementation detail we should be free to change. Where
// rejection is guaranteed to be a hard error rather than a silent zero-row
// filter, that is asserted too.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildFixture, type Fixture } from "./helpers/fixtures";
import { anonClient, serviceClient, signInAs } from "./helpers/supabase";

let fx: Fixture;
/** Parent A's authenticated client — the attacker in every adversarial case. */
let asA: Awaited<ReturnType<typeof signInAs>>;

beforeAll(async () => {
  fx = await buildFixture();
  asA = await signInAs(fx.a.email, fx.a.password);
});

afterAll(async () => {
  await fx?.cleanup();
});

/** Ground truth, read service-role so RLS cannot mask a successful write. */
async function readParent(id: string) {
  const { data, error } = await serviceClient()
    .from("parents")
    .select("id, tenant_id, home_center_id, subscription_tier, email, name")
    .eq("id", id)
    .single();
  if (error) throw new Error(`readParent: ${error.message}`);
  return data as Record<string, string | null>;
}

async function readChild(id: string) {
  const { data, error } = await serviceClient()
    .from("children")
    .select(
      "id, tenant_id, parent_id, home_center_id, prior_center_id, center_changed_at, name, birth_year, grade_level, archived_at, archived_by",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`readChild: ${error.message}`);
  return data as Record<string, string | number | null> | null;
}

// ===========================================================================
// Adversarial — every one of these must fail at the DATABASE boundary
// ===========================================================================

describe("ATLAS-002 adversarial — parents", () => {
  it("(a) Parent A cannot escalate by PATCHing tenant_id on their OWN row", async () => {
    // THE HEADLINE EXPLOIT. app_current_tenant_id() reads parents.tenant_id, so
    // a successful write here would redefine the attacker's own tenant scope
    // and every tenant-scoped policy would then evaluate against tenant B.
    const before = await readParent(fx.a.parentId);

    const { error } = await asA
      .from("parents")
      .update({ tenant_id: fx.b.tenantId })
      .eq("id", fx.a.parentId);

    expect(error).not.toBeNull(); // privilege denial, not a silent no-op
    const after = await readParent(fx.a.parentId);
    expect(after.tenant_id).toBe(before.tenant_id);
    expect(after.tenant_id).not.toBe(fx.b.tenantId);
  });

  it("(a2) Parent A cannot move their own home_center_id", async () => {
    const before = await readParent(fx.a.parentId);
    await asA
      .from("parents")
      .update({ home_center_id: fx.b.centerId })
      .eq("id", fx.a.parentId);
    expect((await readParent(fx.a.parentId)).home_center_id).toBe(before.home_center_id);
  });

  it("(b) Parent A cannot update Parent B's row", async () => {
    const before = await readParent(fx.b.parentId);
    await asA.from("parents").update({ name: "pwned" }).eq("id", fx.b.parentId);
    expect((await readParent(fx.b.parentId)).name).toBe(before.name);
  });

  it("(f) Parent A cannot raise their own subscription_tier", async () => {
    // subscription_tier is single-valued ('PILOT') today, so this asserts the
    // MUTATION IS REFUSED rather than that a specific tier was rejected — the
    // guarantee has to hold on the day a second tier ships.
    const before = await readParent(fx.a.parentId);
    expect(before.subscription_tier).toBe("PILOT");

    const { error } = await asA
      .from("parents")
      .update({ subscription_tier: "PREMIUM" })
      .eq("id", fx.a.parentId);

    expect(error).not.toBeNull();
    expect((await readParent(fx.a.parentId)).subscription_tier).toBe("PILOT");
  });
});

describe("ATLAS-002 adversarial — children", () => {
  it("(c) Parent A cannot update Child B", async () => {
    const before = await readChild(fx.b.childId);
    await asA.from("children").update({ name: "pwned" }).eq("id", fx.b.childId);
    expect((await readChild(fx.b.childId))!.name).toBe(before!.name);
  });

  it("(d) Parent A cannot READ Child B, or B's sessions", async () => {
    const { data: kids } = await asA.from("children").select("id").eq("id", fx.b.childId);
    expect(kids ?? []).toEqual([]);

    // The whole of A's visible roster is A's own children — never B's.
    const { data: allKids } = await asA.from("children").select("id, parent_id");
    for (const row of (allKids ?? []) as Array<{ parent_id: string }>) {
      expect(row.parent_id).toBe(fx.a.parentId);
    }

    const { data: sessions } = await asA
      .from("assessment_sessions")
      .select("id")
      .eq("child_id", fx.b.childId);
    expect(sessions ?? []).toEqual([]);
  });

  const LOCKED_COLUMNS: Array<[string, () => Record<string, string>]> = [
    ["tenant_id", () => ({ tenant_id: fx.b.tenantId })],
    ["home_center_id", () => ({ home_center_id: fx.b.centerId })],
    ["prior_center_id", () => ({ prior_center_id: fx.b.centerId })],
    ["center_changed_at", () => ({ center_changed_at: new Date().toISOString() })],
    ["parent_id", () => ({ parent_id: fx.b.parentId })],
  ];

  for (const [column, patch] of LOCKED_COLUMNS) {
    it(`(e) Parent A cannot PATCH children.${column} on their own child`, async () => {
      const before = await readChild(fx.a.childId);

      const { error } = await asA.from("children").update(patch()).eq("id", fx.a.childId);
      expect(error).not.toBeNull(); // column privilege refuses the statement

      const after = await readChild(fx.a.childId);
      expect(after![column]).toEqual(before![column]);
    });
  }

  it("(g) Parent A cannot hard-DELETE their own child", async () => {
    // Soft delete is the product behaviour (#203). A hard delete would cascade
    // assessment_sessions and question_access_log, destroying the history the
    // archive design exists to retain for staff.
    await asA.from("children").delete().eq("id", fx.a.childId);
    expect(await readChild(fx.a.childId)).not.toBeNull();
  });

  it("(h) archived_by is FORCED to the acting parent, never the supplied value", async () => {
    const { error } = await asA
      .from("children")
      .update({ archived_at: new Date().toISOString(), archived_by: fx.b.parentId })
      .eq("id", fx.a.childId);
    expect(error).toBeNull(); // the archive itself is legitimate and succeeds

    const after = await readChild(fx.a.childId);
    expect(after!.archived_at).not.toBeNull();
    expect(after!.archived_by).toBe(fx.a.parentId);
    expect(after!.archived_by).not.toBe(fx.b.parentId);

    // Restore for later assertions.
    await serviceClient()
      .from("children")
      .update({ archived_at: null, archived_by: null })
      .eq("id", fx.a.childId);
  });

  it("(g2) an anonymous caller can neither read nor write children", async () => {
    const anon = anonClient();
    const { data } = await anon.from("children").select("id");
    expect(data ?? []).toEqual([]);
    await anon.from("children").update({ name: "pwned" }).eq("id", fx.a.childId);
    expect((await readChild(fx.a.childId))!.name).not.toBe("pwned");
  });
});

// ===========================================================================
// Legitimate paths — these must keep working, or the lockdown broke the product
// ===========================================================================

describe("ATLAS-002 legitimate parent paths still work", () => {
  it("(i) creating a child derives tenant_id and home_center_id from the parent", async () => {
    // Send DELIBERATELY WRONG server-controlled values, exactly as a malicious
    // client would; the BEFORE INSERT trigger must overwrite both.
    const { data, error } = await asA
      .from("children")
      .insert({
        parent_id: fx.a.parentId,
        tenant_id: fx.b.tenantId, // lie
        home_center_id: fx.b.centerId, // lie
        name: "IT Created Child",
        birth_year: 2019,
        grade_level: "1",
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    const created = await readChild((data as { id: string }).id);
    expect(created!.tenant_id).toBe(fx.a.tenantId);
    expect(created!.home_center_id).toBe(fx.a.centerId);
    expect(created!.parent_id).toBe(fx.a.parentId);
    expect(created!.archived_at).toBeNull();

    await serviceClient().from("children").delete().eq("id", (data as { id: string }).id);
  });

  it("(i2) a parent cannot create a child owned by another parent", async () => {
    const { error } = await asA.from("children").insert({
      parent_id: fx.b.parentId,
      tenant_id: fx.b.tenantId,
      name: "IT Smuggled Child",
      birth_year: 2019,
      grade_level: "1",
    });
    expect(error).not.toBeNull();

    const { count } = await serviceClient()
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", fx.b.parentId);
    expect(count).toBe(1); // B still has exactly the fixture child
  });

  it("(j) editing name / birth_year / grade_level succeeds", async () => {
    const { error } = await asA
      .from("children")
      .update({ name: "Renamed Child", birth_year: 2017, grade_level: "3" })
      .eq("id", fx.a.childId);
    expect(error).toBeNull();

    const after = await readChild(fx.a.childId);
    expect(after!.name).toBe("Renamed Child");
    expect(after!.birth_year).toBe(2017);
    expect(after!.grade_level).toBe("3");
  });

  it("(k) soft-delete sets archived_at and stamps archived_by with the parent", async () => {
    const { error } = await asA
      .from("children")
      .update({ archived_at: new Date().toISOString(), archived_by: fx.a.parentId })
      .eq("id", fx.a.childId)
      .is("archived_at", null);
    expect(error).toBeNull();

    const after = await readChild(fx.a.childId);
    expect(after!.archived_at).not.toBeNull();
    expect(after!.archived_by).toBe(fx.a.parentId);
  });
});
