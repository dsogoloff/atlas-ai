# Composites the SAM-L0C-Q10 birds STIMULUS — 18 birds (12 yellow + 6 blue) —
# from the two single-bird licensed crops (lane/l0c-qa-fix-batch).
#
# The source worksheet (task 10) shows a flock of 18 birds, 6 of them blue, and
# asks "How many birds are yellow?". Only the two single-bird icons were cropped
# (source/0c/0C-10_1.png blue, 0C-10_2.png yellow), so the row served with no
# stimulus. This composites them into one faithful flock (6 blue + 12 yellow) on
# a white card. The numbers are also in the stem, so the picture is supportive.
#
# GENERATED (composite of licensed crops); tracked, reproducible source. Output ->
# scripts/conversion/source/0c/sam-l0c-q10.png, which activation-image-set.ts
# SOURCE_MAP points at for bucket key l0/sam-l0c-q10.png.
#
# Re-run: python scripts/conversion/gen_l0c_q10_birds.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "source", "0c")
BLUE = os.path.join(SRC_DIR, "0C-10_1.png")
YELLOW = os.path.join(SRC_DIR, "0C-10_2.png")
OUT = os.path.join(SRC_DIR, "sam-l0c-q10.png")

CELL = 150        # per-bird cell (square)
COLS = 6
ROWS = 3          # 6 x 3 = 18 cells
PAD = 20
BG = (255, 255, 255, 255)

# 18 birds: 6 blue, 12 yellow. Interleaved so the blues are not all clustered.
LAYOUT = [
    "Y", "Y", "B", "Y", "Y", "B",
    "Y", "B", "Y", "Y", "B", "Y",
    "Y", "Y", "B", "Y", "Y", "B",
]


def load_scaled(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    scale = min((CELL - 2 * PAD) / w, (CELL - 2 * PAD) / h)
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def main():
    blue = load_scaled(BLUE)
    yellow = load_scaled(YELLOW)
    W, H = COLS * CELL, ROWS * CELL
    canvas = Image.new("RGBA", (W, H), BG)
    for idx, kind in enumerate(LAYOUT):
        r, c = divmod(idx, COLS)
        tile = blue if kind == "B" else yellow
        ox = c * CELL + (CELL - tile.width) // 2
        oy = r * CELL + (CELL - tile.height) // 2
        canvas.alpha_composite(tile, (ox, oy))
    canvas.save(OUT)
    n_blue = LAYOUT.count("B")
    print(f"wrote {OUT}  ({LAYOUT.count('Y')} yellow + {n_blue} blue = {len(LAYOUT)})")


if __name__ == "__main__":
    main()
