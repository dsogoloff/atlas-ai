"use client";

// IMAGE_ORDERING input. The child arranges image (or text-label) tiles into
// the correct sequence, then Submit. We emit
//   JSON.stringify({ type: "ordered-ids", ids })
// where `ids` is the child's chosen ordering of the tile ids. Grading is
// entirely server-side: correctness.ts reads the authored answer model
// (content._authoring.answer_model, rule "order-equality") and grades
// element-for-element order-equality on tile ids. Nothing on the client
// decides correctness.
//
// Reorder UX + a11y mirror the player's DragDropInput (HTML5 drag-and-drop
// for mouse; Space/Enter to pick up, Arrow keys to move, Esc to cancel for
// keyboard; an aria-live region announces moves) — but tiles are id-keyed
// and carry an image face, so ordering works for picture sequences.
//
// Answer-assembly logic lives in an EXPORTED PURE FUNCTION (orderToAnswer)
// so it is unit-testable under the node-env vitest runner that cannot drag.
//
// Per-question state reset: caller wraps with key={question.id}.

import { useRef, useState } from "react";

import type { AnswerValue } from "@/lib/grading/types";
import type { ClientLabeledItem } from "@/lib/questionPicker/types";

import { TileFace } from "./TileFace";

/** Wrap the chosen tile-id ordering into the structured AnswerValue grade()
 *  expects. The server grades it with the "order-equality" rule. */
export function orderToAnswer(ids: string[]): AnswerValue {
  return { type: "ordered-ids", ids };
}

interface Props {
  /** From question.content.tiles ({id,label,image?}). Initial display order
   *  (may be shuffled by the author). */
  tiles: ClientLabeledItem[];
  /** Fired with JSON.stringify({type:"ordered-ids",ids}) on Submit. */
  onSubmit: (answerGiven: string) => void;
  /** True while the submit network call is in flight. */
  disabled?: boolean;
}

export function ImageOrdering({ tiles, onSubmit, disabled }: Props) {
  const [order, setOrder] = useState<ClientLabeledItem[]>(() => tiles.slice());
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
    setAnnounce(`Moved ${it.label} to position ${to + 1}`);
  }

  function handleKey(e: React.KeyboardEvent<HTMLLIElement>, index: number) {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (pickedIndex === null) {
        setPickedIndex(index);
        setAnnounce(`Picked up ${order[index].label}. Use arrow keys to move.`);
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
    onSubmit(JSON.stringify(orderToAnswer(order.map((t) => t.id))));
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <ol
        className="flex w-full max-w-xl flex-col gap-3"
        aria-label="Drag to put in order"
      >
        {order.map((tile, i) => {
          const isPicked = pickedIndex === i;
          return (
            <li
              key={tile.id}
              tabIndex={disabled ? -1 : 0}
              draggable={!disabled}
              onKeyDown={(e) => handleKey(e, i)}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              aria-grabbed={isPicked}
              aria-roledescription="reorderable item"
              aria-label={`${tile.label}, position ${i + 1}`}
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
                <TileFace item={tile} />
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
