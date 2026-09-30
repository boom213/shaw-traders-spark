import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/hooks/useStore";
import { staffSession } from "@/lib/staff.functions";
import { myPrices, myTradeAccount } from "@/lib/trade.functions";

/** The signed-in customer's trade status, tier and credit position. */
export function useTradeAccount(enabled = true) {
  const query = useQuery({
    queryKey: ["trade-account"],
    queryFn: () => myTradeAccount(),
    enabled,
    staleTime: 60_000,
  });
  return {
    account: query.data,
    isTrade: query.data?.approved === true,
    tier: query.data?.tier ?? "retail",
    ready: !query.isPending,
  };
}

export function shouldHideCatalogueRates(input: {
  signedIn: boolean;
  tradeReady: boolean;
  staffReady: boolean;
  approvedTrade: boolean;
  staff: boolean;
}) {
  if (!input.signedIn) return false;
  if (!input.tradeReady || !input.staffReady) return true;
  return input.approvedTrade && !input.staff;
}

/** Hide public catalogue rates only from approved, non-staff wholesale customers. */
export function useCatalogueRateVisibility() {
  const { authReady, user } = useStore();
  const trade = useTradeAccount(authReady && Boolean(user));
  const staff = useQuery({
    queryKey: ["account-staff-session", user?.id],
    queryFn: () => staffSession(),
    enabled: authReady && Boolean(user),
    retry: false,
    staleTime: 60_000,
  });

  return {
    hideCatalogueRates: shouldHideCatalogueRates({
      signedIn: Boolean(user),
      tradeReady: trade.ready,
      staffReady: !staff.isPending,
      approvedTrade: trade.isTrade,
      staff: Boolean(staff.data?.signedIn),
    }),
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
