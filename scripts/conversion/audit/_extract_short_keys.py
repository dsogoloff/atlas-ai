# Atlas Assessment — extract the last-page "Short Test (Y/N)" key from each
# placement-worksheet docx (read-only audit helper). Parses the summary table
# (the one whose header contains "Short") via the docx XML, robust to wrapped
# cell text. Emits JSON: {level: [{task, skill, topic, lvl, short}]}.
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

LEVEL_PREFIX = {
    "0a": "SAM-L0A", "0b": "SAM-L0B", "0c": "SAM-L0C",
    "1": "SAM-L1", "2": "SAM-L2", "3": "SAM-L3", "4": "SAM-L4",
}


def cell_text(tc):
    # join all text runs in the cell, collapse whitespace/newlines
    parts = []
    for t in tc.iter(W + "t"):
        parts.append(t.text or "")
    txt = "".join(parts)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def rows_of_table(tbl):
    out = []
    for tr in tbl.findall(W + "tr"):
        cells = [cell_text(tc) for tc in tr.findall(W + "tc")]
        out.append(cells)
    return out


def extract(path, level_key):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    target = None
    for tbl in root.iter(W + "tbl"):
        rows = rows_of_table(tbl)
        header = " ".join(rows[0]).lower() if rows else ""
        if "short" in header and ("topic" in header or "concept" in header or "skill" in header):
            target = rows
            break
    if target is None:
        return []
    # find the column index of the Short column from the header
    header = [c.lower() for c in target[0]]
    short_idx = next((i for i, c in enumerate(header) if "short" in c), len(target[0]) - 1)
    lvl_idx = next((i for i, c in enumerate(header) if c.strip() == "level"), None)
    topic_idx = next((i for i, c in enumerate(header) if "topic" in c), None)
    skill_idx = next((i for i, c in enumerate(header) if "concept" in c or "skill" in c), None)
    prefix = LEVEL_PREFIX[level_key]
    out = []
    for row in target[1:]:
        if not row:
            continue
        task = row[0].strip()
        m = re.match(r"^(\d+)", task)
        if not m:
            continue
        n = int(m.group(1))
        def get(i):
            return row[i].strip() if (i is not None and i < len(row)) else ""
        short_raw = get(short_idx).upper()
        short = "Y" if short_raw.startswith("Y") else ("N" if short_raw.startswith("N") else short_raw)
        out.append({
            "external_id": f"{prefix}-Q{n:02d}",
            "task": n,
            "skill": get(skill_idx),
            "topic": get(topic_idx),
            "lvl": get(lvl_idx),
            "short": short,
        })
    return out


if __name__ == "__main__":
    base = "scripts/conversion/source"
    files = {
        "0a": "0a/Level 0A Placement Worksheet.docx",
        "0b": "0b/Level 0B Placement Worksheet.docx",
        "0c": "0c/Level 0C Placement Worksheet.docx",
        "1": "1/Level 1 Placement Worksheet.docx",
        "2": "2/Level_2_Placement_Worksheet.docx",
        "3": "3/Level 3 Placement Worksheet.docx",
        "4": "4/Level 4 Placement Worksheet.docx",
    }
    result = {}
    for k, rel in files.items():
        result[k] = extract(f"{base}/{rel}", k)
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False)
    print()
