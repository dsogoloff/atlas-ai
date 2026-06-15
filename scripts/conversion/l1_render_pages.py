"""L1 art extraction — step 2: render the .docx to PDF (via Word) and
rasterize each page to PNG so we can see the true layout and plan crops.
"""
import os
import win32com.client
import fitz  # pymupdf

WT = r"C:\Users\Acer\PROJECTS\atlas-ai-l1-art"
DOCX = os.path.join(WT, "scripts", "conversion", "input", "Level 1 Placement Worksheet.docx")
OUTDIR = os.path.join(WT, "scripts", "conversion", "output", "l1-art")
PAGES = os.path.join(OUTDIR, "_pages")
os.makedirs(PAGES, exist_ok=True)
PDF = os.path.join(OUTDIR, "_l1_rendered.pdf")

# 1. Word -> PDF (wdExportFormatPDF = 17)
word = win32com.client.Dispatch("Word.Application")
word.Visible = False
try:
    doc = word.Documents.Open(DOCX, ReadOnly=True)
    doc.ExportAsFixedFormat(PDF, 17)
    doc.Close(False)
finally:
    word.Quit()
print("PDF written:", PDF, os.path.getsize(PDF), "bytes")

# 2. Rasterize at 200 DPI
d = fitz.open(PDF)
print("pages:", d.page_count)
zoom = 200 / 72.0
mat = fitz.Matrix(zoom, zoom)
for i, page in enumerate(d):
    pix = page.get_pixmap(matrix=mat)
    out = os.path.join(PAGES, f"page-{i+1:02d}.png")
    pix.save(out)
    print(f"  page-{i+1:02d}.png  {pix.width}x{pix.height}")
