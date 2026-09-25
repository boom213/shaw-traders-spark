/**
 * Shaw Traders EV — shared types and display helpers.
 *
 * All catalogue, order, review and coupon data lives in the database.
 * Only the shopper's own cart / wishlist / saved / recently-viewed lists are
 * kept in local state (and mirrored to the database when signed in).
 */

import type { OrderingMode } from "@/lib/ordering";

export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string; // category slug
  categoryName?: string;
  /** How this part may be bought, when it overrides the category and the site. */
  orderingMode?: OrderingMode;
  categoryOrderingMode?: OrderingMode;
  subcategory?: string;
  brand?: string;
  model?: string;
  price?: number;
  mrp?: number;
  stock: number;
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
  boxContents?: string;
  hsnCode?: string;
  createdAt: string;
};

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  imageUrl?: string;
  productCount?: number;
};

export type Review = {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  name: string;
  verified: boolean;
  photos?: string[];
  reply?: string | null;
  createdAt: string;
};

export type OrderStatus =
  | "order_confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export const ORDER_FLOW: { value: OrderStatus; label: string }[] = [
  { value: "order_confirmed", label: "Order Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
];

export const ORDER_EXTRA: { value: OrderStatus; label: string }[] = [
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

export const ALL_STATUSES = [...ORDER_FLOW, ...ORDER_EXTRA];

export const statusLabel = (s: string) => ALL_STATUSES.find((x) => x.value === s)?.label ?? s;

export type OrderItemView = {
  id: string;
  productId: string | null;
  name: string;
  price: number | null;
  qty: number;
  image: string | null;
};

export type OrderView = {
  id: string;
  humanId: string;
  token: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  taxAmount: number;
  gstRate: number;
  gstIncluded: boolean;
  gstin: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  shippingMethod: string | null;
  address: Record<string, string>;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  requests?: {
    id: string;
    kind: "cancellation" | "return";
    reason: string;
    details: string | null;
    status: "pending" | "approved" | "rejected";
    decisionNote: string | null;
    createdAt: string;
  }[];
  refunds?: { id: string; amount: number; method: string; createdAt: string }[];
  placedAt: string;
  updatedAt: string;
  items: OrderItemView[];
  events?: { status: OrderStatus; note: string | null; createdAt: string }[];
};

/** Slugs in display order — used for icons and quick nav only. */
export const NAV_CATEGORIES = [
  "chargers",
  "motors",
  "controllers",
  "body-parts",
  "brake-parts",
  "wheels-tyres",
  "lighting",
  "suspension",
  "accessories",
  "ev-batteries",
];

export const BUSINESS = {
  name: "Shaw Traders EV",
  tagline: "Complete EV Parts & Accessories",
  phone: "7501849610",
  phoneIntl: "917501849610",
  address: "Defence Colony, Bud Bud, Bardhaman, West Bengal – 713403, India",
  site: "https://shawtradersev.info",
  /** Square logo used by search engines and social cards. */
  logo: "https://shawtradersev.com/app-icon-512.png",
  /** 1200x630 share banner used as the site-wide default og:image. */
  banner: "https://shawtradersev.com/og-image.png",
  /**
   * TODO: add the real Google Business Profile, Instagram and Facebook URLs
   * here once confirmed by the owner. Do not add guessed or placeholder URLs —
   * an unverified sameAs entry weakens the entity signal instead of helping it.
   */
  sameAs: [] as string[],
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

export const canonical = (path: string) => `${BUSINESS.site}${path}`;

/**
 * BreadcrumbList JSON-LD for a page. Pass the trail without "Home" —
 * it is prepended automatically.
 */
export const breadcrumbLd = (trail: { name: string; path: string }[]) => ({
  type: "application/ld+json",
  children: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  }),
});

