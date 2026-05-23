"use client";

// Atlas Assessment — question image renderer.
//
// Item #13a Phase 3 deliverable. Pure presentational; consumes a
// signed-URL envelope from ClientQuestionImage (minted by the
// next-question handler — see src/lib/questionPicker/mintImage.ts).
//
// Visual gate criteria: docs/item-13a-phase-3-visual-gate.md
// (sections 1-4, 6-10 covered here; section 5 narrowed to visual
// error UI only — input-disable behavior on required-image-fail is
// deferred to Phase 3.5 per the doc amendment in this same commit).
//
// Tier-aware sizing (visual gate §2):
//   K-4    → w-[60vw], max-w-[600px], max-h-[40vh] on the <img>
//   G5-8   → w-[40vw], max-w-[480px], max-h-[30vh] on the <img>
//
// Height cap added 2026-05-23 after founder gate finding: width-only
// caps let near-square or 3:2 source images grow tall enough to push
// answers + Submit below the fold on standard laptop viewports
// (~900px tall) and iPad-landscape (1024×768). The max-h cap lives on
// the <img> itself, not the wrapper, so the wrapper's natural height
// shrinks with the rendered image. `object-contain` + `w-auto h-auto`
// preserves aspect ratio when the height cap clamps the image; the
// rendered img may then be narrower than the wrapper's width budget,
// which is harmless (centered via mx-auto).
//
// Fallback behavior on image load failure (visual gate §5):
//   required=true   → render inline error + Retry button
//                     (input-disable in Phase 3.5)
//   required=false  → render nothing (graceful hide); question
//                     remains answerable from text alone
//
// URL refresh: when image.url changes between renders (e.g. resume
// path minted a fresh signed URL after the prior one expired), the
// parent passes `key={image.url}` on the QuestionImage element
// (see QuestionShell.tsx). React's reconciliation then mounts a
// FRESH instance and useState defaults are reapplied — same reset
// semantics as a manual setState-in-effect would give, but without
// triggering React's cascade-render lint (react-hooks/set-state-
// in-effect). The keying lives at the parent; this component just
// trusts that lifecycle.

import { useState } from "react";
import { useReducedMotion } from "framer-motion";

import type { ClientQuestionImage } from "@/lib/questionPicker/types";
import type { Tier } from "@/lib/tier/derive";

interface Props {
  image: ClientQuestionImage;
  tier: Tier;
}

type LoadState = "loading" | "loaded" | "error";

export function QuestionImage({ image, tier }: Props) {
  const [state, setState] = useState<LoadState>("loading");
  const [retryCount, setRetryCount] = useState(0);
  const reduceMotion = useReducedMotion();

  // Graceful hide for decorative images on failure — the question is
  // answerable from text alone (image_required=false on the server).
  if (state === "error" && !image.required) {
    return null;
  }

  // Cache-bust on retry. The signed URL already carries a `token=`
  // query param, so append with `&`.
  const src = retryCount > 0 ? `${image.url}&retry=${retryCount}` : image.url;

  const sizeClass =
    tier === "K_4" ? "w-[60vw] max-w-[600px]" : "w-[40vw] max-w-[480px]";
  const imgMaxHClass = tier === "K_4" ? "max-h-[40vh]" : "max-h-[30vh]";

  if (state === "error") {
    // image.required === true at this point (decorative case returned above).
    return (
      <div
        className={`${sizeClass} rounded-lg border-2 border-sam-red/30 bg-sam-cream/60 p-6 text-center`}
        role="alert"
      >
        <p className="font-medium text-sam-red">
          The picture couldn&apos;t load.
        </p>
        <p className="mt-2 text-sm text-sam-gray-dark">{image.alt}</p>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            setRetryCount((c) => c + 1);
          }}
          className="mt-4 rounded-full bg-sam-red px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-sam-red/90 focus:outline-none focus:ring-2 focus:ring-sam-red/40"
        >
          Try again
        </button>
      </div>
    );
  }

  const transitionClass = reduceMotion ? "" : "transition-opacity duration-200";

  return (
    <div className={`relative ${sizeClass}`}>
      {state === "loading" && (
        <div
          className={`absolute inset-0 rounded-lg bg-sam-gray-light/40 ${
            reduceMotion ? "" : "animate-pulse"
          }`}
          aria-hidden="true"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element --
          Plain <img> is intentional: Next <Image> conflicts with
          private signed-URL semantics (its optimization layer expects
          stable URLs, which signed URLs are not). Documented in
          docs/item-13a-phase-3-visual-gate.md §3. */}
      <img
        src={src}
        alt={image.alt}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={`mx-auto block h-auto w-auto max-w-full rounded-lg object-contain ${imgMaxHClass} ${
          state === "loaded" ? "opacity-100" : "opacity-0"
        } ${transitionClass}`}
      />
    </div>
  );
}
