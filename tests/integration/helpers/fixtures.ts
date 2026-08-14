// Fixture graph for the RLS suite: 2 tenants x 2 centers x 2 parents x children.
//
// Built service-role, with a per-run random suffix so concurrent or repeated
// runs never collide on the unique tenant slug. Deliberately does NOT reuse
// supabase/seed.sql — that is 329 KB of question bank with a single shared
// tenant, which is both slow and useless for tenant-isolation assertions.

import { randomUUID } from "node:crypto";

import { serviceClient } from "./supabase";

export interface Party {
  email: string;
  password: string;
  authUserId: string;
  parentId: string;
  tenantId: string;
  centerId: string;
  childId: string;
}

export interface Fixture {
  a: Party;
  b: Party;
  cleanup: () => Promise<void>;
}

const PASSWORD = "atlas-integration-pw-9f2b";

/** Throw on error rather than let a silent fixture failure look like a pass. */
function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[fixtures] ${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`[fixtures] ${what}: no data returned`);
  return res.data;
}

async function buildParty(label: string, suffix: string): Promise<Party> {
  const svc = serviceClient();
  const email = `atlas-${label}-${suffix}@integration.local`;

  const tenant = must(
    await svc
      .from("tenants")
      .insert({ slug: `it-${label}-${suffix}`, display_name: `IT ${label} ${suffix}` })
      .select("id")
      .single(),
    `create tenant ${label}`,
  ) as { id: string };

  const center = must(
    await svc
      .from("centers")
      .insert({ tenant_id: tenant.id, name: `IT Center ${label}`, status: "ACTIVE" })
      .select("id")
      .single(),
    `create center ${label}`,
  ) as { id: string };

  // A real auth user, pre-confirmed so signInWithPassword works with no inbox.
  const { data: created, error: authErr } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authErr || !created?.user) {
    throw new Error(`[fixtures] create auth user ${label}: ${authErr?.message ?? "no user"}`);
  }

  const parent = must(
    await svc
      .from("parents")
      .insert({
        auth_user_id: created.user.id,
        tenant_id: tenant.id,
        home_center_id: center.id,
        email,
        name: `IT Parent ${label}`,
      })
      .select("id")
      .single(),
    `create parent ${label}`,
  ) as { id: string };

  const child = must(
    await svc
      .from("children")
      .insert({
        tenant_id: tenant.id,
        parent_id: parent.id,
        home_center_id: center.id,
        name: `IT Child ${label}`,
        birth_year: 2018,
        grade_level: "2",
      })
      .select("id")
      .single(),
    `create child ${label}`,
  ) as { id: string };

  return {
    email,
    password: PASSWORD,
    authUserId: created.user.id,
    parentId: parent.id,
    tenantId: tenant.id,
    centerId: center.id,
    childId: child.id,
  };
}

export async function buildFixture(): Promise<Fixture> {
  const suffix = randomUUID().slice(0, 8);
  const a = await buildParty("a", suffix);
  const b = await buildParty("b", suffix);

  return {
    a,
    b,
    cleanup: async () => {
      const svc = serviceClient();
      // tenants cascade to centers, parents and children.
      await svc.from("tenants").delete().in("id", [a.tenantId, b.tenantId]);
      for (const party of [a, b]) {
        await svc.auth.admin.deleteUser(party.authUserId).catch(() => undefined);
      }
    },
  };
}
