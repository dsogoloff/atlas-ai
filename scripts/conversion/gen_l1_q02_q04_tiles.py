# Generates per-figure CLICK_IMAGE_SINGLE tiles for SAM-L1-Q02 ("bigger animal")
# and SAM-L1-Q04 ("who is shorter") from the two single-figure licensed crops of
# each item (lane/qa-fixes-l1-l4).
#
# WHY relative-scale, common-canvas tiles: these items are SIZE comparisons. The
# player (TileFace.tsx) clamps every tile to max-h-28 (112px) with object-contain,
# so two independently-cropped figures would render at the SAME height and the
# comparison ("bigger animal" / "who is shorter") would be unanswerable. To keep
# the comparison, each pair is composited onto a SHARED canvas sized to the larger
# figure, with each figure pasted at its TRUE relative size, bottom-aligned to a
# common ground line. Rendered at equal tile size, the bigger/taller figure then
# visibly reads bigger/taller.
#
# GENERATED (composite of licensed crops); tracked, reproducible source. Outputs ->
# scripts/conversion/source/1/, mapped in activation-image-set.ts SOURCE_MAP.
#
# Re-run: python scripts/conversion/gen_l1_q02_q04_tiles.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source", "1")

# (output filename, source crop) — the two figures of each pair, true sizes.
PAIRS = {
    "q02": [("sam-l1-q02-t1.png", "L1-2_1.png"),   # elephant (bigger)
            ("sam-l1-q02-t2.png", "L1-2_2.png")],  # bear
    "q04": [("sam-l1-q04-t1.png", "L1-4_1.png"),   # Lin / girl (shorter)
            ("sam-l1-q04-t2.png", "L1-4_2.png")],  # George / boy (taller)
}

PAD = 12  # transparent margin around the common canvas


def build_pair(pair):
    imgs = [(out, Image.open(os.path.join(SRC, src)).convert("RGBA")) for out, src in pair]
    cw = max(im.width for _, im in imgs) + 2 * PAD
    ch = max(im.height for _, im in imgs) + 2 * PAD
    for out, im in imgs:
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        x = (cw - im.width) // 2          # horizontally centered
        y = ch - PAD - im.height          # bottom-aligned (shared ground line)
        canvas.alpha_composite(im, (x, y))
        path = os.path.join(SRC, out)
        canvas.save(path)
        print(f"wrote {path}  (figure {im.width}x{im.height} on {cw}x{ch})")


def main():
    for pair in PAIRS.values():
        build_pair(pair)


if __name__ == "__main__":
    main()
