// A headed list of report findings, rendered as editorial serif statements.
//
// Replaces the old combined "What We Noticed" list (key-findings.tsx): now that
// Strengths and "Areas to confirm with your instructor" are their own headed
// sections, each renders its own FindingsList and the per-item kind eyebrow /
// "Finding 0N" numbering are redundant and dropped. Items are plain prose from
// the narration model (name + what) — no prescribed activities or methods.
//
// Renders nothing when empty; the caller decides whether to show the section.

interface FindingsListProps {
  items: string[];
}

export function FindingsList({ items }: FindingsListProps) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-8 list-none p-0 m-0">
      {items.map((item, idx) => (
        <li
          key={`finding-${idx}`}
          className="pt-7 border-t-2"
          style={{ borderColor: "var(--color-report-navy)" }}
        >
          <p
            className="text-[22px] leading-[1.3] font-medium"
            style={{
              fontFamily: "var(--font-report-serif)",
              color: "var(--color-report-navy)",
              letterSpacing: "-0.005em",
            }}
          >
            {item}
          </p>
        </li>
      ))}
    </ul>
  );
}
