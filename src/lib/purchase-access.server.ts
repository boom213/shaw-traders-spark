export type PurchaseAccess =
  | { eligible: true; reason: "retail"; userId: string }
  | { eligible: false; reason: "guest" | "trade" | "staff" };

/** Resolve retail storefront purchase eligibility from trusted server data. */
export async function retailPurchaseAccess(): Promise<PurchaseAccess> {
  const { tradeAccount } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  if (!account.userId) return { eligible: false, reason: "guest" };

  const { staffContext } = await import("@/lib/staff.server");
  const staff = await staffContext();
  if (staff) return { eligible: false, reason: "staff" };
  if (account.customerType !== "retail") return { eligible: false, reason: "trade" };
  return { eligible: true, reason: "retail", userId: account.userId };
}