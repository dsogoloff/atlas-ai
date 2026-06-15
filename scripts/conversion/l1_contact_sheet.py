"""L1 art extraction — contact sheet. Auto-discovers every sam-l1-*.png in
the output folder and lays them in a labelled grid so all crops (singles +
per-element splits) can be eyeballed in one glance.
"""
import os, glob, re
from PIL import Image, ImageDraw, ImageFont

BASE = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art\scripts\conversion\output\l1-art"

files = sorted(glob.glob(os.path.join(BASE, "sam-l1-*.png")))

def natkey(p):
    s = os.path.basename(p)
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]
files.sort(key=natkey)

COLS = 5
CELL_W, CELL_H = 330, 330
LABEL_H = 44
PAD = 14
BG = (255, 255, 255); FRAME = (210, 210, 210)

def font(sz, bold=False):
    for name in (("arialbd.ttf" if bold else "arial.ttf"), "DejaVuSans.ttf"):
        try: return ImageFont.truetype(name, sz)
        except Exception: continue
    return ImageFont.load_default()

F_ID = font(22, bold=True)
rows = (len(files) + COLS - 1) // COLS
cw = CELL_W + 2*PAD
ch = CELL_H + LABEL_H + 2*PAD
W = COLS*cw
Hh = rows*ch + 64

sheet = Image.new("RGB", (W, Hh), BG)
d = ImageDraw.Draw(sheet)
d.text((PAD, 18), f"Atlas L1 art — contact sheet ({len(files)} crops, named by external_id / option-id)",
       fill=(20, 20, 20), font=font(30, bold=True))

for i, fp in enumerate(files):
    r, c = divmod(i, COLS)
    x0 = c*cw + PAD; y0 = r*ch + PAD + 64
    d.rectangle([x0, y0, x0+CELL_W, y0+CELL_H], outline=FRAME, width=2)
    im = Image.open(fp).convert("RGB")
    im.thumbnail((CELL_W-14, CELL_H-14))
    sheet.paste(im, (x0 + (CELL_W-im.width)//2, y0 + (CELL_H-im.height)//2))
    label = os.path.basename(fp).replace("sam-l1-", "").replace(".png", "")
    d.text((x0+4, y0+CELL_H+8), label, fill=(180, 30, 30), font=F_ID)

out = os.path.join(BASE, "_contact-sheet.png")
sheet.save(out)
print("contact sheet:", out, sheet.size, "| crops:", len(files))
