import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/hooks/useStore";
import { myPurchaseAccess } from "@/lib/purchase-access.functions";

export function usePurchaseAccess() {
  const { authReady, user } = useStore();
  const check = useServerFn(myPurchaseAccess);
  const query = useQuery({
    queryKey: ["purchase-access", user?.id ?? "guest"],
    queryFn: () => check(),
    enabled: authReady && Boolean(user),
    staleTime: 60_000,
  });

  if (!authReady) return { ready: false, eligible: false, reason: "guest" as const };
  if (!user) return { ready: true, eligible: false, reason: "guest" as const };
  if (!query.data) return { ready: false, eligible: false, reason: "guest" as const };
  return { ready: true, ...query.data };
}