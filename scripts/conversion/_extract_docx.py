import sys
import zipfile
import re

def extract(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8", errors="replace")
    # Convert paragraph and table-cell/row boundaries to newlines/separators
    xml = xml.replace("</w:p>", "\n")
    xml = xml.replace("</w:tc>", " | ")
    xml = xml.replace("</w:tr>", "\n---\n")
    # Strip all tags
    text = re.sub(r"<[^>]+>", "", xml)
    # Unescape basic entities
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")
    # Collapse runs of blank lines
    lines = [ln.rstrip() for ln in text.split("\n")]
    out = []
    blank = 0
    for ln in lines:
        if ln.strip() == "":
            blank += 1
            if blank <= 1:
                out.append("")
        else:
            blank = 0
            out.append(ln)
    return "\n".join(out)

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print("==================== " + p + " ====================")
        print(extract(p))
        print()
