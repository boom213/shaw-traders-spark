import { describe, expect, it } from "vitest";
import { categoryLabel } from "../src/lib/i18n";

describe("category names follow the selected language", () => {
  const chargers = { name: "Chargers", nameHi: "चार्जर", nameBn: "চার্জার" };

  it("shows the Hindi name when Hindi is selected", () => {
    expect(categoryLabel(chargers, "hi")).toBe("चार्जर");
  });

  it("shows the Bengali name when Bengali is selected", () => {
    expect(categoryLabel(chargers, "bn")).toBe("চার্জার");
  });

  it("falls back to English when no translation was entered", () => {
    expect(categoryLabel({ name: "Motors", nameHi: "  " }, "hi")).toBe("Motors");
    expect(categoryLabel({ name: "Motors" }, "bn")).toBe("Motors");
  });
});
