// RENDERED consent-text guard (AMENDMENT-20260825-2334-ATLAS item 3).
//
// WHY THIS FILE EXISTS
// --------------------
// The COPPA consent paragraph on /signup is the text a parent legally agrees
// to when they tick the box. It was rendering with two words fused together
// ("I willregister") in production while every existing test passed.
//
// The 71-assertion verbatim test (src/app/(auth)/coppa/disclosure-copy.test.ts)
// could never have caught it: it guards a DIFFERENT surface — it compares the
// /coppa page's copy CONSTANTS against the shipped PDF's bytes. It contains
// zero references to signup, renders nothing, and compares string-to-string.
// The signup consent paragraph is inline JSX with `{...}` expression children,
// so the only way to know what a parent actually sees is to RENDER it.
//
// That is what this file does, and it is deliberately assertion-on-output:
// it renders the real component and inspects the resulting text, so any future
// interpolation or JSX-whitespace error fails the build instead of shipping.

import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The server action pulls the server-only Supabase/analytics chain in; stub it
// so this stays a pure render test.
vi.mock("./actions", () => ({
  signupAction: vi.fn(),
}));

import { SignupForm } from "./signup-form";

/** Render the form and flatten it to the visible text a parent would read. */
function renderedText(): string {
  const html = renderToString(<SignupForm centerName="S.A.M New York" />);
  return html
    .replace(/<[^>]*>/g, "") // strip tags — adjacent tags must not invent spaces
    .replace(/&rsquo;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("signup COPPA consent — RENDERED output", () => {
  it("renders 'I will register' as two words, not fused", () => {
    const text = renderedText();
    expect(text).toContain("the child(ren) I will register.");
    expect(text).not.toContain("willregister");
  });

  it("renders a space between the product name and the following word", () => {
    const text = renderedText();
    // The tenant product name is interpolated mid-sentence; the join is the
    // exact place a separator goes missing.
    expect(text).toContain("I authorize S.A.M New York Math Assessment to share");
    expect(text).not.toContain("Assessmentto");
  });

  // AMENDMENT item 4. The email field said "Parent Email Address" while the two
  // name fields said only "First Name"/"Last Name" — no signal to the parent
  // that those fields are about them. A parent entering their child's name
  // there is the observed consequence.
  it("qualifies the name fields as the PARENT's, in both label and placeholder", () => {
    const text = renderedText();
    expect(text).toContain("Parent’s First Name");
    expect(text).toContain("Parent’s Last Name");

    const html = renderToString(<SignupForm centerName="S.A.M New York" />);
    expect(html).toContain('placeholder="Enter parent&#x27;s first name"');
    expect(html).toContain('placeholder="Enter parent&#x27;s last name"');
  });

  it("contains no fused word pair anywhere in the consent paragraph", () => {
    const text = renderedText();
    // Generic backstop: a lowercase letter immediately followed by an
    // uppercase one mid-word is the signature of a missing separator around an
    // interpolated value (e.g. "AssessmentTo", "guardianS.A.M").
    const consent = text.slice(
      text.indexOf("I am the parent or legal guardian"),
      text.indexOf("full COPPA disclosure"),
    );
    expect(consent.length).toBeGreaterThan(100); // guard against a vacuous slice
    const fused = consent.match(/[a-z][A-Z]/g) ?? [];
    expect(fused).toEqual([]);
  });
});
