"use client";

// Per-child Edit / Remove affordances on the parent dashboard card.
//
// Edit links to /edit-child/[childId]. Remove is a SOFT delete behind an inline
// confirmation step ("This removes [name] from your dashboard"); on confirm it
// calls archiveChildAction and refreshes so the card disappears. The child's
// data is retained for staff — this only hides it from the parent.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { archiveChildAction } from "./actions";

interface Props {
  childId: string;
  childName: string;
}

export function ChildActions({ childId, childName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setSubmitting(true);
    setError(null);
    const r = await archiveChildAction(childId);
    if (r.ok) {
      // The card is gone from the next render; refresh the server component.
      router.refresh();
      return;
    }
    setSubmitting(false);
    setError(r.error);
  }

  if (confirming) {
    return (
      <div
        className="rounded-2xl border border-sam-red/30 bg-sam-red/5 p-4 space-y-3"
        role="group"
        aria-label={`Confirm removing ${childName}`}
      >
        <p className="text-caption font-caption text-sam-navy">
          This removes <span className="font-bold">{childName}</span> from your
          dashboard. Their assessment history is kept on file.
        </p>
        {error && (
          <p className="text-caption text-sam-red" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRemove}
            disabled={submitting}
            className="flex-1 py-2.5 bg-sam-red text-white font-headline-adult text-sm rounded-xl hover:bg-sam-red/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Removing..." : "Remove"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={submitting}
            className="flex-1 py-2.5 text-sam-navy/70 font-headline-adult text-sm rounded-xl hover:text-sam-navy transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <Link
        href={`/edit-child/${childId}`}
        className="inline-flex items-center gap-1 text-sam-navy/70 font-headline-adult text-sm hover:text-sam-red transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
        Edit
      </Link>
      <span className="text-sam-gray-light" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-sam-navy/70 font-headline-adult text-sm hover:text-sam-red transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
        Remove
      </button>
    </div>
  );
}
