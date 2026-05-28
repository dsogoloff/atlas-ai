// "What We Noticed" — the parent report's key findings section.
//
// Replaces the prior MisconceptionList card grid + misconceptions_lede prose
// (Block 2 restructure). Renders one numbered list: strengths first, then
// growth areas, with the numbering continuing across both groups so the
// parent reads it as a single flow.
//
// Data shape: ReportNarration.key_findings = { strengths, growth_areas }.
// Both arrays may be 0-3 items; empty arrays are valid (thin-bank +
// classifier-quiet cases). If BOTH are empty, the section falls back to an
// empty-state card.
//
// No icons per item — the brief moves from a card-grid look to a clean
// numbered prose list. Lightweight visual differentiation between
// strengths and growth areas via a small uppercase eyebrow under the
// section header (not per-item) so the list itself stays readable.

interface KeyFindingsProps {
  strengths: string[];
  growthAreas: string[];
}

export function KeyFindings({ strengths, growthAreas }: KeyFindingsProps) {
  const isEmpty = strengths.length === 0 && growthAreas.length === 0;

  return (
    <section aria-label="What we noticed">
      <h3 className="font-display-child text-sam-navy text-xl md:text-2xl mb-4 md:mb-6">
        What We Noticed
      </h3>
      {isEmpty ? (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
          <p className="text-sam-gray-mid text-sm md:text-base leading-relaxed">
            No specific findings to surface from this assessment yet. Future
            sessions will fill this section as more responses come in.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0px_4px_24px_rgba(27,58,107,0.06)] border border-sam-gray-light/30">
          <ol className="list-decimal list-outside space-y-4 md:space-y-5 pl-6 md:pl-8 marker:font-bold marker:text-sam-navy/60">
            {strengths.map((item, idx) => (
              <li
                key={`s-${idx}`}
                className="text-sam-navy/90 text-sm md:text-base leading-relaxed pl-2"
              >
                <span className="inline-block text-[10px] md:text-xs font-bold text-sam-teal uppercase tracking-wider mr-2 align-middle">
                  Strength
                </span>
                {item}
              </li>
            ))}
            {growthAreas.map((item, idx) => (
              <li
                key={`g-${idx}`}
                className="text-sam-navy/90 text-sm md:text-base leading-relaxed pl-2"
              >
                <span className="inline-block text-[10px] md:text-xs font-bold text-sam-red uppercase tracking-wider mr-2 align-middle">
                  Growth area
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
