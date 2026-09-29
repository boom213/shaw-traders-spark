export type PurchaseAccess =
  | { eligible: true; reason: "retail"; userId: string }
  | { eligible: false; reason: "guest" | "trade" | "staff" };

export function classifyPurchaseAccess(input: {
  userId: string | null;
  customerType: string;
  isStaff: boolean;
}): PurchaseAccess {
  if (!input.userId) return { eligible: false, reason: "guest" };
  if (input.isStaff) return { eligible: false, reason: "staff" };
  if (input.customerType !== "retail") return { eligible: false, reason: "trade" };
  return { eligible: true, reason: "retail", userId: input.userId };
}

/** Resolve retail storefront purchase eligibility from trusted server data. */
export async function retailPurchaseAccess(): Promise<PurchaseAccess> {
  const { tradeAccount } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  if (!account.userId) return classifyPurchaseAccess({ userId: null, customerType: account.customerType, isStaff: false });

  const { staffContext } = await import("@/lib/staff.server");
  const staff = await staffContext();
  return classifyPurchaseAccess({ userId: account.userId, customerType: account.customerType, isStaff: Boolean(staff) });
}