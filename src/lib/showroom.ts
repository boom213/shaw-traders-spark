import type { VehicleModel } from "@/lib/vehicles";

export const SALE_LINE_KINDS = [
  "vehicle",
  "rto",
  "insurance",
  "accessory",
  "subsidy",
  "discount",
  "finance_fee",
] as const;
export type SaleLine = { label: string; amount: number; kind: (typeof SALE_LINE_KINDS)[number] };
export function catalogueSaleLines(vehicle: VehicleModel): SaleLine[] {
  return [
    { label: "Ex-showroom", amount: vehicle.price.exShowroom, kind: "vehicle" },
    {
      label: "RTO",
      amount: vehicle.specs.registrationRequired ? vehicle.price.rto : 0,
      kind: "rto",
    },
    { label: "Insurance", amount: vehicle.price.insurance, kind: "insurance" },
    { label: "Accessories", amount: vehicle.price.accessories, kind: "accessory" },
    { label: "Subsidy", amount: -vehicle.price.subsidy, kind: "subsidy" },
  ];
}
export function saleTotal(lines: SaleLine[], discount: number) {
  return Math.round((lines.reduce((sum, line) => sum + line.amount, 0) - discount) * 100) / 100;
}
export function outstanding(total: number, token: number, paymentStatus: string, receipts: number) {
  return Math.max(0, total - (paymentStatus === "paid" ? token : 0) - receipts);
}
