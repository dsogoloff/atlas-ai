"""L1 art extraction — step 5: founder-review re-crops.

1. Q02/Q03 — rebuilt WATERMARK-FREE from the raw embedded media (the
   "Seriously Addictive Maths" mark is a page overlay, not baked into the
   art), preserving relative scale so the answer stays readable
   (elephant > bear; plane longer than car).
2. Q13/Q15 — PER-SHAPE images, one file per match stimulus, keyed by the
   option id it represents (sam-l1-q13-<shape>.png) per the VISUAL_MATCHING
   left-item id convention in docs/l1-input-wiring-spec.md.
3. Q07/Q17 — PER-ELEMENT images (scene + each candidate; each day-scene).
4. Removes the superseded single composites for Q07/Q13/Q15/Q17.

Q23 + the other confirmed single composites (Q05/Q08/Q16/Q19/Q22) are left
untouched by this script.
"""
import os
from PIL import Image

BASE = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art\scripts\conversion\output\l1-art"
PAGES = os.path.join(BASE, "_pages")
RAW = os.path.join(BASE, "_raw")
PAD = 16
BG_THRESH = 244

_cache = {}
def page(n):
    if n not in _cache:
        _cache[n] = Image.open(os.path.join(PAGES, f"page-{n:02d}.png")).convert("RGB")
    return _cache[n]

def fbox(n, x0, y0, x1, y1):
    im = page(n); W, H = im.size
    return im.crop((int(x0*W), int(y0*H), int(x1*W), int(y1*H)))

def trim(im, thresh=BG_THRESH, pad=PAD):
    g = im.convert("L"); px = g.load(); W, H = im.size
    minx, miny, maxx, maxy = W, H, -1, -1
    for y in range(H):
        for x in range(W):
            if px[x, y] < thresh:
                if x < minx: minx = x
                if y < miny: miny = y
                if x > maxx: maxx = x
                if y > maxy: maxy = y
    if maxx < 0:
        return im
    c = im.crop((minx, miny, maxx+1, maxy+1))
    out = Image.new("RGB", (c.width+2*pad, c.height+2*pad), (255, 255, 255))
    out.paste(c, (pad, pad)); return out

def flat(name):
    """Load a raw embedded image, flatten onto white."""
    im = Image.open(os.path.join(RAW, name))
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[3])
        return bg
    return im.convert("RGB")

def save(im, name):
    im.save(os.path.join(BASE, name))
    print(f"  {name:30s} {im.size[0]}x{im.size[1]}")

def rm(name):
    p = os.path.join(BASE, name)
    if os.path.exists(p):
        os.remove(p); print(f"  removed {name}")

GAP = 60

# --- Q02 bigger animal: elephant (image8) + bear (image7), bottom-aligned ---
ele, bear = flat("image8.png"), flat("image7.png")
H = max(ele.height, bear.height)
W = ele.width + GAP + bear.width
canvas = Image.new("RGB", (W, H), (255, 255, 255))
canvas.paste(ele, (0, H - ele.height))
canvas.paste(bear, (ele.width + GAP, H - bear.height))
save(trim(canvas), "sam-l1-q02.png")

# --- Q03 longer: toy car (image9) over toy plane (image10), left-aligned ---
car, plane = flat("image9.png"), flat("image10.png")
W = max(car.width, plane.width)
H = car.height + GAP + plane.height
canvas = Image.new("RGB", (W, H), (255, 255, 255))
canvas.paste(car, (0, 0))
canvas.paste(plane, (0, car.height + GAP))
save(trim(canvas), "sam-l1-q03.png")

# --- Q13 plane shapes, per-shape (page 9, left column) ---
save(trim(fbox(9, 0.08, 0.392, 0.285, 0.432)), "sam-l1-q13-rectangle.png")
save(trim(fbox(9, 0.08, 0.436, 0.28, 0.503)), "sam-l1-q13-triangle.png")
save(trim(fbox(9, 0.10, 0.506, 0.29, 0.580)), "sam-l1-q13-circle.png")
save(trim(fbox(9, 0.10, 0.584, 0.29, 0.657)), "sam-l1-q13-square.png")

# --- Q15 solid shapes, per-shape (page 10, row) ---
save(trim(fbox(10, 0.12, 0.378, 0.31, 0.503)), "sam-l1-q15-cylinder.png")
save(trim(fbox(10, 0.31, 0.378, 0.49, 0.503)), "sam-l1-q15-cone.png")
save(trim(fbox(10, 0.50, 0.378, 0.67, 0.503)), "sam-l1-q15-sphere.png")
save(trim(fbox(10, 0.68, 0.378, 0.90, 0.503)), "sam-l1-q15-cube.png")

# --- Q07 match-to-complete, per-element (page 5) ---
save(trim(fbox(5, 0.03, 0.147, 0.58, 0.34)), "sam-l1-q07-scene.png")
save(trim(fbox(5, 0.745, 0.150, 0.89, 0.275)), "sam-l1-q07-option-a.png")
save(trim(fbox(5, 0.745, 0.295, 0.89, 0.44)), "sam-l1-q07-option-b.png")

# --- Q17 Tom's day, per-scene (pages 11-12) — named by activity ---
save(trim(fbox(11, 0.10, 0.774, 0.40, 0.915)), "sam-l1-q17-brushing-teeth.png")
save(trim(fbox(11, 0.42, 0.774, 0.70, 0.915)), "sam-l1-q17-studying.png")
save(trim(fbox(12, 0.12, 0.131, 0.42, 0.272)), "sam-l1-q17-walking-to-school.png")
save(trim(fbox(12, 0.44, 0.131, 0.72, 0.272)), "sam-l1-q17-sleeping.png")

# --- remove superseded single composites ---
for old in ("sam-l1-q07.png", "sam-l1-q13.png", "sam-l1-q15.png", "sam-l1-q17.png"):
    rm(old)

print("DONE")
