// Dev-only gallery for the Singapore-Math visual-primitive + answer-input
// library. Gated by isVisualPrimitivesGalleryEnabled(): always available in
// local dev/test; in a production build it 404s unless
// ENABLE_VISUAL_PRIMITIVES_GALLERY === 'true' (so a Vercel preview can be
// flipped on for review). Reach it at /dev/visual-primitives.

import { notFound } from "next/navigation";

import { VisualPrimitive, describeVisual } from "@/components/visual-primitives";
import { isVisualPrimitivesGalleryEnabled } from "@/lib/env";

import { AnswerInputPreview } from "./AnswerInputPreview";
import { ANSWER_SAMPLES, STEM_SAMPLES } from "./samples";

export const metadata = {
  title: "Visual primitives — dev gallery",
};

export default function VisualPrimitivesGalleryPage() {
  if (!isVisualPrimitivesGalleryEnabled()) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 font-[var(--font-body-regular)]">
      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sam-orange">
          Dev preview · not a production route
        </p>
        <h1 className="text-2xl font-bold text-sam-navy">
          Visual-primitive &amp; answer-input gallery
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-sam-gray-mid">
          Every Singapore-Math (grades 1–3) primitive and answer input rendered
          from sample params. Each card shows the screen-reader text alternative
          the component derives. Authoring contracts:{" "}
          <code>docs/visual-primitives-spec.md</code> and{" "}
          <code>docs/answer-model-spec.md</code>.
        </p>
      </header>

      <section aria-labelledby="stems-heading" className="mb-12">
        <h2
          id="stems-heading"
          className="mb-4 border-b border-sam-gray-light pb-1 text-lg font-semibold text-sam-navy"
        >
          Stem primitives ({STEM_SAMPLES.length})
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEM_SAMPLES.map((sample) => (
            <figure
              key={sample.title}
              className="flex flex-col rounded-2xl border border-sam-gray-light bg-white p-4"
            >
              <figcaption className="mb-3 text-sm font-medium text-sam-navy">
                {sample.title}
              </figcaption>
              <div className="flex flex-1 items-center justify-center">
                <VisualPrimitive spec={sample.spec} />
              </div>
              <p className="mt-3 text-xs text-sam-gray-mid">
                {describeVisual(sample.spec)}
              </p>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="answers-heading">
        <h2
          id="answers-heading"
          className="mb-4 border-b border-sam-gray-light pb-1 text-lg font-semibold text-sam-navy"
        >
          Answer inputs ({ANSWER_SAMPLES.length})
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ANSWER_SAMPLES.map((sample) => (
            <div
              key={sample.title}
              className="rounded-2xl border border-sam-gray-light bg-white p-4"
            >
              <h3 className="mb-3 text-sm font-medium text-sam-navy">
                {sample.title}
              </h3>
              <AnswerInputPreview spec={sample.spec} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
