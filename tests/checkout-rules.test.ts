import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, codAllowed, withTax, type ShopSettings } from "@/lib/shop-settings";
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
  it("allows a small order inside the limit", () => {
    expect(codAllowed(1500, "713403", settings({ codLimit: 2000 })).allowed).toBe(true);
  });

  it("blocks an order above the limit", () => {
    const res = codAllowed(4500, "713403", settings({ codLimit: 2000 }));
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("2,000");
  });

  it("allows exactly the limit", () => {
    expect(codAllowed(2000, "713403", settings({ codLimit: 2000 })).allowed).toBe(true);
  });

  it("blocks when cash on delivery is switched off", () => {
    expect(codAllowed(100, "713403", settings({ codEnabled: false })).allowed).toBe(false);
  });

  it("blocks a pincode outside the serviceable list", () => {
    const s = settings({ codPincodes: ["713403", "713101"] });
    expect(codAllowed(500, "110001", s).allowed).toBe(false);
    expect(codAllowed(500, "713101", s).allowed).toBe(true);
  });

  it("serves everywhere when no pincode list is set", () => {
    expect(codAllowed(500, "110001", settings({ codPincodes: [] })).allowed).toBe(true);
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
