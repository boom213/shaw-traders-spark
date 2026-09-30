import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, codAllowed, minimumOrderShortfall, withTax, type ShopSettings } from "@/lib/shop-settings";
import { deliveryFor } from "@/lib/delivery";

const settings = (patch: Partial<ShopSettings> = {}): ShopSettings => ({ ...DEFAULT_SETTINGS, ...patch });

describe("GST on the order summary", () => {
  it("extracts the tax out of an inclusive price", () => {
    const { total, tax } = withTax(1180, settings({ gstEnabled: true, gstRate: 18, pricesIncludeGst: true }));
    expect(total).toBe(1180);
    expect(tax).toBeCloseTo(180, 0);
  });

  it("adds tax on top when prices exclude GST", () => {
    const { total, tax } = withTax(1000, settings({ gstEnabled: true, gstRate: 18, pricesIncludeGst: false }));
    expect(tax).toBeCloseTo(180, 2);
    expect(total).toBeCloseTo(1180, 2);
  });

  it("charges nothing when GST is switched off", () => {
    expect(withTax(1000, settings({ gstEnabled: false }))).toEqual({ total: 1000, tax: 0 });
  });

  it("charges nothing at a zero rate", () => {
    expect(withTax(1000, settings({ gstEnabled: true, gstRate: 0 }))).toEqual({ total: 1000, tax: 0 });
  });
});

describe("cash on delivery rules", () => {
  it("is temporarily unavailable for every order", () => {
    const res = codAllowed(1500, "713403", settings({ codEnabled: true }));
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("Cash on Delivery is currently not available. Please pay online.");
  });
});

describe("minimum order value", () => {
  it("calculates the remaining post-discount goods value", () => {
    expect(minimumOrderShortfall(150, settings({ minOrderValue: 199 }))).toBe(49);
  });

  it("does not include a shortfall at or above the floor", () => {
    expect(minimumOrderShortfall(199, settings({ minOrderValue: 199 }))).toBe(0);
    expect(minimumOrderShortfall(500, settings({ minOrderValue: 199 }))).toBe(0);
  });

  it("keeps the store-wide minimum disabled at zero", () => {
    expect(minimumOrderShortfall(1, settings({ minOrderValue: 0 }))).toBe(0);
  });
});

describe("delivery estimate", () => {
  it("promises 1-2 days locally in Bardhaman", () => {
    const local = deliveryFor("713403");
    expect(local.ok).toBe(true);
    expect(local.label).toContain("1–2");
  });

  it("promises longer for the rest of India", () => {
    expect(deliveryFor("110001").label).toContain("5–7");
  });

  it("asks for a full pincode when it is incomplete", () => {
    expect(deliveryFor("71340").ok).toBe(false);
  });
});
