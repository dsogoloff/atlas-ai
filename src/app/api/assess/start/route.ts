// POST /api/assess/start
//
// Thin shell over `sessionStartHandler` (lib/sessionStart/handler.ts).
// All real logic — auth, ownership, existing-session resume, picker,
// audit logging, rollback on first-pick exhaustion — lives in the
// handler so it can be unit-tested without spinning up Next.js.
//
// Wire format and error semantics: see lib/sessionStart/types.ts.

import { NextResponse, type NextRequest } from "next/server";

import { getAppPublicOrigin } from "@/lib/config/publicOrigin";
import { extractClientIp } from "@/lib/questionAccessLog/log";
import { sessionStartHandler } from "@/lib/sessionStart/handler";
import { StartRequestSchema } from "@/lib/sessionStart/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "request body is not valid JSON" } },
      { status: 400 },
    );
  }

  const parsed = StartRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 },
    );
  }

  const rlsClient = await createClient();
  const serviceClient = createServiceClient();
  const ip = extractClientIp(request.headers);

  // Origin for the assessment-STARTED staff alert's student link.
  //
  // ATLAS-011: the CANONICAL origin, not `new URL(request.url).origin` — that
  // is built from the Host / X-Forwarded-Host header, so a forged host would
  // put an attacker-controlled student-record link into an email we send to
  // staff.
  //
  // getAppPublicOrigin() THROWS when APP_PUBLIC_ORIGIN is unset or malformed.
  // On the submit path that surfaces as a 500, which is tolerable. Here it is
  // not: a misconfigured env var must never stop a child from starting an
  // assessment for the sake of an internal courtesy email. So it degrades to
  // null and the alert falls back to a bare path — the same fail-soft posture
  // the notifier itself takes.
  let origin: string | null = null;
  try {
    origin = getAppPublicOrigin();
  } catch {
    origin = null;
  }

  // Defensive catch: the handler returns StartHandlerResult for known
  // error paths, but pickQuestion's content-type guards (and any future
  // unexpected throws) can leak. Map to a generic 500 without exposing
  // the stack trace.
  let result;
  try {
    result = await sessionStartHandler({
      request: parsed.data,
      rlsClient,
      serviceClient,
      ip,
      origin,
    });
  } catch (e) {
    console.error("[start] unhandled error", e);
    return NextResponse.json(
      { error: { code: "internal", message: "internal error" } },
      { status: 500 },
    );
  }

  if (result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(
    { error: { code: result.error.code, message: result.error.message } },
    { status: result.error.status },
  );
}
