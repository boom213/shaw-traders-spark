export const BUSINESS_TYPES = [
  "Workshop / service garage",
  "Spare-parts retailer",
  "EV dealer / showroom",
  "Fleet owner (e-rickshaw, delivery)",
  "Distributor",
  "Other",
] as const;
export const YEARS_OPTIONS = ["Under 1 year", "1–3 years", "3–5 years", "5+ years"] as const;
export const STAFF_OPTIONS = ["1–2", "3–5", "6–10", "10+"] as const;
export const VOLUME_OPTIONS = ["Under ₹25k", "₹25k–1L", "₹1–5L", "₹5L+"] as const;

export const pickOne = (v: unknown, list: readonly string[]) => (list.includes(String(v)) ? String(v) : "");
export const cleanList = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((s) => String(s ?? "").trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 30);

export const EV_BRANDS = [
  "Ola Electric", "Ather", "TVS iQube", "Bajaj Chetak", "Hero Vida", "Hero Electric", "Okinawa", "Ampere",
  "Pure EV", "Revolt", "Simple Energy", "Okaya", "Kinetic Green", "Lectrix", "BGauss", "Yulu",
  "E-rickshaw (any make)", "Other",
];
