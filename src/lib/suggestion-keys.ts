/** How many quick suggestions billing shows under the product search box. */
export const SUGGESTION_LIMIT = 4;

/** Moves the highlighted suggestion with the arrow keys, wrapping at both ends. */
export function moveSuggestion(key: string, index: number, count: number): number {
  if (count <= 0) return 0;
  if (key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowUp") return (index - 1 + count) % count;
  return Math.min(Math.max(index, 0), count - 1);
}

/**
 * Suggestions are only offered for results that belong to exactly what is
 * typed, so Enter can never add an item from an older search.
 */
export function suggestionsFor<T>(
  typed: string,
  searchedFor: string,
  results: T[],
  loading: boolean,
): T[] {
  const text = typed.trim();
  if (!text || loading || text !== searchedFor) return [];
  return results.slice(0, SUGGESTION_LIMIT);
}
