"""Generate the four young-band QA stimulus crops (2026-06-22 QA fix wave).

Founder QA found four young-band short-test items rendering WITHOUT the stimulus
the stem refers to (or with the wrong stimulus). Each stimulus is cropped DIRECTLY
from the licensed source worksheet page (rendered via Word -> PDF -> PNG at 150 DPI),
so it is faithful to the doc — no re-drawing, no fabrication.

Outputs (into the untracked, gitignored licensed source tree):
  source/0a/sam-l0a-q11-stimulus.png  — L0A Q11 "Look at the pattern": red,blue,red,blue,red,?
  source/0b/sam-l0b-q02-stimulus.png  — L0B Q02 "comes next in the pattern": magnet,baseball x3
  source/0b/sam-l0b-q03-stimulus.png  — L0B Q03 cake WITH the triangular wedge missing (?-overlay)
  source/0c/sam-l0c-q13-stimulus.png  — L0C Q13 torn calendar: Mon-Thu | Sat-Sun (Friday torn out)

These bucket keys are wired by migration 20260622120000 (+ seed mirror) and resolved
by SOURCE_MAP in activation-image-set.ts; the founder uploads them to the private
`question-images` bucket via `pnpm convert:upload-activation-images`.

Crop boxes are for the 150-DPI render (page = 1241x1755). Re-run after a source-doc
change: `python scripts/conversion/gen_young_qa_stimuli.py`
"""
import os
import win32com.client
import fitz
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source")

# (docx, page-index-0based, crop box (x0,y0,x1,y1) @150dpi, output)
JOBS = [
    ("0a/Level 0A Placement Worksheet.docx", 10, (80, 292, 1180, 455), "0a/sam-l0a-q11-stimulus.png"),
    ("0b/Level 0B Placement Worksheet.docx", 1, (80, 322, 1180, 512), "0b/sam-l0b-q02-stimulus.png"),
    ("0b/Level 0B Placement Worksheet.docx", 1, (80, 930, 540, 1590), "0b/sam-l0b-q03-stimulus.png"),
    ("0c/Level 0C Placement Worksheet.docx", 12, (80, 620, 1180, 1285), "0c/sam-l0c-q13-stimulus.png"),
]


def render_pages(docx_abs):
    """Word -> PDF -> list[PIL.Image] at 150 DPI."""
    pdf = os.path.normpath(os.path.splitext(docx_abs)[0] + "._qa_render.pdf")
    word = win32com.client.gencache.EnsureDispatch("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(docx_abs, False, True)  # FileName, ConfirmConversions, ReadOnly
        doc.ExportAsFixedFormat(pdf, 17)  # wdExportFormatPDF
        doc.Close(False)
    finally:
        word.Quit()
    d = fitz.open(pdf)
    mat = fitz.Matrix(150 / 72.0, 150 / 72.0)
    imgs = []
    for page in d:
        pix = page.get_pixmap(matrix=mat)
        imgs.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    d.close()
    os.remove(pdf)
    return imgs


def trim_white(im, pad=12):
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bbox = ImageChops.difference(im.convert("RGB"), bg).getbbox()
    if not bbox:
        return im
    l = max(0, bbox[0] - pad); t = max(0, bbox[1] - pad)
    r = min(im.size[0], bbox[2] + pad); b = min(im.size[1], bbox[3] + pad)
    return im.crop((l, t, r, b))


def main():
    cache = {}
    for docx_rel, page_idx, box, out_rel in JOBS:
        docx_abs = os.path.normpath(os.path.join(SRC, docx_rel))
        if docx_abs not in cache:
            cache[docx_abs] = render_pages(docx_abs)
        crop = trim_white(cache[docx_abs][page_idx].crop(box))
        out = os.path.join(SRC, out_rel)
        crop.save(out)
        print(f"{out_rel}  {crop.size[0]}x{crop.size[1]}")


if __name__ == "__main__":
    main()
