"""Linear, order-preserving extraction of the Level 2 Placement Worksheet .docx.

Walks word/document.xml in document order and emits:
  - paragraph text (with style name)
  - table rows (incl. the Evaluation Results table)
  - textbox content (w:txbxContent — the "How To Answer" boxes live here)
  - inline/anchored image markers, resolved r:embed -> media filename + EMU size

All embedded media is copied to output/l2-extract/media/ so each drawing can be
viewed and content-matched. A linear text dump goes to output/l2-extract/linear.txt
and a structured JSON to output/l2-extract/linear.json.

Run from repo root:  python scripts/conversion/extract_l2_docx.py
"""

import json
import os
import shutil
import zipfile
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
DOCX = os.path.join(HERE, "input", "Level_2_Placement_Worksheet.docx")
OUT = os.path.join(HERE, "output", "l2-extract")
MEDIA_OUT = os.path.join(OUT, "media")

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"


def qn(prefix_uri, tag):
    return f"{{{prefix_uri}}}{tag}"


def load_rels(z):
    """rId -> target media path (word/media/...)."""
    rels = {}
    with z.open("word/_rels/document.xml.rels") as f:
        tree = ET.parse(f)
    for rel in tree.getroot():
        rid = rel.get("Id")
        target = rel.get("Target")
        rels[rid] = target
    return rels


def para_text(p):
    """Concatenate all w:t descendants (covers runs, hyperlinks, etc.)."""
    parts = []
    for t in p.iter(qn(W, "t")):
        parts.append(t.text or "")
    # represent tabs/breaks coarsely
    return "".join(parts)


def para_style(p):
    ppr = p.find(qn(W, "pPr"))
    if ppr is None:
        return ""
    st = ppr.find(qn(W, "pStyle"))
    if st is None:
        return ""
    return st.get(qn(W, "val")) or ""


def collect_images_in(elem, rels, out_events):
    """Find every a:blip r:embed under elem; emit image events with size."""
    for drawing in elem.iter(qn(W, "drawing")):
        # size (EMU) from wp:extent if present
        cx = cy = None
        ext = drawing.find(f".//{qn(WP,'extent')}")
        if ext is not None:
            cx = ext.get("cx")
            cy = ext.get("cy")
        for blip in drawing.iter(qn(A, "blip")):
            rid = blip.get(qn(R, "embed"))
            target = rels.get(rid, "?")
            out_events.append({
                "kind": "image",
                "rid": rid,
                "media": target,
                "emu_w": cx,
                "emu_h": cy,
            })
    # legacy VML images (v:imagedata)
    for img in elem.iter("{urn:schemas-microsoft-com:vml}imagedata"):
        rid = img.get(qn(R, "id"))
        if rid:
            out_events.append({
                "kind": "image",
                "rid": rid,
                "media": rels.get(rid, "?"),
                "emu_w": None,
                "emu_h": None,
            })


def textbox_texts(elem):
    """Return list of paragraph texts inside any w:txbxContent under elem."""
    out = []
    for txbx in elem.iter(qn(W, "txbxContent")):
        for p in txbx.iter(qn(W, "p")):
            out.append(para_text(p))
    return out


def walk_block(elem, rels, events, depth=0):
    """Walk direct block children (p / tbl) of a body or cell, in order."""
    for child in elem:
        tag = child.tag
        if tag == qn(W, "p"):
            txt = para_text(child)
            tb = textbox_texts(child)
            ev = {"kind": "p", "style": para_style(child), "text": txt}
            if tb:
                ev["textbox"] = tb
            events.append(ev)
            collect_images_in(child, rels, events)
        elif tag == qn(W, "tbl"):
            rows = []
            for tr in child.findall(qn(W, "tr")):
                cells = []
                for tc in tr.findall(qn(W, "tc")):
                    # cell text = join of its paragraphs
                    cell_paras = [para_text(p) for p in tc.findall(qn(W, "p"))]
                    cells.append(" / ".join(t for t in cell_paras if t))
                    # images inside cells
                    collect_images_in(tc, rels, events_sink_for_cell(events))
                rows.append(cells)
            events.append({"kind": "table", "rows": rows})


def events_sink_for_cell(events):
    # images found in cells are appended to the same flat events list;
    # we just return it so collect_images_in can append.
    return events


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(MEDIA_OUT, exist_ok=True)

    z = zipfile.ZipFile(DOCX)
    rels = load_rels(z)

    # dump all media
    media_index = {}
    for name in z.namelist():
        if name.startswith("word/media/"):
            base = os.path.basename(name)
            with z.open(name) as src, open(os.path.join(MEDIA_OUT, base), "wb") as dst:
                dst.write(src.read())
            media_index[name] = base

    with z.open("word/document.xml") as f:
        tree = ET.parse(f)
    body = tree.getroot().find(qn(W, "body"))

    events = []
    walk_block(body, rels, events)

    # write JSON
    with open(os.path.join(OUT, "linear.json"), "w", encoding="utf-8") as f:
        json.dump({"events": events, "media_index": media_index}, f, indent=2, ensure_ascii=False)

    # write human-readable linear dump
    lines = []
    img_seq = 0
    for ev in events:
        if ev["kind"] == "p":
            style = f"[{ev['style']}] " if ev["style"] else ""
            if ev["text"].strip() or ev.get("textbox"):
                lines.append(f"{style}{ev['text']}")
            if ev.get("textbox"):
                for tb in ev["textbox"]:
                    if tb.strip():
                        lines.append(f"    «TEXTBOX» {tb}")
        elif ev["kind"] == "image":
            img_seq += 1
            base = os.path.basename(ev["media"]) if ev["media"] != "?" else "?"
            wmm = hmm = "?"
            if ev["emu_w"]:
                wmm = round(int(ev["emu_w"]) / 360000, 2)
                hmm = round(int(ev["emu_h"]) / 360000, 2)
            lines.append(f"    <<IMG#{img_seq} media={base} {wmm}x{hmm}cm>>")
        elif ev["kind"] == "table":
            lines.append("  --- TABLE ---")
            for row in ev["rows"]:
                lines.append("   | " + " | ".join(row))
            lines.append("  --- /TABLE ---")

    with open(os.path.join(OUT, "linear.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    n_img = sum(1 for e in events if e["kind"] == "image")
    n_tbl = sum(1 for e in events if e["kind"] == "table")
    n_p = sum(1 for e in events if e["kind"] == "p")
    print(f"events: {len(events)}  paragraphs={n_p} tables={n_tbl} images={n_img}")
    print(f"media files copied: {len(media_index)}")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
