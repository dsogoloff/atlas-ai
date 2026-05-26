// First-name extractor for parent-facing surfaces.
//
// children.name is the only name field the schema stores; it may carry
// either a single name or a "First Last" form. Parent-facing copy uses
// first name only (warmer, matches the narration's voice rule). This
// helper centralises the split so every surface produces the same first
// name from the same input.
//
// Works for 95%+ of names (whitespace-delimited tokens). Edge cases —
// mononyms, multi-word given names like "Mary Beth", hyphenated names —
// render harmlessly: mononyms return as-is, multi-word given names use
// the first token (acceptable v1 trade-off; a first_name column is a
// future schema change, out of current scope).

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
