# Generates the single sorted-shapes stimulus for SAM-L0B-Q07 ("How are the
# shapes sorted?", lane/young-band-activation-delta). The licensed source has the
# two sort groups as SEPARATE crops — 0B-07_1.png (a group of pink shapes) and
# 0B-07_2.png (a group of green shapes) — but the question shell renders ONE
# stimulus image. This script composites the two existing crops side by side on a
# plain white canvas so the sort criterion (colour — each box is one colour while
# shape and size vary within a box) is visible in a single image. It is NOT new
# illustration: it only arranges the two licensed crops. This makes Q07 the
# one-image-away flip the activation overlay needs.
#
# Output is written to the uploader's L0 source dir
# (scripts/conversion/source/0b/, untracked — same place the licensed crops live),
# so `pnpm convert:upload-activation-images` finds it at l0/sam-l0b-q07.png.
#
# Re-run: python scripts/conversion/gen_l0b_q07_stimulus.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "source", "0b")

LEFT = os.path.join(SRC_DIR, "0B-07_1.png")   # pink group
RIGHT = os.path.join(SRC_DIR, "0B-07_2.png")  # green group
OUT = os.path.join(SRC_DIR, "sam-l0b-q07.png")

BG = (255, 255, 255)  # white
GAP = 48              # horizontal gap between the two boxes
MARGIN = 40           # outer margin
TARGET_H = 360        # normalize both crops to this height


def load_scaled(path: str, target_h: int) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    scale = target_h / img.height
    return img.resize((round(img.width * scale), target_h), Image.LANCZOS)


def main() -> None:
    left = load_scaled(LEFT, TARGET_H)
    right = load_scaled(RIGHT, TARGET_H)

    width = MARGIN * 2 + left.width + GAP + right.width
    height = MARGIN * 2 + TARGET_H
    canvas = Image.new("RGBA", (width, height), BG + (255,))

    canvas.alpha_composite(left, (MARGIN, MARGIN))
    canvas.alpha_composite(right, (MARGIN + left.width + GAP, MARGIN))

    canvas.convert("RGB").save(OUT, "PNG")
    print(f"wrote {OUT} ({width}x{height})")


if __name__ == "__main__":
    main()
