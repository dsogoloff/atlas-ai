// ATLAS-007 — MFA route group.
//
// A separate segment on purpose: these pages must be reachable by a staff user
// who is authenticated but still at AAL1, so they cannot live under (admin) or
// (instructor) — both of which are gated — and they are listed in
// MFA_EXEMPT_PREFIXES so the middleware gate skips them too. Without that
// exemption enrolment would be unreachable by definition, and every staff
// account would be permanently locked out at cutover.
//
// No analytics island: this is staff chrome, matching (admin)/(instructor).

export default function MfaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
