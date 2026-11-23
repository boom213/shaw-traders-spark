import { describe, expect, it } from "vitest";
import { moveSuggestion, suggestionsFor, SUGGESTION_LIMIT } from "@/lib/suggestion-keys";

const results = ["a", "b", "c", "d", "e", "f"];

describe("billing search suggestions", () => {
  it("offers the top 4 matches for what is typed", () => {
    expect(SUGGESTION_LIMIT).toBe(4);
    expect(suggestionsFor("shock", "shock", results, false)).toEqual(["a", "b", "c", "d"]);
    expect(suggestionsFor("  shock ", "shock", results, false)).toHaveLength(4);
  });

  it("shows fewer when there are fewer matches", () => {
    expect(suggestionsFor("bolt", "bolt", ["a", "b"], false)).toEqual(["a", "b"]);
  });

  it("never offers results from an older search", () => {
    expect(suggestionsFor("shocks", "shock", results, false)).toEqual([]);
    expect(suggestionsFor("shock", "shock", results, true)).toEqual([]);
  });

  it("offers nothing for an empty box", () => {
    expect(suggestionsFor("", "", results, false)).toEqual([]);
  });

  it("moves with the arrow keys and wraps around", () => {
    expect(moveSuggestion("ArrowDown", 0, 4)).toBe(1);
    expect(moveSuggestion("ArrowDown", 3, 4)).toBe(0);
    expect(moveSuggestion("ArrowUp", 0, 4)).toBe(3);
    expect(moveSuggestion("ArrowUp", 2, 4)).toBe(1);
    expect(moveSuggestion("ArrowDown", 0, 0)).toBe(0);
    expect(moveSuggestion("Tab", 5, 3)).toBe(2);
  });
});
