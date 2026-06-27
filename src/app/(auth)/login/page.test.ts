// LoginPage already-signed-in routing.
//
// The anonymous-only gate used to hard-redirect a signed-in user to
// /dashboard, ignoring ?next= — so an authenticated admin/instructor following
// /login?next=/admin landed on the parent dashboard (and errored). The gate now
// honours the VALIDATED next (still same-origin-guarded), falling back to
// /dashboard. redirect() throws in Next, so each case asserts the throw + target.

import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const mockCreateClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// The signed-in branch never renders the form, but the page imports it at
// module load — stub it so the test stays free of client-only deps.
vi.mock("./login-form", () => ({ LoginForm: () => null }));

import { redirect } from "next/navigation";

import LoginPage from "./page";

const redirectMock = vi.mocked(redirect);

function clientWithUser(user: { id: string } | null): SupabaseClient<Database> {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
  } as unknown as SupabaseClient<Database>;
}

afterEach(() => {
  redirectMock.mockClear();
  mockCreateClient.mockReset();
});

describe("LoginPage — already-signed-in redirect honours the validated next", () => {
  it("authenticated user with ?next=/admin lands on /admin", async () => {
    mockCreateClient.mockResolvedValue(clientWithUser({ id: "u1" }));

    await expect(
      LoginPage({ searchParams: Promise.resolve({ next: "/admin" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("authenticated user with no next falls back to /dashboard", async () => {
    mockCreateClient.mockResolvedValue(clientWithUser({ id: "u1" }));

    await expect(
      LoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("authenticated user with an off-origin next is bounced to /dashboard (same-origin guard)", async () => {
    mockCreateClient.mockResolvedValue(clientWithUser({ id: "u1" }));

    await expect(
      LoginPage({ searchParams: Promise.resolve({ next: "//evil.example.com" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
