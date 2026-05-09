"use client";

// Terminal / retryable error panel. Discriminated by `kind`. Copy is kid-
// adjacent (short, no jargon) but addressed to the parent — by the time
// this shows, the parent is likely the one looking at the screen.
//
// Per Phase 3 of Item #7: /login now exists, so all four arms route there
// (was /signup as a placeholder per the original Item #5 ambiguity #7
// resolution). No ?next= plumbing — none of these arms benefits from
// returning to /assessment after sign-in (the underlying error condition
// would just recur), and /login defaults to /dashboard on success when
// ?next= is absent. ErrorPanel is a leaf with no child_id context anyway.

import Link from "next/link";

import type { ApiErrorKind } from "../lib/api";

export type ErrorPanelKind = ApiErrorKind;

interface Props {
  kind: ErrorPanelKind;
  /** True iff the reducer marked the error as retryable (network / server). */
  canRetry: boolean;
  /** Fired when the user clicks Retry. Required iff canRetry. */
  onRetry?: () => void;
}

interface Copy {
  title: string;
  body: string;
}

function copyFor(kind: ErrorPanelKind): Copy {
  switch (kind) {
    case "unauthorized":
      return {
        title: "Please sign in",
        body: "Your session has expired. Sign in again to continue the assessment.",
      };
    case "forbidden":
      return {
        title: "We couldn't open this assessment",
        body: "This child isn't on your account. Check the link or sign in to the right account.",
      };
    case "not_found":
      return {
        title: "Assessment not found",
        body: "We couldn't find this child's assessment. The link may be old.",
      };
    case "unavailable":
      return {
        title: "No questions available",
        body: "There aren't any questions ready for this child right now. Please try again later.",
      };
    case "session_completed":
      return {
        title: "This assessment is already complete",
        body: "It looks like this assessment was finished in another tab or window.",
      };
    case "network":
      return {
        title: "Connection problem",
        body: "We couldn't reach the server. Check your connection and try again.",
      };
    case "server":
    default:
      return {
        title: "Something went wrong",
        body: "Sorry — that didn't work. Please try again in a moment.",
      };
  }
}

export function ErrorPanel({ kind, canRetry, onRetry }: Props) {
  const { title, body } = copyFor(kind);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sam-cream px-6 py-12">
      <div
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-sam-gray-light bg-white p-10 text-center shadow-[0_4px_24px_rgba(27,58,107,0.08)]"
      >
        <span
          className="material-symbols-outlined text-6xl text-sam-orange"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {kind === "session_completed" ? "check_circle" : "error"}
        </span>

        <div className="space-y-2">
          <h1 className="font-display-child text-2xl font-bold text-sam-navy">
            {title}
          </h1>
          <p className="font-headline-adult text-base text-sam-gray-dark">
            {body}
          </p>
        </div>

        {canRetry && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-sam-red px-8 font-display-child text-lg font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none"
          >
            Try again
            <span className="material-symbols-outlined" aria-hidden="true">
              refresh
            </span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-sam-navy px-8 font-display-child text-lg font-bold text-white transition-opacity hover:opacity-90"
          >
            Go to sign in
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
