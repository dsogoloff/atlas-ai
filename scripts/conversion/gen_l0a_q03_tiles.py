# Generates the 2 size-comparison tiles for SAM-L0A-Q03 ("Tap the big bowl").
# The source is a SINGLE bowl crop (0A-03.png) — a same-object size comparison —
# so we reuse it at two clearly-distinguishable sizes on identical canvases, so
# that when the two tiles render in equal-sized CLICK_IMAGE_SINGLE boxes the big
# bowl looks big and the small bowl looks small.
#   t1 = small bowl (~50%)   t2 = big bowl (~95%)  -> correct = t2
# GENERATED (not a new licensed asset; just rescales the one licensed crop).
# Output -> the uploader's L0 source dir (scripts/conversion/source/0a/), the same
# place the licensed crops live, so `pnpm convert:upload-activation-images` finds them.
#
# Re-run: python scripts/conversion/gen_l0a_q03_tiles.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "source", "0a")
SRC = os.path.join(SRC_DIR, "0A-03.png")

W, H = 480, 360
BG = (255, 255, 255)


def make(scale_frac: float, out_name: str) -> None:
    img = Image.open(SRC).convert("RGBA")
    # Fit the bowl within (scale_frac * canvas), preserving aspect ratio.
    box_w, box_h = int(W * scale_frac), int(H * scale_frac)
    ratio = min(box_w / img.width, box_h / img.height)
    new = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    canvas.alpha_composite(new, ((W - new.width) // 2, (H - new.height) // 2))
    canvas.convert("RGB").save(os.path.join(SRC_DIR, out_name), "PNG")
    print(f"wrote {out_name} ({new.width}x{new.height} on {W}x{H})")


def main() -> None:
    make(0.50, "sam-l0a-q03-t1.png")  # small
    make(0.95, "sam-l0a-q03-t2.png")  # big (correct)


if __name__ == "__main__":
    main()
