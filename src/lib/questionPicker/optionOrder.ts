// Deterministic, per-item-stable ordering of select-all options so that the
// CORRECT options are not clustered by display position.
//
// Defect (founder QA): SAM-L1-Q01 ("tap the things that are the same colour")
// is a CLICK_IMAGE_MULTI with reds at tile ids {t1,t3,t5}. ClickImageMulti renders
// a 2-column row-major grid, so positions 1/3/5 all fall in the LEFT column — the
// three correct tiles cluster into one column, making position informative of
// correctness. SELECT_MULTIPLE rows can cluster the same way (e.g. correct options
// contiguous at the end of a list).
//
// Fix: reorder the options at SERVE time with a deterministic permutation seeded
// from the item id (stable across re-renders — the order is baked into the served
// payload, so the client never reshuffles; reproducible; never Math.random). The
// permutation is REPAIRED until the correct options are spread (not all in one
// 2-col column and not all contiguous), so it is robust, not lucky.
//
// Grading is unaffected: the answer is scored server-side by option id
// (id-set / set-equality), never by displayed position — see correctness.ts and
// ClickImageMulti (`{type:"id-set",ids}`). Reordering only changes presentation.

/** FNV-1a-ish string hash → uint32 (deterministic, no deps). */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic, seedable, good enough for option order. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with an injected RNG (pure: returns a new array). */
function shuffleWith<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Are the correct options clustered by position for a 2-column row-major grid?
 * True when (with ≥2 correct) every correct index has the SAME parity (all land
 * in one grid column) OR the correct indices are CONTIGUOUS (a single run).
 */
export function isClustered(orderedIds: readonly string[], correct: ReadonlySet<string>): boolean {
  const pos: number[] = [];
  orderedIds.forEach((id, i) => {
    if (correct.has(id)) pos.push(i);
  });
  if (pos.length < 2) return false;
  const sameColumn = pos.every((p) => p % 2 === pos[0] % 2);
  const contiguous = pos[pos.length - 1] - pos[0] === pos.length - 1;
  return sameColumn || contiguous;
}

/**
 * Deterministically reorder `items` (each with a stable `id`) so the correct
 * options are not position-clustered. Same (items, correctIds, seed) → same order.
 * Falls back to the original order only in the degenerate case where no spread
 * permutation is found within the attempt budget (practically unreachable for
 * real option counts).
 */
export function spreadOptions<T extends { id: string }>(
  items: readonly T[],
  correctIds: readonly string[],
  seed: string,
): T[] {
  if (items.length <= 2) return items.slice();
  const correct = new Set(correctIds);
  for (let attempt = 0; attempt < 64; attempt++) {
    const ordered = shuffleWith(items, mulberry32(hashSeed(`${seed}#${String(attempt)}`)));
    if (!isClustered(ordered.map((it) => it.id), correct)) return ordered;
  }
  return items.slice();
}
