// Parent dashboard — staff routing on the "no parent row" branch.
//
// A signed-in admin/instructor legitimately has no parents row. The page used
// to render "Account profile not found / contact support" for them. It now
// resolves the caller's staff identity (resolveStaff) first and redirects an
// admin to /admin and an instructor to /instructor; only a caller who is
// neither a parent NOR active staff still sees the contact-support message.
// A real parent renders the dashboard unchanged.

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const mockCreateClient = vi.fn();
const mockRecover = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

// Orphan self-heal is exercised in recover-profile.test.ts; here we stub it to
// drive the dashboard's recover-then-render vs graceful-message branches.
vi.mock("./recover-profile", () => ({
  recoverParentProfile: (...args: unknown[]) => mockRecover(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Render-only children — stub to null so renderToStaticMarkup stays hermetic;
// the branch assertions key off plain text in the page itself, not these.
vi.mock("next/link", () => ({ default: () => null }));
vi.mock("./child-card", () => ({ ChildCard: () => null }));
vi.mock("./profile-menu", () => ({ ProfileMenu: () => null }));

import { redirect } from "next/navigation";

import ParentDashboardPage from "./page";

const redirectMock = vi.mocked(redirect);

/** Chainable + awaitable query stub: `.maybeSingle()` resolves the single-row
 *  shape; awaiting the builder (after `.order()`/`.in()`) resolves the list
 *  shape. Both read the same configured `data`, so each table is configured
 *  with the shape its call site consumes. */
function chain(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "is"]) b[m] = () => b;
  b.maybeSingle = async () => ({ data, error });
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(res, rej);
  return b;
}

function makeClient(cfg: {
  parent?: unknown;
  parentErr?: unknown;
  instructors?: unknown[];
  admins?: unknown[];
  children?: unknown[];
  sessions?: unknown[];
}): SupabaseClient<Database> {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "u1", email: "u1@atlas.local" } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "parents":
          return chain(cfg.parent ?? null, cfg.parentErr ?? null);
        case "instructors":
          return chain(cfg.instructors?.[0] ?? null);
        case "admins":
          return chain(cfg.admins?.[0] ?? null);
        case "children":
          return chain(cfg.children ?? []);
        case "assessment_sessions":
          return chain(cfg.sessions ?? []);
        default:
          throw new Error(`unexpected table: ${table}`);
      }
    }),
  } as unknown as SupabaseClient<Database>;
}

afterEach(() => {
  redirectMock.mockClear();
  mockCreateClient.mockReset();
  mockRecover.mockReset();
});

describe("ParentDashboardPage — staff routing on the no-parent branch", () => {
  it("redirects an active admin (no parent row) to /admin", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        parent: null,
        admins: [{ id: "a1", tenant_id: "t1", name: "Dev Admin", status: "ACTIVE" }],
      }),
    );

    await expect(ParentDashboardPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("redirects an active instructor (no parent row) to /instructor", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        parent: null,
        instructors: [
          { id: "i1", tenant_id: "t1", center_id: "c1", name: "Dev Instructor", status: "ACTIVE" },
        ],
      }),
    );

    await expect(ParentDashboardPage()).rejects.toThrow("NEXT_REDIRECT:/instructor");
    expect(redirectMock).toHaveBeenCalledWith("/instructor");
  });

  it("renders the dashboard for a real parent (no redirect)", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({ parent: { id: "p1", name: "Pat Parent" }, children: [] }),
    );

    const html = renderToStaticMarkup(await ParentDashboardPage());

    expect(html).toContain("Welcome to the Atlas Family!");
    expect(html).not.toContain("Account profile not found");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("self-heals an orphan (no parent, not staff): recovers the profile and renders the dashboard", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockCreateClient.mockResolvedValue(
      makeClient({ parent: null, instructors: [], admins: [], children: [] }),
    );
    mockRecover.mockResolvedValue({ id: "p9", name: "Recovered Parent" });

    const html = renderToStaticMarkup(await ParentDashboardPage());

    expect(mockRecover).toHaveBeenCalledTimes(1);
    expect(html).toContain("Welcome to the Atlas Family!");
    expect(html).not.toContain("Account profile not found");
    expect(html).not.toContain("finishing setting up");
    expect(redirectMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("shows the graceful 'still setting up' message when orphan recovery fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreateClient.mockResolvedValue(
      makeClient({ parent: null, instructors: [], admins: [] }),
    );
    mockRecover.mockResolvedValue(null);

    const html = renderToStaticMarkup(await ParentDashboardPage());

    expect(mockRecover).toHaveBeenCalledTimes(1);
    // The "Try again" retry lives inside next/link, which is stubbed to null
    // here; assert the message text the page itself renders.
    expect(html).toContain("finishing setting up your account");
    expect(html).not.toContain("Account profile not found");
    expect(redirectMock).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("does not attempt recovery for staff (admin/instructor redirect wins)", async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        parent: null,
        admins: [{ id: "a1", tenant_id: "t1", name: "Dev Admin", status: "ACTIVE" }],
      }),
    );

    await expect(ParentDashboardPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(mockRecover).not.toHaveBeenCalled();
  });
});
