const CUSTOMER_SHOPPING_PREFIXES = [
  "/shop",
  "/brand",
  "/categories",
  "/category/",
  "/product/",
  "/scooters",
  "/cart",
  "/checkout",
  "/offers",
  "/trade",
] as const;

/** Keep only same-site shopping paths through a sign-in round trip. */
export function customerShoppingPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  let pathname: string;
  try {
    pathname = new URL(value, "https://shawtradersev.com").pathname;
  } catch {
    return null;
  }
  const allowed = CUSTOMER_SHOPPING_PREFIXES.some((prefix) => prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`));
  return allowed ? value : null;
}