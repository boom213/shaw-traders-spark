import { useQuery } from "@tanstack/react-query";
import { shopSettingsQuery } from "@/lib/shop-settings";
import { effectiveMode, type OrderingMode } from "@/lib/ordering";
import type { Product } from "@/lib/catalog";

/** The shop-wide switch, refreshed automatically so changes land without a deploy. */
export function useSiteOrdering(): { mode: OrderingMode; banner: string | null; ready: boolean } {
  const { data } = useQuery(shopSettingsQuery());
  return {
    mode: data?.orderingMode ?? "full",
    banner: data?.browseBanner ?? null,
    ready: Boolean(data),
  };
}

/** How this particular part may be bought: product beats category beats site. */
export function useProductOrdering(product: {
  orderingMode?: OrderingMode | null;
  categoryOrderingMode?: OrderingMode | null;
}): OrderingMode {
  const { mode } = useSiteOrdering();
  return effectiveMode({
    site: mode,
    category: product.categoryOrderingMode ?? null,
    product: product.orderingMode ?? null,
  });
}
