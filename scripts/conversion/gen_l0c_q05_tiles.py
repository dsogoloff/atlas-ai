# Generates the 3 size-ordering tiles for SAM-L0C-Q05 ("order by size: smallest,
# bigger, biggest"). The source crop is a SINGLE object (0C-05.png, a carrot), so
# we reuse it at three clearly-distinguishable sizes on identical canvases for an
# IMAGE_ORDERING task (drag smallest -> biggest). This is a same-object size
# adaptation (the worksheet's 3 objects were not all cropped); the skill (order by
# size) is faithfully preserved and auto-gradeable.
#   t1 small (~40%)  t2 medium (~65%)  t3 big (~95%)  -> correct order t1,t2,t3
# GENERATED. Output -> scripts/conversion/source/0c/ (uploader L0 source dir).
#
# Re-run: python scripts/conversion/gen_l0c_q05_tiles.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "source", "0c")
SRC = os.path.join(SRC_DIR, "0C-05.png")

W, H = 480, 360
BG = (255, 255, 255)


def make(scale_frac: float, out_name: str) -> None:
    img = Image.open(SRC).convert("RGBA")
    box_w, box_h = int(W * scale_frac), int(H * scale_frac)
    ratio = min(box_w / img.width, box_h / img.height)
    new = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", (W, H), BG + (255,))
    canvas.alpha_composite(new, ((W - new.width) // 2, (H - new.height) // 2))
    canvas.convert("RGB").save(os.path.join(SRC_DIR, out_name), "PNG")
    print(f"wrote {out_name} ({new.width}x{new.height} on {W}x{H})")


def main() -> None:
    make(0.40, "sam-l0c-q05-t1.png")  # smallest
    make(0.65, "sam-l0c-q05-t2.png")  # bigger
    make(0.95, "sam-l0c-q05-t3.png")  # biggest


if __name__ == "__main__":
    main()
