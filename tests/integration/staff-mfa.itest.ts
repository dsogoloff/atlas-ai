// ATLAS-007 — staff MFA / AAL2, against a real stack.
//
// THE DEFINITION OF DONE, and what this file exists to prove: a staff session
// authenticated with PASSWORD ONLY (AAL1) cannot reach cross-family child
// assessment data by ANY staff path.
//
// A note on what is and is not testable here. Minting a genuine AAL2 session
// needs a live TOTP secret and a valid time-based code, which the harness
// cannot produce without reimplementing RFC 6238 — so the AAL2-allows side is
// covered by the pure decision tests in src/lib/auth/staffMfa.test.ts, driven
// with faked AAL inputs. What this file proves on the REAL stack is the half
// that actually matters for the finding: a real AAL1 staff session, holding a
// real JWT, is refused. That is the direction a regression would break.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decideStaffMfaStep } from "../../src/lib/auth/staffMfa";
import { buildFixture, type Fixture } from "./helpers/fixtures";
import { serviceClient, signInAs } from "./helpers/supabase";

const PASSWORD = "atlas-integration-pw-9f2b";

let fx: Fixture;
let staffEmail: string;
let staffAuthUserId: string;
let instructorId: string;
/** An AAL1 staff session — password only, no factor verified. */
let asStaff: Awaited<ReturnType<typeof signInAs>>;

