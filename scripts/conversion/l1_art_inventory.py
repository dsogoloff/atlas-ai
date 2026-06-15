"""L1 art extraction — step 1: inventory the .docx media + document order.

Reads the founder's Level 1 worksheet .docx (a zip), dumps every embedded
image to scripts/conversion/output/l1-art/_raw/, and prints a table of each
image's dimensions/size. Also walks word/document.xml in reading order and
prints, for every drawing, the rId -> media filename and the surrounding
paragraph text, so we can map each image to its question.
"""
import os
import zipfile
import re
from PIL import Image

WT = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art"
DOCX = os.path.join(WT, "scripts", "conversion", "input", "Level 1 Placement Worksheet.docx")
RAW = os.path.join(WT, "scripts", "conversion", "output", "l1-art", "_raw")
os.makedirs(RAW, exist_ok=True)

z = zipfile.ZipFile(DOCX)

# 1. Dump media + inventory
media = [n for n in z.namelist() if n.startswith("word/media/")]
print(f"=== MEDIA FILES: {len(media)} ===")
inv = []
for n in sorted(media):
    data = z.read(n)
    base = os.path.basename(n)
    out = os.path.join(RAW, base)
    with open(out, "wb") as f:
        f.write(data)
    dims = ""
    try:
        im = Image.open(out)
        dims = f"{im.size[0]}x{im.size[1]} {im.mode}"
    except Exception as e:
        dims = f"(not image: {e})"
    inv.append((base, len(data), dims))
for base, size, dims in inv:
    print(f"  {base:24s} {size:>9d} B  {dims}")

# 2. Map rId -> media target from document.xml.rels
rels = z.read("word/_rels/document.xml.rels").decode("utf-8", "replace")
rid_to_target = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

# 3. Walk document.xml in order; for each paragraph, capture text + any embeds
doc = z.read("word/document.xml").decode("utf-8", "replace")
paras = re.findall(r"<w:p[ >].*?</w:p>", doc, re.S)
print(f"\n=== DOCUMENT ORDER: {len(paras)} paragraphs ===")
for i, p in enumerate(paras):
    texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)
    txt = "".join(texts).strip()
    embeds = re.findall(r'r:embed="([^"]+)"', p)
    blips = re.findall(r'r:link="([^"]+)"', p)
    imgs = [rid_to_target.get(e, e) for e in embeds + blips]
    if txt or imgs:
        tag = ("  [IMG: " + ", ".join(os.path.basename(x) for x in imgs) + "]") if imgs else ""
        show = (txt[:90] + "...") if len(txt) > 90 else txt
        print(f"  p{i:03d}: {show}{tag}")
