"use client";

// DRAG_DROP input. Built fresh — no sam-placement reference exists.
//
// Wire format (per src/lib/responseSubmit/correctness.ts:45-48 and the
// fixture in correctness.test.ts:90-118):
//   The server compares JSON.stringify(content.correct_order) === answerGiven
//   as raw strings. correct_order is an array of primitives (strings in v1)
//   in canonical order. We submit JSON.stringify(currentOrder) where
//   currentOrder is the child's chosen ordering of the items[] array shown
//   on screen. This works because:
//     1. Both sides are arrays of primitives — JSON.stringify is order-stable.
//     2. The bank's items[] elements are the same elements as correct_order
//        (just possibly shuffled for presentation).
//   Object answers would require canonical key ordering — see the TODO in
//   correctness.ts header. v1 callers must not author DRAG_DROP questions
//   with object correct_orders until that's fixed.
//
// No framer-motion: motion.li's drag-gesture event types conflict with the
// HTML5 DnD DragEvent we want. Items snap on reorder rather than animate;
// the polish loss is small and the typecheck is clean.
//
// Accessibility:
//   * Mouse: HTML5 drag-and-drop on each row.
//   * Keyboard: Tab to focus row, Space/Enter to "pick up", ArrowUp/ArrowDown
//     to move while picked up, Space/Enter again to drop. Esc cancels.
//   * Screen reader: aria-grabbed mirrors picked state; an aria-live region
//     announces moves.
//
// Per-question state reset: caller wraps with `<DragDropInput key={
// question.id} ... />` so React remounts on question change.

import { useRef, useState } from "react";

interface Props {
  /** From question.content.items. Initial display order (may be shuffled). */
  items: string[];
  /** Fired with JSON.stringify(currentOrder) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function DragDropInput({ items, onSubmit, disabled }: Props) {
  const [order, setOrder] = useState<string[]>(() => items.slice());
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const dragSrc = useRef<number | null>(null);

  function move(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= order.length ||
      to >= order.length
    ) {
      return;
    }
    const next = order.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setOrder(next);
    setAnnounce(`Moved ${it} to position ${to + 1}`);
  }

  function handleKey(e: React.KeyboardEvent<HTMLLIElement>, index: number) {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (pickedIndex === null) {
        setPickedIndex(index);
        setAnnounce(`Picked up ${order[index]}. Use arrow keys to move.`);
      } else {
        setPickedIndex(null);
        setAnnounce(`Dropped at position ${index + 1}.`);
      }
      return;
    }
    if (e.key === "Escape" && pickedIndex !== null) {
      e.preventDefault();
      setPickedIndex(null);
      setAnnounce("Cancelled move.");
      return;
    }
    if (pickedIndex !== null && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const target = pickedIndex + (e.key === "ArrowUp" ? -1 : 1);
      if (target < 0 || target >= order.length) return;
      move(pickedIndex, target);
      setPickedIndex(target);
    }
  }

  function handleDragStart(e: React.DragEvent<HTMLLIElement>, index: number) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    dragSrc.current = index;
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e: React.DragEvent<HTMLLIElement>) {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function handleDrop(e: React.DragEvent<HTMLLIElement>, index: number) {
    if (disabled) return;
    e.preventDefault();
    const src = dragSrc.current;
    dragSrc.current = null;
    if (src === null) return;
    move(src, index);
  }

  function handleSubmit() {
    if (disabled) return;
    onSubmit(JSON.stringify(order));
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <ol
        className="flex w-full max-w-xl flex-col gap-3"
        aria-label="Drag to reorder"
      >
        {order.map((item, i) => {
          const isPicked = pickedIndex === i;
          return (
            <li
              key={item}
              tabIndex={disabled ? -1 : 0}
              draggable={!disabled}
              onKeyDown={(e) => handleKey(e, i)}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              aria-grabbed={isPicked}
              aria-roledescription="reorderable item"
              className={
                "flex cursor-grab items-center gap-4 rounded-2xl border-2 bg-white px-6 py-4 shadow-[0_4px_12px_rgba(27,58,107,0.08)] transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-sam-red/30 active:cursor-grabbing " +
                (isPicked
                  ? "border-sam-red ring-2 ring-sam-red/40"
                  : "border-sam-gray-light hover:border-sam-navy") +
                (disabled ? " cursor-not-allowed opacity-60" : "")
              }
            >
              <span
                className="material-symbols-outlined text-sam-gray-mid"
                aria-hidden="true"
              >
                drag_indicator
              </span>
              <span className="font-display-child text-2xl font-bold text-sam-navy">
                {item}
              </span>
              <span
                className="ml-auto font-display-child text-sm font-bold text-sam-gray-mid"
                aria-hidden="true"
              >
                {i + 1}
              </span>
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={handleSubmit}
        className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-sam-red px-12 font-display-child text-2xl font-bold text-white shadow-[0_6px_0_#b7102a] transition-transform hover:translate-y-0.5 active:translate-y-1.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-sam-gray-light disabled:text-sam-gray-mid disabled:shadow-none"
      >
        {disabled ? "Submitting…" : "Submit"}
        {!disabled && (
          <span className="material-symbols-outlined text-3xl" aria-hidden="true">
            chevron_right
          </span>
        )}
      </button>
    </div>
  );
}
