# Generates the SAM-L0C-Q11A..D shared number-line STIMULUS with the printed
# numerals 30-36 beneath the tick marks (lane/l0c-qa-fix-batch).
#
# The raw licensed crop (source/0c/0C-11.png) is a bare line — endpoints + ticks,
# NO printed numerals — so the four number-line sub-items rendered an unlabelled
# line ("31 comes ___ 30" with nothing to read). The source worksheet shows 30-36
# under the line; this regenerates a faithful labelled line (black line + 7 evenly
# spaced ticks, filled end dots, navy numerals 30..36 below each tick).
#
# GENERATED (not a licensed crop); this script is the tracked, reproducible source.
# Output -> the uploader's L0 source dir (scripts/conversion/source/0c/, untracked)
# at sam-l0c-q11.png, which activation-image-set.ts SOURCE_MAP points at for the
# bucket key l0/sam-l0c-q11.png. Mirrors gen_l0c_q11_tiles.py.
#
# Re-run: python scripts/conversion/gen_l0c_q11_stimulus.py

from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "source", "0c")
OUT = os.path.join(OUT_DIR, "sam-l0c-q11.png")

NUMS = [30, 31, 32, 33, 34, 35, 36]

W, H = 1260, 260
BG = (255, 255, 255)
LINE = (0, 0, 0)          # black number line, matching the source crop
NAVY = (27, 58, 107)      # sam-navy numerals
LINE_Y = 110
LINE_W = 8
TICK_H = 34
DOT_R = 16
MARGIN_X = 90


def load_font(size):
    for path in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    n = len(NUMS)
    x0, x1 = MARGIN_X, W - MARGIN_X
    step = (x1 - x0) / (n - 1)
    xs = [round(x0 + i * step) for i in range(n)]

    # horizontal line
    d.line([(x0, LINE_Y), (x1, LINE_Y)], fill=LINE, width=LINE_W)
    # filled end dots
    for ex in (x0, x1):
        d.ellipse([ex - DOT_R, LINE_Y - DOT_R, ex + DOT_R, LINE_Y + DOT_R], fill=LINE)

    f = load_font(56)
    for i, x in enumerate(xs):
        # inner ticks (ends already carry the dots)
        if 0 < i < n - 1:
            d.line([(x, LINE_Y - TICK_H), (x, LINE_Y + TICK_H)], fill=LINE, width=LINE_W)
        label = str(NUMS[i])
        left, top, right, bottom = d.textbbox((0, 0), label, font=f)
        tw = right - left
        d.text((x - tw / 2 - left, LINE_Y + TICK_H + 18 - top), label, font=f, fill=NAVY)

    img.save(OUT)
    print(f"wrote {OUT}  ({'-'.join(map(str, NUMS))})")


if __name__ == "__main__":
    main()
