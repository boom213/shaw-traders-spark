export type StaffRole = "super_admin" | "owner" | "manager" | "staff" | "online_sales";

export type StaffCapability =
  | "online-orders"
  | "operations"
  | "catalogue"
  | "trade"
  | "counter-sales"
  | "vendor-finance"
  | "quotes"
  | "content"
  | "reports"
  | "settings"
  | "staff.manage";

const RANK: Record<StaffRole, number> = { online_sales: 0, staff: 1, manager: 2, owner: 3, super_admin: 4 };

export const ROLE_LABEL: Record<StaffRole, string> = {
  online_sales: "Sales Manager",
  staff: "Staff",
  manager: "Manager",
  owner: "Owner",
  super_admin: "Super admin",
};

export const CAPABILITY_ROLE: Record<StaffCapability, StaffRole> = {
  "online-orders": "online_sales",
  operations: "staff",
  catalogue: "manager",
  trade: "owner",
  "counter-sales": "manager",
  "vendor-finance": "manager",
  quotes: "manager",
  content: "manager",
  reports: "owner",
  settings: "owner",
  "staff.manage": "super_admin",
};

export function roleAtLeast(role: StaffRole, minimum: StaffRole): boolean {
  return RANK[role] >= RANK[minimum];
}

export function can(role: StaffRole, capability: StaffCapability): boolean {
  return roleAtLeast(role, CAPABILITY_ROLE[capability]);
}

export const MANAGE_ROUTE_CAPABILITY = {
  "/manage": "operations",
  "/manage/orders": "online-orders",
  "/manage/enquiries": "operations",
  "/manage/quotes": "quotes",
  "/manage/reviews": "operations",
  "/manage/bookings": "operations",
  "/manage/customers": "operations",
  "/manage/outreach": "operations",
  "/manage/all-products": "operations",
  "/manage/products/$productId": "catalogue",
  "/manage/counter-sales": "counter-sales",
  "/manage/vendors": "vendor-finance",
  "/manage/suppliers": "vendor-finance",
  "/manage/catalogue": "catalogue",
  "/manage/import": "catalogue",
  "/manage/scooters": "catalogue",
  "/manage/trade": "trade",
  "/manage/home": "settings",
  "/manage/about": "settings",
  "/manage/summary": "reports",
  "/manage/payment-reports": "reports",
  "/manage/razorpay-review": "reports",
  "/manage/domain": "settings",
  "/manage/settings": "settings",
  "/manage/brand-catalogue": "settings",
  "/manage/staff": "staff.manage",
} as const satisfies Record<string, StaffCapability>;

export function capabilityForManagePath(pathname: string): StaffCapability {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (path.startsWith("/manage/orders/")) return "online-orders";
  if (path.startsWith("/manage/customers/")) return "operations";
  if (path.startsWith("/manage/products/")) return "catalogue";
  return MANAGE_ROUTE_CAPABILITY[path as keyof typeof MANAGE_ROUTE_CAPABILITY] ?? "operations";
}

export function manageFallbackForRole(role: StaffRole): "/manage" | "/manage/orders" {
  return !can(role, "operations") && can(role, "online-orders") ? "/manage/orders" : "/manage";
}