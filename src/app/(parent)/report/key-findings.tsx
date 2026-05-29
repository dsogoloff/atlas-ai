// "What We Noticed" — key findings for the parent Assessment Report.
//
// Editorial reskin (docs/atlas-sample-report.html): each finding renders as
// a stacked card with a 2px navy top rule, an italic "Finding 0N" eyebrow
// in cyan, and the existing one/two-line body as the serif title. The 4-beat
// expansion in the reference HTML is intentionally NOT rendered here — the
// brief explicitly defers that pass.
//
// Data shape: ReportNarration.key_findings = { strengths, growth_areas }.
// Both arrays may be 0-3 items; empty arrays are valid (thin-bank +
// classifier-quiet cases). Strengths render first, then growth areas, with
// numbering continuous across both — the parent reads it as one ordered
// flow of "what we noticed", labelled by kind via a small pre-eyebrow.

interface KeyFindingsProps {
  strengths: string[];
  growthAreas: string[];
}

interface FindingItem {
  text: string;
  kind: "strength" | "growth";
}

function findingNumber(index: number): string {
  return `Finding ${String(index + 1).padStart(2, "0")}`;
}

export function KeyFindings({ strengths, growthAreas }: KeyFindingsProps) {
  const items: FindingItem[] = [
    ...strengths.map<FindingItem>((text) => ({ text, kind: "strength" })),
    ...growthAreas.map<FindingItem>((text) => ({ text, kind: "growth" })),
  ];

  if (items.length === 0) {
    return (
      <p
        className="text-[15px] leading-[1.65]"
        style={{
          fontFamily: "var(--font-report-sans)",
          color: "var(--color-report-text-secondary)",
        }}
      >
        No specific findings to surface from this assessment yet. Future
        sessions will fill this section as more responses come in.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-10 list-none p-0 m-0">
      {items.map((item, idx) => (
        <li
          key={`finding-${idx}`}
          className="pt-7 pb-2 border-t-2"
          style={{ borderColor: "var(--color-report-navy)" }}
        >
          <div className="flex items-baseline gap-3 mb-2.5">
            <span
              className="text-[10px] uppercase tracking-[0.14em] font-semibold"
              style={{
                fontFamily: "var(--font-report-sans)",
                color:
                  item.kind === "strength"
                    ? "var(--color-report-solid)"
                    : "var(--color-report-developing)",
              }}
            >
              {item.kind === "strength" ? "Strength" : "Growth area"}
            </span>
            <span
              className="italic text-[14px]"
              style={{
                fontFamily: "var(--font-report-serif)",
                color: "var(--color-report-cyan)",
              }}
            >
              {findingNumber(idx)}
            </span>
          </div>
          <p
            className="text-[22px] leading-[1.3] font-medium"
            style={{
              fontFamily: "var(--font-report-serif)",
              color: "var(--color-report-navy)",
              letterSpacing: "-0.005em",
            }}
          >
            {item.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
