import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // ATLAS-007: updateSession now also applies the OUTER staff-MFA gate on
  // /admin and /instructor. It is belt-and-braces only — the authoritative
  // control is requireStaffAal2 / requireStaffAal2Action inside the pages,
  // server actions and service-client call sites. Middleware sees paths, not
  // intent: it cannot protect a server action (which POSTs to the page's own
  // path) and cannot sit between a page and its service-role reads.
  return updateSession(request);
}

export const config = {
  // Skip static assets, image optimization, and the favicon. Run on
  // everything else so Supabase Auth cookies stay fresh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|img/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