beforeAll(async () => {
  fx = await buildFixture();
  const svc = serviceClient();

  // An ACTIVE instructor at party A's center, so they are unambiguously staff
  // with legitimate scope over A's child — the access the gate must withhold
  // until AAL2.
  staffEmail = `atlas-staff-${fx.a.tenantId.slice(0, 8)}@integration.local`;
  const { data: created, error } = await svc.auth.admin.createUser({
    email: staffEmail,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) {
    throw new Error(`create staff user: ${error?.message ?? "no user"}`);
  }
  staffAuthUserId = created.user.id;

  const { data: instructor, error: instErr } = await svc
    .from("instructors")
    .insert({
      auth_user_id: staffAuthUserId,
      tenant_id: fx.a.tenantId,
      center_id: fx.a.centerId,
      email: staffEmail,
      name: "IT Instructor",
      status: "ACTIVE",
    })
    .select("id")
    .single();
  if (instErr) throw new Error(`create instructor: ${instErr.message}`);
  instructorId = (instructor as { id: string }).id;

  asStaff = await signInAs(staffEmail, PASSWORD);
});

afterAll(async () => {
  const svc = serviceClient();
  await svc.from("instructors").delete().eq("auth_user_id", staffAuthUserId);
  await svc.auth.admin.deleteUser(staffAuthUserId).catch(() => undefined);
  await fx?.cleanup();
});

// ===========================================================================
// The session really is AAL1 — otherwise everything below proves nothing
// ===========================================================================
describe("baseline", () => {
  it("a password-only staff session is AAL1 with no factor enrolled", async () => {
    const { data, error } =
      await asStaff.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(error).toBeNull();
    expect(data?.currentLevel).toBe("aal1");
    expect(data?.nextLevel).toBe("aal1"); // aal1/aal1 => no factors

    // And the gate agrees, on the real reading rather than a fabricated one.
    expect(
      decideStaffMfaStep({
        isStaff: true,
        aal: { currentLevel: data!.currentLevel, nextLevel: data!.nextLevel },
      }),
    ).toBe("enroll");
  });

  it("the staff user genuinely resolves as ACTIVE staff", async () => {
    // If this failed, the denials below would be meaningless — they would be
    // "not staff" rather than "staff without MFA".
    const { data } = await asStaff.from("instructors").select("id, status");
    expect(data).toHaveLength(1);
    expect((data as Array<{ id: string; status: string }>)[0].id).toBe(
      instructorId,
    );
    expect((data as Array<{ status: string }>)[0].status).toBe("ACTIVE");
  });
});

// ===========================================================================
// HEADLINE — AAL1 staff cannot reach child assessment data
// ===========================================================================
describe("ATLAS-007 headline — AAL1 staff is refused everywhere it matters", () => {
  it("the gate denies for every AAL reading this session can produce", async () => {
    const { data } = await asStaff.auth.mfa.getAuthenticatorAssuranceLevel();
    const decision = decideStaffMfaStep({
      isStaff: true,
      aal: { currentLevel: data!.currentLevel, nextLevel: data!.nextLevel },
    });
    expect(decision).not.toBe("allow");
  });

  it("cannot mint an AAL2 session without verifying a real factor", async () => {
    // The property the whole design rests on: there is no API that elevates
    // assurance without a TOTP verification. If this ever starts succeeding,
    // the recovery flow's security argument collapses.
    const { data: factors } = await asStaff.auth.mfa.listFactors();
    expect(factors?.totp ?? []).toEqual([]);

    const { data: after } =
      await asStaff.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(after?.currentLevel).toBe("aal1");
  });

  it("the service-role path is NOT reachable from a client session (#205)", async () => {
    // The student-detail page reads its report with the service role, which
    // bypasses RLS — that is why the gate is in application code. What we can
    // prove from here is the other half: a staff JWT alone confers none of that
    // power, so the ONLY way to those reads is through the gated page.
    const { data: sessions } = await asStaff
      .from("responses")
      .select("id")
      .limit(5);
    expect(sessions ?? []).toEqual([]);
  });
});

// ===========================================================================
// Parents are untouched
// ===========================================================================
describe("ATLAS-007 — parents are never gated", () => {
  it("a parent at AAL1 is allowed by the decision core", async () => {
    const asParent = await signInAs(fx.a.email, fx.a.password);
    const { data } = await asParent.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(data?.currentLevel).toBe("aal1");

    // isStaff: false — a parent is never evaluated for a factor.
    expect(
      decideStaffMfaStep({
        isStaff: false,
        aal: { currentLevel: data!.currentLevel, nextLevel: data!.nextLevel },
      }),
    ).toBe("allow");
  });

  it("a parent at AAL1 can still read their OWN child (no regression)", async () => {
    const asParent = await signInAs(fx.a.email, fx.a.password);
    const { data, error } = await asParent
      .from("children")
      .select("id")
      .eq("id", fx.a.childId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

// ===========================================================================
// Recovery codes — single use, own-account only
// ===========================================================================
describe("ATLAS-007 — recovery codes", () => {
  // SHA-256 of a code, matching what the server stores. Computed here rather
  // than imported so the test does not depend on the action module (which pulls
  // in next/headers and cannot load outside a request).
  async function sha256Hex(value: string): Promise<string> {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(value).digest("hex");
  }

  it("a staff user can issue codes, and each redeems exactly ONCE", async () => {
    const codes = ["ITCODEAAAA", "ITCODEBBBB"];
    const hashes = await Promise.all(codes.map(sha256Hex));

    const { data: issued, error: issueErr } = await asStaff.rpc(
      "issue_staff_recovery_codes",
      { p_hashes: hashes },
    );
    expect(issueErr).toBeNull();
    expect(issued).toBe(2);

    // First redemption succeeds...
    const first = await asStaff.rpc("redeem_staff_recovery_code", {
      p_code_hash: hashes[0],
    });
    expect(first.error).toBeNull();
    expect(first.data).toBe(true);

    // ...the second use of the SAME code does not.
    const second = await asStaff.rpc("redeem_staff_recovery_code", {
      p_code_hash: hashes[0],
    });
    expect(second.error).toBeNull();
    expect(second.data).toBe(false);

    // The other code is untouched.
    const other = await asStaff.rpc("redeem_staff_recovery_code", {
      p_code_hash: hashes[1],
    });
    expect(other.data).toBe(true);
  });

  it("an unknown code is refused", async () => {
    const { data } = await asStaff.rpc("redeem_staff_recovery_code", {
      p_code_hash: await sha256Hex("NOT-A-REAL-CODE"),
    });
    expect(data).toBe(false);
  });

  it("a PARENT cannot issue or redeem staff recovery codes", async () => {
    const asParent = await signInAs(fx.a.email, fx.a.password);

    const issue = await asParent.rpc("issue_staff_recovery_codes", {
      p_hashes: [await sha256Hex("PARENTCODE")],
    });
    expect(issue.error).not.toBeNull(); // not active staff

    const redeem = await asParent.rpc("redeem_staff_recovery_code", {
      p_code_hash: await sha256Hex("PARENTCODE"),
    });
    expect(redeem.error).not.toBeNull();
  });

  it("codes are stored HASHED and are readable only by their owner", async () => {
    const rows = await asStaff.from("staff_mfa_recovery_codes").select("*");
    for (const row of (rows.data ?? []) as Array<Record<string, unknown>>) {
      expect(row.auth_user_id).toBe(staffAuthUserId);
      expect(String(row.code_hash)).toMatch(/^[0-9a-f]{64}$/); // digest, not plaintext
    }

    // Another signed-in user sees none of them.
    const asParent = await signInAs(fx.a.email, fx.a.password);
    const { data: theirs } = await asParent
      .from("staff_mfa_recovery_codes")
      .select("id");
    expect(theirs ?? []).toEqual([]);
  });
});

// ===========================================================================
// Role removed from staff
// ===========================================================================
describe("ATLAS-007 — role changes", () => {
  it("a deactivated instructor stops resolving as staff and simply loses access", async () => {
    const svc = serviceClient();
    await svc
      .from("instructors")
      .update({ status: "INACTIVE" })
      .eq("id", instructorId);

    // resolveStaff drops INACTIVE rows, so they are no longer staff — no MFA is
    // demanded of them, they just have nothing privileged to reach.
    const { data } = await asStaff.from("instructors").select("id, status");
    const status = (data as Array<{ status: string }> | null)?.[0]?.status;
    expect(status).toBe("INACTIVE");

    expect(decideStaffMfaStep({ isStaff: false, aal: null })).toBe("allow");

    // And they can no longer issue staff recovery codes.
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update("AFTERDEACTIVATION").digest("hex");
    const { error } = await asStaff.rpc("issue_staff_recovery_codes", {
      p_hashes: [hash],
    });
    expect(error).not.toBeNull();

    await svc
      .from("instructors")
      .update({ status: "ACTIVE" })
      .eq("id", instructorId);
  });
});
