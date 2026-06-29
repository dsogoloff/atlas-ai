// Forgot-password form — static render.
//
// The neutral-success guarantee is enforced in the action (actions.test.ts);
// here we check the request form renders its single email field + submit, and
// surfaces the reset-failed note when arriving from an expired recovery link.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children }: { children?: unknown }) => children,
}));
vi.mock("./actions", () => ({ requestPasswordReset: vi.fn() }));

import { ForgotPasswordForm } from "./forgot-password-form";

describe("ForgotPasswordForm", () => {
  it("renders an email field and a send button", () => {
    const html = renderToStaticMarkup(<ForgotPasswordForm />);

    expect(html).toContain('id="email"');
    expect(html).toContain("Send reset link");
  });

  it("shows the reset-failed note when arriving from an expired link", () => {
    const html = renderToStaticMarkup(<ForgotPasswordForm resetFailed />);

    expect(html).toContain("invalid or expired");
  });

  it("omits the reset-failed note by default", () => {
    const html = renderToStaticMarkup(<ForgotPasswordForm />);

    expect(html).not.toContain("invalid or expired");
  });
});
