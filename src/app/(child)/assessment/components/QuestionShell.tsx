// Visual chrome for one question. Adapted from sam-placement K4QuestionShell:
//   * sam-* tokens (was atlas-*).
//   * Inline Material Symbols span (was @/components/ui/Icon).
//   * No question-count display — the engine terminates dynamically on
//     confidence threshold, max-questions cap, or bank exhaustion, so a
//     "Question N of M" display would be dishonest. The original sam-
//     placement count came with a denominator we don't have.
//
// Pure presentational; no state, no fetch, no framer-motion. Imported into
// a "use client" boundary by assessment-client, so it composes cleanly
// without an explicit directive.

interface Props {
  /** Question prompt (from question.content.stem). */
  prompt: string;
  /** Input component for this question's format. */
  children: React.ReactNode;
}

export function QuestionShell({ prompt, children }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-sam-cream">
      {/* Decorative accents — Stitch module-b vibe */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-sam-yellow/20 blur-3xl" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-sam-red/5 blur-3xl" />
      </div>

      {/* Question canvas */}
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-3xl flex-col items-center gap-10">
          <header className="text-center">
            <h1 className="font-display-child text-3xl font-bold leading-tight text-sam-navy md:text-4xl">
              {prompt}
            </h1>
            <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-sam-yellow" />
          </header>

          <div className="w-full">{children}</div>
        </div>
      </main>

      <footer className="flex items-center gap-2 border-t border-sam-gray-light bg-white/80 px-6 py-4 backdrop-blur">
        <span
          className="material-symbols-outlined text-sam-orange"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          lightbulb
        </span>
        <span className="text-sm font-medium text-sam-gray-dark">
          Read carefully!
        </span>
      </footer>
    </div>
  );
}
