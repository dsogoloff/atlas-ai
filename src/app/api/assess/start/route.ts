// POST /api/assess/start
//
// Thin shell over `sessionStartHandler` (lib/sessionStart/handler.ts).
// All real logic — auth, ownership, existing-session resume, picker,
// audit logging, rollback on first-pick exhaustion — lives in the
// handler so it can be unit-tested without spinning up Next.js.
//
// Wire format and error semantics: see lib/sessionStart/types.ts.

import { NextResponse, type NextRequest } from "next/server";

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
