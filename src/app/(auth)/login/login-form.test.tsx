// Login form — email-confirmed banner + prefill.
//
// After /auth/confirm verifies an email it routes to /login?confirmed=1[&email].
// The form then shows an informational success banner and prefills the email.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// LoginForm is a client component: stub the router, the login action, and Link
// so renderToStaticMarkup runs in the node test env.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ children }: { children?: unknown }) => children,
}));
vi.mock("./actions", () => ({ loginAction: vi.fn() }));

import { LoginForm } from "./login-form";

describe("LoginForm — email-confirmed banner", () => {
  it("shows the confirmed banner and prefills the email when confirmed", () => {
    const html = renderToStaticMarkup(
      <LoginForm next="/dashboard" confirmed confirmedEmail="parent@example.com" />,
    );

    expect(html).toContain("Email confirmed");
    expect(html).toContain("please sign in to continue");
    expect(html).toContain("parent@example.com");
  });

  it("omits the banner (and prefills nothing) when not confirmed", () => {
    const html = renderToStaticMarkup(<LoginForm next="/dashboard" />);

    expect(html).not.toContain("Email confirmed");
    expect(html).not.toContain("parent@example.com");
  });

  it("shows the 'Password updated' banner when reset", () => {
    const html = renderToStaticMarkup(<LoginForm next="/dashboard" reset />);

    expect(html).toContain("Password updated");
    expect(html).toContain("please sign in");
  });

  it("omits the reset banner by default", () => {
    const html = renderToStaticMarkup(<LoginForm next="/dashboard" />);

    expect(html).not.toContain("Password updated");
  });

  it("always offers a 'Forgot your password?' link", () => {
    // next/link is mocked to render only its children, so we assert the link
    // text (the href to /forgot-password is verified structurally in the form).
    const html = renderToStaticMarkup(<LoginForm next="/dashboard" />);

    expect(html).toContain("Forgot your password?");
  });
});
