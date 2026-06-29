// Set-new-password form — static render.
//
// Behaviour (updateUser success -> /login?reset=1; validation) is covered by
// actions.test.ts; here we check the form renders both password fields.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./actions", () => ({ resetPassword: vi.fn() }));

import { ResetPasswordForm } from "./reset-password-form";

describe("ResetPasswordForm", () => {
  it("renders new-password and confirm-password fields and an update button", () => {
    const html = renderToStaticMarkup(<ResetPasswordForm />);

    expect(html).toContain('id="password"');
    expect(html).toContain('id="confirm-password"');
    expect(html).toContain("Update password");
  });
});
