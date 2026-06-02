"use client";

// Account menu for the parent dashboard header. Replaces the Phase 1
// placeholder avatar (a static div with no handler) with a working dropdown
// whose only action for v1 is Sign out. Closes on outside-click and Escape.

import { useEffect, useRef, useState } from "react";

import { signOutAction } from "./auth-actions";

interface ProfileMenuProps {
  /** Shown as a quiet label at the top of the menu, for "who am I signed in as". */
  name: string;
  email?: string;
}

export function ProfileMenu({ name, email }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 cursor-pointer group"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sam-teal">
          <img
            alt="Parent profile avatar"
            className="w-full h-full object-cover"
            src="/img/placeholder-avatar.svg"
          />
        </div>
        <span className="material-symbols-outlined text-sam-navy group-hover:text-sam-red transition-colors">
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-sam-gray-light/40 shadow-[0px_8px_24px_rgba(27,58,107,0.12)] py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-sam-gray-light/40">
            <p className="font-headline-adult text-sam-navy truncate">{name}</p>
            {email && (
              <p className="text-xs text-sam-gray-mid truncate">{email}</p>
            )}
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full text-left px-4 py-2.5 font-headline-adult text-sam-navy hover:bg-sam-gray-light/30 hover:text-sam-red transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
