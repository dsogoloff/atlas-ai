"""L1 art extraction — step 3: crop each visual question's art from the
rendered pages. Every L1 overlay row (Q01-Q28) exists; the 18 with real
art get a crop named by external_id into output/l1-art/. Oral/text/
number-word-tile items (Q09,Q11,Q18,Q20,Q21,Q24,Q25,Q27,Q28) get no image.

external_id number == Evaluation-Results task number (page 18 of the
worksheet). Verified against the seeded stems.

Method: each spec gives a page + a generous bbox (fractions of the
1655x2339 page) chosen to contain ONLY that question's art, then we
auto-trim to the non-white bbox and pad a small white margin. Composites
(Q05, Q17, Q19, Q22) are assembled from sub-rects.
"""
import os
from PIL import Image

BASE = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art\scripts\conversion\output\l1-art"
PAGES = os.path.join(BASE, "_pages")

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
        row = False
        for x in range(W):
            if px[x, y] < thresh:
                if x < minx: minx = x
                if x > maxx: maxx = x
                row = True
        if row:
            if y < miny: miny = y
            if y > maxy: maxy = y
    if maxx < 0:
        return im
    c = im.crop((minx, miny, maxx+1, maxy+1))
    out = Image.new("RGB", (c.width+2*pad, c.height+2*pad), (255, 255, 255))
    out.paste(c, (pad, pad))
    return out

def whiteout(im, x0, y0, x1, y1):
    """Paint a fractional rectangle of `im` white (in place) and return it.
    Used to drop a worksheet artifact (e.g. the printed question number) that
    falls inside a generous crop bbox."""
    from PIL import ImageDraw
    w, h = im.size
    ImageDraw.Draw(im).rectangle(
        [int(x0*w), int(y0*h), int(x1*w), int(y1*h)], fill=(255, 255, 255))
    return im

def stack(parts, gap=24):
    parts = [trim(p) for p in parts]
    w = max(p.width for p in parts)
    h = sum(p.height for p in parts) + gap*(len(parts)-1)
    canvas = Image.new("RGB", (w, h), (255, 255, 255))
    y = 0
    for p in parts:
        canvas.paste(p, ((w-p.width)//2, y)); y += p.height + gap
    return trim(canvas)

def save(im, qid):
    name = f"sam-l1-{qid}.png"
    im.save(os.path.join(BASE, name))
    print(f"  {name:18s} {im.size[0]}x{im.size[1]}")

print("=== L1 art crops (named by external_id) ===")

# --- single-band crops (bands from l1_profile.py) ----------------------
save(trim(fbox(1,  0.13, 0.160, 0.92, 0.530)), "q01")  # same colour (6 objects)
save(trim(fbox(2,  0.07, 0.108, 0.86, 0.396), 150), "q02")  # bigger animal [watermark]
save(trim(fbox(2,  0.10, 0.455, 0.69, 0.715), 150), "q03")  # longer car/plane [watermark]
save(trim(fbox(3,  0.27, 0.122, 0.73, 0.332)), "q04")  # Lin / George (figures + names)
save(trim(fbox(4,  0.08, 0.640, 0.92, 0.876)), "q06")  # flower pattern + 3 choices
save(trim(fbox(5,  0.02, 0.145, 0.88, 0.478)), "q07")  # match to complete picture
save(trim(fbox(5,  0.495, 0.498, 0.88, 0.748)), "q08") # shelf (ball/box/shoe)
save(trim(fbox(7,  0.15, 0.355, 0.47, 0.530)), "q10")  # 9 grey dots
save(trim(fbox(9,  0.10, 0.148, 0.64, 0.222)), "q12")  # set A / set B circles
save(trim(fbox(9,  0.08, 0.392, 0.33, 0.655)), "q13")  # plane shapes (stimuli only)
save(trim(fbox(10, 0.16, 0.108, 0.51, 0.236)), "q14")  # apples make 8 (two boxes)
save(trim(fbox(10, 0.12, 0.378, 0.89, 0.505)), "q15")  # solid shapes (stimuli only)
save(trim(fbox(11, 0.08, 0.225, 0.92, 0.525)), "q16")  # tree: Louis / Andy
save(trim(fbox(14, 0.14, 0.642, 0.58, 0.757)), "q23")  # ribbons (7 blue + 3 red)
save(trim(fbox(16, 0.13, 0.150, 0.58, 0.315)), "q26")  # candies (select 10)

# --- composites --------------------------------------------------------
# Q05 — Group A/B boxes (WITH their header labels) + the stingray target.
# The crop INCLUDES the worksheet's "Group A / Group B" header row: a
# NUMERIC_ENTRY item renders as a single <img> with no per-box caption, so the
# labels must live on the image (the stem is only "In which group does it
# belong? / Answer: Group ___"). y0 raised to 0.092 to capture the labels; the
# stray "5." question number in the top-left band is whited out.
save(stack([whiteout(fbox(4, 0.085, 0.092, 0.95, 0.365), 0.0, 0.0, 0.066, 0.16),
            fbox(4, 0.50, 0.402, 0.66, 0.470)]), "q05")
# Q17 — Tom's day: 4 scenes (p11 bottom two + p12 top two)
save(stack([fbox(11, 0.08, 0.774, 0.72, 0.935), fbox(12, 0.06, 0.030, 0.72, 0.230)], gap=16), "q17")
# Q19 — cherries: top box + box below
save(stack([fbox(13, 0.13, 0.215, 0.63, 0.300), fbox(13, 0.13, 0.398, 0.82, 0.503)]), "q19")
# Q22 — number bond: study (6,3,9) + complete (2,6,?)
save(stack([fbox(14, 0.14, 0.190, 0.40, 0.315), fbox(14, 0.14, 0.378, 0.40, 0.505)], gap=30), "q22")

print("DONE — 19 crops")
