import { createServerFn } from "@tanstack/react-start";

export const myPurchaseAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { retailPurchaseAccess } = await import("@/lib/purchase-access.server");
  return retailPurchaseAccess();
});