/**
 * Builds a PostgREST `or=(...)` filter that matches `term` (case-insensitive,
 * substring) in any of `columns`. The term is stripped of filter/wildcard
 * syntax and wrapped in double quotes so it can never add or change filters.
 */
export function safeSearchTerm(term: string): string {
  return String(term ?? "")
    .replace(/[%_*\\",()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function ilikeAny(columns: readonly string[], term: string): string | null {
  const safe = safeSearchTerm(term);
  if (!safe) return null;
  return columns.map((column) => `${column}.ilike."%${safe}%"`).join(",");
}
