export type StaffRole = "super_admin" | "owner" | "manager" | "staff";

export type StaffCapability =
  | "operations"
  | "catalogue"
  | "trade"
  | "counter-sales"
  | "vendor-finance"
  | "content"
  | "reports"
  | "settings"
  | "staff.manage";

const RANK: Record<StaffRole, number> = { staff: 0, manager: 1, owner: 2, super_admin: 3 };

export const ROLE_LABEL: Record<StaffRole, string> = {
  staff: "Staff",
  manager: "Manager",
  owner: "Owner",
  super_admin: "Super admin",
};

export const CAPABILITY_ROLE: Record<StaffCapability, StaffRole> = {
  operations: "staff",
  catalogue: "manager",
  trade: "manager",
  "counter-sales": "manager",
  "vendor-finance": "manager",
  content: "manager",
  reports: "manager",
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
  "/manage/orders": "operations",
  "/manage/enquiries": "operations",
  "/manage/reviews": "operations",
  "/manage/bookings": "operations",
  "/manage/customers": "operations",
  "/manage/all-products": "operations",
  "/manage/products/$productId": "catalogue",
  "/manage/counter-sales": "counter-sales",
  "/manage/vendors": "vendor-finance",
  "/manage/catalogue": "catalogue",
  "/manage/import": "catalogue",
  "/manage/scooters": "catalogue",
  "/manage/trade": "trade",
  "/manage/home": "content",
  "/manage/about": "content",
  "/manage/summary": "reports",
  "/manage/domain": "settings",
  "/manage/settings": "settings",
  "/manage/brand-catalogue": "settings",
  "/manage/staff": "staff.manage",
} as const satisfies Record<string, StaffCapability>;

export function capabilityForManagePath(pathname: string): StaffCapability {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (path.startsWith("/manage/customers/")) return "operations";
  if (path.startsWith("/manage/products/")) return "catalogue";
  return MANAGE_ROUTE_CAPABILITY[path as keyof typeof MANAGE_ROUTE_CAPABILITY] ?? "operations";
}