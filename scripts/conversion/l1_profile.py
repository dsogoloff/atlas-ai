"""Profiler: for each given page, print the y-ranges (as fractions) of
horizontal ink bands separated by whitespace gaps, so crop bands can be
chosen precisely. Also prints x-extent of each band.
"""
import sys
from PIL import Image
import os

PAGES = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art\scripts\conversion\output\l1-art\_pages"
THRESH = 244
MIN_GAP = 18   # whitespace rows needed to split bands
import os as _os
if _os.environ.get("PT"):
    THRESH = int(_os.environ["PT"])

def profile(n):
    im = Image.open(os.path.join(PAGES, f"page-{n:02d}.png")).convert("L")
    W, H = im.size
    px = im.load()
    ink_rows = []
    for y in range(H):
        cnt = 0
        for x in range(W):
            if px[x, y] < THRESH:
                cnt += 1
        ink_rows.append(cnt)
    # find bands
    bands = []
    y = 0
    while y < H:
        if ink_rows[y] > 0:
            y0 = y
            gap = 0
            while y < H and gap < MIN_GAP:
                if ink_rows[y] == 0:
                    gap += 1
                else:
                    gap = 0
                y += 1
            y1 = y - gap
            # x-extent within band
            minx, maxx = W, -1
            for yy in range(y0, y1):
                for x in range(W):
                    if px[x, yy] < THRESH:
                        if x < minx: minx = x
                        if x > maxx: maxx = x
            bands.append((y0, y1, minx, maxx))
        else:
            y += 1
    print(f"--- page {n}  ({W}x{H}) ---")
    for (y0, y1, minx, maxx) in bands:
        print(f"  y {y0/H:.3f}-{y1/H:.3f}  x {minx/W:.3f}-{maxx/W:.3f}  (h={y1-y0}px)")

for a in sys.argv[1:]:
    profile(int(a))
