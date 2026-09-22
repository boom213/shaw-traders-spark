import { useQuery } from "@tanstack/react-query";
import { myPrices, myTradeAccount } from "@/lib/trade.functions";

/** The signed-in customer's trade status, tier and credit position. */
export function useTradeAccount() {
  const { data } = useQuery({
    queryKey: ["trade-account"],
    queryFn: () => myTradeAccount(),
    staleTime: 60_000,
  });
  return {
    account: data,
    isTrade: data?.approved === true,
    tier: data?.tier ?? "retail",
  };
}

/** Prices for the customer's own tier. Empty for retail customers. */
export function useTierPrices(items: { productId: string; qty: number }[]) {
  const key = items.map((i) => `${i.productId}:${i.qty}`).join(",");
  const { data } = useQuery({
    queryKey: ["tier-prices", key],
    queryFn: () => myPrices({ data: { items } }),
    enabled: items.length > 0,
    staleTime: 30_000,
  });
  const map = new Map((data?.lines ?? []).map((l) => [l.productId, l]));
  return { tier: data?.tier ?? "retail", priceFor: (id: string) => map.get(id) ?? null };
}
