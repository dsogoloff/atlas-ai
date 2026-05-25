// Atlas Assessment — conversion pipeline Stage 1.
//
// Pure extraction: each *.pdf in scripts/conversion/input/ is rendered to
// per-page PNGs at ~200 DPI, and its text layer is extracted per page.
// Output lands in scripts/conversion/output/<basename>/. One audit line
// per processed PDF is appended to scripts/conversion/conversion.log.
//
// Stage 1 of the 5-stage pipeline (0 audit, 1 extract, 2 structure,
// 3 tag, 4 load). NOT wired into the Next.js app. Run via:
//   pnpm convert:extract
//
// Render path: pdf-to-img (pdfjs-dist under the hood). pdfjs renders at
// 72 DPI when scale=1, so RENDER_SCALE = 200/72 produces ~200 DPI PNGs.
// Text path: pdf-parse with pageJoiner='' so per-page text is clean.

import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFParse } from "pdf-parse";
import { pdf } from "pdf-to-img";

interface ExtractedPage {
  page: number;
  image: string;
  text: string;
}

interface ExtractionResult {
  source: string;
  extractedAt: string;
  pageCount: number;
  pages: ExtractedPage[];
}

interface ProcessSummary {
  source: string;
  pageCount: number;
  outRel: string;
}

const RENDER_SCALE = 200 / 72;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(HERE, "input");
const OUTPUT_DIR = path.join(HERE, "output");
const LOG_FILE = path.join(HERE, "conversion.log");

async function listPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => e.name)
    .sort();
}

async function extractTextByPage(buffer: Buffer): Promise<Map<number, string>> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    // pageJoiner='' suppresses the default "-- N of M --" page-boundary
    // marker so per-page text is exactly what the page contains.
    const result = await parser.getText({ pageJoiner: "" });
    return new Map(result.pages.map((p) => [p.num, p.text]));
  } finally {
    await parser.destroy();
  }
}

async function renderPagesToPng(
  pdfPath: string,
  outDir: string,
): Promise<{ pageCount: number; imageFileNames: Map<number, string> }> {
  const doc = await pdf(pdfPath, { scale: RENDER_SCALE });
  const imageFileNames = new Map<number, string>();
  let index = 0;
  for await (const pageBuffer of doc) {
    index += 1;
    const fileName = `page-${String(index).padStart(2, "0")}.png`;
    await writeFile(path.join(outDir, fileName), pageBuffer);
    imageFileNames.set(index, fileName);
  }
  return { pageCount: doc.length, imageFileNames };
}

async function processPdf(pdfFileName: string): Promise<ProcessSummary> {
  const basename = path.basename(pdfFileName, path.extname(pdfFileName));
  const outDir = path.join(OUTPUT_DIR, basename);
  await mkdir(outDir, { recursive: true });

  const pdfPath = path.join(INPUT_DIR, pdfFileName);
  const pdfBuffer = await readFile(pdfPath);

  const { pageCount, imageFileNames } = await renderPagesToPng(pdfPath, outDir);
  const textByPage = await extractTextByPage(pdfBuffer);

  const pages: ExtractedPage[] = [];
  for (let p = 1; p <= pageCount; p += 1) {
    pages.push({
      page: p,
      image: imageFileNames.get(p) ?? "",
      text: textByPage.get(p) ?? "",
    });
  }

  const result: ExtractionResult = {
    source: pdfFileName,
    extractedAt: new Date().toISOString(),
    pageCount,
    pages,
  };

  await writeFile(
    path.join(outDir, "extraction.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );

  return { source: pdfFileName, pageCount, outRel: `output/${basename}/` };
}

async function appendAuditLine(summary: ProcessSummary): Promise<void> {
  const line = `${new Date().toISOString()} | stage1 | ${summary.source} | ${summary.pageCount} pages | ${summary.outRel}\n`;
  await appendFile(LOG_FILE, line, "utf8");
}

async function main(): Promise<void> {
  await mkdir(INPUT_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const pdfs = await listPdfs(INPUT_DIR);
  const inputRel = path.relative(process.cwd(), INPUT_DIR);

  if (pdfs.length === 0) {
    console.log(
      `No PDFs found in ${inputRel}/. Drop one or more *.pdf files there and re-run.`,
    );
    return;
  }

  console.log(`Found ${pdfs.length} PDF(s) in ${inputRel}/:`);
  for (const name of pdfs) {
    console.log(`  - ${name}`);
  }
  console.log("");

  let succeeded = 0;
  for (const pdfFileName of pdfs) {
    try {
      const summary = await processPdf(pdfFileName);
      await appendAuditLine(summary);
      console.log(
        `  [ok]   ${summary.source} — ${summary.pageCount} pages -> ${summary.outRel}`,
      );
      succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  [fail] ${pdfFileName} — ${message}`);
    }
  }

  console.log("");
  console.log(`Stage 1 done: ${succeeded}/${pdfs.length} PDF(s) extracted.`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error("Stage 1 failed:", message);
  process.exit(1);
});
