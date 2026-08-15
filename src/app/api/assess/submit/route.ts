// POST /api/assess/submit
//
// Thin shell over `submitResponseHandler` (lib/responseSubmit/handler.ts).
// All real logic — auth, ownership, idempotency, engine update, time
// flagging, persistence, session-close aggregation — lives in the handler
// so it can be unit-tested without spinning up Next.js.
//
// Wire format and error semantics: see lib/responseSubmit/types.ts.

import { NextResponse, type NextRequest } from "next/server";

import { getAppPublicOrigin } from "@/lib/config/publicOrigin";
import { extractClientIp } from "@/lib/questionAccessLog/log";
import { submitResponseHandler } from "@/lib/responseSubmit/handler";
import { SubmitRequestSchema } from "@/lib/responseSubmit/types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Body parsing — JSON syntax errors and Zod validation both map to 400.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "request body is not valid JSON" } },
      { status: 400 },
    );
  }

  const parsed = SubmitRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.message } },
      { status: 400 },
    );
  }

  const rlsClient = await createClient();
  const serviceClient = createServiceClient();
  const ip = extractClientIp(request.headers);

  // The handler returns SubmitHandlerResult for all known error paths.
  // The catch is defensive — judgeAnswer can throw on malformed
  // questions.content (a content-authoring bug); we log and return a
  // generic 500 so the stack trace doesn't leak in the response body.
  let result;
  try {
    result = await submitResponseHandler({
      request: parsed.data,
      rlsClient,
      serviceClient,
      ip,
      // Only used to make the staff-alert student link absolute on session
      // finalization; nothing else in the handler reads it.
      //
      // ATLAS-011: the CANONICAL origin, not `new URL(request.url).origin`.
      // request.url is built from the Host / X-Forwarded-Host header, so a
      // forged host would put an attacker-controlled student-record link into
      // an email we send to staff. The handler stays origin-agnostic (it is
      // unit-tested with an injected origin); the trust decision lives here.
      origin: getAppPublicOrigin(),
    });
  } catch (e) {
    console.error("[submit] unhandled error", e);
    return NextResponse.json(
      { error: { code: "internal", message: "internal error" } },
      { status: 500 },
    );
  }

  if (result.ok) {
    return NextResponse.json(result.body, { status: 200 });
  }

  return NextResponse.json(
    { error: { code: result.error.code, message: result.error.message } },
    { status: result.error.status },
  );
}
