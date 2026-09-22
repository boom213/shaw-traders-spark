/**
 * How customers may order — chosen for the whole site, per category or per
 * product. The most specific setting wins: product, then category, then site.
 */
export type OrderingMode = "full" | "enquiry" | "browse";
export type ProductStatus = "draft" | "visible" | "hidden";

export const ORDERING_MODES: { value: OrderingMode; label: string; help: string }[] = [
  { value: "full", label: "Customers can order online", help: "Add to cart, checkout and payment all work." },
  {
    value: "enquiry",
    label: "Customers can only ask about availability",
    help: "No cart anywhere. Every buy button becomes “Check availability” and the request lands in this panel.",
  },
  { value: "browse", label: "Catalogue only", help: "Parts and prices are shown, with no way to buy or ask." },
];

export const modeLabel = (m: OrderingMode) => ORDERING_MODES.find((o) => o.value === m)?.label ?? m;

export const isOrderingMode = (v: unknown): v is OrderingMode =>
  v === "full" || v === "enquiry" || v === "browse";

export const isProductStatus = (v: unknown): v is ProductStatus =>
  v === "draft" || v === "visible" || v === "hidden";

/** Most specific wins: product, then category, then the site-wide switch. */
export function effectiveMode(input: {
  site?: OrderingMode | null;
  category?: OrderingMode | null;
  product?: OrderingMode | null;
}): OrderingMode {
  return input.product ?? input.category ?? input.site ?? "full";
}

export const STATUS_CHIP: Record<ProductStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  visible: { label: "Visible", className: "bg-primary text-primary-foreground" },
  hidden: { label: "Hidden", className: "bg-destructive text-destructive-foreground" },
};
