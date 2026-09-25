/**
 * Shaw Traders EV — electric scooters (whole vehicles).
 *
 * A vehicle is a different shape from a spare part: it has a specification
 * sheet, an itemised on-road price and a booking rather than a purchase.
 */

export type VehicleSpecs = {
  variant: string | null;
  colours: string[];
  batteryType: string | null;
  batteryCapacity: string | null;
  certifiedRange: string | null;
  topSpeed: string | null;
  chargingTime: string | null;
  motorPower: string | null;
  kerbWeight: string | null;
  warrantyYears: number | null;
  warrantyKm: number | null;
  registrationRequired: boolean;
  serviceIntervalMonths: number;
  serviceIntervalKm: number;
};

export type VehiclePrice = {
  exShowroom: number;
  rto: number;
  insurance: number;
  accessories: number;
  subsidy: number;
  onRoad: number;
  tokenAmount: number;
};

export type VehicleModel = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  images: string[];
  stock: number;
  specs: VehicleSpecs;
  price: VehiclePrice;
  extraSpecs: Record<string, string>;
  createdAt: string;
};

export const EMPTY_SPECS: VehicleSpecs = {
  variant: null,
  colours: [],
  batteryType: null,
  batteryCapacity: null,
  certifiedRange: null,
  topSpeed: null,
  chargingTime: null,
  motorPower: null,
  kerbWeight: null,
  warrantyYears: null,
  warrantyKm: null,
  registrationRequired: true,
  serviceIntervalMonths: 6,
  serviceIntervalKm: 3000,
};

export const EMPTY_PRICE: VehiclePrice = {
  exShowroom: 0,
  rto: 0,
  insurance: 0,
  accessories: 0,
  subsidy: 0,
  onRoad: 0,
  tokenAmount: 5000,
};

/** The itemised lines a buyer compares, in the order they expect to read them. */
export function priceLines(
  price: VehiclePrice,
  registrationRequired = true,
): { label: string; amount: number; negative?: boolean }[] {
  return [
    { label: "Ex-showroom price", amount: price.exShowroom },
    ...(registrationRequired ? [{ label: "RTO & registration", amount: price.rto }] : []),
    { label: "Insurance", amount: price.insurance },
    { label: "Accessories & handling", amount: price.accessories },
    ...(price.subsidy > 0 ? [{ label: "Subsidy (FAME / state)", amount: price.subsidy, negative: true }] : []),
  ];
}

export const SPEC_ROWS: { key: keyof VehicleSpecs; label: string; suffix?: string }[] = [
  { key: "variant", label: "Variant" },
  { key: "batteryType", label: "Battery type" },
  { key: "batteryCapacity", label: "Battery capacity" },
  { key: "certifiedRange", label: "Certified range" },
  { key: "topSpeed", label: "Top speed" },
  { key: "chargingTime", label: "Charging time" },
  { key: "motorPower", label: "Motor power" },
  { key: "kerbWeight", label: "Kerb weight" },
];

export const BOOKING_FLOW: { value: string; label: string }[] = [
  { value: "booked", label: "Booked" },
  { value: "allotted", label: "Allotted" },
  { value: "rto_in_progress", label: "RTO in progress" },
  { value: "ready_for_delivery", label: "Ready for delivery" },
  { value: "delivered", label: "Delivered" },
];

export const bookingStatusLabel = (s: string) =>
  BOOKING_FLOW.find((x) => x.value === s)?.label ?? (s === "cancelled" ? "Cancelled" : s);

export const TEST_RIDE_SLOTS = ["10:00 – 12:00", "12:00 – 14:00", "14:00 – 16:00", "16:00 – 18:00", "18:00 – 20:00"];

/** Equated monthly instalment for a simple reducing-balance loan. */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.round(principal / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principal * r * f) / (f - 1));
}
