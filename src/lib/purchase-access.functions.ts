import { createServerFn } from "@tanstack/react-start";

export type { PurchaseAccess } from "@/lib/purchase-access.server";

export const myPurchaseAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { retailPurchaseAccess } = await import("@/lib/purchase-access.server");
  return retailPurchaseAccess();
});