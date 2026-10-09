import { describe, expect, it } from "vitest";
import { catalogueSaleLines, outstanding, saleTotal } from "../src/lib/showroom";
import type { VehicleModel } from "../src/lib/vehicles";

describe("showroom agreed prices and outstanding", () => {
  it("deducts subsidy and deal discount from itemised price", () => {
    expect(saleTotal([
      { label: "Vehicle", kind: "vehicle", amount: 90000 },
      { label: "RTO", kind: "rto", amount: 6000 },
      { label: "Subsidy", kind: "subsidy", amount: -10000 },
    ], 2000)).toBe(84000);
  });
  it("counts only confirmed online tokens alongside valid receipts", () => {
    expect(outstanding(90000, 5000, "pending", 10000)).toBe(80000);
    expect(outstanding(90000, 5000, "paid", 10000)).toBe(75000);
    expect(outstanding(90000, 5000, "failed", 10000)).toBe(80000);
  });
  it("floors fully paid outstanding at zero", () => {
    expect(outstanding(90000, 5000, "paid", 85000)).toBe(0);
  });
  it("prefills zero RTO for registration-exempt models", () => {
    const model = { price: { exShowroom: 90000, rto: 6000, insurance: 4500, accessories: 2000, subsidy: 10000 }, specs: { registrationRequired: false } } as VehicleModel;
    expect(catalogueSaleLines(model).find(line => line.kind === "rto")?.amount).toBe(0);
    expect(saleTotal(catalogueSaleLines(model), 0)).toBe(86500);
  });
});