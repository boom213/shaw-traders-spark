import { describe, expect, it } from "vitest";
import { can, capabilityForManagePath } from "../src/lib/staff-permissions";
import { quoteGrandTotal } from "../src/lib/quote-requests.functions";

describe("wholesale quote permissions", () => {
  it("allows manager and higher roles to manage quotes", () => {
    expect(can("manager", "quotes")).toBe(true);
    expect(can("owner", "quotes")).toBe(true);
    expect(can("super_admin", "quotes")).toBe(true);
  });
  it("blocks staff and online sales from quote pricing", () => {
    expect(can("staff", "quotes")).toBe(false);
    expect(can("online_sales", "quotes")).toBe(false);
  });
  it("protects the quotes route with its dedicated capability", () => {
    expect(capabilityForManagePath("/manage/quotes")).toBe("quotes");
  });
  it("keeps inclusive totals unchanged and adds exclusive GST", () => {
    const lines = [{ qty: 2, unitPrice: 500 }];
    expect(quoteGrandTotal(lines, 18, true)).toBe(1000);
    expect(quoteGrandTotal(lines, 18, false)).toBe(1180);
    expect(quoteGrandTotal(lines, null, false)).toBe(1000);
  });
});