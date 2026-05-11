// Grade-level formatter for display.
//
// The add-child form (src/app/(auth)/add-child/add-child-form.tsx:152-158)
// is a closed-list <select> emitting exactly: "K" | "1" | … | "8".
// We expand those known values to "Kindergarten" / "Nth Grade".
//
// The DB column is open text, so non-form write paths (admin imports,
// CSV) could land "Grade 2", "Pre-K", "Kindergarten" verbatim. For
// those, pass through as-is — better to render exactly-as-stored than
// risk awkward double-prefix output ("2nd Grade Grade") from over-eager
// normalization. tier derivation in src/lib/tier/derive.ts already
// tolerates the broader shape set; the renderer just shouldn't make it
// look stupid.

export function formatGradeLevel(raw: string): string {
  if (raw === "K") return "Kindergarten";
  if (/^[1-8]$/.test(raw)) {
    const n = parseInt(raw, 10);
    return `${n}${ordinalSuffix(n)} Grade`;
  }
  return raw;
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
