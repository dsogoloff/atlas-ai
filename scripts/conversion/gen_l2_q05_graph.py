"""Build the Q05 seashell picture-graph image by tiling the founder's single
seashell icon (l2-art/L2-5.png) once per shell, per the founder-supplied
counts: Jimmy 9, Adam 6, Tom 11, Mark 15.

Q05 stem: "How many more seashells were collected by Mark than by Adam?"
=> 15 - 6 = 9 (NUMERIC_ENTRY correct_answer "9").

Output (gitignored): output/l2-art-generated/q-sam-l2-q05-seashell-graph.png
The founder uploads this file to the question-images bucket as
  q-sam-l2-q05-seashell-graph.png
"""

import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, "input", "l2-art", "L2-5.png")
OUT_DIR = os.path.join(HERE, "output", "l2-art-generated")
OUT = os.path.join(OUT_DIR, "q-sam-l2-q05-seashell-graph.png")

COUNTS = [("Jimmy", 9), ("Adam", 6), ("Tom", 11), ("Mark", 15)]

ICON = 40          # px per shell icon (square cell)
GAP = 2            # px gap between icons
LABEL_W = 90       # left label column width
ROW_H = ICON + 12
PAD = 16
MAXN = max(n for _, n in COUNTS)


def load_font(size):
    for path in (
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    shell = Image.open(SHELL).convert("RGBA")
    shell = shell.resize((ICON - 2 * GAP, ICON - 2 * GAP), Image.LANCZOS)

    grid_w = LABEL_W + MAXN * ICON
    width = grid_w + 2 * PAD
    height = PAD + len(COUNTS) * ROW_H + 40 + PAD  # rows + key line
    img = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    font = load_font(22)
    keyfont = load_font(18)

    y = PAD
    for name, n in COUNTS:
        # row baseline box
        cy = y + (ROW_H - ICON) // 2
        draw.text((PAD, y + (ROW_H - 22) // 2), name, fill=(20, 20, 20), font=font)
        for i in range(n):
            x = PAD + LABEL_W + i * ICON + GAP
            img.paste(shell, (x, cy + GAP), shell)
        # row separator
        draw.line(
            [(PAD + LABEL_W, y + ROW_H - 1), (PAD + grid_w, y + ROW_H - 1)],
            fill=(210, 210, 210), width=1,
        )
        y += ROW_H

    # vertical axis line after labels
    draw.line([(PAD + LABEL_W, PAD), (PAD + LABEL_W, y)], fill=(120, 120, 120), width=2)

    # key
    ky = y + 8
    key_icon = shell.resize((24, 24), Image.LANCZOS)
    img.paste(key_icon, (PAD, ky), key_icon)
    draw.text((PAD + 30, ky), "stands for 1 seashell", fill=(40, 40, 40), font=keyfont)

    img.convert("RGB").save(OUT, "PNG")
    print(f"wrote {OUT}  ({width}x{height})  counts={COUNTS}  Mark-Adam={15-6}")


if __name__ == "__main__":
    main()
