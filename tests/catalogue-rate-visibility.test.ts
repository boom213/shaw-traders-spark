import { describe, expect, it } from "vitest";
import { shouldHideCatalogueRates } from "../src/hooks/useTrade";

describe("catalogue rate visibility", () => {
  it("keeps rates public for signed-out and retail shoppers", () => {
    expect(shouldHideCatalogueRates({ signedIn: false, tradeReady: false, staffReady: false, approvedTrade: false, staff: false })).toBe(false);
    expect(shouldHideCatalogueRates({ signedIn: true, tradeReady: true, staffReady: true, approvedTrade: false, staff: false })).toBe(false);
  });

  it("hides rates from approved wholesale customers", () => {
    expect(shouldHideCatalogueRates({ signedIn: true, tradeReady: true, staffReady: true, approvedTrade: true, staff: false })).toBe(true);
  });

  it("keeps rates visible to staff and masks them while a signed-in role is unresolved", () => {
    expect(shouldHideCatalogueRates({ signedIn: true, tradeReady: true, staffReady: true, approvedTrade: true, staff: true })).toBe(false);
    expect(shouldHideCatalogueRates({ signedIn: true, tradeReady: false, staffReady: true, approvedTrade: false, staff: false })).toBe(true);
    expect(shouldHideCatalogueRates({ signedIn: true, tradeReady: true, staffReady: false, approvedTrade: true, staff: false })).toBe(true);
  });
});