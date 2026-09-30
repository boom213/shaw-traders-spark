import { describe, expect, it } from "vitest";
import { GSTIN_ERROR, taxIdError } from "@/lib/trade-options";

describe("wholesale tax ID validation", () => {
  it("accepts an empty optional GSTIN", () => {
    expect(taxIdError("")).toBeNull();
  });

  it("accepts a valid GSTIN", () => {
    expect(taxIdError("22AAAAA0000A1Z5")).toBeNull();
  });

  it("rejects a malformed GSTIN", () => {
    expect(taxIdError("not-a-gstin")).toBe(GSTIN_ERROR);
  });
});