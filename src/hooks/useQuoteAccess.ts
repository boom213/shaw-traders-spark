import { usePurchaseAccess } from "@/hooks/usePurchaseAccess";
import { useTradeAccount } from "@/hooks/useTrade";
import { useStore } from "@/hooks/useStore";

export function useQuoteAccess() {
  const { authReady, user } = useStore();
  const purchase = usePurchaseAccess();
  const trade = useTradeAccount(authReady && Boolean(user));
  const controlReady = authReady && (!user || (purchase.ready && trade.ready));
  return {
    ready: controlReady,
    allowed: controlReady && purchase.reason === "trade" && trade.isTrade,
    reason: purchase.reason,
    account: trade.account,
  };
}