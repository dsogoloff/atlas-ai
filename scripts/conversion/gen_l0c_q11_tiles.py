# Generates the 4 shared comparison-word tiles for the SAM-L0C-Q11A..D number-line
# sub-items (lane/young-band-content-fixes). Each tile is a single word centered on
# a plain card in the S.A.M. palette (navy text on white, rounded navy border),
# served as CLICK_IMAGE_SINGLE option tiles. The same 4 assets are reused across
# the 4 sub-items (After+Before for Q11a/c; Greater+Smaller for Q11b/d). These are
# GENERATED (not licensed crops); this script is the tracked, reproducible source.
# Output -> the uploader's L0 source dir (scripts/conversion/source/0c/, untracked,
# same place the licensed crops live) so `pnpm convert:upload-activation-images`
# finds them. Mirrors gen_l0c_q13_tiles.py.
#
# Re-run: python scripts/conversion/gen_l0c_q11_tiles.py

from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "source", "0c")

W, H = 480, 320
BG = (255, 255, 255)        # white card
NAVY = (27, 58, 107)        # sam-navy (border + text)
BORDER_W = 6
RADIUS = 28
MARGIN = 36                 # min horizontal padding for the word

TILES = [
    ("sam-l0c-q11-after.png", "After"),
    ("sam-l0c-q11-before.png", "Before"),
    ("sam-l0c-q11-greater.png", "Greater"),
    ("sam-l0c-q11-smaller.png", "Smaller"),
]


def load_font(size):
    for path in ("C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit_font(draw, text, max_w):
    size = 96
    while size > 16:
        f = load_font(size)
        left, _, right, _ = draw.textbbox((0, 0), text, font=f)
        if (right - left) <= max_w:
            return f
        size -= 4
    return load_font(16)


def render(word, path):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        [BORDER_W // 2, BORDER_W // 2, W - BORDER_W // 2, H - BORDER_W // 2],
        radius=RADIUS, fill=BG, outline=NAVY, width=BORDER_W,
    )
    f = fit_font(d, word, W - 2 * MARGIN)
    left, top, right, bottom = d.textbbox((0, 0), word, font=f)
    tw, th = right - left, bottom - top
    d.text(((W - tw) / 2 - left, (H - th) / 2 - top), word, font=f, fill=NAVY)
    img.save(path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for fname, word in TILES:
        out = os.path.join(OUT_DIR, fname)
        render(word, out)
        print(f"wrote {out}  ({word})")


if __name__ == "__main__":
    main()
