/**
 * Shaw Traders EV — catalogue data layer.
 *
 * IMPORTANT BUSINESS RULE: no product names, prices, brands, stock levels,
 * reviews, warranties or compatibility data are invented here. The catalogue
 * starts empty and is filled by the shop owner through the Admin panel.
 * Everything is persisted to localStorage so the store works today and can be
 * moved to a real database later without changing the UI.
 */

import { CATALOGUE_SEED } from "@/lib/catalogue-seed";

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string; // category slug
  subcategory?: string;
  brand?: string;
  model?: string;
  price?: number; // undefined => "Contact us for price and availability."
  mrp?: number;
  stock?: number;
  images: string[];
  description?: string;
  specs?: Record<string, string>;
  voltage?: string;
  ah?: string;
  wattage?: string;
  compatibility?: string[];
  warranty?: string;
  weight?: string;
  dimensions?: string;
  shippingInfo?: string;
  createdAt: number;
};

export type Review = {
  id: string;
  productId: string;
  name: string;
  rating: number;
  text: string;
  verified: boolean;
  approved: boolean;
  createdAt: number;
};

export type Order = {
  id: string;
  createdAt: number;
  status: OrderStatus;
  items: { productId: string; name: string; price?: number; qty: number; image?: string }[];
  address: Record<string, string>;
  shippingMethod: string;
  paymentMethod: string;
  total: number;
};

export const ORDER_STATUSES = [
  "Order Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Category = { slug: string; name: string; blurb: string };

export const CATEGORIES: Category[] = [
  { slug: "ev-batteries", name: "EV Batteries", blurb: "Lithium & lead-acid packs" },
  { slug: "chargers", name: "Chargers", blurb: "Scooter & e-rickshaw chargers" },
  { slug: "motors", name: "Motors", blurb: "Hub and BLDC motors" },
  { slug: "controllers", name: "Controllers", blurb: "Speed controllers" },
  { slug: "body-parts", name: "Body Parts", blurb: "Panels, mudguards, covers" },
  { slug: "brake-parts", name: "Brake Parts", blurb: "Shoes, discs, cables" },
  { slug: "wheels-tyres", name: "Wheels & Tyres", blurb: "Rims, tyres, tubes" },
  { slug: "suspension", name: "Suspension / Shockers", blurb: "Front & rear shockers" },
  { slug: "lighting", name: "Lights & Reflectors", blurb: "Headlights, indicators" },
  { slug: "footrests", name: "Footrests", blurb: "Foot rests & pedals" },
  { slug: "locks-latches", name: "Locks & Latches", blurb: "Ignition locks, latches" },
  { slug: "electrical-parts", name: "EV Electrical Parts", blurb: "Switches, converters" },
  { slug: "cables-wiring", name: "Cables & Wiring", blurb: "Harnesses & connectors" },
  { slug: "accessories", name: "Other Accessories", blurb: "Everyday EV add-ons" },
];

export const NAV_CATEGORIES = [
  "ev-batteries",
  "chargers",
  "motors",
  "controllers",
  "body-parts",
  "brake-parts",
  "wheels-tyres",
  "lighting",
  "suspension",
  "accessories",
];

export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export const BUSINESS = {
  name: "Shaw Traders EV",
  tagline: "Complete EV Parts & Accessories",
  phone: "7501849610",
  phoneIntl: "917501849610",
  address: "Defence Colony, Bud Bud, Bardhaman, West Bengal – 713403, India",
};

export const whatsappLink = (message: string) =>
  `https://wa.me/${BUSINESS.phoneIntl}?text=${encodeURIComponent(message)}`;

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export const discountPct = (p?: number, mrp?: number) =>
  p && mrp && mrp > p ? Math.round(((mrp - p) / mrp) * 100) : 0;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* ------------------------------------------------------------------ */
/* localStorage-backed store                                           */
/* ------------------------------------------------------------------ */

const KEY = "shaw-traders-ev";

/** Bump when the printed catalogue import changes. */
export const SEED_VERSION = 1;

export type StoreState = {
  products: Product[];
  brands: string[];
  reviews: Review[];
  orders: Order[];
  cart: { productId: string; qty: number }[];
  saved: string[];
  wishlist: string[];
  recentlyViewed: string[];
  coupons: { code: string; type: "percent" | "fixed"; value: number; minOrder: number; expiry: string }[];
  vehicles: { brand: string; models: string[] }[];
  banners: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  addresses: Record<string, string>[];
  profile: { name?: string; email?: string; phone?: string } | null;
  /** Customer account stored on this device (no server login). */
  account: { name: string; phone: string; email?: string; pin: string } | null;
  signedIn: boolean;
  seedVersion?: number;
};

export const emptyState: StoreState = {
  products: [],
  brands: [],
  reviews: [],
  orders: [],
  cart: [],
  saved: [],
  wishlist: [],
  recentlyViewed: [],
  coupons: [],
  vehicles: [],
  banners: [],
  faqs: [],
  addresses: [],
  profile: null,
  account: null,
  signedIn: false,
};

/**
 * Adds the products printed in the Shaw Traders catalogue PDF, without
 * touching anything the shop owner has already edited (matched by SKU or name).
 */
export function applySeed(state: StoreState): StoreState {
  if (state.seedVersion === SEED_VERSION) return state;

  const bySku = new Set(state.products.map((p) => p.sku.toUpperCase()));
  const byName = new Set(state.products.map((p) => p.name.toUpperCase()));
  const usedSlugs = new Set(state.products.map((p) => p.slug));
  const added: Product[] = [];

  for (const s of CATALOGUE_SEED) {
    if (byName.has(s.name.toUpperCase())) continue;
    if (s.sku && bySku.has(s.sku.toUpperCase())) continue;

    let slug = slugify(s.name);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(s.name)}-${n++}`;
    usedSlugs.add(slug);

    added.push({
      id: `seed-${slug}`,
      sku: s.sku ?? slug.slice(0, 24).toUpperCase(),
      name: s.name,
      slug,
      category: s.category,
      model: s.model,
      compatibility: s.model ? [s.model] : [],
      images: [],
      createdAt: Date.now(),
    });
  }

  const vehicleModels = Array.from(new Set(CATALOGUE_SEED.map((s) => s.model).filter(Boolean) as string[])).sort();

  return {
    ...state,
    products: [...state.products, ...added],
    vehicles: state.vehicles.length ? state.vehicles : [{ brand: "Electric scooter models", models: vehicleModels }],
    seedVersion: SEED_VERSION,
  };
}

export function loadState(): StoreState {
  if (typeof window === "undefined") return applySeed(emptyState);
  try {
    const raw = window.localStorage.getItem(KEY);
    const base = raw ? { ...emptyState, ...(JSON.parse(raw) as Partial<StoreState>) } : emptyState;
    const seeded = applySeed(base);
    if (seeded !== base) window.localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return applySeed(emptyState);
  }
}

export function saveState(state: StoreState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("shaw-store-change"));
}

